import { ACHIEVEMENTS } from '../logic/achievements';
import { prettyDate } from '../logic/dates';

export default function BadgesView({ state }) {
  const got = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
  return (
    <>
      <header className="page-head">
        <h1>Badges</h1>
        <div className="muted small">
          {got} / {ACHIEVEMENTS.length} unlocked
        </div>
      </header>
      <section className="badges">
        {ACHIEVEMENTS.map((a) => {
          const when = state.achievements[a.id];
          return (
            <div key={a.id} className={`badge ${when ? 'on' : ''}`}>
              <div className="badge-icon">{a.icon}</div>
              <strong>{a.name}</strong>
              <small>{a.desc}</small>
              {when && <small className="accent">{prettyDate(when)}</small>}
            </div>
          );
        })}
      </section>
    </>
  );
}
