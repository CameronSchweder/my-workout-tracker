// Pure helpers for cloud sync (no Firebase imports, so they're unit-testable).
//
// Firestore layout, per signed-in user:
//   users/{uid}                 profile: settings, exercises, templates, steps, bonuses, achievements
//   users/{uid}/workouts/{id}   one doc per finished workout
//   users/{uid}/cardio/{id}     one doc per cardio session
// The in-progress workout stays on the device (it's also saved in localStorage).

export const PROFILE_FIELDS = ['settings', 'exercises', 'templates', 'steps', 'bonuses', 'achievements'];
export const COLLECTIONS = { workouts: 'finishedAt', cardio: 'loggedAt' };

export const profileOf = (s) => Object.fromEntries(PROFILE_FIELDS.filter((k) => s[k] !== undefined).map((k) => [k, s[k]]));

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .filter((k) => v[k] !== undefined)
        .map((k) => [k, sortKeys(v[k])]),
    );
  }
  return v;
}

/** Key-order-independent JSON, for "did this change?" checks. */
export const stable = (v) => JSON.stringify(sortKeys(v));

export const sortRecords = (records, key) => records.slice().sort((a, b) => (a[key] || 0) - (b[key] || 0));

/**
 * First sign-in on a device: combine what's on this device with what's in the cloud so nothing is lost.
 * remote = { profile: object | null, workouts: [], cardio: [] }
 */
export function mergeStates(local, remote) {
  const rp = remote.profile || {};
  const union = (a, b) => {
    const m = new Map(a.map((r) => [r.id, r]));
    b.forEach((r) => m.set(r.id, r)); // cloud copy wins on conflicts
    return [...m.values()];
  };

  const steps = { ...local.steps };
  for (const [d, n] of Object.entries(rp.steps || {})) steps[d] = Math.max(steps[d] || 0, n);

  const achievements = { ...local.achievements };
  for (const [id, d] of Object.entries(rp.achievements || {})) {
    if (!achievements[id] || d < achievements[id]) achievements[id] = d;
  }

  return {
    ...local,
    settings: rp.settings ? { ...local.settings, ...rp.settings } : local.settings,
    exercises: { ...local.exercises, ...(rp.exercises || {}) },
    templates: rp.templates || local.templates,
    steps,
    achievements,
    bonuses: { ...local.bonuses, ...(rp.bonuses || {}) },
    workouts: sortRecords(union(local.workouts, remote.workouts), COLLECTIONS.workouts),
    cardio: sortRecords(union(local.cardio, remote.cardio), COLLECTIONS.cardio),
  };
}

/** Returning device: the cloud is the source of truth, but keep this device's in-progress workout. */
export function adoptRemote(local, remote) {
  return {
    ...local,
    ...profileOf(remote.profile || {}),
    settings: { ...local.settings, ...(remote.profile?.settings || {}) },
    workouts: sortRecords(remote.workouts, COLLECTIONS.workouts),
    cardio: sortRecords(remote.cardio, COLLECTIONS.cardio),
  };
}
