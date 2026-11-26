import { useState } from 'react';
import { addDays } from '../logic/dates';
import { CARDIO_KINDS } from '../logic/defaults';
import { logCardio } from '../logic/store';
import { XP } from '../logic/xp';

const INTENSITIES = [
  ['easy', 'Easy', 'Could chat the whole time'],
  ['moderate', 'Moderate', 'Breathing hard, short sentences'],
  ['hard', 'Hard', "Couldn't hold a conversation"],
];

export default function CardioSheet({ state, today, onClose, onSave }) {
  const [kind, setKind] = useState('Run');
  const [minutes, setMinutes] = useState('20');
  const [intensity, setIntensity] = useState('hard');
  const [day, setDay] = useState(today);
  const mins = parseInt(minutes, 10);

  const save = () => {
    if (!(mins > 0)) return;
    onSave(logCardio(state, { kind, minutes: mins, intensity, date: day }));
  };

  return (
    <div className="overlay sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h2>Log cardio</h2>

        <div className="label">Type</div>
        <div className="pills">
          {CARDIO_KINDS.map((k) => (
            <button key={k} className={`pill ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
              {k}
            </button>
          ))}
        </div>

        <div className="label">Intensity</div>
        <div className="intensity">
          {INTENSITIES.map(([id, label, hint]) => (
            <button key={id} className={`int ${id} ${intensity === id ? 'on' : ''}`} onClick={() => setIntensity(id)}>
              <strong>{label}</strong>
              <small>{hint}</small>
              <span className="int-xp">+{XP.cardio[id]} XP</span>
            </button>
          ))}
        </div>

        <div className="row gap">
          <div className="grow">
            <div className="label">Minutes</div>
            <input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
          <div>
            <div className="label">When</div>
            <div className="seg tall">
              <button className={day === today ? 'on' : ''} onClick={() => setDay(today)}>Today</button>
              <button className={day !== today ? 'on' : ''} onClick={() => setDay(addDays(today, -1))}>Yesterday</button>
            </div>
          </div>
        </div>

        <button className="btn primary block big" disabled={!(mins > 0)} onClick={save}>
          Save cardio
        </button>
      </div>
    </div>
  );
}
