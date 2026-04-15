const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

chromium.use(StealthPlugin());

const SESSION_DIR = path.join(__dirname, 'session');
const APP_URL = 'https://app.factorialhr.com';

async function createBrowser(headless = false) {
  return chromium.launchPersistentContext(SESSION_DIR, {
    headless,
    args: ['--disable-blink-features=AutomationControlled'],
  });
}

function getPage(browser) {
  return browser.pages()[0] || browser.newPage();
}

function assertSession(page) {
  const url = page.url();
  if (url.includes('login') || url.includes('accounts.google')) {
    throw new Error('Session expired. Run: npm run login');
  }
}

module.exports = { SESSION_DIR, APP_URL, createBrowser, getPage, assertSession };
