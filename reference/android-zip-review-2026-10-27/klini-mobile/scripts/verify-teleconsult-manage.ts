import {chromium,expect} from '@playwright/test';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:844}});try{
await p.goto('http://127.0.0.1:8096');await p.getByTestId('menu-teleconsult').click();await p.locator('[data-testid^="teleconsult-appointment-"]').first().click();await p.getByTestId('teleconsult-reschedule').click();
await expect(p.getByTestId('teleconsult-confirm-change')).toBeDisabled();
await expect(p.locator('[data-testid^="reschedule-day-"]')).toHaveCount(42);
await p.locator('[data-testid^="reschedule-day-"]:not([aria-disabled="true"]):not([disabled])').last().click();
await p.locator('[data-testid^="reschedule-time-"]').first().click();await expect(p.getByTestId('teleconsult-confirm-change')).toBeEnabled();
await p.waitForTimeout(400);await p.screenshot({path:'test-results/teleconsult-reschedule.png'});
await p.getByTestId('teleconsult-confirm-change').click();await expect(p.getByTestId('teleconsult-appointment-detail')).toBeVisible();
await p.getByTestId('teleconsult-cancel').click();await expect(p.getByText('¿Cancelar esta cita?')).toBeVisible();await p.waitForTimeout(400);await p.screenshot({path:'test-results/teleconsult-cancel.png'});
await p.getByTestId('teleconsult-keep').click();await expect(p.getByTestId('teleconsult-reschedule')).toBeVisible();
await p.setViewportSize({width:320,height:640});await p.getByTestId('teleconsult-reschedule').click();await p.screenshot({path:'test-results/teleconsult-reschedule-320.png'});await p.getByTestId('teleconsult-keep').click();
await p.getByTestId('teleconsult-cancel').click();await p.getByTestId('teleconsult-confirm-cancel').click();await expect(p.getByTestId('teleconsult-detail-status')).toHaveText('Cita cancelada');console.log('PASS calendar, available slots, confirm change, keep appointment, cancel confirmation and 320px');
}finally{await b.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});
