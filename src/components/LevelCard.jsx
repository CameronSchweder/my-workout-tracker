import { levelInfo } from '../logic/xp';

export function XpBar({ into, need, className = '' }) {
  return (
    <div className={`xpbar ${className}`}>
      <div className="xpbar-fill" style={{ width: `${Math.min(100, (into / need) * 100)}%` }} />
    </div>
  );
}

export default function LevelCard({ xp, weekStreak, stepStreak }) {
  const lv = levelInfo(xp);
  return (
    <section className="card level-card">
      <div className="level-row">
        <div className="level-badge">
          <small>LVL</small>
          <strong>{lv.level}</strong>
        </div>
        <div className="level-meta">
          <div className="level-title">{lv.title}</div>
          <XpBar into={lv.into} need={lv.need} />
          <div className="muted small">
            {lv.into.toLocaleString()} / {lv.need.toLocaleString()} XP to level {lv.level + 1}
          </div>
        </div>
      </div>
      <div className="chips">
        <span className={`chip ${weekStreak ? 'chip-hot' : ''}`}>🔥 {weekStreak} week streak</span>
        <span className={`chip ${stepStreak ? 'chip-hot' : ''}`}>👟 {stepStreak} day step streak</span>
      </div>
    </section>
  );
}
