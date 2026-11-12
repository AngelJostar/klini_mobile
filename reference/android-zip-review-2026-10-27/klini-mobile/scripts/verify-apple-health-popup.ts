import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, unlink, writeFile, readFile } from 'node:fs/promises';

// Isolated rendering fixture. It emulates iOS availability for presentation only;
// Metro still resolves web services, so it cannot access HealthKit or health data.
const fixturePath = 'scripts/apple-health-popup-fixture.tmp.tsx';
const fixture = `import React, { useState } from 'react';
import { AppRegistry, AppState, Platform, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ArchivePopup from '../src/components/ArchivePopup';
import { readDailySteps } from '../src/services/appleHealthSteps';
import AppleHealthHistoryPopup from '../src/components/AppleHealthHistoryPopup';
import AppleHealthPanel from '../src/components/AppleHealthPanel';
import AppleHealthLiveReadings, { AppleHealthReadingsList } from '../src/components/AppleHealthLiveReadings';
import BodyParameterListRow from '../src/components/BodyParameterListRow';
import ArchiveScreen from '../src/screens/ArchiveScreen';
import BodyParametersScreen from '../src/screens/BodyParametersScreen';
import { AppProvider } from '../src/state/store';
import { createDemoState } from '../src/domain/seed';
import AppleHealthOptionsPopup from '../src/components/AppleHealthOptionsPopup';
import { HEALTH_CATEGORIES } from '../src/services/appleHealthReader';
const params = new URLSearchParams(location.search);
const web = params.has('web');
Object.defineProperty(Platform, 'OS', { value: web ? 'web' : params.has('android') ? 'android' : 'ios', configurable: true });
Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
Object.defineProperty(Constants, 'executionEnvironment', { value: params.has('go') ? 'storeClient' : 'standalone', configurable: true });
if (params.has('medications')) {
 const state = createDemoState();
 state.medications=[{id:'fixture-medication',name:'Medicamento seleccionado',dose:'Dosis literal',frequency:'Frecuencia literal',startDate:'2026-11-05',active:true},{id:'fixture-other-medication',name:'Otro medicamento',dose:'NO COMPARTIR OTRA DOSIS',frequency:'Otra frecuencia',startDate:'2026-11-04',active:true},{id:'fixture-previous-medication',name:'Medicamento anterior',dose:'Dosis anterior',frequency:'Frecuencia anterior',startDate:'2026-10-01',endDate:'2026-10-10',active:false}];
 localStorage.setItem('@klini/app-state:v1',JSON.stringify(state));
}
if (params.has('records')) {
 const state = createDemoState();
 const type=params.get('recordType') || 'Consulta';
 state.records=[{id:'fixture-selected',type,title:'Elemento seleccionado de prueba',date:'2026-11-05',doctorName:'Profesional de prueba',description:'Contenido seleccionado completo'}, {id:'fixture-other',type,title:'Otro elemento privado de prueba',date:'2026-11-04',doctorName:'Otro profesional',description:'NO COMPARTIR ESTE CONTENIDO'}];
 localStorage.setItem('@klini/app-state:v1',JSON.stringify(state));
}
if (params.has('body')) {
 const state = createDemoState();
 state.settings.appleHealth = { ownerId: state.profile.id, enabled: true, selected: ['HKQuantityTypeIdentifierHeartRate'], requested: ['HKQuantityTypeIdentifierHeartRate'] };
 localStorage.setItem('@klini/app-state:v1', JSON.stringify(state));
}
const readPage = async (id, from, to, excluded) => {
 if (params.has('error')) throw new Error('Synthetic failure');
 if (params.has('empty')) return {readings:[],hasMore:false};
 if(id==='HKQuantityTypeIdentifierStepCount') {
   const daily=await readDailySteps({queryStatisticsCollectionForQuantity:async(_id,_stats,anchor,_interval,options)=>{
    const bins=[];for(const day=new Date(anchor);day<options.filter.date.endDate;day.setDate(day.getDate()+1)){
     const end=new Date(day);end.setDate(end.getDate()+1);
     bins.push({startDate:new Date(day),endDate:end,sources:[{name:'iPhone',bundleIdentifier:'test.phone'},{name:'Apple Watch',bundleIdentifier:'test.watch'}],...(bins.length===1?{}:{sumQuantity:{unit:'count',quantity:bins.length===2?0:5000+bins.length}})});
    }return bins;
   }},from,to,new Date());
   return {readings:daily.map(row=>({...row,uuid:'steps-day-'+row.day})),hasMore:false};
 }

 const samples=Array.from({length:52},(_,i)=>({id,uuid:'synthetic-'+i,value:i===0?69:i,source:'Apple Watch de prueba',start:'2026-11-04T20:15:57Z',end:'2026-11-04T20:16:57Z',...(id==='HKCategoryTypeIdentifierSleepAnalysis'?{stage:'REM'}:{})}));
 const remaining=samples.filter(item=>!excluded.includes(item.uuid));
 return {readings:remaining.slice(0,50),hasMore:remaining.length>50};
};
function Fixture() {
 const [history, setHistory] = useState(null);
 const [open, setOpen] = useState(false);
 const [selected, setSelected] = useState(HEALTH_CATEGORIES.map(item => item.id));
 if (history || params.has('history')) return <SafeAreaProvider><AppleHealthHistoryPopup categoryId={history || 'HKQuantityTypeIdentifierHeartRate'} onClose={() => setHistory(null)} readPage={readPage} /></SafeAreaProvider>;
 if (params.has('medications')) return <SafeAreaProvider><AppProvider><ArchiveScreen initialTab='medications' onClose={() => {}} /></AppProvider></SafeAreaProvider>;
 if (params.has('records')) return <SafeAreaProvider><AppProvider><ArchiveScreen initialHistory initialListTitle={params.get('records') || 'Mi historial'} initialType={params.get('recordType') || undefined} onClose={() => {}} /></AppProvider></SafeAreaProvider>;
 if (params.has('body')) return <SafeAreaProvider><AppProvider><BodyParametersScreen onClose={() => {}} /></AppProvider></SafeAreaProvider>;
 return <SafeAreaProvider><View style={{flex:1,backgroundColor:'#F5F8FA'}}>
  {web && <Pressable testID="fixture-open" onPress={() => setOpen(true)}><Text>Abrir fixture</Text></Pressable>}
  <View style={{flex:1}} pointerEvents={open ? 'none' : 'auto'} accessibilityElementsHidden={open} importantForAccessibility={open ? 'no-hide-descendants' : 'auto'}>
   <ArchivePopup title="Parámetros corporales" onClose={() => {}} onBack={open ? () => setOpen(false) : undefined}>
    <AppleHealthPanel optionsOpen={open} onOptionsChange={setOpen} onShowInfo={() => {}} />
    {params.has('values') && <AppleHealthReadingsList onOpenHistory={setHistory} selected={selected} loading={false} failed={false} readings={[
      {id:'HKQuantityTypeIdentifierHeartRate', value:69, source:'Apple Watch de Persona de prueba con nombre muy largo', start:'2026-11-04T20:15:57Z', end:'2026-11-04T20:15:57Z'},
      {id:'HKQuantityTypeIdentifierStepCount', value:0, source:'iPhone de prueba', start:'2026-11-04T20:15:57Z', end:'2026-11-04T20:16:57Z'},
      {id:'HKQuantityTypeIdentifierActiveEnergyBurned', value:123456.7, source:'Apple Salud'},
      {id:'HKCategoryTypeIdentifierSleepAnalysis', value:90, stage:'REM', source:'Apple Salud'},
    ]} />}
    {params.has('values') && <BodyParameterListRow testID='comparison-manual' label='Peso' icon='scale-outline' value='72.5' unit='kg' source='Manual' sourceIcon='pencil-outline' onPress={() => {}} />}
    {params.has('live') && <AppleHealthLiveReadings selected={selected} />}
    {['Peso','Frecuencia cardiaca','Presión arterial','Glucosa','Oxigenación','Temperatura'].map(label => <View testID={'manual-' + label} key={label} style={{height:62,justifyContent:'center',borderBottomWidth:1,borderBottomColor:'#DFE8EE'}}><Text style={{color:'#082441'}}>{label}</Text></View>)}
   </ArchivePopup>
  </View>
  {open && <AppleHealthOptionsPopup selected={selected} onSelectedChange={setSelected} onClose={() => setOpen(false)} />}
 </View></SafeAreaProvider>;
}
AppRegistry.registerComponent('AppleHealthPopupFixture', () => Fixture);
AppRegistry.runApplication('AppleHealthPopupFixture', {rootTag:document.getElementById('root')});
`;

