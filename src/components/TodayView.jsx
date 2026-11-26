import { useState } from 'react';
import { addDays, DAY_NAMES, DAY_SHORT, fromKey, weekday } from '../logic/dates';
import { DAY_LABEL } from '../logic/defaults';
import { planFor, stepStreak, totalXp, weekStatus, weekStreak } from '../logic/stats';
import { setSteps, startWorkout } from '../logic/store';
import { XP } from '../logic/xp';
import LevelCard from './LevelCard';

function QuestCard({ state, setState, today, onCardio }) {
  const plan = planFor(today, state.settings.weekStartDay);
  const doneToday = state.workouts.filter((w) => w.date === today);
  const cardioToday = state.cardio.filter((c) => c.date === today);
  const start = (type) => setState((s) => startWorkout(s, type, today));

  if (plan === 'rest') {
    return (
      <section className="card quest rest">
        <div className="eyebrow">Today · {DAY_NAMES[weekday(today)]}</div>
        <h2>Rest Day</h2>
        <p className="muted">Recover, walk, hit your steps. Great day for hard cardio if you still need it this week.</p>
        {doneToday.length > 0 && <p className="done-note">✓ Extra lift done today (+{doneToday[0].xp} XP)</p>}
        {cardioToday.length > 0 && <p className="done-note">✓ Cardio done today</p>}
        <div className="row gap">
          <button className="btn" onClick={onCardio}>Log cardio</button>
          <button className="btn ghost" onClick={() => start('upper')}>Train upper</button>
          <button className="btn ghost" onClick={() => start('lower')}>Train lower</button>
        </div>
      </section>
    );
  }

  const template = state.templates[plan].map((id) => state.exercises[id]).filter(Boolean);
  const cleared = doneToday.find((w) => w.type === plan);

  return (
    <section className={`card quest ${cleared ? 'cleared' : 'active'}`}>
      <div className="eyebrow">Today's quest · {DAY_NAMES[weekday(today)]}</div>
      <h2>{DAY_LABEL[plan]} Body</h2>
      {cleared ? (
        <>
          <p className="done-note big">✓ Cleared · +{cleared.xp} XP</p>
          <p className="muted small">
            {cleared.summary.sets} sets · {cleared.summary.volume.toLocaleString()} lb moved
            {cleared.summary.overloads.length > 0 && ` · ${cleared.summary.overloads.length} weight jumps earned`}
          </p>
          <div className="row gap">
            <button className="btn" onClick={onCardio}>Log cardio</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted small">{template.map((e) => e.name).join(' · ')}</p>
          <button className="btn primary block" onClick={() => start(plan)}>
            Start {DAY_LABEL[plan].toLowerCase()} workout
          </button>
          <div className="row gap center">
            <button className="link" onClick={() => start(plan === 'upper' ? 'lower' : 'upper')}>
              Do {plan === 'upper' ? 'lower' : 'upper'} instead
            </button>
            <span className="muted">·</span>
            <button className="link" onClick={onCardio}>Log cardio</button>
          </div>
        </>
      )}
    </section>
  );
}

function StepsCard({ state, today, apply }) {
  const [day, setDay] = useState(today);
  const goal = state.settings.stepGoal;
  const current = state.steps[day] || 0;
  const [value, setValue] = useState('');
  const pct = Math.min(1, current / goal);
  const R = 34;
  const C = 2 * Math.PI * R;

  const save = (e) => {
    e.preventDefault();
    const n = parseInt(String(value).replace(/[^\d]/g, ''), 10);
    if (Number.isNaN(n)) return;
    apply(setSteps(state, day, n));
    setValue('');
  };

  return (
    <section className="card steps">
      <div className="steps-ring">
        <svg viewBox="0 0 80 80" width="88" height="88">
          <circle cx="40" cy="40" r={R} className="ring-bg" />
          <circle
            cx="40"
            cy="40"
            r={R}
            className={`ring-fg ${pct >= 1 ? 'full' : ''}`}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            transform="rotate(-90 40 40)"
          />
        </svg>
        <div className="ring-label">{pct >= 1 ? '✓' : `${Math.round(pct * 100)}%`}</div>
      </div>
      <div className="steps-body">
        <div className="row between">
          <div className="eyebrow">Steps</div>
          <div className="seg">
            <button className={day === today ? 'on' : ''} onClick={() => setDay(today)}>Today</button>
            <button className={day !== today ? 'on' : ''} onClick={() => setDay(addDays(today, -1))}>Yesterday</button>
          </div>
        </div>
        <div className="steps-count">
          {current.toLocaleString()} <span className="muted">/ {goal.toLocaleString()}</span>
        </div>
        <form className="row gap" onSubmit={save}>
          <input
            className="input"
            inputMode="numeric"
            placeholder="Enter steps"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="btn" type="submit">Save</button>
        </form>
      </div>
    </section>
  );
}

