const { APP_URL, createBrowser, getPage, assertSession } = require('./browser');

const API_URL = 'https://api.factorialhr.com';
const SHIFTS = [
  { clockIn: '08:00', clockOut: '12:00' },
  { clockIn: '13:00', clockOut: '17:00' },
];

class AttendanceFillerAPI {
  constructor() {
    this.cookieHeader = null;
  }

  async extractCookies() {
    console.log('Extracting session cookies...');
    const browser = await createBrowser(true);
    try {
      const page = await getPage(browser);
      await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
      assertSession(page);

      const [apiCookies, appCookies] = await Promise.all([
        browser.cookies(`${API_URL}`),
        browser.cookies(APP_URL),
      ]);

      this.cookieHeader = [...apiCookies, ...appCookies]
        .map(c => `${c.name}=${c.value}`)
        .join('; ');

      console.log(`Got ${apiCookies.length + appCookies.length} cookies.`);
    } finally {
      await browser.close();
    }
  }

  async request(method, urlPath, body) {
    const res = await fetch(`${API_URL}${urlPath}`, {
      method,
      headers: {
        'Accept': 'application/json',
        'Cookie': this.cookieHeader,
        ...(body && { 'Content-Type': 'application/json;charset=UTF-8' }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${method} ${urlPath} -> ${res.status}: ${text.substring(0, 200)}`);
    }
    return res.json();
  }

  async getPeriod(year, month) {
    console.log(`Fetching period for ${year}/${month}...`);
    const periods = await this.request('GET', `/attendance/periods?year=${year}&month=${month}`);
    if (!periods.length) throw new Error(`No period found for ${year}/${month}`);
    const period = periods[0];
    console.log(`Period ID: ${period.id} (employee: ${period.employee_id})`);
    return period;
  }

  async getExistingShifts(employeeId, year, month) {
    console.log('Checking existing shifts...');
    const shifts = await this.request('GET', `/attendance/shifts?employee_id=${employeeId}&year=${year}&month=${month}`);
    const filledDays = new Set(shifts.map(s => s.day));
    console.log(`Found ${filledDays.size} days already filled.`);
    return filledDays;
  }

  async getHolidayDays(year, month) {
    console.log('Fetching holidays...');
    try {
      const holidays = await this.request('GET', '/company_holidays');
      // The API returns holidays with years from when they were created (e.g. 2023),
      // not the current year. We match only by month+day since they recur annually.
      const holidayDays = new Set();
      for (const h of holidays) {
        const [, hMonth, hDay] = h.date.split('-').map(Number);
        if (hMonth === month) {
          holidayDays.add(hDay);
          console.log(`  Holiday: ${h.summary} (day ${hDay})`);
        }
      }
      return holidayDays;
    } catch (err) {
      console.warn(`  Could not fetch holidays (skipping): ${err.message.substring(0, 120)}`);
      return new Set();
    }
  }

  getWeekdaysInMonth(year, month) {
    const days = [];
    const today = new Date();
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dow = date.getDay();
      if (dow >= 1 && dow <= 5 && date <= today) {
        days.push(d);
      }
    }
    return days;
  }

  async createShift(periodId, year, month, day, clockIn, clockOut) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return this.request('POST', '/attendance/shifts', {
      period_id: periodId,
      day,
      date,
      reference_date: date,
      clock_in: clockIn,
      clock_out: clockOut,
      minutes: 0,
      observations: null,
      history: [],
      half_day: null,
      workable: true,
    });
  }

  async fillDay(periodId, year, month, day) {
    await Promise.all(
      SHIFTS.map(({ clockIn, clockOut }) =>
        this.createShift(periodId, year, month, day, clockIn, clockOut)
      )
    );
    console.log(`  ${SHIFTS.map(s => `${s.clockIn}-${s.clockOut}`).join(', ')} done`);
  }

  async run() {
    await this.extractCookies();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const period = await this.getPeriod(year, month);

    const [existingDays, holidayDays] = await Promise.all([
      this.getExistingShifts(period.employee_id, year, month),
      this.getHolidayDays(year, month),
    ]);

    const daysToFill = this.getWeekdaysInMonth(year, month)
      .filter(d => !existingDays.has(d) && !holidayDays.has(d));

    if (daysToFill.length === 0) {
      console.log('No open days found. All good!');
      return;
    }

    console.log(`Days to fill: ${daysToFill.join(', ')}`);

    for (const day of daysToFill) {
      console.log(`\n-> Day ${day}`);
      try {
        await this.fillDay(period.id, year, month, day);
      } catch (err) {
        console.error(`  Error on day ${day}: ${err.message}`);
      }
    }

    console.log('\nDone!');
  }
}

module.exports = AttendanceFillerAPI;
