import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, writeFile, unlink } from 'node:fs/promises';

const fixturePath = 'scripts/directory-country-fixture.tmp.tsx';
const fixture = `import React,{useState} from 'react';
import {AppRegistry,View,Pressable,Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppProvider} from '../src/state/store';
import DirectoryFlow from '../src/screens/DirectoryFlow';
function Fixture(){const [open,setOpen]=useState(false);return <SafeAreaProvider><AppProvider><View style={{flex:1}}>{open?<DirectoryFlow onClose={()=>setOpen(false)} onBooked={()=>{}}/>:<Pressable testID='fixture-directory-open' onPress={()=>setOpen(true)}><Text>Buscar médico</Text></Pressable>}</View></AppProvider></SafeAreaProvider>}
AppRegistry.registerComponent('DirectoryCountryFixture',()=>Fixture);
AppRegistry.runApplication('DirectoryCountryFixture',{rootTag:document.getElementById('root')});`;

async function main() {
  await mkdir('test-results', { recursive:true });
  await writeFile(fixturePath,fixture,{flag:'wx'});
  const server=createServer(async(request,response)=>{
    if(request.url?.startsWith('/assets/')) {
      const asset=await fetch(`http://127.0.0.1:8099${request.url}`);
      response.statusCode=asset.status;response.setHeader('Content-Type',asset.headers.get('content-type')||'application/octet-stream');response.end(Buffer.from(await asset.arrayBuffer()));return;
    }
    response.setHeader('Content-Type','text/html; charset=utf-8');
    response.end('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden}#root{display:flex;flex-direction:column}</style><div id="root"></div><script src="http://127.0.0.1:8099/scripts/directory-country-fixture.tmp.bundle?platform=web&dev=true&hot=false&lazy=false"></script></html>');
  });
  let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
  try {
    await new Promise<void>(resolve=>server.listen(8102,'127.0.0.1',resolve));
    browser=await chromium.launch({channel:'chrome',headless:true});
    for(const width of [320,390]) {
      const page=await browser.newPage({viewport:{width,height:844}});
      const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
      await page.goto('http://127.0.0.1:8102');
      await page.getByTestId('fixture-directory-open').click();
      const country=page.getByTestId('directory-country');
      await expect(country).toContainText('México');
      await expect(page.getByTestId('directory-country-search')).toHaveCount(0);
      await expect(page.getByTestId('directory-country-search')).toHaveCount(0);
      await expect.poll(()=>page.getByTestId('directory-popup').evaluate(element=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))).toBeLessThanOrEqual(.5);
      await page.screenshot({path:`test-results/directory-country-default-${width}.png`});
      await country.click();
      await expect(page.getByTestId('directory-country-search')).toBeVisible();
      await page.getByTestId('directory-country-search').fill('colom');
      await page.getByRole('button',{name:/Colombia/}).click();
      await expect(country).toContainText('Colombia');
      await expect(page.getByTestId('directory-country-search')).toHaveCount(0);
      await expect(page.getByTestId('directory-city')).toContainText('Selecciona ciudad');
      await page.getByTestId('booking-search').fill('Prueba');
      await expect(country).toContainText('Colombia');
      await country.click();
      await expect(page.getByTestId('directory-country-search')).toHaveValue('');
      await page.getByTestId('directory-options-close').click();
      await expect(country).toContainText('Colombia');
      await page.getByTestId('booking-search-submit').click();
      await page.getByTestId('directory-edit-filters').click();
      await expect(country).toContainText('Colombia');
      await expect(page.getByTestId('directory-country-search')).toHaveCount(0);
      await expect(page.getByTestId('directory-country-search')).toHaveCount(0);
      // A fresh search keeps the existing default; changes remain within the current flow.
      await page.getByTestId('directory-close').click();
      await page.getByTestId('fixture-directory-open').click();
      await expect(country).toContainText('México');
      await expect(page.getByTestId('directory-country-search')).toHaveCount(0);
      await country.click();
      await page.getByRole('button',{name:/Estados Unidos/}).click();
      await expect(country).toContainText('Estados Unidos');
      await expect(page.getByTestId('directory-country-search')).toHaveCount(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      expect(errors).toEqual([]);
      await page.close();
    }
    console.log('PASS Directory 320/390: Mexico default, country menu closed, explicit opening/search/selection, retained selection through dropdown toggles and results/back, fresh search default, no overflow or JS errors.');
  } finally {await browser?.close();server.close();await unlink(fixturePath);}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