function WeekCard({ state, today }) {
  const ws = weekStatus(state, today);
  const start = state.settings.weekStartDay;
  // Don't flag days as missed before you started using the app.
  const firstDay = [...state.workouts.map((w) => w.date), ...state.cardio.map((c) => c.date)].sort()[0] || today;
  const quests = [
    { label: 'Lift 4 times', have: ws.lifts.length, need: 4 },
    { label: 'Hard cardio session', have: ws.hard.length, need: 1 },
    { label: `${(state.settings.stepGoal / 1000).toLocaleString()}k steps every day`, have: ws.stepDays.length, need: 7 },
  ];
  return (
    <section className="card">
      <div className="row between">
        <div className="eyebrow">This week</div>
        <div className={`small ${ws.cleared ? 'gold' : 'muted'}`}>
          {ws.perfect ? '💎 Perfect week' : ws.cleared ? '🏁 Week cleared' : `Clear it for +${XP.weekCleared} XP`}
        </div>
      </div>
      <div className="week-strip">
        {ws.days.map((d) => {
          const plan = planFor(d, start);
          const lifted = state.workouts.some((w) => w.date === d);
          const cardio = state.cardio.some((c) => c.date === d);
          const hard = state.cardio.some((c) => c.date === d && c.intensity === 'hard');
          const steps = (state.steps[d] || 0) >= state.settings.stepGoal;
          const past = d < today;
          const missed = past && d >= firstDay && plan !== 'rest' && !lifted;
          return (
            <div key={d} className={`day ${d === today ? 'today' : ''} ${lifted ? 'lifted' : ''} ${missed ? 'missed' : ''}`}>
              <div className="day-name">{DAY_SHORT[fromKey(d).getDay()]}</div>
              <div className="day-plan">{plan === 'rest' ? '–' : plan === 'upper' ? 'U' : 'L'}</div>
              <div className="day-dots">
                <i className={cardio ? (hard ? 'on hard' : 'on') : ''} title="Cardio" />
                <i className={steps ? 'on steps' : ''} title="Steps" />
              </div>
            </div>
          );
        })}
      </div>
      <ul className="quests">
        {quests.map((q) => (
          <li key={q.label} className={q.have >= q.need ? 'done' : ''}>
            <span className="q-check">{q.have >= q.need ? '✓' : ''}</span>
            <span className="q-label">{q.label}</span>
            <span className="q-count">
              {Math.min(q.have, q.need)}/{q.need}
            </span>
            <div className="q-bar">
              <div style={{ width: `${Math.min(100, (q.have / q.need) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function TodayView({ state, setState, apply, today, onCardio }) {
  return (
    <>
      <header className="page-head">
        <h1>Rep Quest</h1>
        <div className="muted small">{fromKey(today).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</div>
      </header>
      <LevelCard xp={totalXp(state)} weekStreak={weekStreak(state, today)} stepStreak={stepStreak(state, today)} />
      <QuestCard state={state} setState={setState} today={today} onCardio={onCardio} />
      <StepsCard key={today} state={state} today={today} apply={apply} />
      <WeekCard state={state} today={today} />
    </>
  );
}
