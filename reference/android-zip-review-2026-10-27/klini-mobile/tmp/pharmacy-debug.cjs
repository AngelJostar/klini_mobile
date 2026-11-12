const { chromium } = require('@playwright/test');
(async () => {
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
page.on('pageerror',e=>console.log('ERROR',e.message));
page.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE',m.text()); });
page.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()?.errorText));
await page.goto('http://127.0.0.1:8097/pharmacy');
await page.waitForTimeout(15000);
console.log((await page.locator('body').innerText()).slice(0,8000));
await page.screenshot({path:'test-results/pharmacy-layout/diagnostic.png'});
await browser.close();
})().catch(console.error);