async function main() {
  await mkdir('test-results', { recursive: true });
  await writeFile(fixturePath, fixture, { flag: 'wx' });
  const server = createServer(async (request, response) => {
    if (request.url?.startsWith('/assets/')) {
      const asset = await fetch(`http://127.0.0.1:8099${request.url}`);
      response.statusCode = asset.status;
      response.setHeader('Content-Type', asset.headers.get('content-type') || 'application/octet-stream');
      response.end(Buffer.from(await asset.arrayBuffer()));
      return;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden}#root{display:flex;flex-direction:column}</style><div id="root"></div><script src="http://127.0.0.1:8099/scripts/apple-health-popup-fixture.tmp.bundle?platform=web&dev=true&hot=false&lazy=false"></script></html>');
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const errors: string[] = [];
  try {
    await new Promise<void>(resolve => server.listen(8101, '127.0.0.1', resolve));
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
      const page = await browser.newPage({ viewport });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => ['127.0.0.1', 'localhost', '192.168.100.250'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
      page.on('requestfailed', request => console.log('Fixture request failed:', new URL(request.url()).pathname));
      await page.goto('http://127.0.0.1:8101');
      const toggle = page.getByTestId('apple-health-toggle').locator('input');
      await expect(toggle).toBeEnabled({ timeout: 60000 });
      await expect(page.getByTestId('apple-health-options')).toHaveCount(0);
      await expect.poll(() => page.getByTestId('archive-popup').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
      await toggle.check();
      const popup = page.getByTestId('apple-health-options-popup');
      await expect(popup).toBeInViewport();
      await expect(popup.getByRole('switch')).toHaveCount(5);
      const bounds = (await popup.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(15);
      expect(bounds.y).toBeGreaterThanOrEqual(15);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 15);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 15);
      const heart = page.getByTestId('apple-health-category-HKQuantityTypeIdentifierHeartRate').locator('input');
      await heart.uncheck();
      await page.screenshot({ path: `test-results/apple-health-options-${viewport.width}x${viewport.height}.png` });
      await page.getByTestId('apple-health-options-close').click();
      await expect(popup).toHaveCount(0);
      await expect(toggle).not.toBeChecked();
      await toggle.check();
      await expect(heart).not.toBeChecked();
      for (const input of await popup.getByRole('switch').all()) {
        await input.uncheck();
      }
      await page.getByTestId('apple-health-connect').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('apple-health-connect')).toHaveAttribute('aria-disabled', 'true');
      await page.getByTestId('apple-health-options-backdrop').click({ position: { x: 2, y: 2 } });
      await expect(popup).toHaveCount(0);
      await expect(page.getByTestId('archive-popup')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://127.0.0.1:8101?web');
    await page.getByTestId('fixture-open').click();
    await expect(page.getByTestId('apple-health-options-popup')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('apple-health-options-popup')).toHaveCount(0);
    await page.close();
    const live = await browser.newPage({ viewport: { width: 320, height: 568 } });
    live.on('pageerror', error => errors.push(error.message));
    await live.goto('http://127.0.0.1:8101?live');
    const pinned = live.getByTestId('apple-health-pinned-readings');
    await expect(pinned).toBeVisible();
    await expect(pinned.locator('[data-testid^="apple-health-row-"][role="button"]')).toHaveCount(5);
    expect(await pinned.evaluate(element => !!(element.compareDocumentPosition(document.querySelector('[data-testid="manual-Peso"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    expect(await live.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await live.close();
    for (const width of [320, 390]) {
      const values = await browser.newPage({viewport:{width,height:844}});
      values.on('pageerror', error => errors.push(error.message));
      await values.goto('http://127.0.0.1:8101?values');
      const heart = values.getByTestId('apple-health-row-HKQuantityTypeIdentifierHeartRate');
      await expect(heart).toContainText('69');
      const icon = await values.getByTestId('apple-health-row-HKQuantityTypeIdentifierHeartRate-icon').boundingBox();
      const value = await values.getByTestId('apple-health-row-HKQuantityTypeIdentifierHeartRate-value').boundingBox();
      expect(icon!.x + icon!.width).toBeLessThan(value!.x);
      await expect(values.getByTestId('apple-health-row-HKQuantityTypeIdentifierStepCount-value')).toContainText('0');
      await expect(values.getByTestId('apple-health-row-HKQuantityTypeIdentifierRestingHeartRate-value')).toHaveText('Sin lectura');
      await expect(values.getByTestId('apple-health-row-HKCategoryTypeIdentifierSleepAnalysis-date')).toContainText('REM');
      expect(await values.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await expect.poll(() => values.getByTestId('archive-popup').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
      await values.screenshot({path:'test-results/apple-health-rows-' + width + '.png'});
      await heart.click();
      await expect(values.getByTestId('apple-health-history-list')).toBeVisible();
      await expect(values.locator('[data-testid^="apple-health-history-row-"]')).toHaveCount(50);
      await expect.poll(() => values.getByTestId('archive-popup').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
      await values.screenshot({path:'test-results/apple-health-history-' + width + '.png'});
      await values.getByTestId('apple-health-history-row-synthetic-0').click();
      await expect(values.getByTestId('apple-health-history-detail')).toContainText('69');
      await expect(values.getByTestId('apple-health-history-detail')).toContainText('2026');
      await expect(values.getByTestId('apple-health-history-title')).toBeInViewport();
      await expect.poll(() => values.getByTestId('archive-popup').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
      await values.getByTestId('archive-popup').screenshot({path:'test-results/apple-health-history-detail-' + width + '.png'});
      await values.getByTestId('archive-detail-back').click();
      await values.getByTestId('apple-health-history-next').scrollIntoViewIfNeeded();
      await values.getByTestId('apple-health-history-next').click();
      await expect(values.locator('[data-testid^="apple-health-history-row-"]')).toHaveCount(2);
      await values.getByTestId('apple-health-history-previous').click();
      await expect(values.locator('[data-testid^="apple-health-history-row-"]')).toHaveCount(50);
      await values.getByTestId('archive-close').click();
      await expect(heart).toBeVisible();
      for (const category of ['HKQuantityTypeIdentifierRestingHeartRate','HKQuantityTypeIdentifierStepCount','HKQuantityTypeIdentifierActiveEnergyBurned','HKCategoryTypeIdentifierSleepAnalysis']) {
        await values.getByTestId('apple-health-row-' + category).click();
        await expect(values.getByTestId('apple-health-history-list')).toBeVisible();
        await expect(values.locator('[data-testid^="apple-health-history-row-"]')).toHaveCount(category === 'HKQuantityTypeIdentifierStepCount' ? 7 : 50);
        if(category === 'HKQuantityTypeIdentifierStepCount') {
          await expect(values.getByText('Historial diario de pasos')).toBeVisible();
          await expect(values.getByTestId('apple-health-history-next')).toHaveCount(0);
          await values.locator('[data-testid^="apple-health-history-row-"]').first().click();
          await expect(values.getByTestId('apple-health-history-detail')).toContainText('Total del día');
          await expect(values.getByTestId('apple-health-history-detail')).toContainText('Zona horaria:');
          await expect.poll(() => values.getByTestId('archive-popup').evaluate(element => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
          await values.getByTestId('archive-popup').screenshot({path:'test-results/apple-health-daily-steps-' + width + '.png'});
        }
        await values.getByTestId('archive-close').click();
        await expect(values.getByTestId('apple-health-pinned-readings')).toBeVisible();
      }
      await values.close();
    }
    const body = await browser.newPage({viewport:{width:390,height:844}});
    body.on('pageerror', error => errors.push(error.message));
    await body.goto('http://127.0.0.1:8101?body');
    await expect(body.getByTestId('apple-health-row-HKQuantityTypeIdentifierHeartRate')).toBeVisible();
    await expect(body.getByTestId('body-row-heart-rate')).toHaveCount(0);
    await expect(body.getByTestId('body-row-weight')).toBeVisible();
    await body.getByTestId('apple-health-row-HKQuantityTypeIdentifierHeartRate').click();
    await expect(body.getByTestId('apple-health-history-screen')).toBeVisible();
    await expect(body.getByText('No se pudo consultar el historial.',{exact:false})).toBeVisible();
    await body.getByTestId('apple-health-saved-history').scrollIntoViewIfNeeded();
    await body.getByTestId('apple-health-saved-history').click();
    await expect(body.getByTestId('body-parameter-history')).toBeVisible();
    await expect(body.getByTestId('body-history-title')).toContainText('Frecuencia cardiaca');
    await body.goto('http://127.0.0.1:8101?body');
    await expect(body.getByTestId('apple-health-row-HKQuantityTypeIdentifierHeartRate')).toBeVisible();
    await body.getByTestId('apple-health-toggle').locator('input').uncheck();
    await expect(body.getByTestId('apple-health-row-HKQuantityTypeIdentifierHeartRate')).toHaveCount(0);
    await expect(body.getByTestId('body-row-heart-rate')).toBeVisible();
    await expect.poll(() => body.evaluate(() => JSON.parse(localStorage.getItem('@klini/app-state:v1')!).settings.appleHealth.enabled)).toBe(false);
    expect(await body.evaluate(() => JSON.parse(localStorage.getItem('@klini/app-state:v1')!).settings.appleHealth.selected)).toEqual(['HKQuantityTypeIdentifierHeartRate']);
    await body.close();
    for (const runtime of ['web', 'android', 'go']) {
      const unsupported = await browser.newPage({viewport:{width:390,height:844}});
      unsupported.on('pageerror', error => errors.push(error.message));
      await unsupported.goto('http://127.0.0.1:8101?body&' + runtime);
      await expect(unsupported.getByTestId('body-row-heart-rate')).toBeVisible();
      await expect(unsupported.getByTestId('apple-health-pinned-readings')).toHaveCount(0);
      const toggle = unsupported.getByTestId('apple-health-toggle').locator('input');
      await expect(toggle).not.toBeChecked();
      await expect(toggle).toBeDisabled();
      await expect(unsupported.getByText('Conectar con Apple Health', { exact:true })).toBeVisible();
      const preferences = await unsupported.evaluate(() => JSON.parse(localStorage.getItem('@klini/app-state:v1')!).settings.appleHealth);
      expect(preferences.enabled).toBe(true);
      expect(preferences.selected).toEqual(['HKQuantityTypeIdentifierHeartRate']);
      await unsupported.getByRole('button', { name:'Conectar con Apple Health', exact:true }).click();
      await expect(unsupported.getByTestId('apple-health-options-popup')).toBeVisible();
      await expect(unsupported.getByTestId('apple-health-connect')).toHaveAttribute('aria-disabled', 'true');
      await unsupported.getByTestId('apple-health-options-close').click();
      await expect(unsupported.getByTestId('body-row-heart-rate')).toBeVisible();
      expect(await unsupported.evaluate(() => JSON.parse(localStorage.getItem('@klini/app-state:v1')!).settings.appleHealth)).toEqual(preferences);
      await unsupported.close();
    }
    for (const state of ['empty','error']) {
      const page = await browser.newPage({viewport:{width:320,height:568}});
      page.on('pageerror',error => errors.push(error.message));
      await page.goto('http://127.0.0.1:8101?history&' + state);
      await expect(page.getByTestId('apple-health-history-list')).toBeVisible();
      await expect(page.getByText(state==='empty'?'Sin lecturas disponibles':'No se pudo consultar el historial.',{exact:false})).toBeVisible();
      await page.getByTestId('apple-health-history-filter').click();
      await page.getByTestId('apple-health-history-from').fill('2026-02-30');
      await page.getByTestId('apple-health-history-apply').click();
      await expect(page.getByText('Revisa las fechas.')).toBeVisible();
      if(state==='empty') await expect(page.getByTestId('apple-health-read-access-help')).toContainText('permiso de lectura');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.close();
    }
    for (const type of ['Consulta','Estudio','Procedimiento']) {
      const records = await browser.newPage({viewport:{width:390,height:844}});
      records.on('pageerror',error => errors.push(error.message));
      await records.goto('http://127.0.0.1:8101?web&records=Registro&recordType=' + type);
      const send = records.locator('[data-testid^="history-send-"]').first();
      await expect(send).toBeVisible();
      const before = await records.evaluate(() => localStorage.getItem('@klini/app-state:v1'));
      const download = records.waitForEvent('download');
      await send.click();
      const result = await download;
      expect(result.suggestedFilename()).toMatch(/\.txt$/);
      const text = await readFile((await result.path())!, 'utf8');
      expect(text).toContain('Klini'); expect(text).toContain(type); expect(text).toContain('Contenido seleccionado completo'); expect(text).not.toContain('NO COMPARTIR ESTE CONTENIDO');
      await expect(records.getByTestId('record-share-popup')).toHaveCount(0);
      expect(await records.evaluate(() => localStorage.getItem('@klini/app-state:v1'))).toEqual(before);
      await expect(send).toBeEnabled();
      await records.close();
    }
    for (const width of [320,390]) {
      const meds = await browser.newPage({viewport:{width,height:844}});
      meds.on('pageerror',error => errors.push(error.message));
      await meds.goto('http://127.0.0.1:8101?web&medications');
      const send = meds.getByTestId('medication-send-fixture-medication');
      await expect(send).toBeVisible(); await send.scrollIntoViewIfNeeded();
      const bounds = await send.boundingBox(); expect(bounds!.width).toBeGreaterThan(200); expect(bounds!.height).toBeGreaterThanOrEqual(44);
      const before = await meds.evaluate(() => localStorage.getItem('@klini/app-state:v1'));
      const download = meds.waitForEvent('download'); await send.click(); const result = await download;
      expect(result.suggestedFilename()).toContain('medicamento');
      const text = await readFile((await result.path())!,'utf8');
      for(const value of ['Medicamento seleccionado','Dosis literal','Frecuencia literal','2026-11-05','Vigente']) expect(text).toContain(value);
      expect(text).not.toContain('NO COMPARTIR OTRA DOSIS');
      expect(await meds.evaluate(() => localStorage.getItem('@klini/app-state:v1'))).toEqual(before);
      await expect(meds.getByTestId('record-share-popup')).toHaveCount(0); await expect(send).toBeEnabled();
      expect(await meds.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await meds.screenshot({path:'test-results/medication-share-' + width + '.png'});
      await meds.getByRole('button',{name:'Anteriores',exact:true}).click();
      const previousDownload=meds.waitForEvent('download'); await meds.getByTestId('medication-send-fixture-previous-medication').click();
      const previousText=await readFile((await(await previousDownload).path())!,'utf8');
      expect(previousText).toContain('Anterior'); expect(previousText).toContain('2026-10-10');
      await meds.close();
    }
    expect(errors).toEqual([]);
    console.log('Apple Salud shared rows: icon left/value right, long source, date details, zero/no-reading, duplicate replacement, saved history and disable/selection persistence passed. Restored enabled preferences remain inactive and unchanged in Android, web and Expo Go. Popup: 390/320 px and landscape, selection, persistence, close/backdrop, Escape and zero-selection disabled passed. Presentation fixture; no native HealthKit access.');
  } finally {
    await browser?.close();
    server.close();
    await unlink(fixturePath);
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
