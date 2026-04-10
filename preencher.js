/**
 * preencher.js — Fills open days with 08:00-12:00 and 13:00-17:00 shifts.
 */

const fs = require('fs');
const path = require('path');
const AttendanceFiller = require('./AttendanceFiller');

const SESSION_DIR = path.join(__dirname, 'session');

if (!fs.existsSync(SESSION_DIR)) {
  console.error('Session not found. Run first: npm run login');
  process.exit(1);
}

(async () => {
  const filler = new AttendanceFiller();
  try {
    await filler.run();
  } finally {
    await filler.close();
  }
})();
