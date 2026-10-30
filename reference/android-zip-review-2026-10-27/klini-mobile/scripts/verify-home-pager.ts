import {chromium,expect} from '@playwright/test';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:844}});try{
await p.goto('http://127.0.0.1:8096');const ids=['home-fixed-logo','home-fixed-bottom','header-profile','quick-register'];const before=await Promise.all(ids.map(id=>p.getByTestId(id).boundingBox()));
await p.getByTestId('home-tab-archive').click();await expect(p.getByTestId('home-context')).toContainText('Todo en un solo lugar');await p.waitForTimeout(500);
for(let i=0;i<ids.length;i++)expect(await p.getByTestId(ids[i]).boundingBox()).toEqual(before[i]);
await p.getByTestId('menu-medications').click();await expect(p.getByText('Agregar medicamento',{exact:true})).toBeVisible();await p.goBack();await expect(p.getByTestId('home-context')).toContainText('Todo en un solo lugar');
await p.getByTestId('menu-prescriptions').click();await expect(p).toHaveURL(/recordType=Receta/);await p.goBack();await p.getByTestId('menu-history').click();await expect(p).toHaveURL(/recordType=Consulta/);await p.goBack();await p.getByTestId('menu-records').click();await expect(p.getByTestId('archive-search')).toBeVisible();await p.goBack();
await p.getByTestId('home-tab-today').click();await expect(p.getByTestId('home-context')).toContainText('PRÓXIMA CITA');await p.waitForTimeout(400);await p.screenshot({path:'test-results/home-pager-today.png'});
await p.setViewportSize({width:320,height:640});await p.getByTestId('home-tab-archive').click();await p.waitForTimeout(400);await p.screenshot({path:'test-results/home-pager-small.png'});await expect(p.getByTestId('quick-register')).toBeInViewport();await expect(p.getByTestId('home-tab-archive')).toBeInViewport();console.log('PASS fixed elements, both tabs, four archive destinations, return state and 320px');
}finally{await b.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});

