// Double progression in a 5–9 rep range:
// hit 9 reps at a weight -> next session go up one increment, and stay there until you hit 9 again.
export const REP_MIN = 5;
export const REP_MAX = 9;

const num = (v) => (v === '' || v == null ? NaN : Number(v));

export function doneSets(sets) {
  return sets
    .filter((s) => s.done)
    .map((s) => ({ weight: num(s.weight), reps: num(s.reps) }))
    .filter((s) => Number.isFinite(s.weight) && s.weight >= 0 && Number.isFinite(s.reps) && s.reps > 0);
}

/** Heaviest set, ties broken by reps. Expects already-cleaned sets. */
export function bestOf(sets) {
  if (!sets.length) return null;
  return sets.reduce((b, s) => (s.weight > b.weight || (s.weight === b.weight && s.reps > b.reps) ? s : b));
}

/** Chronological list of finished sessions for one exercise. */
export function exerciseHistory(exerciseId, workouts) {
  return workouts
    .filter((w) => w.finishedAt)
    .slice()
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .flatMap((w) => {
      const entry = w.exercises.find((e) => e.exerciseId === exerciseId);
      const sets = entry ? doneSets(entry.sets) : [];
      return sets.length ? [{ date: w.date, workoutId: w.id, sets, best: bestOf(sets) }] : [];
    });
}

/** What to do next time for this exercise. */
export function suggest(exercise, workouts) {
  const hist = exerciseHistory(exercise.id, workouts);
  const last = hist[hist.length - 1];
  if (!last) {
    return { mode: 'new', weight: exercise.startWeight ?? '', targetReps: null, last: null };
  }
  const b = last.best;
  if (b.reps >= REP_MAX) {
    return { mode: 'overload', weight: b.weight + exercise.increment, targetReps: REP_MIN, last: b };
  }
  return {
    mode: 'build',
    weight: b.weight,
    targetReps: Math.min(REP_MAX, Math.max(REP_MIN, b.reps + 1)),
    last: b,
  };
}

/** Score one exercise from a just-finished workout against everything before it. */
export function evaluateExercise(entry, exercise, priorWorkouts) {
  const sets = doneSets(entry.sets);
  if (!sets.length) return null;
  const prior = exerciseHistory(exercise.id, priorWorkouts).flatMap((h) => h.sets);

  // Overload: hit the top of the range at a heavier weight than ever before.
  const topSets = sets.filter((s) => s.reps >= REP_MAX).sort((a, b) => b.weight - a.weight);
  const prevTop = Math.max(-Infinity, ...prior.filter((s) => s.reps >= REP_MAX).map((s) => s.weight));
  const overload =
    topSets.length && topSets[0].weight > prevTop
      ? { weight: topSets[0].weight, reps: topSets[0].reps, next: topSets[0].weight + exercise.increment }
      : null;

  // PR: a set no previous set matched (same or heavier weight with same or more reps).
  let pr = null;
  if (prior.length && !overload) {
    pr = sets.find((s) => !prior.some((p) => p.weight >= s.weight && p.reps >= s.reps)) || null;
  }

  return {
    exerciseId: exercise.id,
    name: exercise.name,
    sets: sets.length,
    volume: sets.reduce((v, s) => v + s.weight * s.reps, 0),
    best: bestOf(sets),
    overload,
    pr,
  };
}
