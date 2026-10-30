(() => {
  'use strict';
  if (!document.body.classList.contains('operational-native-body')) return;

  const wrappers = new Map();
  const wrapperSelector = '.operational-native-table-scroll, .external-pharmacy-native-table-scroll, .outpatient-table-wrap, .external-prescription-table-wrap, .operational-request-detail-table-wrap, .operational-oncology-mixture-table-wrap, [data-operational-table-scroll]';
  const bar = document.createElement('div');
  bar.className = 'operational-fixed-table-scroll';
  bar.hidden = true;
  bar.tabIndex = 0;
  bar.setAttribute('role', 'scrollbar');
  bar.setAttribute('aria-orientation', 'horizontal');
  bar.setAttribute('aria-valuemin', '0');
  const track = document.createElement('div');
  track.className = 'operational-fixed-table-track';
  bar.append(track);
  document.body.append(bar);

  let active = null;
  let preferred = null;
  let frame = 0;
  let needsScan = true;
  let serial = 0;
  let expectedScroll = 0;
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const resizeObserver = new ResizeObserver(schedule);
  const intersect = (a, b) => ({left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom)});
  const clientRect = element => {
    const rect = element.getBoundingClientRect();
    const scale = element.offsetWidth ? rect.width / element.offsetWidth : 1;
    const left = rect.left + element.clientLeft * scale;
    const top = rect.top + element.clientTop * scale;
    return {left, top, right: left + element.clientWidth * scale, bottom: top + element.clientHeight * scale};
  };

  // The iframe can extend below the Unit viewport. Keep its bar inside the
  // portion the user can actually see, including clipping by scrolling panels.
  const visibleViewport = win => {
    let bounds = {left: 0, top: 0, right: win.innerWidth, bottom: win.innerHeight};
    try {
      const owner = win.frameElement;
      if (!owner) return bounds;
      const rect = clientRect(owner);
      let visible = intersect(rect, visibleViewport(win.parent));
      for (let ancestor = owner.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = win.parent.getComputedStyle(ancestor);
        const clip = clientRect(ancestor);
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { visible.left = Math.max(visible.left, clip.left); visible.right = Math.min(visible.right, clip.right); }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { visible.top = Math.max(visible.top, clip.top); visible.bottom = Math.min(visible.bottom, clip.bottom); }
      }
      const scale = owner.getBoundingClientRect().width / owner.offsetWidth || 1;
      bounds = intersect(bounds, {left: (visible.left - rect.left) / scale, top: (visible.top - rect.top) / scale, right: (visible.right - rect.left) / scale, bottom: (visible.bottom - rect.top) / scale});
    } catch (_) { /* A cross-origin parent cannot expose its viewport. */ }
    return bounds;
  };

  const scan = () => {
    document.querySelectorAll('table').forEach(table => {
      let wrapper = table.closest(wrapperSelector);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.dataset.operationalTableScroll = '';
        table.before(wrapper);
        wrapper.append(table);
      }
      if (!wrappers.has(wrapper)) {
        if (!wrapper.id) wrapper.id = `operational-scroll-table-${++serial}`;
        const prefer = () => { preferred = wrapper; schedule(); };
        wrapper.addEventListener('pointerenter', prefer);
        wrapper.addEventListener('focusin', prefer);
        wrapper.addEventListener('scroll', schedule, {passive: true});
        wrappers.set(wrapper, table);
        resizeObserver.observe(wrapper);
        resizeObserver.observe(table);
      }
    });
    wrappers.forEach((table, wrapper) => {
      if (!wrapper.isConnected || !table.isConnected) {
        resizeObserver.unobserve(wrapper);
        resizeObserver.unobserve(table);
        wrappers.delete(wrapper);
      }
    });
  };

  function update() {
    frame = 0;
    if (needsScan) { needsScan = false; scan(); }
    const viewport = visibleViewport(window);
    const dialogs = [...document.querySelectorAll('dialog[open], [role="dialog"]')].filter(dialog => dialog.getClientRects().length && getComputedStyle(dialog).visibility !== 'hidden');
    const modal = dialogs.at(-1);
    const candidates = [];
    wrappers.forEach((table, wrapper) => {
      if (wrapper.scrollWidth <= wrapper.clientWidth + 1 || !wrapper.getClientRects().length || (modal && !modal.contains(wrapper))) return;
      const container = wrapper.closest('dialog, [role="dialog"]') || wrapper.closest('.operational-native-workspace') || document.documentElement;
      const bounds = intersect(viewport, clientRect(container));
      const rect = clientRect(wrapper);
      const visible = intersect(rect, bounds);
      const width = visible.right - visible.left;
      const height = visible.bottom - visible.top;
      if (width > 30 && height > 1) candidates.push({wrapper, table, container, bounds, left: visible.left, width, score: width * height});
    });
    const selected = candidates.find(item => item.wrapper === preferred) || candidates.sort((a, b) => b.score - a.score)[0];
    if (!selected) { bar.hidden = true; active = null; return; }
    const {wrapper, table, bounds, left, width} = selected;
    const host = wrapper.closest('dialog, [role="dialog"]') || document.body;
    if (bar.parentElement !== host) host.append(bar);
    active = wrapper;
    bar.hidden = false;
    // Coordinates are viewport pixels; CSS zoom varies across workspaces.
    const scale = bar.getBoundingClientRect().width / bar.offsetWidth || 1;
    bar.style.left = `${left / scale}px`;
    bar.style.width = `${width / scale}px`;
    const height = bar.getBoundingClientRect().height;
    bar.style.top = `${(bounds.bottom - height) / scale}px`;
    const max = wrapper.scrollWidth - wrapper.clientWidth;
    track.style.width = `${bar.clientWidth + max}px`;
    expectedScroll = wrapper.scrollLeft;
    bar.scrollLeft = expectedScroll;
    bar.setAttribute('aria-controls', wrapper.id);
    bar.setAttribute('aria-valuemax', String(Math.round(max)));
    bar.setAttribute('aria-valuenow', String(Math.round(wrapper.scrollLeft)));
    const label = table.getAttribute('aria-label') || table.closest('section, article')?.querySelector('h2, h3')?.textContent.trim() || 'Tabla';
    bar.setAttribute('aria-label', `Desplazamiento horizontal: ${label}`);
    bar.title = `Desplazar lateralmente: ${label}`;
  }

  bar.addEventListener('scroll', () => {
    if (!active || Math.abs(bar.scrollLeft - expectedScroll) < 1) return;
    active.scrollLeft = bar.scrollLeft;
    expectedScroll = active.scrollLeft;
    schedule();
  }, {passive: true});
  bar.addEventListener('keydown', event => {
    if (!active) return;
    const max = active.scrollWidth - active.clientWidth;
    const steps = {ArrowLeft: -50, ArrowRight: 50, PageUp: -active.clientWidth, PageDown: active.clientWidth};
    if (event.key in steps) active.scrollLeft += steps[event.key];
    else if (event.key === 'Home') active.scrollLeft = 0;
    else if (event.key === 'End') active.scrollLeft = max;
    else return;
    event.preventDefault();
    schedule();
  });
  new MutationObserver(records => {
    if (records.every(record => bar.contains(record.target))) return;
    needsScan ||= records.some(record => record.type === 'childList' && !bar.contains(record.target));
    schedule();
  }).observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'style', 'open']});

  const windows = [];
  let owner = window;
  while (owner) {
    try {
      owner.document.addEventListener('scroll', schedule, {capture: true, passive: true});
      owner.addEventListener('resize', schedule);
      windows.push(owner);
      if (owner === owner.parent) break;
      if (owner.frameElement) resizeObserver.observe(owner.frameElement);
      owner = owner.parent;
    } catch (_) { break; }
  }
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    windows.forEach(win => { win.document.removeEventListener('scroll', schedule, true); win.removeEventListener('resize', schedule); });
    resizeObserver.disconnect();
  });
  window.addEventListener('pageshow', schedule);
  document.fonts?.ready.then(schedule);
  schedule();
})();
