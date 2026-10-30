import {chromium,expect} from '@playwright/test';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:844}});try{
await p.goto('http://127.0.0.1:8096');await p.getByTestId('menu-directory').click();await p.getByTestId('booking-search-submit').click();await p.waitForTimeout(450);
const panel=p.getByTestId('directory-popup');const before=await panel.boundingBox();
await p.getByTestId('directory-results-search').click();await p.getByTestId('directory-results-search').fill('Elena');expect((await panel.boundingBox())!.y).toBeCloseTo(before!.y,0);
await p.setViewportSize({width:390,height:544});expect((await panel.boundingBox())!.y).toBeCloseTo(before!.y,0);await expect(p.getByTestId('directory-results-search')).toBeVisible();
await p.setViewportSize({width:390,height:844});expect((await panel.boundingBox())!.y).toBeCloseTo(before!.y,0);console.log('PASS focus, typing, viewport shrink and restore retain panel top');
}finally{await b.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});
