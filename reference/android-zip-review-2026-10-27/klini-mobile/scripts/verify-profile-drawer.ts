import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
async function main(){const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const page=await browser.newPage({viewport:{width:390,height:844}});try{
await page.goto('http://127.0.0.1:8096');await page.getByTestId('header-profile').click();
await page.getByTestId('profile-drawer').waitFor();
const xs:number[]=[];for(let i=0;i<25;i++){xs.push((await page.getByTestId('profile-drawer').boundingBox())!.x);await page.evaluate(()=>new Promise(requestAnimationFrame));}
assert.ok(Math.max(...xs)>xs.at(-1)!+5,'Entra desde la derecha');
let box=(await page.getByTestId('profile-drawer').boundingBox())!;assert.equal(Math.round(box.x+box.width),390);assert.equal(Math.round(box.width),326);
await page.screenshot({path:'test-results/profile-drawer-390.png'});
await page.getByTestId('profile-edit').click();await page.getByTestId('profile-name').fill('Sofía Martínez');await page.getByTestId('profile-save').click();await expect(page.getByTestId('profile-edit')).toBeVisible();
await page.getByTestId('profile-logout').click();await page.getByTestId('profile-cancel-logout').click();
await page.setViewportSize({width:320,height:640});await page.screenshot({path:'test-results/profile-drawer-320.png'});
box=(await page.getByTestId('profile-drawer').boundingBox())!;assert.equal(Math.round(box.x+box.width),320);assert.ok(box.y+box.height<=640);
await page.getByTestId('profile-close').click();await page.getByTestId('profile-drawer').waitFor({state:'hidden'});
await page.getByTestId('header-profile').click();await page.getByTestId('profile-drawer').waitFor();await page.getByTestId('profile-dismiss').click({position:{x:2,y:300}});await page.getByTestId('profile-drawer').waitFor({state:'hidden'});
console.log('PASS right-to-left slide, mirrored panel, edit, logout cancel, 320px and close/backdrop');
}finally{await browser.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});

