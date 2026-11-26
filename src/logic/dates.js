// All dates are local-time "YYYY-MM-DD" keys.
const pad = (n) => String(n).padStart(2, '0');

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => toKey(new Date());
export const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k, n) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
export const weekday = (k) => fromKey(k).getDay();

/** First day of the week containing `k`, where weeks begin on `startDay` (0 = Sun). */
export const weekStart = (k, startDay = 1) => addDays(k, -((weekday(k) - startDay + 7) % 7));
export const weekDays = (k, startDay = 1) => {
  const s = weekStart(k, startDay);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const prettyDate = (k) =>
  fromKey(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export const fmtDuration = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};
