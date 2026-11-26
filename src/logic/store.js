import { useEffect, useState } from 'react';
import { DEFAULT_EXERCISES, DEFAULT_SETTINGS, DEFAULT_TEMPLATES, DAY_LABEL } from './defaults';
import { doneSets, evaluateExercise, suggest } from './progression';
import { XP } from './xp';
import { lifetime, totalXp, weekStatus } from './stats';
import { ACHIEVEMENTS } from './achievements';

const KEY = 'repquest:v1';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function initialState() {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    exercises: Object.fromEntries(DEFAULT_EXERCISES.map((e) => [e.id, { ...e }])),
    templates: structuredClone(DEFAULT_TEMPLATES),
    workouts: [],
    cardio: [],
    steps: {},
    bonuses: {},
    achievements: {},
    activeWorkout: null,
  };
}

export function normalize(p) {
  const base = initialState();
  return { ...base, ...p, settings: { ...base.settings, ...(p.settings || {}) } };
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : initialState();
  } catch {
    return initialState();
  }
}

export function useStore() {
  const [state, setState] = useState(loadState);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);
  return [state, setState];
}

// ---------- rewards ----------

/** Award weekly bonuses and achievements that the new state qualifies for. */
function settle(s, dateKey) {
  const lines = [];
  const bonuses = { ...s.bonuses };
  const ws = weekStatus(s, dateKey);
  if (ws.cleared && !bonuses[`clear:${ws.key}`]) {
    bonuses[`clear:${ws.key}`] = XP.weekCleared;
    lines.push({ icon: '🏁', text: 'Week cleared: 4 lifts + hard cardio', xp: XP.weekCleared, tone: 'gold' });
  }
  if (ws.perfect && !bonuses[`perfect:${ws.key}`]) {
    bonuses[`perfect:${ws.key}`] = XP.perfectWeek;
    lines.push({ icon: '💎', text: 'Perfect week: steps every single day', xp: XP.perfectWeek, tone: 'gold' });
  }
  let next = { ...s, bonuses };
  const ctx = lifetime(next);
  const unlocked = ACHIEVEMENTS.filter((a) => !next.achievements[a.id] && a.check(ctx));
  if (unlocked.length) {
    next = {
      ...next,
      achievements: { ...next.achievements, ...Object.fromEntries(unlocked.map((a) => [a.id, dateKey])) },
    };
  }
  return { state: next, lines, unlocked };
}

function withReward(prev, next, dateKey, base) {
  const settled = settle(next, dateKey);
  return {
    state: settled.state,
    reward: {
      ...base,
      xpBefore: totalXp(prev),
      xpAfter: totalXp(settled.state),
      lines: [...base.lines, ...settled.lines],
      unlocked: settled.unlocked,
    },
  };
}

// ---------- workouts ----------

export function startWorkout(s, type, today) {
  const exercises = s.templates[type]
    .filter((id) => s.exercises[id])
    .map((id) => {
      const sug = suggest(s.exercises[id], s.workouts);
      return {
        exerciseId: id,
        suggestion: sug,
        sets: Array.from({ length: s.settings.defaultSets }, () => ({ weight: sug.weight, reps: '', done: false })),
      };
    });
  return { ...s, activeWorkout: { id: uid(), type, date: today, startedAt: Date.now(), lastSetAt: null, exercises } };
}

const mapActive = (s, ei, fn) => ({
  ...s,
  activeWorkout: {
    ...s.activeWorkout,
    exercises: s.activeWorkout.exercises.map((e, i) => (i === ei ? fn(e) : e)),
  },
});

export function updateSet(s, ei, si, patch) {
  let next = mapActive(s, ei, (e) => {
    const sets = e.sets.map((x, i) => (i === si ? { ...x, ...patch } : x));
    // Typing a new weight in set 1 carries it to later sets that haven't been logged yet.
    if (si === 0 && 'weight' in patch) {
      for (let i = 1; i < sets.length; i++) {
        if (!sets[i].done && sets[i].weight === e.sets[0].weight) sets[i] = { ...sets[i], weight: patch.weight };
      }
    }
    return { ...e, sets };
  });
  if (patch.done) next = { ...next, activeWorkout: { ...next.activeWorkout, lastSetAt: Date.now() } };
  return next;
}

