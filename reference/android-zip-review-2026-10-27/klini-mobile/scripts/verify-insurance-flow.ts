import { chromium, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import type { AppState } from '../src/domain/types';

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('dialog', dialog => void dialog.accept());
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const settleLayout = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  async function verifyCoverageExpansion(width: number) {
    const popup = page.getByTestId('insurance-popup');
    await expect(popup).toHaveAccessibleName('Coberturas');
    await expect(page.getByTestId('insurance-coverage-policy')).toHaveCount(0);
    const coverageBounds = (await popup.boundingBox())!;
    for (const [kind, title] of [['hospitalization', 'Hospitalización'], ['emergencies', 'Urgencias'], ['consultations', 'Consultas médicas']] as const) {
      await page.getByTestId(`insurance-coverage-${kind}`).click();
      await expect(popup).toHaveAccessibleName(title);
      await expect(page.getByTestId('insurance-service-detail')).toContainText('aseguradora');
      await expect(page.getByTestId('insurance-coverage-policy')).toHaveCount(0);
      await settleLayout();
      const detailBounds = (await popup.boundingBox())!;
      for (const edge of ['x', 'y', 'width'] as const) {
        expect(Math.abs(detailBounds[edge] - coverageBounds[edge]), `${title} preserves the Coberturas ${edge}, allowing native layout rounding`).toBeLessThanOrEqual(1);
      }
      expect(detailBounds.height, `${title} grows downwards`).toBeGreaterThan(coverageBounds.height + 20);
      expect(Math.abs(detailBounds.y + detailBounds.height - (page.viewportSize()!.height - 12)), `${title} ends at the bottom safe margin`).toBeLessThan(1);
      const scroll = page.getByTestId('insurance-popup-scroll');
      await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBe(0);
      const scrollSize = await scroll.evaluate(element => ({ content: element.scrollHeight, viewport: element.clientHeight }));
      expect(scrollSize.content).toBeGreaterThan(scrollSize.viewport + 100);
      const headerClose = await page.getByTestId('insurance-popup-close').boundingBox();
      const footer = await popup.getByText('Datos de ejemplo', { exact: true }).boundingBox();
      await expect(page.getByTestId('insurance-popup-back')).toBeInViewport();
      await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
      await settleLayout();
      await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(100);
      const bottom = await scroll.evaluate(element => ({ top: element.scrollTop, content: element.scrollHeight, viewport: element.clientHeight }));
      expect(bottom.top + bottom.viewport).toBeGreaterThanOrEqual(bottom.content - 1);
      await expect(page.getByTestId('insurance-service-detail')).toContainText('Fin de condiciones ficticias');
      expect(await page.getByTestId('insurance-popup-close').boundingBox()).toEqual(headerClose);
      expect(await popup.getByText('Datos de ejemplo', { exact: true }).boundingBox()).toEqual(footer);
      await page.screenshot({ path: `test-results/insurance-${kind}-conditions-${width}.png` });
      await page.getByTestId('insurance-popup-back').click();
      await expect(popup).toHaveAccessibleName('Coberturas');
      await settleLayout();
      expect(await popup.boundingBox()).toEqual(coverageBounds);
      await expect.poll(() => page.getByTestId('insurance-popup-scroll').evaluate(element => element.scrollTop)).toBe(0);
    }
  }

  async function verifyNetworkExpansion(width: number) {
    const popup = page.getByTestId('insurance-popup');
    await expect(popup).toHaveAccessibleName('Red médica');
    const compactBounds = (await popup.boundingBox())!;
    await page.getByTestId('insurance-network-doctors').click();
    await settleLayout();
    const expandedBounds = (await popup.boundingBox())!;
    for (const edge of ['x', 'y', 'width'] as const) {
      expect(Math.abs(expandedBounds[edge] - compactBounds[edge]), `Médicos preserves the Red médica ${edge}, allowing native layout rounding`).toBeLessThanOrEqual(1);
    }
    expect(expandedBounds.height).toBeGreaterThan(compactBounds.height + 20);
    expect(Math.abs(expandedBounds.y + expandedBounds.height - (page.viewportSize()!.height - 12))).toBeLessThan(1);
    await expect(page.locator('[data-testid^="insurance-network-item-"]')).toHaveCount(14);
    for (const id of ['doctor-elena', 'doctor-ana', 'doctor-daniel', 'doctor-lucia', 'doctor-mateo', 'doctor-vale']) {
      await expect(page.getByTestId(`insurance-network-item-${id}`)).toHaveCount(1);
    }
    const scroll = page.getByTestId('insurance-popup-scroll');
    const closeBounds = await page.getByTestId('insurance-popup-close').boundingBox();
    const size = await scroll.evaluate(element => ({ content: element.scrollHeight, viewport: element.clientHeight }));
    expect(size.content).toBeGreaterThan(size.viewport + 100);
    await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await settleLayout();
    await expect(page.getByTestId('insurance-network-item-doctor-network-qa-8')).toBeInViewport();
    expect(await page.getByTestId('insurance-popup-close').boundingBox()).toEqual(closeBounds);
    await page.screenshot({ path: `test-results/insurance-network-doctors-expanded-${width}.png` });

    await page.getByTestId('insurance-network-search').fill('rios');
    await expect(page.locator('[data-testid^="insurance-network-item-"]')).toHaveCount(1);
    expect(await popup.boundingBox()).toEqual(expandedBounds);
    await page.getByTestId('insurance-network-search').fill('sin-resultados-ficticios');
    await expect(page.locator('[data-testid^="insurance-network-item-"]')).toHaveCount(0);
    expect(await popup.boundingBox()).toEqual(expandedBounds);
    await page.getByTestId('insurance-network-search').fill('rios');
    await page.getByTestId('insurance-network-item-doctor-elena').click();
    await expect(page.getByTestId('insurance-service-detail')).toContainText('Perfil ficticio');
    expect(await popup.boundingBox()).toEqual(expandedBounds);
    await page.getByTestId('insurance-popup-back').click();
    await expect(popup).toHaveAccessibleName('Red médica');
    expect(await popup.boundingBox()).toEqual(expandedBounds);
    await expect(page.getByTestId('insurance-network-search')).toHaveValue('rios');
    await expect.poll(() => page.getByTestId('insurance-popup-scroll').evaluate(element => element.scrollTop)).toBe(0);
    await page.getByTestId('insurance-network-hospitals').click();
    await settleLayout();
    expect(await popup.boundingBox()).toEqual(compactBounds);
    await expect(page.getByTestId('insurance-network-search')).toHaveValue('');
    await expect(page.getByTestId('insurance-network-item-hospital-example')).toBeInViewport();
  }

  try {
    await page.goto('http://127.0.0.1:8096');
    await page.getByTestId('menu-insurance').waitFor();
    await page.evaluate(() => {
      const key = '@klini/app-state:v1';
      const fixture = JSON.parse(localStorage.getItem(key)!) as AppState;
      const longConditions = Array.from({ length: 24 }, (_, index) => `Condición ficticia ${index + 1}: información de demostración sobre límites y requisitos que deben confirmarse con la aseguradora. No representa una cobertura real.`).join('\n\n');
      fixture.policies.find(policy => policy.id === 'policy-demo')!.coverage += `\n\n${longConditions}\n\nFin de condiciones ficticias para comprobar el desplazamiento.`;
      const sampleDoctor = fixture.doctors[0];
      fixture.doctors.push(...Array.from({ length: 8 }, (_, index) => ({ ...sampleDoctor, id: `doctor-network-qa-${index + 1}`, name: `Profesional ficticio de red ${index + 1}` })));
      localStorage.setItem(key, JSON.stringify(fixture));
    });
    await page.reload();
    await page.getByTestId('menu-insurance').click();
    await expect(page.getByTestId('insurance-view-my')).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/insurance-home.png' });
    await page.getByTestId('insurance-view-my').click();
    await expect(page.getByRole('heading', { name: 'Tus seguros', exact: true })).toBeVisible();
    await expect(page.getByTestId('insurance-view-selected')).toHaveCount(0);
    await expect(page.getByTestId('insurance-select-policy-demo')).toHaveRole('button');
    await page.screenshot({ path: 'test-results/insurance-policies.png' });
    await page.getByTestId('insurance-select-policy-demo').click();
    await expect(page.getByTestId('insurance-summary-card')).toContainText('Sofía Martínez');
    await page.screenshot({ path: 'test-results/insurance-summary.png' });
    const panel = await page.getByTestId('insurance-panel').boundingBox();

    await page.getByTestId('insurance-service-credential').click();
    await expect(page.getByTestId('insurance-credential-card')).toContainText('GMM Corporativo Plus');
    await page.screenshot({ path: 'test-results/insurance-credential.png' });
    const credentialDownload = page.waitForEvent('download');
    await page.getByTestId('insurance-download-credential').click();
    const credential = await credentialDownload;
    expect(credential.suggestedFilename()).toMatch(/credencial.*\.pdf$/);
    const bytes = await readFile((await credential.path())!);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
    await page.getByTestId('insurance-popup-close').click();
    expect(await page.getByTestId('insurance-panel').boundingBox()).toEqual(panel);

    await page.getByTestId('insurance-service-coverage').click();
    await page.screenshot({ path: 'test-results/insurance-coverage.png' });
    await verifyCoverageExpansion(390);
    await page.getByTestId('insurance-popup-close').click();
    await page.getByTestId('insurance-service-documents').click();
    await expect(page.getByTestId('insurance-popup')).toHaveAccessibleName('Documentos');
    for (const kind of ['policy', 'conditions', 'receipts']) {
      const pendingDownload = page.waitForEvent('download');
      await page.getByTestId(`insurance-download-${kind}`).click();
      const download = await pendingDownload;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      expect((await PDFDocument.load(await readFile((await download.path())!))).getPageCount()).toBeGreaterThan(0);
    }
    await page.screenshot({ path: 'test-results/insurance-documents.png' });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('insurance-popup')).toHaveCount(0);

    await page.getByTestId('insurance-service-network').click();
    await page.screenshot({ path: 'test-results/insurance-network.png' });
    await page.getByTestId('insurance-network-search').fill('clinica');
    await expect(page.getByTestId('insurance-network-item-clinic-example')).toBeVisible();
    await expect(page.getByTestId('insurance-network-item-hospital-example')).toHaveCount(0);
    await page.getByTestId('insurance-network-search').fill('');
    await verifyNetworkExpansion(390);
    await page.getByTestId('insurance-network-doctors').click();
    await page.getByTestId('insurance-network-search').fill('rios');
    await page.getByTestId('insurance-network-item-doctor-elena').click();
    await expect(page.getByTestId('insurance-service-detail')).toContainText('Perfil ficticio');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('insurance-popup')).toHaveCount(0);

    await page.getByTestId('insurance-change-policy').click();
    await page.getByTestId('insurance-add-policy').click();
    await page.getByTestId('insurance-insurer').fill('Plan familiar de ejemplo');
    await page.getByTestId('insurance-number').fill('FAM-0024');
    await page.getByTestId('insurance-save-policy').click();
    await expect(page.getByTestId('insurance-summary-card')).toContainText('0024');
    await page.getByTestId('insurance-change-policy').click();
    const policies = page.locator('[data-testid^="insurance-select-"]');
    await expect(policies).toHaveCount(2);
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByTestId('insurance-view-selected')).toHaveCount(0);
    const familyButtonId = (await policies.filter({ hasText: 'Plan familiar de ejemplo' }).getAttribute('data-testid'))!;
    await page.getByTestId(familyButtonId).click();
    await expect(page.getByTestId('insurance-summary-card')).toContainText('0024');
    await page.getByTestId('insurance-detail-back').click();
    await expect(page.getByRole('heading', { name: 'Tus seguros', exact: true })).toBeVisible();
    await page.getByTestId('insurance-select-policy-demo').click();
    await expect(page.getByText('GMM Corporativo Plus', { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 640 });
    for (const kind of ['credential', 'coverage', 'network', 'documents']) {
      await page.getByTestId(`insurance-service-${kind}`).click();
      await expect(page.getByTestId('insurance-popup-close')).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: `test-results/insurance-${kind}-320.png` });
      if (kind === 'coverage') await verifyCoverageExpansion(320);
      if (kind === 'network') await verifyNetworkExpansion(320);
      await page.getByTestId('insurance-popup-close').click();
    }
    await page.getByTestId('insurance-detail-back').click();
    await expect(page.getByTestId('insurance-view-selected')).toHaveCount(0);
    await expect(page.getByTestId(familyButtonId)).toBeInViewport();
    await page.getByTestId(familyButtonId).click();
    await expect(page.getByTestId('insurance-summary-card')).toContainText('0024');
    await page.getByTestId('insurance-detail-back').click();
    await page.screenshot({ path: 'test-results/insurance-policies-320.png' });
    await page.getByTestId('insurance-close').click();
    await page.waitForURL(url => url.pathname === '/');
    await page.reload();
    await page.getByTestId('menu-insurance').click();
    await page.getByTestId('insurance-view-my').click();
    await expect(page.locator('[data-testid^="insurance-select-"]')).toHaveCount(2);
    await expect(page.getByTestId('insurance-view-selected')).toHaveCount(0);
    await page.getByTestId('insurance-select-policy-demo').click();
    await expect(page.getByText('GMM Corporativo Plus', { exact: true })).toBeVisible();
    await page.getByTestId('insurance-detail-back').click();
    await page.getByTestId(familyButtonId).click();
    await expect(page.getByTestId('insurance-summary-card')).toContainText('0024');
    expect(errors).toEqual([]);
    console.log('PASS insurance menus, single-tap policies, coverage and doctors anchored at 390/320px with long scrollable content, fixed headers, restored parent bounds, stable filtering and doctor details, PDFs, adding policy and persistence');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
