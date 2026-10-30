import {chromium, expect} from '@playwright/test';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:844}});try{
await p.goto('http://127.0.0.1:8096');await p.getByTestId('menu-directory').click();await p.getByTestId('booking-search-submit').click();
await p.getByTestId('directory-tab-favorites').click();await expect(p.getByTestId('booking-doctor-doctor-elena')).toBeVisible();
await p.getByTestId('directory-results-search').fill('ningun-medico');await expect(p.getByText('No encontramos coincidencias')).toBeVisible();
await p.getByTestId('directory-results-search').fill('');await p.getByTestId('directory-favorite-doctor-elena').click();await expect(p.getByTestId('booking-doctor-doctor-elena')).toHaveCount(0);
await p.getByTestId('directory-tab-all').click();await p.getByTestId('directory-favorite-doctor-elena').click();await p.getByTestId('directory-tab-favorites').click();
await p.screenshot({path:'test-results/directory-favorites.png'});await p.setViewportSize({width:320,height:640});await p.screenshot({path:'test-results/directory-favorites-320.png'});
await p.getByTestId('booking-doctor-doctor-elena').click();await expect(p.getByTestId('booking-profile-next')).toBeVisible();console.log('PASS favorites tabs, search, remove/add favorite, doctor navigation and 320px');
}finally{await b.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});
