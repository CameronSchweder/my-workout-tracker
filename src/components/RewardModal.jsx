import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { fmtDuration } from '../logic/dates';
import { volumeComparison } from '../logic/stats';
import { levelInfo } from '../logic/xp';
import { sfx } from '../sfx';
import { XpBar } from './LevelCard';

const ease = (t) => 1 - Math.pow(1 - t, 3);

export default function RewardModal({ reward, sound, onClose }) {
  const gained = reward.xpAfter - reward.xpBefore;
  const [shown, setShown] = useState(reward.xpBefore);
  const startLevel = levelInfo(reward.xpBefore).level;
  const lv = levelInfo(shown);
  const leveled = lv.level > startLevel;
  const playedLevel = useRef(false);

  useEffect(() => {
    const big = reward.kind === 'workout' || reward.unlocked.length > 0;
    confetti({
      particleCount: big ? 140 : 70,
      spread: 80,
      origin: { y: 0.35 },
      colors: ['#a3e635', '#fbbf24', '#f4f4f5', '#60a5fa'],
      disableForReducedMotion: true,
    });
    const delay = 500;
    const dur = 1400;
    let raf;
    const t0 = performance.now() + delay;
    const tick = (t) => {
      const p = Math.max(0, Math.min(1, (t - t0) / dur));
      setShown(Math.round(reward.xpBefore + gained * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reward, gained]);

  useEffect(() => {
    if (leveled && !playedLevel.current) {
      playedLevel.current = true;
      if (sound) sfx.levelUp();
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: ['#fbbf24', '#a3e635'], disableForReducedMotion: true });
    }
  }, [leveled, sound]);

  const comparison = reward.stats?.volume ? volumeComparison(reward.stats.volume) : null;

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="reward">
        <div className="eyebrow accent">Quest complete</div>
        <h2>{reward.title}</h2>
        <div className="reward-xp">+{(shown - reward.xpBefore).toLocaleString()} XP</div>

        <div className={`reward-level ${leveled ? 'leveled' : ''}`}>
          <div className="row between small">
            <span>
              Level <strong>{lv.level}</strong> · {lv.title}
            </span>
            <span className="muted">
              {lv.into} / {lv.need}
            </span>
          </div>
          <XpBar into={lv.into} need={lv.need} className="thick" />
          {leveled && <div className="level-up">LEVEL UP</div>}
        </div>

        {reward.stats && (
          <div className="reward-stats">
            {reward.stats.duration > 0 && (
              <div>
                <strong>{fmtDuration(reward.stats.duration)}</strong>
                <span>time</span>
              </div>
            )}
            {reward.stats.sets != null && (
              <div>
                <strong>{reward.stats.sets}</strong>
                <span>sets</span>
              </div>
            )}
            {reward.stats.volume != null && (
              <div>
                <strong>{reward.stats.volume.toLocaleString()}</strong>
                <span>lb moved</span>
              </div>
            )}
          </div>
        )}
        {comparison && <div className="muted small center">That's {comparison}</div>}

        <ul className="reward-lines">
          {reward.lines.map((l, i) => (
            <li key={i} className={l.tone || ''} style={{ animationDelay: `${0.4 + i * 0.12}s` }}>
              <span className="rl-icon">{l.icon}</span>
              <span className="rl-text">{l.text}</span>
              <span className="rl-xp">+{l.xp}</span>
            </li>
          ))}
          {reward.unlocked.map((a, i) => (
            <li key={a.id} className="badge-line" style={{ animationDelay: `${0.4 + (reward.lines.length + i) * 0.12}s` }}>
              <span className="rl-icon">{a.icon}</span>
              <span className="rl-text">
                <strong>Badge unlocked: {a.name}</strong>
                <small>{a.desc}</small>
              </span>
              <span className="rl-xp">+100</span>
            </li>
          ))}
        </ul>

        <button className="btn primary block big" onClick={onClose}>
          Collect
        </button>
      </div>
    </div>
  );
}
