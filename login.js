/**
 * login.js — Rode UMA VEZ para fazer login com Google SSO.
 * O browser fica aberto para você completar o login manualmente.
 * A sessão é salva em ./session e reutilizada pelo ponto.js.
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

chromium.use(StealthPlugin());

const SESSION_DIR = path.join(__dirname, 'session');

(async () => {
  console.log('Abrindo browser para login...');
  console.log('Faça login com sua conta Google e aguarde redirecionar para o Factorial.');
  console.log('Quando estiver na tela principal do Factorial, pressione ENTER aqui.\n');

  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = browser.pages()[0] || await browser.newPage();
  await page.goto('https://app.factorialhr.com/?locale=pt-BR');

  // Aguarda o usuário fazer login e pressionar ENTER
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
    process.stdout.write('Pressione ENTER após fazer login no Factorial: ');
  });

  console.log('\nSessão salva! Agora você pode rodar: npm run ponto');
  await browser.close();
  process.exit(0);
})();
