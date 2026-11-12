const { chromium } = require('@playwright/test');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
await page.goto('http://127.0.0.1:8097');await page.getByTestId('header-menu').click();await page.getByTestId('nav-pharmacy').click();
await page.getByTestId('pharmacy-popup').waitFor({state:'attached'});
const ys=[];for(let i=0;i<26;i++){ys.push((await page.getByTestId('pharmacy-popup').boundingBox()).y);await page.evaluate(()=>new Promise(requestAnimationFrame));}
if(Math.max(...ys)<=70||Math.abs(ys.at(-1)-68)>1)throw new Error('Slide animation geometry not verified '+JSON.stringify(ys));
console.log(JSON.stringify({slideUp:true,start:ys[0],end:ys.at(-1)}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
