import { chromium, expect } from '@playwright/test';
async function main() {
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page = await browser.newPage({viewport:{width:390,height:844}});
 try {
 await page.goto('http://127.0.0.1:8096');
 await page.getByTestId('menu-directory').click();
 await page.getByTestId('booking-search-submit').click();
 await page.getByTestId('booking-doctor-doctor-elena').click();
 await page.getByTestId('booking-profile-next').click();
 await expect(page.getByTestId('booking-calendar-toggle')).toContainText('Ver Calendario');
 await page.getByTestId('booking-calendar-toggle').click();
 await expect(page.locator('[data-testid^="booking-calendar-day-"]')).toHaveCount(42);
 const day = page.locator('[data-testid^="booking-calendar-day-"]:not([aria-disabled="true"]):not([disabled])').last();
 await day.click();
 await page.getByRole('button',{name:/^Seleccionar \d/}).first().click();
 await expect(page.getByTestId('booking-schedule-next')).toBeEnabled();
 await page.getByTestId('booking-calendar-toggle').click();
 await expect(page.getByTestId('booking-calendar')).toHaveCount(0);
 await expect(page.getByTestId('booking-schedule-next')).toBeEnabled();
 await page.setViewportSize({width:320,height:740});
 await page.getByTestId('booking-calendar-toggle').scrollIntoViewIfNeeded();
 await page.screenshot({path:'test-results/directory-calendar-button.png'});
 await page.getByTestId('booking-calendar-toggle').click();
 await page.getByTestId('booking-calendar').scrollIntoViewIfNeeded();
 await page.screenshot({path:'test-results/directory-calendar.png'});
 console.log('PASS calendar toggle, 42 days, available date/time selection, preserved selection, 320px');
 } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

