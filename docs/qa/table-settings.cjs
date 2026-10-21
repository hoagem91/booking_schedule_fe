// Only synthetic API responses; this script never reaches the real backend.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.TABLE_QA_NODE_MODULES || process.cwd()] }));
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
async function run() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.TABLE_QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const shots = path.resolve('docs/screenshots/table-settings'); fs.mkdirSync(shots, { recursive: true });
  const errors = [], calls = [];
  let page;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN' });
    await context.addInitScript(() => {
      sessionStorage.setItem('booking-schedule-auth', JSON.stringify({ token: 'fixture-only', authenticated: true, expiryTime: '2099-01-01T00:00:00Z', userId: 41, patientId: null }));
      sessionStorage.setItem('booking-schedule-auth-area', 'management');
    });
    await context.route('**/booking-schedule/**', async route => {
      const endpoint = new URL(route.request().url()).pathname.replace('/booking-schedule', ''); calls.push(endpoint);
      let result;
      if (endpoint === '/users/me') result = { id: 41, username: 'fixture', fullName: 'Nhân viên minh họa', status: 'ACTIVE', roles: [{ id: 1, name: 'STAFF' }] };
      else if (endpoint.endsWith('/appointments/search')) result = { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true, empty: true, numberOfElements: 0 };
      else throw new Error('Unexpected API blocked: ' + endpoint);
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 1000, result }) });
    });
    page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.env.TABLE_QA_URL || 'http://127.0.0.1:4310') + '/management/appointments');
    await page.getByRole('button', { name: 'Cài đặt bảng', exact: true }).waitFor();
    const trigger = () => page.getByRole('button', { name: 'Cài đặt bảng', exact: true });
    const popover = () => page.locator('.ant-popover').filter({ visible: true });
    await trigger().click();
    const phone = () => popover().getByRole('checkbox', { name: 'Số điện thoại', exact: true });
    await phone().uncheck();
    assert.equal(await phone().isChecked(), false);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('booking-schedule:table-settings:v1:41:appointments')));
    assert.equal(stored.columns.find(column => column.key === 'patientPhone').visible, false);
    await page.screenshot({ path: path.join(shots, 'popover-desktop.png') });
    await Promise.all([page.waitForResponse(response => response.url().includes('/appointments/search')), page.reload()]); await page.locator('app-share-table').waitFor(); await trigger().click(); assert.equal(await phone().isChecked(), false);
    await popover().getByRole('button', { name: 'Nâng cao', exact: false }).click();
    const drawer = () => page.locator('.ant-drawer-content').filter({ visible: true });
    await drawer().getByText('Cài đặt cột hiển thị', { exact: true }).waitFor();
    const phoneRow = () => drawer().locator('.cdk-drag').filter({ has: page.getByText('Số điện thoại', { exact: true }) });
    await phoneRow().getByRole('checkbox').check();
    await phoneRow().getByRole('spinbutton').fill('320');
    await page.screenshot({ path: path.join(shots, 'advanced-desktop.png') });
    await drawer().getByRole('button', { name: /Lưu/ }).click();
    await page.getByText('Cài đặt cột hiển thị', { exact: true }).waitFor({ state: 'hidden' });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('booking-schedule:table-settings:v1:41:appointments')));
    assert.equal(saved.columns.find(column => column.key === 'patientPhone').width, 320);
    assert.equal(saved.columns.find(column => column.key === 'patientPhone').visible, true);
    await trigger().click(); await popover().getByRole('button', { name: 'Nâng cao', exact: false }).click();
    await phoneRow().getByRole('checkbox').uncheck();
    await drawer().locator('.ant-drawer-close').click();
    await page.getByText('Cài đặt cột hiển thị', { exact: true }).waitFor({ state: 'hidden' });
    await trigger().click(); assert.equal(await phone().isChecked(), true);
    await popover().getByRole('button', { name: 'Nâng cao', exact: false }).click();
    await drawer().getByRole('button', { name: 'Cài lại mặc định', exact: false }).click();
    await page.locator('.ant-popover-buttons button.ant-btn-primary').click();
    await page.getByText('Cài đặt cột hiển thị', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => localStorage.getItem('booking-schedule:table-settings:v1:41:appointments')), null);
    await page.setViewportSize({ width: 390, height: 844 });
    await trigger().click(); await popover().getByRole('button', { name: 'Nâng cao', exact: false }).click();
    await drawer().getByText('Cài đặt cột hiển thị', { exact: true }).waitFor();
    await page.waitForFunction(() => { const box = document.querySelector('.ant-drawer-content')?.getBoundingClientRect(); return box && box.left >= -1 && box.right <= innerWidth + 1; }); await page.screenshot({ path: path.join(shots, 'advanced-mobile.png'), fullPage: true, animations: 'disabled' });
    assert.ok(await drawer().evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'Drawer overflow on mobile');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', apiCalls: calls.length, errors, screenshots: shots }, null, 2));
  } catch (error) {
    if (page) { await page.screenshot({ path: path.join(shots, 'failure.png'), fullPage: true }); console.error('Page errors:', errors); }
    throw error;
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });




