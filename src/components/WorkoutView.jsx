import { useState } from 'react';
import { fmtDuration } from '../logic/dates';
import { DAY_LABEL } from '../logic/defaults';
import { REP_MAX, REP_MIN } from '../logic/progression';
import { addSet, discardWorkout, finishWorkout, removeSet, updateSet } from '../logic/store';
import { XP } from '../logic/xp';
import { useNow } from '../hooks';
import { sfx } from '../sfx';
import { Icon } from './Icons';

function SuggestionChip({ sug }) {
  if (sug.mode === 'overload')
    return (
      <span className="sug overload">
        ⬆ Go {sug.weight} lb · aim {sug.targetReps}+ reps
      </span>
    );
  if (sug.mode === 'build')
    return (
      <span className="sug">
        {sug.weight} lb · aim for {sug.targetReps} reps
      </span>
    );
  return <span className="sug new">New · find a weight for {REP_MIN}–{REP_MAX} reps</span>;
}

function SetRow({ n, set, onChange, onToggle, onRemove, canRemove }) {
  const [pop, setPop] = useState(0);
  const [shake, setShake] = useState(false);
  const reps = Number(set.reps);
  const top = set.done && reps >= REP_MAX;

  const toggle = () => {
    if (!set.done && (set.weight === '' || !(reps > 0))) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    if (!set.done) setPop((p) => p + 1);
    onToggle(!set.done);
  };

  return (
    <div className={`set-row ${set.done ? 'done' : ''} ${shake ? 'shake' : ''}`}>
      <span className="set-n">{n}</span>
      <label className="field">
        <input
          inputMode="decimal"
          value={set.weight}
          placeholder="–"
          disabled={set.done}
          onChange={(e) => onChange({ weight: e.target.value.replace(/[^\d.]/g, '') })}
        />
        <span>lb</span>
      </label>
      <span className="times">×</span>
      <label className="field">
        <input
          inputMode="numeric"
          value={set.reps}
          placeholder="–"
          disabled={set.done}
          onChange={(e) => onChange({ reps: e.target.value.replace(/[^\d]/g, '') })}
        />
        <span>reps</span>
      </label>
      <button className={`check ${set.done ? 'on' : ''}`} onClick={toggle} aria-label={set.done ? 'Undo set' : 'Complete set'}>
        <Icon name="check" size={20} stroke={3} />
        {pop > 0 && (
          <span key={pop} className="float-xp">
            +{XP.set}
          </span>
        )}
      </button>
      {top ? (
        <span className="top-tag" title="Top of range: weight goes up next time">⬆</span>
      ) : canRemove && !set.done ? (
        <button className="icon-btn" onClick={onRemove} aria-label="Remove set">
          <Icon name="x" size={16} />
        </button>
      ) : (
        <span className="icon-btn-spacer" />
      )}
    </div>
  );
}

export default function WorkoutView({ state, setState, onFinish }) {
  const w = state.activeWorkout;
  const now = useNow(1000);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const doneCount = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const tally = doneCount ? XP.workout + doneCount * XP.set : 0;

  const finish = () => {
    const result = finishWorkout(state);
    if (result) onFinish(result);
  };

  return (
    <div className="workout">
      <header className="workout-head">
        <div>
          <div className="eyebrow">In progress</div>
          <h1>{DAY_LABEL[w.type]} Day</h1>
        </div>
        <div className="workout-timers">
          <div className="timer">{fmtDuration(now - w.startedAt)}</div>
          {w.lastSetAt && <div className="muted small">rest {fmtDuration(now - w.lastSetAt)}</div>}
        </div>
      </header>

      <div className="tally">
        <span>{doneCount} sets</span>
        <span className="tally-xp">+{tally} XP</span>
      </div>

      {w.exercises.map((e, ei) => {
        const ex = state.exercises[e.exerciseId];
        if (!ex) return null;
        const doneHere = e.sets.filter((s) => s.done).length;
        return (
          <section key={e.exerciseId} className={`card exercise ${doneHere && doneHere === e.sets.length ? 'complete' : ''}`}>
            <div className="ex-head">
              <h3>{ex.name}</h3>
              <SuggestionChip sug={e.suggestion} />
              {e.suggestion.last && (
                <div className="muted small">
                  Last best: {e.suggestion.last.weight} lb × {e.suggestion.last.reps}
                </div>
              )}
            </div>
            {e.sets.map((set, si) => (
              <SetRow
                key={si}
                n={si + 1}
                set={set}
                canRemove={e.sets.length > 1}
                onChange={(patch) => setState((s) => updateSet(s, ei, si, patch))}
                onToggle={(done) => {
                  if (done && state.settings.sound) sfx.ding();
                  setState((s) => updateSet(s, ei, si, { done }));
                }}
                onRemove={() => setState((s) => removeSet(s, ei, si))}
              />
            ))}
            <button className="link add-set" onClick={() => setState((s) => addSet(s, ei))}>
              <Icon name="plus" size={14} /> Add set
            </button>
          </section>
        );
      })}

      <div className="workout-foot">
        <button className="btn primary block big" disabled={!doneCount} onClick={finish}>
          {doneCount ? 'Finish workout' : 'Complete a set to finish'}
        </button>
        {confirmDiscard ? (
          <div className="row gap center">
            <span className="muted small">Discard this workout?</span>
            <button className="link danger" onClick={() => setState(discardWorkout)}>Yes, discard</button>
            <button className="link" onClick={() => setConfirmDiscard(false)}>Keep going</button>
          </div>
        ) : (
          <button className="link muted center-block" onClick={() => setConfirmDiscard(true)}>
            Discard workout
          </button>
        )}
      </div>
    </div>
  );
}
