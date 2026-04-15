const { APP_URL, createBrowser, getPage, assertSession } = require('./browser');

class AttendanceFiller {
  constructor() {
    const now = new Date();
    this.url = `${APP_URL}/attendance/clock-in/monthly/${now.getFullYear()}/${now.getMonth() + 1}/1`;
    this.browser = null;
    this.page = null;
  }

  async launch() {
    this.browser = await createBrowser(false);
    this.page = await getPage(this.browser);
  }

  async navigate() {
    console.log('Loading attendance page...');
    await this.page.goto(this.url, { waitUntil: 'networkidle', timeout: 30000 });

    assertSession(this.page);

    await this.selectCompanyIfNeeded();

    await this.page.waitForSelector('button[data-intercom-target="attendance-row-toggle"]', { timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  async selectCompanyIfNeeded() {
    const questEdu = this.page.locator('text=Quest Edu').first();
    const visible = await questEdu.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
      console.log('Selecting company Quest Edu...');
      await questEdu.click();
      await this.page.waitForTimeout(3000);
      await this.page.goto(this.url, { waitUntil: 'networkidle', timeout: 30000 });
    }
  }

  async findOpenDays() {
    return this.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const result = [];

      for (const row of rows) {
        const toggleBtn = row.querySelector('button[data-intercom-target="attendance-row-toggle"]');
        if (!toggleBtn || toggleBtn.disabled) continue;

        const text = row.textContent || '';
        if (!text.includes('-8h')) continue;

        const match = text.match(/(\d{1,2})\s*(abr|mar|mai|jun|jul|ago|set|out|nov|dez|jan|fev)/i);
        const label = match ? `${match[1]} ${match[2]}` : text.substring(0, 20).trim();
        result.push(label);
      }

      return result;
    });
  }

  async fillDay(dayLabel) {
    console.log(`\n-> ${dayLabel}`);

    const btnIndex = await this.page.evaluate((label) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      let idx = 0;
      for (const row of rows) {
        const btn = row.querySelector('button[data-intercom-target="attendance-row-toggle"]');
        if (!btn) continue;
        if (row.textContent.includes(label)) return idx;
        idx++;
      }
      return -1;
    }, dayLabel);

    if (btnIndex === -1) {
      console.log(`  Row not found for "${dayLabel}", skipping.`);
      return;
    }

    const toggleBtn = this.page.locator('button[data-intercom-target="attendance-row-toggle"]').nth(btnIndex);

    await toggleBtn.scrollIntoViewIfNeeded();
    await toggleBtn.click();
    await this.page.waitForTimeout(1200);

    console.log('  08:00 - 12:00...');
    await this.addShift('08:00', '12:00');
    console.log('  08:00 - 12:00 done');

    // After applying, the row may collapse — re-expand it before adding the second shift
    await this.page.waitForTimeout(1000);
    const addBtnVisible = await this.page
      .locator('button[data-intercom-target="attendance-row-add-shift-button"]')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!addBtnVisible) {
      console.log('  Row collapsed, re-expanding...');
      await toggleBtn.scrollIntoViewIfNeeded();
      await toggleBtn.click();
      await this.page.waitForTimeout(1200);
    }

    console.log('  13:00 - 17:00...');
    await this.addShift('13:00', '17:00');
    console.log('  13:00 - 17:00 done');

    // Collapse the row
    await this.page.waitForTimeout(500);
    await toggleBtn.scrollIntoViewIfNeeded();
    await toggleBtn.click();
    await this.page.waitForTimeout(800);

    console.log(`  ${dayLabel} complete!`);
  }

  async addShift(start, end) {
    const addBtn = this.page.locator('button[data-intercom-target="attendance-row-add-shift-button"]').first();
    await addBtn.waitFor({ state: 'visible', timeout: 8000 });
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();
    await this.page.waitForTimeout(1500);

    const inputs = this.page.locator('input[type="time"], input._14l8ais0');
    for (let attempt = 1; attempt <= 3; attempt++) {
      const count = await inputs.count();
      if (count >= 2) break;
      console.log(`    Inputs not ready (${count}), retrying... (${attempt}/3)`);
      await addBtn.click();
      await this.page.waitForTimeout(2000);
    }

    const count = await inputs.count();
    const inputStart = inputs.nth(count - 2);
    const inputEnd = inputs.nth(count - 1);

    await inputStart.fill(start);
    await this.page.waitForTimeout(300);
    await inputStart.dispatchEvent('change');
    await this.page.waitForTimeout(400);

    await inputEnd.fill(end);
    await this.page.waitForTimeout(300);
    await inputEnd.dispatchEvent('change');
    await this.page.waitForTimeout(400);

    await this.setLocationRemote();
    await this.clickApply();
  }

  async setLocationRemote() {
    const locationSelect = this.page
      .locator('select')
      .filter({ has: this.page.locator('option[value="work_from_home"]') })
      .last();
    const visible = await locationSelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (visible) {
      await locationSelect.selectOption('work_from_home');
      await this.page.waitForTimeout(300);
    }
  }

  async clickApply() {
    const applyBtn = this.page.locator('button').filter({ hasText: 'Aplicar' });
    await applyBtn.waitFor({ state: 'visible', timeout: 8000 });
    await applyBtn.scrollIntoViewIfNeeded();

    for (let t = 0; t < 5; t++) {
      if (!(await applyBtn.isDisabled())) break;
      await this.page.waitForTimeout(400);
    }

    await applyBtn.click();
    await this.page.waitForTimeout(2000);
  }

  async close() {
    await this.browser.close();
  }

  async run() {
    await this.launch();
    try {
      await this.navigate();

      const days = await this.findOpenDays();

      if (days.length === 0) {
        console.log('No open days found. All good!');
        return;
      }

      console.log(`Days to fill: ${days.join(', ')}`);

      for (const day of days) {
        await this.fillDay(day);
      }

      console.log('\nDone!');
    } finally {
      await this.close();
    }
  }
}

module.exports = AttendanceFiller;
