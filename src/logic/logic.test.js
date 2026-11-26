import { describe, expect, it } from 'vitest';
import { evaluateExercise, suggest } from './progression';
import { levelInfo } from './xp';
import { finishWorkout, initialState, logCardio, setSteps, startWorkout, updateSet } from './store';
import { planFor, weekStatus } from './stats';

const bench = { id: 'db-bench', name: 'DB Bench Press', increment: 5, startWeight: null };
const workout = (finishedAt, sets) => ({
  id: String(finishedAt),
  date: '2026-11-23',
  finishedAt,
  exercises: [{ exerciseId: 'db-bench', sets: sets.map(([weight, reps]) => ({ weight, reps, done: true })) }],
});

describe('progression', () => {
  it('suggests +5 lb after hitting 9 reps', () => {
    const s = suggest(bench, [workout(1, [[75, 9], [75, 8]])]);
    expect(s).toMatchObject({ mode: 'overload', weight: 80, targetReps: 5 });
  });

  it('stays at the weight and aims for one more rep below 9', () => {
    const s = suggest(bench, [workout(1, [[75, 9]]), workout(2, [[80, 6], [80, 5]])]);
    expect(s).toMatchObject({ mode: 'build', weight: 80, targetReps: 7 });
  });

  it('awards overload only when 9 reps happens at a new weight', () => {
    const prior = [workout(1, [[75, 9]])];
    expect(evaluateExercise({ sets: [{ weight: 75, reps: 9, done: true }] }, bench, prior).overload).toBeNull();
    expect(evaluateExercise({ sets: [{ weight: 80, reps: 9, done: true }] }, bench, prior).overload).toMatchObject({
      weight: 80,
      next: 85,
    });
  });

  it('detects a rep PR at the same weight', () => {
    const prior = [workout(1, [[80, 6]])];
    const ev = evaluateExercise({ sets: [{ weight: 80, reps: 7, done: true }] }, bench, prior);
    expect(ev.pr).toEqual({ weight: 80, reps: 7 });
  });

  it('ignores unchecked sets', () => {
    expect(evaluateExercise({ sets: [{ weight: 80, reps: 7, done: false }] }, bench, [])).toBeNull();
  });
});

describe('schedule & levels', () => {
  it('maps the Upper/Lower/Rest cycle onto a Monday-start week', () => {
    // 2026-11-23 is a Monday
    const days = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];
    expect(days.map((d) => planFor(d, 1))).toEqual(['upper', 'lower', 'rest', 'upper', 'lower', 'rest', 'rest']);
  });

  it('computes levels', () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(299).level).toBe(1);
    expect(levelInfo(300).level).toBe(2);
    expect(levelInfo(300 + 450).level).toBe(3);
  });
});

describe('store flow', () => {
  it('finishes a workout, grants XP and first achievements', () => {
    let s = startWorkout(initialState(), 'upper', '2026-11-23');
    s = updateSet(s, 0, 0, { weight: 75, reps: 9, done: true });
    const { state, reward } = finishWorkout(s);
    expect(state.activeWorkout).toBeNull();
    expect(state.workouts).toHaveLength(1);
    expect(state.achievements['first-rep']).toBe('2026-11-23');
    expect(state.achievements['overloaded']).toBe('2026-11-23');
    expect(reward.xpAfter).toBeGreaterThan(reward.xpBefore);
    // Next upper day suggests 80
    const next = startWorkout(state, 'upper', '2026-11-26');
    expect(next.activeWorkout.exercises[0].suggestion.weight).toBe(80);
  });

  it('clears a week with 4 lifts and hard cardio', () => {
    let s = initialState();
    for (const d of ['2026-11-23', '2026-11-24', '2026-11-26', '2026-11-27']) {
      s = startWorkout(s, 'upper', d);
      s = updateSet(s, 0, 0, { weight: 50, reps: 6, done: true });
      s = finishWorkout(s).state;
    }
    expect(weekStatus(s, '2026-11-27').cleared).toBe(false);
    const r = logCardio(s, { kind: 'Run', minutes: 25, intensity: 'hard', date: '2026-11-28' });
    expect(weekStatus(r.state, '2026-11-28').cleared).toBe(true);
    expect(r.state.bonuses['clear:2026-11-23']).toBe(300);
  });

  it('only rewards steps when crossing the goal', () => {
    const s = initialState();
    expect(setSteps(s, '2026-11-23', 8000).reward).toBeNull();
    const hit = setSteps(s, '2026-11-23', 10400);
    expect(hit.reward.lines[0].xp).toBe(50);
    expect(setSteps(hit.state, '2026-11-23', 12000).reward).toBeNull();
  });
});
