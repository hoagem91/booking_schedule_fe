// Read-only API fixtures: verify real body-cell layout and status-tag centering.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.TABLE_QA_NODE_MODULES || process.cwd()] }));
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
async function run() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.TABLE_QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => sessionStorage.setItem('booking-schedule-auth', JSON.stringify({ token: 'fixture', authenticated: true, expiryTime: '2099-01-01T00:00:00Z', userId: 41, patientId: null })));
    const item = { id: 1, appointmentCode: 'LH-MINH-HOA', patientId: 1, patientCode: 'BN-001', patientName: 'Người bệnh minh họa', patientPhone: '0900000000', doctorId: 5, doctorCode: 'BS-005', doctorName: 'Bác sĩ minh họa', serviceId: 2, serviceName: 'Khám tổng quát', servicePrice: 250000, finalAmount: 250000, reviewEligible: false, timeSlotId: 1, startTime: '09:00:00', endTime: '09:30:00', appointmentDate: '2026-10-22', status: 'CONFIRMED', reason: null, note: null, createdAt: '2026-10-22T08:00:00', updatedAt: '2026-10-22T08:00:00' };
    await context.route('**/booking-schedule/**', async route => {
      const endpoint = new URL(route.request().url()).pathname;
      let result;
      if (endpoint.endsWith('/users/me')) result = { id: 41, username: 'fixture', fullName: 'Nhân viên minh họa', status: 'ACTIVE', roles: [{ id: 1, name: 'STAFF' }] };
      else if (endpoint.endsWith('/appointments/search')) result = { content: [item], totalElements: 1, totalPages: 1, number: 0, size: 20, first: true, last: true, empty: false, numberOfElements: 1 };
      else throw new Error('Unexpected API blocked: ' + endpoint);
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 1000, result }) });
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.TABLE_QA_URL || 'http://127.0.0.1:4311/management/appointments');
    const tag = page.locator('nz-tag.appointment-status-tag').first(); await tag.waitFor();
    await tag.scrollIntoViewIfNeeded();
    const alignment = await tag.evaluate(element => {
      const cell = element.closest('td'), a = element.getBoundingClientRect(), b = cell.getBoundingClientRect();
      return { textAlign: getComputedStyle(cell).textAlign, marginEnd: getComputedStyle(element).marginInlineEnd, offset: Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2) };
    });
    assert.equal(alignment.textAlign, 'center'); assert.equal(alignment.marginEnd, '0px'); assert.ok(alignment.offset < 1, JSON.stringify(alignment));
    const row = tag.locator('xpath=ancestor::tr');
    assert.equal(await row.locator('td').filter({ hasText: 'LH-MINH-HOA' }).first().evaluate(element => getComputedStyle(element).textAlign), 'left');
    assert.ok(await row.locator('td').evaluateAll(cells => cells.some(cell => getComputedStyle(cell).textAlign === 'right')));
    const shots = path.resolve('docs/screenshots/table-alignment'); fs.mkdirSync(shots, { recursive: true });
    await page.screenshot({ path: path.join(shots, 'status-centered.png'), animations: 'disabled' });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', alignment, pageErrors: errors }, null, 2));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
