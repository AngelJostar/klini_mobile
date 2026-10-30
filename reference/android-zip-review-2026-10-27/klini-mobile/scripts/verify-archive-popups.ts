import {chromium,expect} from '@playwright/test';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:844}});try{
await p.goto('http://127.0.0.1:8096');await p.getByTestId('menu-directory').click();await p.waitForTimeout(400);const reference=await p.getByTestId('directory-popup').boundingBox();await p.getByTestId('directory-close').click();await p.getByTestId('directory-popup').waitFor({state:'hidden'});await p.getByTestId('home-tab-archive').click();await p.waitForTimeout(400);
for(const id of ['menu-history','menu-prescriptions','menu-medications','menu-records']){
 await p.getByTestId(id).click();await p.getByTestId('archive-popup').waitFor();await p.waitForTimeout(400);const box=await p.getByTestId('archive-popup').boundingBox();expect(box!.y).toBeCloseTo(reference!.y,0);expect(box!.height).toBeCloseTo(reference!.height,0);
 await p.getByTestId('add-archive-item').click();await expect(p.getByTestId(id==='menu-medications'?'medication-name':'record-title')).toBeVisible();const form=await p.getByTestId('archive-popup').boundingBox();expect(form!.y).toBeCloseTo(reference!.y,0);
 await p.getByTestId('archive-detail-back').click();await expect(p.getByTestId('add-archive-item')).toBeVisible();await p.screenshot({path:'test-results/'+id+'-popup.png'});await p.getByTestId('archive-close').click();await p.getByTestId('archive-popup').waitFor({state:'hidden'});await expect(p.getByTestId('home-context')).toContainText('Todo en un solo lugar');
}
console.log('PASS all four Archive popups match Directory geometry, internal forms/back, close and retain Archivo page');
}finally{await b.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});
