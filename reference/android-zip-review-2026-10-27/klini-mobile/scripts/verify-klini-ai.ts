import { chromium, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { AppState } from '../src/domain/types';
import { initialWallet } from '../src/domain/wallet';

const storageKey = '@klini/app-state:v1';
const origin = 'http://127.0.0.1:8096';
const now = new Date('2026-10-30T12:00:00-06:00');

function readState(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
}

async function home(page: Page) {
  await page.waitForURL(url => url.pathname === '/');
  await expect(page.getByTestId('home-search')).toBeVisible();
}

async function wallet(page: Page) {
  await page.getByTestId('header-menu').click();
  await page.getByTestId('nav-wallet').click();
  await expect(page.getByTestId('wallet-ai-card')).toBeVisible();
}

async function ask(page: Page, question: string, enter = false) {
  await page.getByTestId('home-search').fill(question);
  await expect(page.getByTestId('ai-ask-question')).toContainText(question);
  if (enter) await page.getByTestId('home-search').press('Enter');
  else await page.getByTestId('home-ai-submit').click();
  await expect(page.getByTestId('klini-ai-conversation')).toBeVisible();
  await expect(page.getByTestId('ai-message-assistant')).toHaveCount(1);
  await expect(page.getByTestId('ai-mode')).toContainText('Demostración');
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const conversation = await page.getByTestId('klini-ai-conversation').boundingBox();
  const viewport = page.viewportSize()!;
  expect(conversation).not.toBeNull();
  expect(conversation!.x).toBeGreaterThanOrEqual(0);
  expect(conversation!.y).toBeGreaterThanOrEqual(0);
  expect(conversation!.x + conversation!.width).toBeLessThanOrEqual(viewport.width);
  expect(conversation!.y + conversation!.height).toBeLessThanOrEqual(viewport.height);
  await expect(page.getByTestId('ai-message-input')).toBeInViewport();
  await expect(page.getByTestId('ai-send')).toBeInViewport();
  await expect(page.getByTestId('ai-close')).toBeInViewport();
}

async function main() {
  await mkdir('test-results', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.KLINI_CHROMIUM_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Mexico_City' });
  await page.clock.install({ time: now });
  const errors: string[] = [], posts: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // This test exercises only the local demo; it must never send a model request.
  await page.route('**/*', route => {
    if (route.request().method() === 'POST') { posts.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  try {
    await page.goto(origin);
    await home(page);
    const baseline = await readState(page);
    const walletBaseline = baseline.wallet ?? { ...initialWallet, movements: [] };
    expect(baseline.profile.id).toBe('patient-sofia');
    expect(baseline.aiSubscription?.status).toBe('active');
    expect(baseline.aiSubscription?.mode).toBe('demo');
    await expect(page.getByTestId('home-ai-submit')).toBeVisible();
    await expect(page.getByTestId('home-search')).toHaveAttribute('placeholder', 'Pregunta a Klini…');
    await wallet(page);
    await expect(page.getByTestId('wallet-ai-status')).toContainText('Activa');
    await page.getByTestId('wallet-ai-open').click();
    await expect(page.getByTestId('ai-subscription-price')).toContainText('$99 MXN');
    await page.screenshot({ path: 'test-results/klini-ai-sofia-active-default.png' });
    await page.getByTestId('ai-subscription-cancel').click();
    await page.getByTestId('ai-subscription-confirm-cancel').click();
    await expect(page.getByTestId('ai-subscription-cancelled')).toBeVisible();
    await page.getByTestId('ai-subscription-return').click();
    await page.getByTestId('wallet-close').click();
    await home(page);
    await page.reload();
    await home(page);
    expect((await readState(page)).aiSubscription?.status).toBe('cancelled');
    await expect(page.getByTestId('home-ai-submit')).toHaveCount(0);
    await expect(page.getByTestId('home-search')).toHaveAttribute('placeholder', 'Buscar en Klini');
    await page.getByTestId('home-search').fill('rios');
    await expect(page.getByTestId('nav-doctor-elena')).toBeVisible();
    await expect(page.getByTestId('ai-ask-question')).toHaveCount(0);
    await page.getByTestId('ai-discover').click();
    await expect(page.getByTestId('wallet-ai-status')).toContainText('Sin activar');
    await page.getByTestId('wallet-ai-open').click();
    await expect(page.getByTestId('ai-subscription-price')).toContainText('$99 MXN');
    await page.screenshot({ path: 'test-results/klini-ai-overview-390.png' });
    await page.getByTestId('ai-subscription-continue').click();
    await expect(page.getByTestId('ai-subscription-profile')).toContainText('Sofía Martínez');
    await expect(page.getByTestId('ai-subscription-total')).toContainText('$99 MXN');
    await expect(page.getByTestId('ai-subscription-consent')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('ai-subscription-activate')).toBeDisabled();
    await page.getByTestId('ai-subscription-pay-apple-pay').click();
    await expect(page.getByTestId('ai-subscription-pay-apple-pay')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('ai-subscription-consent').click();
    await expect(page.getByTestId('ai-subscription-activate')).toBeEnabled();
    await page.getByTestId('ai-subscription-pay-card').click();
    await expect(page.getByTestId('ai-subscription-consent')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('ai-subscription-activate')).toBeDisabled();
    await page.getByTestId('ai-subscription-consent').click();

    await page.evaluate(key => {
      const original = Storage.prototype.setItem;
      let failNext = true;
      Storage.prototype.setItem = function (name, value) {
        if (this === localStorage && name === key && failNext) {
          failNext = false;
          throw new DOMException('Synthetic local AI activation failure', 'QuotaExceededError');
        }
        original.call(this, name, value);
      };
      (window as typeof window & { restoreAiStorage?: () => void }).restoreAiStorage = () => { Storage.prototype.setItem = original; };
    }, storageKey);
    await page.getByTestId('ai-subscription-activate').click();
    await expect(page.getByTestId('ai-subscription-error')).toBeVisible();
    await expect(page.getByTestId('ai-subscription-success')).toHaveCount(0);
    await expect(page.getByTestId('ai-subscription-activate')).toBeEnabled();
    expect((await readState(page)).aiSubscription?.status).toBe('cancelled');
    await page.evaluate(() => (window as typeof window & { restoreAiStorage?: () => void }).restoreAiStorage?.());
    await page.getByTestId('ai-subscription-activate').click();
    await expect(page.getByTestId('ai-subscription-success')).toBeVisible();
    await expect.poll(async () => (await readState(page)).aiSubscription?.status).toBe('active');
    expect((await readState(page)).wallet ?? { ...initialWallet, movements: [] }).toEqual(walletBaseline);
    await page.getByTestId('ai-subscription-ask').click();
    await home(page);
    await expect(page.getByTestId('home-ai-submit')).toBeVisible();
    await expect(page.getByTestId('home-search')).toHaveAttribute('placeholder', 'Pregunta a Klini…');

    const activeState = await readState(page);
    const next = activeState.appointments.filter(appointment => appointment.status === 'scheduled' && new Date(`${appointment.date}T${appointment.time}:00-06:00`) >= now).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
    const doctor = activeState.doctors.find(item => item.id === next.doctorId)!;
    await ask(page, '¿Cuándo es mi próxima cita?', true);
    await expect(page.getByTestId('ai-message-assistant')).toContainText(next.time);
    await expect(page.getByTestId('ai-message-assistant')).toContainText(doctor.name);
    await noOverflow(page);
    await page.screenshot({ path: 'test-results/klini-ai-conversation-390.png' });
    await page.getByTestId('ai-message-action').click();
    await page.waitForURL(url => url.pathname === '/agenda' && url.searchParams.get('appointmentId') === next.id);
    await expect(page.getByTestId(`agenda-open-${next.id}`)).toBeVisible();
    await page.getByTestId('agenda-close').click();
    await home(page);

    await page.evaluate(key => {
      const state = JSON.parse(localStorage.getItem(key)!) as AppState;
      state.records.push({ id: 'record-ai-e2e', type: 'Nota', title: 'Registro ficticio para Klini IA', date: '2026-10-30', doctorName: 'Personal de ejemplo', description: 'Control de demostración: lectura del expediente actual.' });
      localStorage.setItem(key, JSON.stringify(state));
    }, storageKey);
    await page.reload();
    await home(page);
    await expect(page.getByTestId('home-ai-submit')).toBeVisible();
    await ask(page, 'Resume mi expediente');
    await expect(page.getByTestId('ai-message-assistant')).toContainText('Registro ficticio para Klini IA');
    await expect(page.getByTestId('ai-message-assistant')).toContainText('lectura del expediente actual');
    const current = await readState(page);
    for (const question of ['¿Qué medicamentos tengo registrados?', 'Muéstrame mis registros', '¿Cuándo es mi próxima cita?']) {
      const count = await page.getByTestId('ai-message-assistant').count();
      await page.getByTestId('ai-message-input').fill(question);
      await page.getByTestId('ai-send').click();
      await expect(page.getByTestId('ai-message-assistant')).toHaveCount(count + 1);
      if (question.includes('medicamentos')) {
        await expect(page.getByTestId('ai-message-assistant').last()).toContainText(current.medications.find(item => item.active)!.name);
      }
    }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 640 });
      await noOverflow(page);
      const input = await page.getByTestId('ai-message-input').boundingBox();
      const close = await page.getByTestId('ai-close').boundingBox();
      const scroll = page.getByTestId('ai-messages');
      const dimensions = await scroll.evaluate(element => ({ content: element.scrollHeight, viewport: element.clientHeight }));
      expect(dimensions.content).toBeGreaterThan(dimensions.viewport);
      await scroll.evaluate(element => { element.scrollTop = 0; });
      expect(await page.getByTestId('ai-message-input').boundingBox()).toEqual(input);
      expect(await page.getByTestId('ai-close').boundingBox()).toEqual(close);
      await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
      expect(await page.getByTestId('ai-message-input').boundingBox()).toEqual(input);
      await page.screenshot({ path: `test-results/klini-ai-chat-scroll-${width}.png` });
    }
    await page.getByTestId('ai-close').click();
    await expect(page.getByTestId('klini-ai-conversation')).toHaveCount(0);
    await expect(page.getByTestId('home-search')).toHaveValue('');
    await ask(page, 'Consulta mi próxima cita');
    await expect(page.getByTestId('ai-message-user')).toHaveCount(1);
    await page.getByTestId('ai-close').click();
    await page.setViewportSize({ width: 390, height: 844 });

    await page.getByTestId('header-profile').click();
    await page.getByTestId('profile-select-demo-mateo').click();
    await expect.poll(async () => (await readState(page)).profile.id).toBe('demo-mateo');
    await page.getByTestId('profile-close').click();
    await home(page);
    await expect(page.getByTestId('home-ai-submit')).toHaveCount(0);
    expect((await readState(page)).aiSubscription).toBeUndefined();
    await page.getByTestId('home-search').fill('agenda');
    await expect(page.getByTestId('ai-ask-question')).toHaveCount(0);
    await expect(page.getByTestId('ai-discover')).toBeVisible();
    await page.getByTestId('dismiss-header-panel').click();
    await page.getByTestId('header-profile').click();
    await page.getByTestId('profile-select-owner').click();
    await expect.poll(async () => (await readState(page)).profile.id).toBe(baseline.profile.id);
    await page.getByTestId('profile-close').click();
    await home(page);
    await expect(page.getByTestId('home-ai-submit')).toBeVisible();
    await page.reload();
    await home(page);
    await expect(page.getByTestId('home-ai-submit')).toBeVisible();

    await wallet(page);
    await expect(page.getByTestId('wallet-ai-status')).toContainText('Activa');
    await page.getByTestId('wallet-ai-open').click();
    await page.getByTestId('ai-subscription-cancel').click();
    await page.getByTestId('ai-subscription-keep').click();
    expect((await readState(page)).aiSubscription?.status).toBe('active');
    await page.getByTestId('ai-subscription-cancel').click();
    await page.getByTestId('ai-subscription-confirm-cancel').click();
    await expect(page.getByTestId('ai-subscription-cancelled')).toBeVisible();
    await expect.poll(async () => (await readState(page)).aiSubscription?.status).toBe('cancelled');
    await page.getByTestId('ai-subscription-return').click();
    await page.getByTestId('wallet-close').click();
    await home(page);
    await expect(page.getByTestId('home-ai-submit')).toHaveCount(0);
    await expect(page.getByTestId('home-search')).toHaveAttribute('placeholder', 'Buscar en Klini');
    await page.reload();
    await home(page);
    await page.getByTestId('home-search').fill('¿Cuándo es mi próxima cita?');
    await page.getByTestId('home-search').press('Enter');
    await expect(page.getByTestId('klini-ai-conversation')).toHaveCount(0);
    expect((await readState(page)).wallet).toEqual(walletBaseline);
    expect(errors).toEqual([]);
    expect(posts).toEqual([]);
    console.log('PASS Klini IA: gated search, local demo subscription/consent/payment selection, failed persistence retry, contextual conversation and deep link, fixed composer 390/320px, family isolation, reload and cancellation without model requests or charges');
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
