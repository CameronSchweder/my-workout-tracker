import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, redirectResult, signIn as fbSignIn, signOut as fbSignOut } from './firebase';
import { adoptRemote, COLLECTIONS, mergeStates, profileOf, sortRecords, stable } from './sync';

const SYNCED_KEY = 'repquest:syncedUid';

const friendly = (e) => {
  if (e?.code === 'permission-denied') return 'The database refused access. Check the Firestore security rules.';
  if (e?.code === 'auth/unauthorized-domain') return 'This domain is not authorized in Firebase Authentication settings.';
  if (e?.code === 'failed-precondition' || e?.code === 'not-found') return 'Firestore is not set up yet. Create the database in the Firebase console.';
  return e?.message || String(e);
};

/**
 * Keeps app state mirrored to Firestore while signed in.
 * Local state stays the source the UI reads from; every change is diffed against what the cloud
 * has and written through. Changes from other devices arrive via snapshot listeners.
 */
export function useCloudSync(state, setState) {
  const [user, setUser] = useState(undefined); // undefined = still checking, null = signed out
  const [status, setStatus] = useState('idle'); // idle | loading | syncing | synced | offline | error
  const [error, setError] = useState('');
  const ready = useRef(false);
  const pending = useRef(0);
  const cache = useRef({ profile: null, workouts: new Map(), cardio: new Map() });

  const fail = useCallback((e) => {
    console.error(e);
    setError(friendly(e));
    setStatus('error');
  }, []);

  useEffect(() => {
    redirectResult().catch(fail);
    return onAuthStateChanged(auth, setUser);
  }, [fail]);

  useEffect(() => {
    const update = () => {
      if (pending.current > 0) setStatus(navigator.onLine ? 'syncing' : 'offline');
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Sign-in: load the cloud copy, merge or adopt it, then listen for changes.
  useEffect(() => {
    ready.current = false;
    cache.current = { profile: null, workouts: new Map(), cardio: new Map() };
    if (!user) {
      setStatus('idle');
      return undefined;
    }
    const uid = user.uid;
    const profileRef = doc(db, 'users', uid);
    const refs = { workouts: collection(db, 'users', uid, 'workouts'), cardio: collection(db, 'users', uid, 'cardio') };
    const unsubs = [];
    let cancelled = false;
    setStatus('loading');
    setError('');

    (async () => {
      try {
        const [p, ws, cs] = await Promise.all([getDoc(profileRef), getDocs(refs.workouts), getDocs(refs.cardio)]);
        if (cancelled) return;
        const remote = {
          profile: p.exists() ? profileOf(p.data()) : null,
          workouts: ws.docs.map((d) => d.data()),
          cardio: cs.docs.map((d) => d.data()),
        };
        cache.current = {
          profile: remote.profile ? stable(remote.profile) : null,
          workouts: new Map(remote.workouts.map((r) => [r.id, stable(r)])),
          cardio: new Map(remote.cardio.map((r) => [r.id, stable(r)])),
        };
        const firstTimeHere = localStorage.getItem(SYNCED_KEY) !== uid || !remote.profile;
        ready.current = true;
        setState((local) => (firstTimeHere ? mergeStates(local, remote) : adoptRemote(local, remote)));
        localStorage.setItem(SYNCED_KEY, uid);
        setStatus('synced');

        unsubs.push(
          onSnapshot(
            profileRef,
            (snap) => {
              if (snap.metadata.hasPendingWrites || !snap.exists()) return; // our own write echoing back
              const prof = profileOf(snap.data());
              const s = stable(prof);
              if (s === cache.current.profile) return;
              cache.current.profile = s;
              setState((cur) => ({ ...cur, ...prof }));
            },
            fail,
          ),
        );
        for (const [key, ref] of Object.entries(refs)) {
          unsubs.push(
            onSnapshot(
              ref,
              (snap) => {
                if (snap.metadata.hasPendingWrites) return;
                const docs = snap.docs.map((d) => d.data());
                const before = cache.current[key];
                const next = new Map(docs.map((r) => [r.id, stable(r)]));
                const same = next.size === before.size && [...next].every(([id, s]) => before.get(id) === s);
                if (same) return;
                cache.current[key] = next;
                setState((cur) => {
                  const ids = new Set(docs.map((r) => r.id));
                  // Keep records made here that haven't been sent yet; drop ones deleted elsewhere.
                  const unsent = cur[key].filter((r) => !ids.has(r.id) && !before.has(r.id));
                  return { ...cur, [key]: sortRecords([...docs, ...unsent], COLLECTIONS[key]) };
                });
              },
              fail,
            ),
          );
        }
      } catch (e) {
        if (!cancelled) fail(e);
      }
    })();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [user, setState, fail]);

  // Write-through: push whatever differs from the cloud copy.
  useEffect(() => {
    if (!user || !ready.current) return;
    const uid = user.uid;
    const writes = [];

    const prof = profileOf(state);
    const ps = stable(prof);
    if (ps !== cache.current.profile) {
      cache.current.profile = ps;
      writes.push(setDoc(doc(db, 'users', uid), { ...prof, updatedAt: Date.now() }));
    }
    for (const key of Object.keys(COLLECTIONS)) {
      const c = cache.current[key];
      const ids = new Set();
      for (const r of state[key]) {
        ids.add(r.id);
        const s = stable(r);
        if (c.get(r.id) !== s) {
          c.set(r.id, s);
          writes.push(setDoc(doc(db, 'users', uid, key, r.id), r));
        }
      }
      for (const id of [...c.keys()]) {
        if (!ids.has(id)) {
          c.delete(id);
          writes.push(deleteDoc(doc(db, 'users', uid, key, id)));
        }
      }
    }
    if (!writes.length) return;

    pending.current += 1;
    setStatus(navigator.onLine ? 'syncing' : 'offline');
    Promise.all(writes)
      .then(() => {
        pending.current -= 1;
        if (pending.current === 0) setStatus('synced');
      })
      .catch((e) => {
        pending.current -= 1;
        fail(e);
      });
  }, [state, user, fail]);

  const signIn = useCallback(() => {
    setError('');
    return fbSignIn().catch(fail);
  }, [fail]);

  const signOut = useCallback(() => {
    localStorage.removeItem(SYNCED_KEY);
    return fbSignOut().catch(fail);
  }, [fail]);

  return { user, status, error, signIn, signOut };
}
