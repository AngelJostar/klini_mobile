import { chromium, expect, type Browser, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY } from '../src/domain/reducer';
import { healthDegreeTypes, isProfessionalProfile, medicalSpecialties, type ManagedProfile, type ManagedProfessionalProfile } from '../src/domain/managedProfiles';
import type { AppState } from '../src/domain/types';

const origin = process.env.KLINI_QA_ORIGIN ?? 'http://127.0.0.1:8097';
const outputDirectory = 'test-results';
const seed = createDemoState();
const managedKey = `klini-managed-profiles-v1:${encodeURIComponent(seed.profile.id)}`;
const familyFixtures: ManagedProfile[] = [
  { id: 'demo-mateo', name: 'Mateo Salinas', kind: 'Niño' },
  { id: 'demo-valentina', name: 'Valentina Salinas', kind: 'Niña' },
  { id: 'demo-max', name: 'Max', kind: 'Mascota' },
  { id: 'demo-luna', name: 'Luna', kind: 'Mascota' },
  { id: 'demo-sofia-medical-oncology-v1', name: seed.profile.name, kind: 'Profesional de la salud', professionalType: 'doctor', specialty: 'Oncología Médica', licenseNumber: '111111', demo: 'sofia-medical-oncology-v1' },
];

type FailureControls = Window & { __accountFailWrites?: number };
type MediaControls = Window & { __professionalDenyMedia?: boolean; __professionalDelayMedia?: number; __professionalStreams?: MediaStream[]; __professionalMediaCalls?: number };
type Viewport = { width: number; height: number };

async function readProfiles(page: Page): Promise<ManagedProfile[]> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]'), managedKey);
}

async function readState(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY);
}

async function openAccount(page: Page) {
  await page.getByTestId('header-profile').click();
  await expect(page.getByTestId('profile-drawer')).toBeVisible();
  await expect.poll(() => page.getByTestId('profile-drawer').evaluate(element => {
    const transform = getComputedStyle(element).transform;
    return transform === 'none' ? 0 : Math.abs(new DOMMatrixReadOnly(transform).m41);
  })).toBeLessThan(0.5);
  await expect(page.getByTestId('profile-add-professional')).toBeEnabled();
}

async function closeAccount(page: Page) {
  await page.getByTestId('profile-close').click();
  await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
}

async function clickReachable(locator: Locator) {
  await expect(locator).toBeVisible();
  // Playwright scrolls and re-resolves the target during its actionability checks.
  await locator.click();
}

async function assertDrawerGeometry(page: Page, viewport: Viewport) {
  const panel = await page.getByTestId('profile-drawer').boundingBox();
  expect(panel).not.toBeNull();
  expect(panel!.x).toBeGreaterThanOrEqual(-1);
  expect(panel!.y).toBeGreaterThanOrEqual(-1);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(viewport.height + 1);
  const overflow = await page.getByTestId('profile-drawer').evaluate(element =>
    [element, ...element.querySelectorAll<HTMLElement>('*')].filter(child =>
      child.clientWidth > 0 && child.scrollWidth > child.clientWidth + 2 &&
      getComputedStyle(child).overflowX !== 'hidden',
    ).map(child => ({ testID: child.getAttribute('data-testid'), width: child.clientWidth, content: child.scrollWidth })),
  );
  expect(overflow).toEqual([]);
  return panel!;
}

async function assertFamilyChoices(page: Page) {
  const form = page.getByTestId('managed-profile-form');
  await expect(form.getByRole('radio')).toHaveCount(3);
  for (const kind of ['Niño', 'Niña', 'Mascota']) await expect(form.getByRole('radio', { name: kind, exact: true })).toBeVisible();
  await expect(form.getByRole('radio', { name: 'Adulto', exact: true })).toHaveCount(0);
}

async function selectProfessionalOption(page: Page, field: 'specialty' | 'degreeType', value: string) {
  const choices: readonly string[] = field === 'specialty' ? medicalSpecialties : healthDegreeTypes;
  const index = choices.indexOf(value);
  expect(index).toBeGreaterThanOrEqual(0);
  await clickReachable(page.getByTestId(`professional-profile-${field}`));
  await expect(page.getByTestId(`professional-profile-${field}-options`)).toBeVisible();
  await page.getByTestId('professional-picker-search').fill(value);
  await clickReachable(page.getByTestId(`professional-${field}-${index}`));
  await expect(page.getByTestId(`professional-profile-${field}`)).toContainText(value);
  await expect(page.getByTestId(`professional-profile-${field}-options`)).toHaveCount(0);
}

