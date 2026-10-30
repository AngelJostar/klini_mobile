import {chromium,expect} from '@playwright/test';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:844}});try{
await p.goto('http://127.0.0.1:8096');await p.getByTestId('header-profile').click();
await expect(p.locator('[data-testid^="managed-profile-demo-"]')).toHaveCount(4);
await expect(p.getByTestId('profile-requests')).toHaveCount(0);
await p.getByTestId('profile-add').click();await p.getByTestId('managed-profile-save').click();await expect(p.getByRole('alert')).toContainText('Revisa el nombre');
await p.getByTestId('managed-profile-name').fill('Leo Prueba');await p.getByTestId('managed-profile-save').click();
await expect(p.getByRole('button',{name:'Editar perfil de Leo Prueba',exact:true})).toBeVisible();
await p.getByRole('button',{name:'Editar perfil de Leo Prueba',exact:true}).click();await p.getByTestId('managed-profile-name').fill('Leo Actualizado');await p.getByTestId('managed-profile-save').click();
await p.getByTestId('profile-close').click();await p.getByTestId('profile-drawer').waitFor({state:'hidden'});await p.reload();await p.getByTestId('header-profile').click();
await expect(p.getByRole('button',{name:'Editar perfil de Leo Actualizado',exact:true})).toBeVisible();
await expect(p.getByTestId('profile-edit')).toContainText('Sofía Martínez');
await p.getByTestId('profile-edit').scrollIntoViewIfNeeded();await p.screenshot({path:'test-results/managed-profiles.png'});
await p.getByTestId('profile-logout').click();await p.getByTestId('profile-cancel-logout').click();
await p.setViewportSize({width:320,height:640});await p.getByTestId('profile-add').click();await expect(p.getByTestId('managed-profile-save')).toBeVisible();console.log('PASS managed profiles add, validation, edit, persistence, owner preserved, logout and 320px');
}finally{await b.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});


