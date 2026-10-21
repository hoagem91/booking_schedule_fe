// Fixture-only browser regression for the appointments toolbar.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.TABLE_QA_NODE_MODULES || process.cwd()] }));
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
async function run() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.TABLE_QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const requests = [], errors = [];
  const shots = path.resolve('docs/screenshots/appointments-toolbar'); fs.mkdirSync(shots, { recursive: true });
  let page;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => sessionStorage.setItem('booking-schedule-auth', JSON.stringify({ token: 'fixture', authenticated: true, expiryTime: '2099-01-01T00:00:00Z', userId: 41, patientId: null })));
    await context.route('**/booking-schedule/**', async route => {
      const endpoint = new URL(route.request().url()).pathname.replace('/booking-schedule', '');
      let result;
      if (endpoint === '/users/me') result = { id: 41, username: 'fixture', fullName: 'Nhân viên minh họa', status: 'ACTIVE', roles: [{ id: 1, name: 'STAFF' }] };
      else if (endpoint.endsWith('/appointments/search')) {
        requests.push(route.request().postDataJSON());
        result = { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true, empty: true, numberOfElements: 0 };
      } else throw new Error('Unexpected API: ' + endpoint);
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 1000, result }) });
    });
    page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', error => errors.push(error.message));
    await Promise.all([page.waitForResponse(response => response.url().includes('/appointments/search')), page.goto(process.env.TABLE_QA_URL || 'http://127.0.0.1:4310/management/appointments')]);
    const input = () => page.getByRole('textbox', { name: 'Tìm lịch hẹn', exact: true });
    await input().waitFor();
    const styles = await page.locator('#header').evaluate(element => {
      const css = getComputedStyle(element);
      return { className: element.className, backgroundImage: css.backgroundImage, borderLeft: css.borderLeftWidth, padding: css.padding };
    });
    assert.ok(!styles.className.includes('page-header'));
    assert.equal(styles.backgroundImage, 'none'); assert.equal(styles.borderLeft, '0px'); assert.equal(styles.padding, '0px');
    assert.ok((await input().getAttribute('class')).includes('ant-input'));
    assert.ok((await input().boundingBox()).width > 200);
    await input().fill('  LH-001  ');
    await Promise.all([page.waitForResponse(response => response.url().includes('/appointments/search')), input().press('Enter')]);
    assert.equal(requests.at(-1).keyword, 'LH-001'); assert.ok(!('searchText' in requests.at(-1)));
    await input().fill('Nguyễn Văn A');
    await Promise.all([page.waitForResponse(response => response.url().includes('/appointments/search')), page.getByRole('button', { name: 'Tìm kiếm lịch hẹn', exact: true }).click()]);
    assert.equal(requests.at(-1).keyword, 'Nguyễn Văn A');
    await input().fill('');
    await Promise.all([page.waitForResponse(response => response.url().includes('/appointments/search')), input().press('Enter')]);
    assert.equal(requests.at(-1).keyword, null);
    await page.screenshot({ path: path.join(shots, 'desktop.png'), animations: 'disabled' });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const box = await input().boundingBox(); assert.ok(box.width > 100 && box.x >= 0 && box.x + box.width <= width + 1);
      await page.screenshot({ path: path.join(shots, `mobile-${width}.png`), animations: 'disabled' });
    }
    assert.deepEqual(errors, []);
    assert.equal(requests.length, 4, 'One initial load plus one request per search');
    console.log(JSON.stringify({ result: 'PASS', searches: requests, header: styles, errors, screenshots: shots }, null, 2));
  } catch (error) { console.error(JSON.stringify({ requests, errors })); if (page) { await page.screenshot({ path: path.join(shots, 'failure.png') }); console.error('Header count:', await page.locator('#header').count()); } throw error; } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });



