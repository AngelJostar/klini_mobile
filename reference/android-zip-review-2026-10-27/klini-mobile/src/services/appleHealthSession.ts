import type { HealthReading } from '../domain/appleHealth';

/** One foreground session. Results from stopped sessions never reach the UI. */
export function createHealthSession(deps: {
  read: () => Promise<HealthReading[]>;
  observe: (changed: () => void) => Promise<() => void>;
  publish: (readings: HealthReading[], error?: boolean) => void;
  interval?: (callback: () => void) => () => void;
}) {
  let stopped = false;
  let running = false;
  let queued = false;
  let unsubscribe: (() => void) | undefined;
  async function refresh() {
    if (stopped) return;
    if (running) { queued = true; return; }
    running = true;
    try {
      const readings = await deps.read();
      if (!stopped) deps.publish(readings);
    } catch { if (!stopped) deps.publish([], true); }
    finally {
      running = false;
      if (queued && !stopped) { queued = false; void refresh(); }
    }
  }
  void deps.observe(() => void refresh()).then(remove => {
    if (stopped) remove(); else unsubscribe = remove;
  }).catch(() => { /* Polling still refreshes if observation is unavailable. */ });
  const cancelTimer = (deps.interval ?? (callback => {
    const timer = setInterval(callback, 60_000);
    return () => clearInterval(timer);
  }))(() => void refresh());
  void refresh();
  return () => { stopped = true; cancelTimer(); unsubscribe?.(); };
}