export const addSet = (s, ei) =>
  mapActive(s, ei, (e) => {
    const last = e.sets[e.sets.length - 1];
    return { ...e, sets: [...e.sets, { weight: last ? last.weight : e.suggestion.weight, reps: '', done: false }] };
  });

export const removeSet = (s, ei, si) => mapActive(s, ei, (e) => ({ ...e, sets: e.sets.filter((_, i) => i !== si) }));

export const discardWorkout = (s) => ({ ...s, activeWorkout: null });

export function finishWorkout(s) {
  const w = s.activeWorkout;
  const evals = w.exercises
    .map((e) => s.exercises[e.exerciseId] && evaluateExercise(e, s.exercises[e.exerciseId], s.workouts))
    .filter(Boolean);
  if (!evals.length) return null;

  const sets = evals.reduce((a, e) => a + e.sets, 0);
  const volume = evals.reduce((a, e) => a + e.volume, 0);
  const overloads = evals.filter((e) => e.overload);
  const prs = evals.filter((e) => e.pr);
  const xp = XP.workout + sets * XP.set + overloads.length * XP.overload + prs.length * XP.pr;
  const finishedAt = Date.now();

  const record = {
    id: w.id,
    type: w.type,
    date: w.date,
    startedAt: w.startedAt,
    finishedAt,
    exercises: w.exercises
      .map((e) => ({ exerciseId: e.exerciseId, sets: doneSets(e.sets).map((x) => ({ ...x, done: true })) }))
      .filter((e) => e.sets.length),
    xp,
    summary: {
      sets,
      volume,
      overloads: overloads.map((o) => ({ exerciseId: o.exerciseId, ...o.overload })),
      prs: prs.map((p) => ({ exerciseId: p.exerciseId, ...p.pr })),
    },
  };

  const lines = [
    { icon: '✅', text: `${DAY_LABEL[w.type]} day complete`, xp: XP.workout },
    { icon: '📋', text: `${sets} sets logged`, xp: sets * XP.set },
    ...overloads.map((o) => ({
      icon: '⬆️',
      text: `${o.name}: ${o.overload.reps} × ${o.overload.weight} lb. Next time: ${o.overload.next} lb`,
      xp: XP.overload,
      tone: 'win',
    })),
    ...prs.map((p) => ({ icon: '⭐', text: `${p.name} PR: ${p.pr.reps} × ${p.pr.weight} lb`, xp: XP.pr, tone: 'win' })),
  ];

  const next = { ...s, activeWorkout: null, workouts: [...s.workouts, record] };
  return withReward(s, next, w.date, {
    kind: 'workout',
    title: `${DAY_LABEL[w.type]} Day Cleared`,
    stats: { duration: finishedAt - w.startedAt, sets, volume },
    lines,
  });
}

// ---------- cardio & steps ----------

export function logCardio(s, { kind, minutes, intensity, date }) {
  const xp = XP.cardio[intensity];
  const record = { id: uid(), date, kind, minutes, intensity, xp, loggedAt: Date.now() };
  const next = { ...s, cardio: [...s.cardio, record] };
  const label = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' }[intensity];
  return withReward(s, next, date, {
    kind: 'cardio',
    title: intensity === 'hard' ? 'Hard Cardio Done' : 'Cardio Logged',
    stats: { duration: minutes * 60000 },
    lines: [{ icon: intensity === 'hard' ? '❤️‍🔥' : '🫁', text: `${label} ${kind.toLowerCase()} · ${minutes} min`, xp }],
  });
}

export function setSteps(s, date, n) {
  const goal = s.settings.stepGoal;
  const was = (s.steps[date] || 0) >= goal;
  const steps = { ...s.steps };
  if (n > 0) steps[date] = n;
  else delete steps[date];
  const next = { ...s, steps };
  if (was || n < goal) return { state: settle(next, date).state, reward: null };
  return withReward(s, next, date, {
    kind: 'steps',
    title: 'Step Goal Hit',
    stats: null,
    lines: [{ icon: '👟', text: `${n.toLocaleString()} steps`, xp: XP.stepsDay }],
  });
}

export const deleteWorkout = (s, id) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) });
export const deleteCardio = (s, id) => ({ ...s, cardio: s.cardio.filter((c) => c.id !== id) });
