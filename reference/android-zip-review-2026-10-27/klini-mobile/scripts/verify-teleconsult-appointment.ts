import {chromium,expect} from '@playwright/test';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:844}});try{
await p.goto('http://127.0.0.1:8096');await p.getByTestId('menu-teleconsult').click();await p.locator('[data-testid^="teleconsult-appointment-"]').first().click();await expect(p.getByText('Tu cita',{exact:true})).toBeVisible();await expect(p.getByText('Precio informativo. Sin cobro en este paso.')).toBeVisible();await p.screenshot({path:'test-results/teleconsult-appointment.png'});
p.once('dialog',d=>d.dismiss());await p.getByTestId('teleconsult-cancel').click();await expect(p.getByTestId('teleconsult-reschedule')).toBeVisible();
await p.getByTestId('teleconsult-reschedule').click();await p.waitForURL('**/directory?rescheduleId=*');await expect(p.getByText('Elige tu horario.')).toBeVisible();await p.getByTestId('directory-close').click();await p.getByTestId('directory-popup').waitFor({state:'hidden'});
await p.getByTestId('menu-teleconsult').click();await p.locator('[data-testid^="teleconsult-appointment-"]').first().click();await p.setViewportSize({width:320,height:640});await p.screenshot({path:'test-results/teleconsult-appointment-320.png'});
p.once('dialog',d=>d.accept());await p.getByTestId('teleconsult-cancel').click();await expect(p.getByTestId('teleconsult-detail-status')).toHaveText('Cita cancelada');await expect(p.getByTestId('teleconsult-cancel')).toHaveCount(0);
await p.getByTestId('teleconsult-detail-back').click();await p.getByTestId('teleconsult-tab-history').click();await expect(p.getByText('Cancelada',{exact:true})).toBeVisible();
console.log('PASS Tu cita details, cancellation confirmation, cancellation state and reschedule existing appointment.');
}finally{await b.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});