async function openProfessionalData(page: Page, testID: string) {
  await clickReachable(page.getByTestId(testID));
  if (await page.getByTestId('professional-review-step').count()) await clickReachable(page.getByTestId('professional-review-edit'));
  await expect(page.getByTestId('professional-profile-form')).toBeVisible();
}

async function assertPendingVerification(page: Page, profileId: string) {
  const profile = (await readProfiles(page)).find(item => item.id === profileId) as ManagedProfessionalProfile;
  expect(profile).toBeTruthy();
  expect(profile.verification).toMatchObject({ mode: 'local-demo', status: 'pending', consentVersion: 'professional-identity-v1' });
  expect(profile.verification!.challenge).toMatch(/^\d{4}$/);
  expect(profile.verification!.durationSeconds).toBeGreaterThanOrEqual(2);
  expect(profile.verification!.durationSeconds).toBeLessThanOrEqual(20);
  expect(profile.verification!.video.uri).toMatch(/^data:video\/[^;]+;base64,/);
}

async function recordProfessionalVideo(page: Page) {
  await clickReachable(page.getByTestId('professional-identity-record'));
  await clickReachable(page.getByTestId('professional-recorder-permission'));
  await expect(page.getByTestId('professional-recorder-start')).toBeEnabled();
  await expect.poll(() => page.locator('video').first().evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  await clickReachable(page.getByTestId('professional-recorder-start'));
  await expect(page.getByTestId('professional-recorder-stop')).toBeDisabled();
  const frame = page.getByTestId('professional-recorder-face-frame');
  await frame.scrollIntoViewIfNeeded();
  await expect(frame).toBeInViewport({ ratio: 1 });
  const preview = (await page.getByTestId('professional-recorder-preview').boundingBox())!;
  expect(preview.x).toBeGreaterThanOrEqual(0);
  expect(preview.y).toBeGreaterThanOrEqual(0);
  expect(preview.x + preview.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(preview.y + preview.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: `${outputDirectory}/professional-recorder-recording-${page.viewportSize()!.width}.png` });
  await page.waitForTimeout(2300);
  await expect(page.getByTestId('professional-recorder-stop')).toBeEnabled();
  await clickReachable(page.getByTestId('professional-recorder-stop'));
  await expect(page.getByTestId('professional-recorder-use')).toBeEnabled();
  await clickReachable(page.getByTestId('professional-recorder-use'));
  await expect(page.getByTestId('professional-recorder-use')).toHaveCount(0);
  await expect(page.getByTestId('professional-identity-step')).toBeVisible();
  await expect(page.getByTestId('professional-identity-save')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => ((window as MediaControls).__professionalStreams || []).every(stream => stream.getTracks().every(track => track.readyState === 'ended')))).toBe(true);
}

