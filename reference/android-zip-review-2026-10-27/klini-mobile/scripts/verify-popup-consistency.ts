import {chromium,expect} from '@playwright/test';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:844}});try{
let baseline:any;
for(const section of ['directory','agenda','teleconsult','insurance']){
await p.goto('http://127.0.0.1:8096');await p.getByTestId('menu-'+section).click();await p.waitForTimeout(500);
const box=await p.getByTestId(section+'-popup').boundingBox();if(!baseline)baseline=box;expect(box!.y).toBeCloseTo(baseline.y,0);expect(box!.height).toBeCloseTo(baseline.height,0);
if(section==='directory'){await p.screenshot({path:'test-results/directory-search-compact.png'});await p.getByTestId('booking-search-submit').click();await expect(p.getByTestId('directory-tab-all')).toBeVisible();}
if(section==='teleconsult'){await p.locator('[data-testid^="teleconsult-appointment-"]').first().click();expect((await p.getByTestId('teleconsult-popup').boundingBox())!.y).toBeCloseTo(baseline.y,0);await p.getByTestId('teleconsult-reschedule').click();expect((await p.getByTestId('teleconsult-popup').boundingBox())!.y).toBeCloseTo(baseline.y,0);}
}
console.log('PASS equal popup top/height for directory, agenda, teleconsult and insurance; teleconsult internal navigation; search button');
}finally{await b.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});
