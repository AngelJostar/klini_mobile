import {chromium,expect} from '@playwright/test';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:844}});try{
await p.goto('http://127.0.0.1:8096');await p.getByTestId('menu-directory').click();await p.waitForTimeout(450);
const initial=await p.getByTestId('directory-popup').boundingBox();
async function stable(){const box=await p.getByTestId('directory-popup').boundingBox();expect(box!.y).toBeCloseTo(initial!.y,0);expect(box!.height).toBeCloseTo(initial!.height,0);}
await p.getByTestId('booking-search-submit').click();await stable();
await p.getByTestId('booking-doctor-doctor-elena').click();await stable();
await p.getByTestId('booking-profile-next').click();await stable();
await p.getByTestId('booking-calendar-toggle').click();await stable();
await p.locator('[data-testid^="booking-calendar-day-"]:not([aria-disabled="true"]):not([disabled])').last().click();await p.getByRole('button',{name:/^Seleccionar \d/}).first().click();await p.getByTestId('booking-schedule-next').click();await stable();
await p.getByTestId('booking-service-next').click();await stable();await p.getByTestId('booking-patient-next').click();await stable();
await p.getByTestId('directory-detail-back').click();await stable();
await p.screenshot({path:'test-results/directory-fixed-panel.png'});console.log('PASS fixed top and height in steps 1–7, calendar expansion and back navigation');
}finally{await b.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});
