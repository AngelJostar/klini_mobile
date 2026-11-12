import { HISTORY_MAX_SAMPLES, type HealthHistoryPage } from './appleHealthHistoryReader';

export interface HistoryView extends HealthHistoryPage { page: number; busy: boolean; error: boolean; limited: boolean }
/** Bounded page cache. Pausing invalidates in-flight queries without persisting their results. */
export function createHistorySession(read: (excluded: readonly string[], snapshot: Date) => Promise<HealthHistoryPage>, publish: (view: HistoryView) => void) {
  let pages: HealthHistoryPage[] = [], page = 0, version = 0, busy = false, active = true;
  let snapshot = new Date();
  let refreshQueued = false;
  const emit = (error = false) => publish({ ...(pages[page] ?? { readings: [], hasMore: false }), page, busy, error, limited: pages.flatMap(item => item.readings).length >= HISTORY_MAX_SAMPLES && page === pages.length - 1 });
  async function load(reset: boolean) {
    if (!active) return;
    if (busy) { if (reset) refreshQueued = true; return; }
    if (reset) { pages = []; page = 0; snapshot = new Date(); }
    const excluded = pages.flatMap(item => item.readings.map(reading => reading.uuid));
    if (excluded.length >= HISTORY_MAX_SAMPLES) { emit(); return; }
    busy = true; emit(); const current = version;
    try {
      const result = await read(excluded, snapshot);
      if (!active || current !== version) return;
      pages.push(result); page = pages.length - 1; busy = false; emit();
    } catch { if (active && current === version) { busy = false; emit(true); } }
    finally {
      if (active && current === version && refreshQueued) { refreshQueued = false; void load(true); }
    }
  }
  return {
    autoRefresh: () => { if (!busy && page === 0) void load(true); },
    refresh: () => { void load(true); },
    next: () => {
      if (!active || busy) return;
      if (page + 1 < pages.length) { page++; emit(); }
      else if (pages[page]?.hasMore) void load(false);
    },
    previous: () => { if (active && !busy && page > 0) { page--; emit(); } },
    stop: () => { active = false; version++; pages = []; busy = false; refreshQueued = false; },
  };
}
