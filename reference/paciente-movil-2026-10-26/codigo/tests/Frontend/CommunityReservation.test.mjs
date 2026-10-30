import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../public/js/community-activities.js', import.meta.url), 'utf8');

function reservationFlow({ cancelFails = false, refreshFails = false, deferRefresh = false, reserved = true, cost = 0 } = {}) {
  const listeners = {}, requests = [];
  const yes = { addEventListener: (_, handler) => { yes.submit = handler; } };
  const done = { focus: () => { done.focused = true; } };
  const status = { textContent: '' };
  const classes = new Set();
  const dialog = {
    innerHTML: '', open: false, classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: name => classes.delete(name) },
    setAttribute: () => {}, addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: selector => selector === '[data-reservation-yes]' ? yes : selector === '[data-reservation-status]' ? status : done,
    showModal() { this.open = true; }, close() { this.open = false; },
  };
  const document = {
    readyState: 'loading', body: { dataset: {}, append: () => {} },
    querySelector: () => null, createElement: () => dialog,
    addEventListener: (name, handler) => { listeners[name] = handler; },
  };
  const window = { addEventListener: () => {}, dispatchEvent: () => {} };
  const item = { id: 7, title: 'Yoga', starts_at: '2030-10-24T09:00', timezone: 'America/Mexico_City', reserved, reservations: 2, cost };
  const fetch = async (url, options) => {
    requests.push([url, options.method]);
    if (options.method === 'GET' && deferRefresh) return new Promise(() => {});
    const fails = options.method === 'DELETE' ? cancelFails : refreshFails;
    return { ok: !fails, status: fails ? 500 : 200, json: async () => fails ? { message: 'No se pudo cancelar.' } : { activities: [{ ...item, reserved: false, reservations: 1 }] } };
  };
  vm.runInNewContext(source, { window, document, fetch, FormData, Event, Intl, Date, setTimeout, clearTimeout });
  window.KliniCommunityActivities.items = [item];
  listeners.click({ target: { closest: () => ({ dataset: { activityReserve: '7' } }) } });
  return { dialog, done, status, classes, requests, submit: async () => { yes.submit(); await new Promise(setImmediate); } };
}

test('successful cancellation keeps a confirmation popup open until dismissed', async () => {
  const flow = reservationFlow();
  await flow.submit();
  assert.equal(flow.dialog.open, true);
  assert.ok(flow.classes.has('is-cancelled'));
  assert.match(flow.dialog.innerHTML, /Reserva cancelada/);
  assert.match(flow.dialog.innerHTML, /Tu lugar ha sido liberado/);
  assert.match(flow.dialog.innerHTML, /Entendido/);
  assert.equal(flow.done.focused, true);
  assert.deepEqual(flow.requests[0], ['/communities/activities/7/reservation', 'DELETE']);
});

test('a failed cancellation preserves the confirmation controls and shows the error', async () => {
  const flow = reservationFlow({ cancelFails: true });
  await flow.submit();
  assert.equal(flow.dialog.open, true);
  assert.equal(flow.classes.has('is-cancelled'), false);
  assert.match(flow.status.textContent, /No se pudo cancelar/);
  assert.match(flow.dialog.innerHTML, /Sí, cancelar/);
  assert.equal(flow.requests.length, 1);
});

test('feed refresh failure does not hide a cancellation already saved by the server', async () => {
  const flow = reservationFlow({ refreshFails: true });
  await flow.submit();
  assert.equal(flow.dialog.open, true);
  assert.ok(flow.classes.has('is-cancelled'));
  assert.match(flow.dialog.innerHTML, /Reserva cancelada/);
});

test('a successful free reservation shows the confirmation popup instead of a transient notice', async () => {
  const flow = reservationFlow({ reserved: false });
  await flow.submit();
  assert.equal(flow.dialog.open, true);
  assert.ok(flow.classes.has('is-confirmed'));
  assert.match(flow.dialog.innerHTML, /Reserva confirmada/);
  assert.match(flow.dialog.innerHTML, /Tu lugar está reservado/);
  assert.match(flow.dialog.innerHTML, /Evento gratuito/);
  assert.doesNotMatch(flow.dialog.innerHTML, /Pago de demostración/);
  assert.deepEqual(flow.requests[0], ['/communities/activities/7/reservation', 'POST']);
});

test('free confirmation does not wait for a slow feed refresh or show payment fields', async () => {
  for (const cost of [0, '0.00', '', null, undefined]) {
    const flow = reservationFlow({ reserved: false, deferRefresh: true, cost });
    await flow.submit();
    assert.equal(flow.dialog.open, true);
    assert.ok(flow.classes.has('is-confirmed'));
    assert.match(flow.dialog.innerHTML, /Evento gratuito\. Tu lugar está reservado\./);
    assert.doesNotMatch(flow.dialog.innerHTML, /data-demo-payment|Número de tarjeta|Pago de demostración/);
    assert.equal(flow.done.focused, true);
  }
});