async function exerciseRecorderFailures(page: Page) {
  await expect(page.getByTestId('professional-identity-save')).toHaveCount(0);
  await expect(page.getByTestId('professional-identity-record')).toBeDisabled();
  await clickReachable(page.getByTestId('professional-identity-consent'));
  await page.evaluate(() => { (window as MediaControls).__professionalDenyMedia = true; });
  await clickReachable(page.getByTestId('professional-identity-record'));
  await clickReachable(page.getByTestId('professional-recorder-permission'));
  await expect(page.getByTestId('professional-recorder-error')).toBeVisible();
  await expect(page.getByTestId('professional-recorder-use')).toHaveCount(0);
  await page.evaluate(() => { (window as MediaControls).__professionalDenyMedia = false; });
  await clickReachable(page.getByTestId('professional-recorder-close'));
  await expect(page.getByTestId('professional-identity-save')).toHaveCount(0);

  // A late permission result must release its synthetic tracks after cancellation.
  await page.evaluate(() => { (window as MediaControls).__professionalDelayMedia = 500; });
  await clickReachable(page.getByTestId('professional-identity-record'));
  await clickReachable(page.getByTestId('professional-recorder-permission'));
  await clickReachable(page.getByTestId('professional-recorder-close'));
  await page.waitForTimeout(600);
  await expect.poll(() => page.evaluate(() => ((window as MediaControls).__professionalStreams || []).every(stream => stream.getTracks().every(track => track.readyState === 'ended')))).toBe(true);
  await page.evaluate(() => { (window as MediaControls).__professionalDelayMedia = 0; });
  await expect(page.getByTestId('professional-identity-save')).toHaveCount(0);

  await clickReachable(page.getByTestId('professional-identity-record'));
  await clickReachable(page.getByTestId('professional-recorder-permission'));
  await expect(page.getByTestId('professional-recorder-start')).toBeEnabled();
  await clickReachable(page.getByTestId('professional-recorder-start'));
  await page.waitForTimeout(2300);
  await page.evaluate(() => {
    for (const stream of (window as MediaControls).__professionalStreams || []) {
      for (const track of stream.getTracks()) {
        if (track.readyState === 'live') { track.stop(); track.dispatchEvent(new Event('ended')); }
      }
    }
  });
  await expect(page.getByTestId('professional-recorder-error')).toBeVisible();
  await expect(page.getByTestId('professional-recorder-use')).toHaveCount(0);
  await clickReachable(page.getByTestId('professional-recorder-close'));
  await expect(page.getByTestId('professional-identity-save')).toHaveCount(0);
  expect(await readProfiles(page)).toEqual(familyFixtures);
  await recordProfessionalVideo(page);
}

async function prepareProfessionalIdentity(page: Page) {
  await expect(page.getByTestId('professional-identity-step')).toBeVisible();
  await expect(page.getByTestId('professional-identity-phrase')).toContainText(/Soy .+ y mi código es \d{4}/);
  await expect(page.getByTestId('professional-identity-save')).toHaveCount(0);
  await expect(page.getByTestId('professional-identity-record')).toBeDisabled();
  await clickReachable(page.getByTestId('professional-identity-consent'));
  await recordProfessionalVideo(page);
}

async function returnFromProfessionalReview(page: Page) {
  await expect(page.getByTestId('professional-review-step')).toBeVisible();
  await expect(page.getByTestId('professional-review-license')).toContainText(/pendiente/i);
  await expect(page.getByTestId('professional-review-video')).toContainText(/recibido/i);
  await expect(page.getByTestId('professional-review-step')).toContainText(/demostración|local/i);
  await clickReachable(page.getByTestId('professional-review-return'));
  await expect(page.getByTestId('profile-add-professional')).toBeVisible();
}

async function saveProfessional(page: Page) {
  const expectedName = await page.getByTestId('professional-profile-name').inputValue();
  await clickReachable(page.getByTestId('professional-profile-save'));
  if (await page.getByTestId('professional-identity-step').count()) {
    await expect(page.getByTestId('professional-identity-phrase')).toContainText(`Soy ${expectedName} y mi código es `);
    await prepareProfessionalIdentity(page);
    await clickReachable(page.getByTestId('professional-identity-save'));
  }
  await returnFromProfessionalReview(page);
}

