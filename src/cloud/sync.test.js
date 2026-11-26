import { describe, expect, it } from 'vitest';
import { adoptRemote, mergeStates, stable } from './sync';
import { initialState } from '../logic/store';

const w = (id, finishedAt, xp = 100) => ({ id, finishedAt, date: '2026-11-23', type: 'upper', xp, exercises: [] });

describe('cloud merge', () => {
  it('keeps the local copy when the cloud is empty', () => {
    const local = { ...initialState(), workouts: [w('a', 1)] };
    const merged = mergeStates(local, { profile: null, workouts: [], cardio: [] });
    expect(merged.workouts.map((x) => x.id)).toEqual(['a']);
  });

  it('unions workouts from both sides, sorted by time', () => {
    const local = { ...initialState(), workouts: [w('a', 3), w('b', 1)] };
    const merged = mergeStates(local, { profile: {}, workouts: [w('c', 2)], cardio: [] });
    expect(merged.workouts.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('takes the higher step count per day and the earliest badge date', () => {
    const local = { ...initialState(), steps: { '2026-11-23': 12000, '2026-11-24': 3000 }, achievements: { 'first-rep': '2026-11-24' } };
    const merged = mergeStates(local, {
      profile: { steps: { '2026-11-23': 9000, '2026-11-24': 11000 }, achievements: { 'first-rep': '2026-11-20' } },
      workouts: [],
      cardio: [],
    });
    expect(merged.steps).toEqual({ '2026-11-23': 12000, '2026-11-24': 11000 });
    expect(merged.achievements['first-rep']).toBe('2026-11-20');
  });

  it('adopting the cloud copy keeps an in-progress workout on this device', () => {
    const local = { ...initialState(), activeWorkout: { id: 'live' }, workouts: [w('stale', 1)] };
    const next = adoptRemote(local, { profile: { steps: { '2026-11-23': 500 } }, workouts: [w('x', 5)], cardio: [] });
    expect(next.activeWorkout).toEqual({ id: 'live' });
    expect(next.workouts.map((x) => x.id)).toEqual(['x']);
    expect(next.steps).toEqual({ '2026-11-23': 500 });
  });

  it('stable() ignores key order', () => {
    expect(stable({ a: 1, b: { c: 2, d: 3 } })).toBe(stable({ b: { d: 3, c: 2 }, a: 1 }));
  });
});
