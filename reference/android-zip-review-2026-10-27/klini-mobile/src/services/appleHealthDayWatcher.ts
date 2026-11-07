import { localDayKey } from './appleHealthSteps';

/** Foreground-only. Local calendar arithmetic handles DST; periodic checks detect timezone changes. */
export function watchHealthDay(changed: () => void, clock = () => new Date(), timers = {
  once: (callback: () => void, ms: number) => { const timer = setTimeout(callback, ms); return () => clearTimeout(timer); },
  repeat: (callback: () => void, ms: number) => { const timer = setInterval(callback, ms); return () => clearInterval(timer); },
}) {
  let key = localDayKey(clock());
  const check = () => { const next = localDayKey(clock()); if (key !== next) { key = next; changed(); } };
  const now = clock(), midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
  const cancelTimeout = timers.once(check, Math.max(1, midnight.getTime() - now.getTime()));
  const cancelInterval = timers.repeat(check, 15_000);
  return () => { cancelTimeout(); cancelInterval(); };
}