async function createContext(browser: Browser, viewport: Viewport, profiles = familyFixtures) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', permissions: ['camera', 'microphone'], timezoneId: 'America/Mexico_City' });
  const forbiddenRequests: string[] = [];
  const errors: string[] = [];
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin || request.method() !== 'GET') {
      forbiddenRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort();
    } else await route.continue();
  });
  await context.addInitScript(({ initialState, storedProfiles, appKey, profileKey }) => {
    if (!sessionStorage.getItem('klini-account-flow-fixture')) {
      localStorage.setItem(appKey, JSON.stringify(initialState));
      localStorage.setItem(profileKey, JSON.stringify(storedProfiles));
      sessionStorage.setItem('klini-account-flow-fixture', '1');
    }
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      const controls = window as FailureControls;
      if (this === localStorage && key === profileKey && (controls.__accountFailWrites ?? 0) > 0) {
        controls.__accountFailWrites!--;
        throw new DOMException('No se pudo guardar el perfil de prueba.', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
    const media = navigator.mediaDevices;
    if (media?.getUserMedia) {
      const getUserMedia = media.getUserMedia.bind(media);
      media.getUserMedia = async constraints => {
        const controls = window as MediaControls;
        controls.__professionalMediaCalls = (controls.__professionalMediaCalls || 0) + 1;
        if (controls.__professionalDenyMedia) throw new DOMException('Synthetic permission denied.', 'NotAllowedError');
        const stream = await getUserMedia(constraints);
        (controls.__professionalStreams ??= []).push(stream);
        if (controls.__professionalDelayMedia) await new Promise(resolve => setTimeout(resolve, controls.__professionalDelayMedia));
        return stream;
      };
    }
  }, { initialState: seed, storedProfiles: profiles, appKey: STORAGE_KEY, profileKey: managedKey });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await expect(page.getByTestId('header-profile')).toContainText('SM');
  return { context, page, forbiddenRequests, errors };
}

async function verifyViewport(browser: Browser, viewport: Viewport) {
  const { context, page, forbiddenRequests, errors } = await createContext(browser, viewport);
  const captures: string[] = [];
  const capture = async (name: string) => {
    const path = `${outputDirectory}/account-profiles-${name}-${viewport.width}.png`;
    await page.screenshot({ path });
    captures.push(path);
  };
  try {
    await openAccount(page);
    const initialState = await readState(page);
    expect(initialState.profile.id).toBe(seed.profile.id);
    const panel = await assertDrawerGeometry(page, viewport);

    await clickReachable(page.getByTestId('profile-add-professional'));
    const professionalForm = page.getByTestId('professional-profile-form');
    await expect(professionalForm).toContainText('Agregar profesional');
    await expect(page.getByTestId('professional-type-doctor')).toHaveAttribute('aria-selected', 'true');
    await expect(professionalForm).toContainText('Cédula profesional');
    await expect(professionalForm).toContainText('Especialidad');
    await expect(page.getByTestId('professional-profile-name')).toHaveValue(seed.profile.name);
    await expect(page.getByTestId('professional-profile-name')).not.toBeEditable();
    await clickReachable(page.getByTestId('professional-profile-save'));
    await expect(page.getByTestId('account-profile-error')).toContainText(/cédula/i);
    await page.getByTestId('professional-profile-license').fill('00000001');
    await clickReachable(page.getByTestId('professional-profile-save'));
    await expect(page.getByTestId('account-profile-error')).toContainText(/especialidad/i);
    await selectProfessionalOption(page, 'specialty', 'Cardiología');

    // Each branch keeps its own selection while the name comes from the general account.
    await page.getByTestId('professional-type-licensed').click();
    await expect(page.getByTestId('professional-profile-name')).toHaveValue(seed.profile.name);
    await expect(professionalForm).toContainText('Cédula profesional de la licenciatura');
    await expect(professionalForm).toContainText('Tipo de licenciatura');
    await expect(page.getByTestId('professional-profile-specialty')).toHaveCount(0);
    await expect(page.getByTestId('professional-profile-degreeType')).not.toContainText('Cardiología');
    await expect(page.getByTestId('professional-profile-license')).toHaveValue('');
    await page.getByTestId('professional-profile-license').fill('00000002');
    await selectProfessionalOption(page, 'degreeType', 'Fisioterapia');
    await page.getByTestId('professional-type-doctor').click();
    await expect(page.getByTestId('professional-profile-specialty')).toContainText('Cardiología');
    await expect(page.getByTestId('professional-profile-degreeType')).toHaveCount(0);
    await expect(page.getByTestId('professional-profile-license')).toHaveValue('00000001');
    await page.getByTestId('professional-type-licensed').click();
    await expect(page.getByTestId('professional-profile-license')).toHaveValue('00000002');
    await expect(page.getByTestId('professional-profile-degreeType')).toContainText('Fisioterapia');
    await page.getByTestId('professional-type-doctor').click();
    await assertDrawerGeometry(page, viewport);
    await page.getByTestId('professional-profile-name').scrollIntoViewIfNeeded();
    await capture('doctor-form');

    await clickReachable(page.getByTestId('professional-profile-save'));
    await expect(page.getByTestId('professional-identity-step')).toBeVisible();
    await expect(page.getByTestId('professional-identity-phrase')).toContainText(/Soy Sofía Martínez y mi código es \d{4}/);
    expect(await page.evaluate(() => (window as MediaControls).__professionalMediaCalls || 0)).toBe(0);
    await capture('identity-before-consent');
    await exerciseRecorderFailures(page);
    // An accepted clip remains a draft until Guardar perfil, even when closing Tu cuenta.
    await closeAccount(page);
    expect(await readProfiles(page)).toEqual(familyFixtures);
    expect(await readState(page)).toEqual(initialState);
    await openAccount(page);
    await clickReachable(page.getByTestId('profile-add-professional'));
    await expect(page.getByTestId('professional-profile-name')).toHaveValue(seed.profile.name);
    await expect(page.getByTestId('professional-profile-name')).not.toBeEditable();
    await page.getByTestId('professional-profile-license').fill('00000001');
    await selectProfessionalOption(page, 'specialty', 'Cardiología');
    await clickReachable(page.getByTestId('professional-profile-save'));
    await prepareProfessionalIdentity(page);
    await page.evaluate(() => { (window as FailureControls).__accountFailWrites = 1; });
    await clickReachable(page.getByTestId('professional-identity-save'));
    await expect(page.getByTestId('professional-identity-step')).toBeVisible();
    await expect(page.getByTestId('professional-identity-error')).toContainText('No se pudo guardar');
    expect(await readProfiles(page)).toEqual(familyFixtures);
    expect(await readState(page)).toEqual(initialState);
    await clickReachable(page.getByTestId('professional-identity-save'));
    await expect(page.getByTestId('professional-review-step')).toBeVisible();
    await capture('pending-review');
    await returnFromProfessionalReview(page);
    await expect(professionalForm).toHaveCount(0);
    const stored = await readProfiles(page);
    const doctor = stored.find(profile => isProfessionalProfile(profile) && profile.professionalType === 'doctor' && profile.licenseNumber === '00000001') as ManagedProfessionalProfile;
    expect(doctor).toMatchObject({ name: seed.profile.name, kind: 'Profesional de la salud', professionalType: 'doctor', licenseNumber: '00000001', specialty: 'Cardiología' });
    expect(doctor).not.toHaveProperty('degreeType');
    expect(doctor).not.toHaveProperty('profession');
    expect(stored).toHaveLength(familyFixtures.length + 1);
    await assertPendingVerification(page, doctor.id);
    const row = page.getByTestId(`profile-select-${doctor.id}`);
    await expect(row).toContainText('Cardiología');
    await expect(row).not.toHaveAttribute('aria-selected', 'true');
    expect(await page.getByTestId('profile-select-owner').evaluate(element => getComputedStyle(element.parentElement!).backgroundColor)).toBe('rgb(234, 247, 247)');
    expect(await readState(page)).toEqual(initialState);

    await clickReachable(page.getByTestId('profile-add-professional'));
    await page.getByTestId('professional-type-licensed').click();
    await expect(page.getByTestId('professional-type-licensed')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('professional-profile-name')).not.toBeEditable();
    await page.getByTestId('professional-profile-license').fill('00000002');
    await clickReachable(page.getByTestId('professional-profile-save'));
    await expect(page.getByTestId('account-profile-error')).toContainText(/licenciatura/i);
    await selectProfessionalOption(page, 'degreeType', 'Fisioterapia');
    await assertDrawerGeometry(page, viewport);
    await page.getByTestId('professional-profile-name').scrollIntoViewIfNeeded();
    await capture('licensed-form');
    await saveProfessional(page);
    await expect(professionalForm).toHaveCount(0);
    const withBothProfessionals = await readProfiles(page);
    const professional = withBothProfessionals.find(profile => isProfessionalProfile(profile) && profile.professionalType === 'licensed' && profile.licenseNumber === '00000002') as ManagedProfessionalProfile;
    expect(professional).toMatchObject({ name: seed.profile.name, kind: 'Profesional de la salud', professionalType: 'licensed', licenseNumber: '00000002', degreeType: 'Fisioterapia' });
    expect(professional).not.toHaveProperty('specialty');
    expect(professional).not.toHaveProperty('profession');
    expect(withBothProfessionals).toHaveLength(familyFixtures.length + 2);
    await assertPendingVerification(page, professional.id);
    await expect(page.getByTestId(`profile-select-${professional.id}`)).toContainText('Fisioterapia');
    await page.getByTestId('profile-select-owner').scrollIntoViewIfNeeded();
    await capture('list');

    const callsBeforeUnchangedEdit = await page.evaluate(() => (window as MediaControls).__professionalMediaCalls || 0);
    await openProfessionalData(page, `managed-profile-${professional.id}`);
    await saveProfessional(page);
    expect((await readProfiles(page)).find(profile => profile.id === professional.id)).toEqual(professional);
    expect(await page.evaluate(() => (window as MediaControls).__professionalMediaCalls || 0)).toBe(callsBeforeUnchangedEdit);

    await openProfessionalData(page, `managed-profile-${professional.id}`);
    await expect(page.getByTestId('professional-profile-name')).toHaveValue(seed.profile.name);
    await expect(page.getByTestId('professional-type-licensed')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('professional-profile-license')).toHaveValue('00000002');
    await expect(page.getByTestId('professional-profile-name')).not.toBeEditable();
    await selectProfessionalOption(page, 'degreeType', 'Psicología');
    await saveProfessional(page);
    await expect(professionalForm).toHaveCount(0);
    expect(await readProfiles(page)).toHaveLength(withBothProfessionals.length);
    expect((await readProfiles(page)).find(profile => profile.id === professional.id)).toMatchObject({ name: seed.profile.name, licenseNumber: '00000002', degreeType: 'Psicología' });
    expect(((await readProfiles(page)).find(profile => profile.id === professional.id) as ManagedProfessionalProfile).verification).not.toEqual(professional.verification);
    // The pencil edits the professional without changing the active scope.
    await openProfessionalData(page, `managed-profile-${professional.id}`);
    await expect(page.getByTestId('professional-profile-name')).not.toBeEditable();
    await selectProfessionalOption(page, 'degreeType', 'Fisioterapia');
    await saveProfessional(page);
    await expect(professionalForm).toHaveCount(0);
    expect(await readState(page)).toEqual(initialState);

    await openProfessionalData(page, `managed-profile-${doctor.id}`);
    await expect(page.getByTestId('professional-type-doctor')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('professional-profile-license')).toHaveValue('00000001');
    await expect(page.getByTestId('professional-profile-specialty')).toContainText('Cardiología');
    await expect(page.getByTestId('professional-profile-name')).not.toBeEditable();
    await saveProfessional(page);
    await expect(professionalForm).toHaveCount(0);
    expect(await readProfiles(page)).toHaveLength(withBothProfessionals.length);
    expect((await readProfiles(page)).find(profile => profile.id === doctor.id)).toMatchObject({ name: seed.profile.name, licenseNumber: '00000001', specialty: 'Cardiología' });

    await clickReachable(page.getByTestId('profile-add'));
    await expect(page.getByTestId('managed-profile-form')).toContainText('Agregar perfil familiar');
    await assertFamilyChoices(page);
    await page.getByTestId('managed-profile-name').fill('Leo Prueba');
    for (const kind of ['Mascota', 'Niña', 'Niño']) {
      await page.getByTestId(`managed-profile-kind-${kind}`).click();
      expect(await page.getByTestId(`managed-profile-kind-${kind}`).evaluate(element => getComputedStyle(element.firstElementChild!).backgroundColor)).toBe('rgb(221, 243, 241)');
    }
    await assertDrawerGeometry(page, viewport);
    await page.getByTestId('managed-profile-name').scrollIntoViewIfNeeded();
    await capture('family-form');
    await page.getByTestId('managed-profile-name').fill('');
    await clickReachable(page.getByTestId('managed-profile-save'));
    await expect(page.getByTestId('account-profile-error')).toContainText('nombre válido');
    await page.getByTestId('managed-profile-name').fill('Leo Prueba');
    await clickReachable(page.getByTestId('managed-profile-save'));
    await expect(page.getByTestId('managed-profile-form')).toHaveCount(0);
    const afterAdd = await readProfiles(page);
    const child = afterAdd.find(profile => profile.name === 'Leo Prueba')!;
    expect(child.kind).toBe('Niño');
    expect(afterAdd).toHaveLength(familyFixtures.length + 3);
    expect(await readState(page)).toEqual(initialState);

    await closeAccount(page);
    await page.reload();
    await expect(page.getByTestId('header-profile')).toContainText('SM');
    await openAccount(page);
    expect(await readProfiles(page)).toEqual(afterAdd);
    await expect(page.getByTestId(`profile-select-${professional.id}`)).toContainText(seed.profile.name);
    await expect(page.getByTestId(`profile-select-${doctor.id}`)).toContainText(seed.profile.name);
    await clickReachable(page.getByTestId(`profile-select-${child.id}`));
    await expect.poll(async () => (await readState(page)).profile.id).toBe(child.id);
    await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
    await expect(page.getByTestId('home-tab-today')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('header-profile')).toContainText('LP');
    const activeChild = await readState(page);
    for (const key of ['appointments', 'records', 'policies', 'claims', 'medications', 'messages', 'favorites'] as const) expect(activeChild[key]).toEqual([]);
    expect(activeChild.family?.profiles[seed.profile.id].records).toEqual(initialState.records);
    await page.reload();
    await expect(page.getByTestId('header-profile')).toContainText('LP');
    await openAccount(page);
    await openProfessionalData(page, `managed-profile-${professional.id}`);
    await expect(professionalForm).toBeVisible();
    expect((await readState(page)).profile.id).toBe(child.id);
    await page.getByTestId('profile-back').click();
    await clickReachable(page.getByTestId('profile-select-owner'));
    await expect.poll(async () => (await readState(page)).profile.id).toBe(seed.profile.id);
    await expect(page.getByTestId('profile-drawer')).toHaveCount(0);
    await expect(page.getByTestId('home-tab-today')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('header-profile')).toContainText('SM');
    const restoredOwner = await readState(page);
    for (const key of ['appointments', 'records', 'policies', 'claims', 'medications', 'messages', 'favorites'] as const) expect(restoredOwner[key]).toEqual(initialState[key]);
    expect(await readProfiles(page)).toEqual(afterAdd);

    // Existing personal-profile editing also omits Adulto from its choice controls.
    await openAccount(page);
    await clickReachable(page.getByTestId('managed-profile-demo-mateo'));
    await expect(page.getByTestId('profile-edit-popup')).toBeVisible();
    await expect(page.getByTestId('profile-edit-popup').getByText('Adulto', { exact: true })).toHaveCount(0);
    await page.getByTestId('profile-edit-close').click();
    await expect(page.getByTestId('profile-edit-popup')).toHaveCount(0);
    await clickReachable(page.getByTestId('profile-logout'));
    await expect(page.getByTestId('profile-cancel-logout')).toBeInViewport();
    await page.getByTestId('profile-cancel-logout').click();
    await closeAccount(page);
    expect(errors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
    return { viewport, panel, captures, doctorId: doctor.id, licensedId: professional.id, childId: child.id, savedProfileCount: afterAdd.length, bothProfessionalTypes: true, leadingZeroLicenses: true, branchDraftIsolation: true, requiredProfessionalFields: true, localDemoPendingReview: true, consentAndRealSyntheticRecordingRequired: true, deniedInterruptedAndCancelledRecordingsRejected: true, releasedCameraTracks: true, storageFailureRetried: true, identityAndClinicalIsolation: true, reloadPersistence: true, errors, forbiddenRequests };
  } catch (error) {
    await page.screenshot({ path: `${outputDirectory}/account-profiles-failure-${viewport.width}.png` }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function verifyLegacyAdult(browser: Browser) {
  const adult: ManagedProfile = { id: 'legacy-adult', name: 'Perfil previo', kind: 'Adulto', email: 'legacy@example.com' };
  const { context, page, errors, forbiddenRequests } = await createContext(browser, { width: 320, height: 640 }, [...familyFixtures, adult]);
  try {
    await openAccount(page);
    await clickReachable(page.getByTestId('managed-profile-legacy-adult'));
    await expect(page.getByTestId('profile-edit-popup')).toBeVisible();
    await expect(page.getByTestId('profile-edit-popup').getByText('Adulto', { exact: true })).toHaveCount(0);
    await page.getByTestId('profile-edit-name').fill('Perfil previo editado');
    await clickReachable(page.getByTestId('profile-edit-save'));
    await expect(page.getByTestId('profile-edit-popup')).toHaveCount(0);
    expect((await readProfiles(page)).find(profile => profile.id === adult.id)).toMatchObject({ ...adult, name: 'Perfil previo editado' });
    await closeAccount(page);
    await page.reload();
    await openAccount(page);
    await expect(page.getByTestId(`profile-select-${adult.id}`)).toContainText('Perfil previo editado');
    expect(errors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
    return { legacyAdultPreserved: true, editableWithoutShowingAdultChoice: true, errors, forbiddenRequests };
  } finally {
    await context.close();
  }
}

async function verifyLegacyProfessional(browser: Browser) {
  const legacy: ManagedProfile = { id: 'legacy-professional', name: 'Andrea Previa', kind: 'Profesional de la salud', profession: 'Fisioterapeuta' };
  const original = [...familyFixtures, legacy];
  const { context, page, errors, forbiddenRequests } = await createContext(browser, { width: 320, height: 640 }, original);
  try {
    await openAccount(page);
    await expect(page.getByTestId(`profile-select-${legacy.id}`)).toContainText('Fisioterapeuta');
    expect(await readProfiles(page)).toEqual(original);
    await openProfessionalData(page, `managed-profile-${legacy.id}`);
    await expect(page.getByTestId('professional-profile-name')).toHaveValue(seed.profile.name);
    await expect(page.getByTestId('professional-type-licensed')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('professional-profile-license')).toHaveValue('');
    await expect(page.getByTestId('professional-profile-degreeType')).toContainText('Fisioterapia');
    // Opening and returning from an older profile never migrates or removes it implicitly.
    await page.getByTestId('profile-back').click();
    expect(await readProfiles(page)).toEqual(original);
    await openProfessionalData(page, `managed-profile-${legacy.id}`);
    await clickReachable(page.getByTestId('professional-profile-save'));
    await expect(page.getByTestId('account-profile-error')).toContainText(/cédula/i);
    expect(await readProfiles(page)).toEqual(original);
    await page.getByTestId('professional-profile-license').fill('00000002');
    await saveProfessional(page);
    await expect(page.getByTestId('professional-profile-form')).toHaveCount(0);
    const completed = await readProfiles(page);
    expect(completed).toHaveLength(original.length);
    expect(completed.filter(profile => profile.id !== legacy.id)).toEqual(familyFixtures);
    expect(completed.find(profile => profile.id === legacy.id)).toMatchObject({ id: legacy.id, name: seed.profile.name, kind: legacy.kind, professionalType: 'licensed', licenseNumber: '00000002', degreeType: 'Fisioterapia' });
    await assertPendingVerification(page, legacy.id);
    await closeAccount(page);
    await page.reload();
    await openAccount(page);
    expect(await readProfiles(page)).toEqual(completed);
    await openProfessionalData(page, `managed-profile-${legacy.id}`);
    await expect(page.getByTestId('professional-profile-license')).toHaveValue('00000002');
    await expect(page.getByTestId('professional-profile-name')).toHaveValue(seed.profile.name);
    expect(errors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
    return { legacyCollectionReadable: true, unchangedBeforeExplicitSave: true, completionPreservesIdentityAndOtherProfiles: true, reloadPersistence: true, errors, forbiddenRequests };
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  await mkdir('.expo', { recursive: true });
  const videoPath = resolve('.expo/professional-identity-test.y4m');
  const frames = Array.from({ length: 30 }, () => Buffer.concat([Buffer.from('FRAME\n'), Buffer.alloc(320 * 240, 130), Buffer.alloc(320 * 240 / 2, 128)]));
  await writeFile(videoPath, Buffer.concat([Buffer.from('YUV4MPEG2 W320 H240 F15:1 Ip A1:1 C420jpeg\n'), ...frames]));
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${videoPath}`, '--autoplay-policy=no-user-gesture-required'] });
  try {
    const viewports = [];
    for (const viewport of [{ width: 393, height: 852 }, { width: 320, height: 640 }]) viewports.push(await verifyViewport(browser, viewport));
    const legacyAdult = await verifyLegacyAdult(browser);
    const legacyProfessional = await verifyLegacyProfessional(browser);
    await writeFile(`${outputDirectory}/account-profile-flows.json`, JSON.stringify({ passed: true, fixtureOnly: true, providerRequests: 0, viewports, legacyAdult, legacyProfessional }, null, 2));
    console.log('PASS account profile flows: doctor/licensed credentials, required fields, isolated drafts, leading zeros, family regression, edit, persistence, storage failure/retry, clinical isolation and legacy compatibility at 393/320px.');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
