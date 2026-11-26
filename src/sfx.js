let ctx;
const ac = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

function tone(freq, start, dur, { type = 'sine', gain = 0.12 } = {}) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

export const sfx = {
  ding() {
    try {
      tone(880, 0, 0.15);
      tone(1320, 0.06, 0.2, { gain: 0.08 });
    } catch {}
  },
  fanfare() {
    try {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, { type: 'triangle', gain: 0.1 }));
    } catch {}
  },
  levelUp() {
    try {
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.5, { type: 'square', gain: 0.05 }));
    } catch {}
  },
};
