import { useRef, useState } from 'react';
import { DAY_NAMES } from '../logic/dates';
import { CYCLE, DAY_LABEL } from '../logic/defaults';
import { initialState, normalize, uid } from '../logic/store';
import { Icon } from './Icons';
import { syncLabel } from './SyncPill';

function TemplateEditor({ type, state, setState }) {
  const [name, setName] = useState('');
  const ids = state.templates[type];

  const setTemplate = (fn) => setState((s) => ({ ...s, templates: { ...s.templates, [type]: fn(s.templates[type]) } }));
  const setEx = (id, patch) =>
    setState((s) => ({ ...s, exercises: { ...s.exercises, [id]: { ...s.exercises[id], ...patch } } }));
  const move = (i, d) =>
    setTemplate((t) => {
      const a = [...t];
      [a[i], a[i + d]] = [a[i + d], a[i]];
      return a;
    });
  const add = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const id = `${n.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uid().slice(-4)}`;
    setState((s) => ({
      ...s,
      exercises: { ...s.exercises, [id]: { id, name: n, increment: 5, startWeight: null } },
      templates: { ...s.templates, [type]: [...s.templates[type], id] },
    }));
    setName('');
  };

  return (
    <section className="card">
      <div className="eyebrow">{DAY_LABEL[type]} day exercises</div>
      <ul className="tpl">
        {ids.map((id, i) => {
          const ex = state.exercises[id];
          if (!ex) return null;
          return (
            <li key={id}>
              <input className="input grow" value={ex.name} onChange={(e) => setEx(id, { name: e.target.value })} />
              <select
                className="input inc"
                value={ex.increment}
                onChange={(e) => setEx(id, { increment: Number(e.target.value) })}
                title="Weight jump after hitting 9 reps"
              >
                {[2.5, 5, 10, 15, 20].map((v) => (
                  <option key={v} value={v}>
                    +{v}
                  </option>
                ))}
              </select>
              <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <Icon name="up" size={16} />
              </button>
              <button className="icon-btn" disabled={i === ids.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <Icon name="down" size={16} />
              </button>
              <button className="icon-btn" onClick={() => setTemplate((t) => t.filter((x) => x !== id))} aria-label="Remove">
                <Icon name="x" size={16} />
              </button>
            </li>
          );
        })}
      </ul>
      <form className="row gap" onSubmit={add}>
        <input className="input grow" placeholder="Add exercise" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="submit">Add</button>
      </form>
      <p className="muted small">Removing an exercise keeps its history. The +lb number is how much the weight goes up after you hit 9 reps.</p>
    </section>
  );
}

function CloudCard({ cloud }) {
  const [text, tone] = syncLabel(cloud);
  if (cloud.user === undefined) return null;
  return (
    <section className="card">
      <div className="row between">
        <div className="eyebrow">Cloud backup</div>
        <span className={`sync-pill ${tone} static`}>
          <i />
          {text}
        </span>
      </div>
      {cloud.user ? (
        <>
          <div className="account">
            {cloud.user.photoURL && <img src={cloud.user.photoURL} alt="" referrerPolicy="no-referrer" />}
            <div className="grow">
              <div className="ex-name">{cloud.user.displayName || 'Signed in'}</div>
              <div className="muted small">{cloud.user.email}</div>
            </div>
            <button className="link muted" onClick={cloud.signOut}>Sign out</button>
          </div>
          <p className="muted small">
            Every workout, cardio session and step count is saved to your account. Sign in on another device to see the
            same data. Works offline and catches up when you have signal.
          </p>
        </>
      ) : (
        <>
          <p className="muted small">
            Right now your data only lives in this browser. Sign in to back it up and sync it across your phone and
            computer. Anything already logged here gets uploaded.
          </p>
          <button className="btn primary block" onClick={cloud.signIn}>Sign in with Google</button>
        </>
      )}
      {cloud.error && <p className="small error-text">{cloud.error}</p>}
    </section>
  );
}

export default function SettingsView({ state, setState, cloud }) {
  const fileRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const st = state.settings;
  const schedule = CYCLE.map((p, i) => `${DAY_NAMES[(st.weekStartDay + i) % 7].slice(0, 3)} ${DAY_LABEL[p]}`);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rep-quest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.workouts) || !data.exercises) throw new Error('bad file');
      setState(normalize(data));
      setMsg('Backup restored.');
    } catch {
      setMsg("That file doesn't look like a Rep Quest backup.");
    }
    e.target.value = '';
  };

  return (
    <>
      <header className="page-head">
        <h1>Settings</h1>
      </header>

      <CloudCard cloud={cloud} />

      <section className="card">
        <div className="eyebrow">Schedule</div>
        <label className="setting">
          <span>Week starts on</span>
          <select className="input" value={st.weekStartDay} onChange={(e) => set({ weekStartDay: Number(e.target.value) })}>
            {DAY_NAMES.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">{schedule.join(' · ')}</p>
        <label className="setting">
          <span>Daily step goal</span>
          <input
            className="input narrow"
            inputMode="numeric"
            value={st.stepGoal}
            onChange={(e) => set({ stepGoal: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })}
          />
        </label>
        <label className="setting">
          <span>Sets per exercise</span>
          <select className="input" value={st.defaultSets} onChange={(e) => set({ defaultSets: Number(e.target.value) })}>
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="setting">
          <span>Sound effects</span>
          <input type="checkbox" className="toggle" checked={st.sound} onChange={(e) => set({ sound: e.target.checked })} />
        </label>
      </section>

      <TemplateEditor type="upper" state={state} setState={setState} />
      <TemplateEditor type="lower" state={state} setState={setState} />

      <section className="card">
        <div className="eyebrow">Your data</div>
        <p className="muted small">Everything is stored in this browser. Export a backup now and then.</p>
        <div className="row gap">
          <button className="btn" onClick={exportData}>Export backup</button>
          <button className="btn ghost" onClick={() => fileRef.current.click()}>Import backup</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importData} />
        </div>
        {msg && <p className="small accent">{msg}</p>}
        <div className="divider" />
        {confirmReset ? (
          <div className="row gap">
            <span className="small">Erase all workouts, XP and badges{cloud?.user ? ', including your cloud backup' : ''}?</span>
            <button
              className="link danger"
              onClick={() => {
                setState(initialState());
                setConfirmReset(false);
              }}
            >
              Erase everything
            </button>
            <button className="link" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <button className="link danger" onClick={() => setConfirmReset(true)}>Reset all data</button>
        )}
      </section>
    </>
  );
}
