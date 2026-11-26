import { useEffect, useState } from 'react';
import { todayKey } from './logic/dates';

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Today's date key, refreshed every minute so the app rolls over at midnight. */
export function useToday() {
  const [k, setK] = useState(todayKey);
  useEffect(() => {
    const t = setInterval(() => setK(todayKey()), 60000);
    return () => clearInterval(t);
  }, []);
  return k;
}
