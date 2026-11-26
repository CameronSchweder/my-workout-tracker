import { addDays, weekDays, weekStart, weekday, fromKey } from './dates';
import { CYCLE } from './defaults';
import { XP, levelInfo } from './xp';

export const planFor = (k, startDay) => CYCLE[(weekday(k) - startDay + 7) % 7];

export function totalXp(s) {
  const sum = (arr) => arr.reduce((a, x) => a + (x.xp || 0), 0);
  const stepDays = Object.values(s.steps).filter((n) => n >= s.settings.stepGoal).length;
  const bonuses = Object.values(s.bonuses).reduce((a, x) => a + x, 0);
  return (
    sum(s.workouts) +
    sum(s.cardio) +
    stepDays * XP.stepsDay +
    bonuses +
    Object.keys(s.achievements).length * XP.achievement
  );
}

export const levelOf = (s) => levelInfo(totalXp(s));

export function weekStatus(s, k) {
  const days = weekDays(k, s.settings.weekStartDay);
  const inWeek = new Set(days);
  const lifts = s.workouts.filter((w) => inWeek.has(w.date));
  const hard = s.cardio.filter((c) => inWeek.has(c.date) && c.intensity === 'hard');
  const stepDays = days.filter((d) => (s.steps[d] || 0) >= s.settings.stepGoal);
  const cleared = lifts.length >= 4 && hard.length >= 1;
  return { key: days[0], days, lifts, hard, stepDays, cleared, perfect: cleared && stepDays.length === 7 };
}

/** Consecutive cleared weeks. The current week only adds to the streak — it can't break it until it's over. */
export function weekStreak(s, today) {
  let k = weekStart(today, s.settings.weekStartDay);
  let streak = weekStatus(s, k).cleared ? 1 : 0;
  for (let i = 0; i < 520; i++) {
    k = addDays(k, -7);
    if (!weekStatus(s, k).cleared) break;
    streak += 1;
  }
  return streak;
}

/** Consecutive days at the step goal. Today only adds — it can't break it until it's over. */
export function stepStreak(s, today) {
  const goal = s.settings.stepGoal;
  let d = (s.steps[today] || 0) >= goal ? today : addDays(today, -1);
  let n = 0;
  while ((s.steps[d] || 0) >= goal) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

function longestRun(sortedKeys, gapDays) {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of sortedKeys) {
    run = prev && addDays(prev, gapDays) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export function lifetime(s) {
  const goal = s.settings.stepGoal;
  const stepKeys = Object.keys(s.steps).filter((k) => s.steps[k] >= goal).sort();
  const clearedWeeks = Object.keys(s.bonuses).filter((k) => k.startsWith('clear:')).map((k) => k.slice(6)).sort();
  return {
    workouts: s.workouts.length,
    volume: s.workouts.reduce((a, w) => a + (w.summary?.volume || 0), 0),
    sets: s.workouts.reduce((a, w) => a + (w.summary?.sets || 0), 0),
    overloads: s.workouts.reduce((a, w) => a + (w.summary?.overloads.length || 0), 0),
    prs: s.workouts.reduce((a, w) => a + (w.summary?.prs.length || 0), 0),
    cardio: s.cardio.length,
    hardCardio: s.cardio.filter((c) => c.intensity === 'hard').length,
    cardioMinutes: s.cardio.reduce((a, c) => a + (c.minutes || 0), 0),
    stepDays: stepKeys.length,
    bestStepStreak: longestRun(stepKeys, 1),
    clearedWeeks: clearedWeeks.length,
    bestWeekStreak: longestRun(clearedWeeks, 7),
    perfectWeeks: Object.keys(s.bonuses).filter((k) => k.startsWith('perfect:')).length,
    earlyBird: s.workouts.filter((w) => { const h = new Date(w.startedAt).getHours(); return h >= 4 && h < 7; }).length,
    level: levelOf(s).level,
  };
}

const THINGS = [
  [13000, 'elephant', 'elephants'],
  [4000, 'car', 'cars'],
  [1200, 'horse', 'horses'],
  [1000, 'grand piano', 'grand pianos'],
  [500, 'motorcycle', 'motorcycles'],
  [150, 'golden retriever', 'golden retrievers'],
];

export function volumeComparison(lbs) {
  const hit = THINGS.find(([w]) => lbs >= w * 1.5) || THINGS.find(([w]) => lbs >= w);
  if (!hit) return null;
  const n = Math.round((lbs / hit[0]) * 10) / 10;
  return `≈ ${n} ${n === 1 ? hit[1] : hit[2]}`;
}

export const isToday = (k, today) => fromKey(k).getTime() === fromKey(today).getTime();
