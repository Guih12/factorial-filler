/**
 * preencher-api.js — Fills open days via Factorial API (no browser UI needed).
 * Uses session cookies from ./session (run `npm run login` first).
 */

const fs = require('fs');
const path = require('path');
const AttendanceFillerAPI = require('./AttendanceFillerAPI');

const SESSION_DIR = path.join(__dirname, 'session');

if (!fs.existsSync(SESSION_DIR)) {
  console.error('Session not found. Run first: npm run login');
  process.exit(1);
}

(async () => {
  const filler = new AttendanceFillerAPI();
  await filler.run();
})();
