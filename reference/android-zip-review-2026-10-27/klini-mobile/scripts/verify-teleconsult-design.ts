import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:844}});const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));try{
await p.goto('http://127.0.0.1:8096');await p.getByTestId('menu-teleconsult').click();await p.getByTestId('teleconsult-popup').waitFor();const ys:number[]=[];for(let i=0;i<25;i++){ys.push((await p.getByTestId('teleconsult-popup').boundingBox())!.y);await p.evaluate(()=>new Promise(requestAnimationFrame));}assert.ok(Math.max(...ys)>ys.at(-1)!+5);assert.equal((await p.getByTestId('teleconsult-popup').boundingBox())!.width,390);
await expect(p.getByText('Próxima cita',{exact:true})).toBeVisible();await p.screenshot({path:'test-results/teleconsult-design.png'});
await p.getByTestId('teleconsult-tab-history').click();await expect(p.getByTestId('teleconsult-tab-history')).toHaveAttribute('aria-selected','true');
await p.getByTestId('teleconsult-tab-scheduled').click();await p.locator('[data-testid^="teleconsult-appointment-"]').first().click();await p.getByTestId('teleconsult-prepare').click();
await p.getByTestId('teleconsult-check-sound').click();await p.getByTestId('teleconsult-check-camera').click();await p.getByTestId('teleconsult-check-privacy').click();await expect(p.getByTestId('teleconsult-enter-demo')).toBeEnabled();
await p.getByTestId('teleconsult-detail-back').click();await p.getByTestId('teleconsult-detail-back').click();
await p.setViewportSize({width:320,height:640});await p.screenshot({path:'test-results/teleconsult-design-320.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await p.getByTestId('teleconsult-book').click();await p.waitForURL('**/directory?mode=Teleconsulta');await expect(p.getByTestId('booking-search-submit')).toBeVisible();assert.deepEqual(errors,[]);console.log('PASS teleconsult slide, tabs, appointment, preparation, 320px and booking.');
}finally{await b.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});

