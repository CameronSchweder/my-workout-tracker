import { useState } from 'react';
import { prettyDate } from '../logic/dates';
import { DAY_LABEL } from '../logic/defaults';
import { exerciseHistory, suggest } from '../logic/progression';
import { lifetime } from '../logic/stats';
import { deleteCardio, deleteWorkout } from '../logic/store';
import { Icon } from './Icons';

function Sparkline({ values }) {
  if (values.length < 2) return <div className="spark-empty" />;
  const W = 90;
  const H = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - 3 - ((v - min) / span) * (H - 6)}`);
  return (
    <svg className="spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts.join(' ')} />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="2.5" />
    </svg>
  );
}

function ExerciseRow({ ex, workouts }) {
  const [open, setOpen] = useState(false);
  const hist = exerciseHistory(ex.id, workouts);
  const sug = suggest(ex, workouts);
  const last = hist[hist.length - 1];
  return (
    <li className={`ex-row ${open ? 'open' : ''}`}>
      <button className="ex-row-main" onClick={() => setOpen(!open)} disabled={!hist.length}>
        <div className="grow">
          <div className="ex-name">{ex.name}</div>
          <div className="muted small">
            {last ? (
              <>
                Best last time {last.best.weight} × {last.best.reps}
                {' · '}
                <span className={sug.mode === 'overload' ? 'accent' : ''}>
                  next {sug.weight} lb{sug.mode === 'overload' ? ' ⬆' : ` for ${sug.targetReps}`}
                </span>
              </>
            ) : (
              'Not logged yet'
            )}
          </div>
        </div>
        <Sparkline values={hist.slice(-12).map((h) => h.best.weight)} />
      </button>
      {open && (
        <ul className="ex-hist">
          {hist
            .slice()
            .reverse()
            .slice(0, 10)
            .map((h) => (
              <li key={h.workoutId}>
                <span className="muted">{prettyDate(h.date)}</span>
                <span>{h.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')}</span>
              </li>
            ))}
        </ul>
      )}
    </li>
  );
}

export default function ProgressView({ state, setState }) {
  const L = lifetime(state);
  const [confirm, setConfirm] = useState(null);
  const tiles = [
    [L.workouts, 'workouts'],
    [L.volume >= 10000 ? `${Math.round(L.volume / 1000).toLocaleString()}k` : L.volume.toLocaleString(), 'lb moved'],
    [L.overloads, 'weight jumps'],
    [L.hardCardio, 'hard cardio'],
  ];
  const activity = [
    ...state.workouts.map((w) => ({ kind: 'lift', id: w.id, date: w.date, at: w.finishedAt, item: w })),
    ...state.cardio.map((c) => ({ kind: 'cardio', id: c.id, date: c.date, at: c.loggedAt, item: c })),
  ]
    .sort((a, b) => (a.date === b.date ? b.at - a.at : a.date < b.date ? 1 : -1))
    .slice(0, 30);

  const inTemplates = new Set([...state.templates.upper, ...state.templates.lower]);
  const others = Object.values(state.exercises).filter(
    (e) => !inTemplates.has(e.id) && exerciseHistory(e.id, state.workouts).length,
  );

  return (
    <>
      <header className="page-head">
        <h1>Progress</h1>
      </header>
      <section className="tiles">
        {tiles.map(([v, l]) => (
          <div key={l} className="tile">
            <strong>{v}</strong>
            <span>{l}</span>
          </div>
        ))}
      </section>

      {['upper', 'lower'].map((t) => (
        <section key={t} className="card">
          <div className="eyebrow">{DAY_LABEL[t]} lifts</div>
          <ul className="ex-list">
            {state.templates[t]
              .map((id) => state.exercises[id])
              .filter(Boolean)
              .map((ex) => (
                <ExerciseRow key={ex.id} ex={ex} workouts={state.workouts} />
              ))}
          </ul>
        </section>
      ))}
      {others.length > 0 && (
        <section className="card">
          <div className="eyebrow">Retired lifts</div>
          <ul className="ex-list">
            {others.map((ex) => (
              <ExerciseRow key={ex.id} ex={ex} workouts={state.workouts} />
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="eyebrow">Recent activity</div>
        {!activity.length && <p className="muted small">Nothing yet. Your first workout will show up here.</p>}
        <ul className="activity">
          {activity.map((a) => (
            <li key={a.id}>
              <span className="act-icon">{a.kind === 'lift' ? '🏋️' : a.item.intensity === 'hard' ? '❤️‍🔥' : '🫁'}</span>
              <div className="grow">
                <div>
                  {a.kind === 'lift'
                    ? `${DAY_LABEL[a.item.type]} day · ${a.item.summary.sets} sets`
                    : `${a.item.kind} · ${a.item.minutes} min · ${a.item.intensity}`}
                </div>
                <div className="muted small">
                  {prettyDate(a.date)} · +{a.item.xp} XP
                </div>
              </div>
              {confirm === a.id ? (
                <button
                  className="link danger small"
                  onClick={() => {
                    setState((s) => (a.kind === 'lift' ? deleteWorkout(s, a.id) : deleteCardio(s, a.id)));
                    setConfirm(null);
                  }}
                >
                  Delete?
                </button>
              ) : (
                <button className="icon-btn" onClick={() => setConfirm(a.id)} aria-label="Delete">
                  <Icon name="trash" size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
