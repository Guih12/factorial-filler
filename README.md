# ponto-factorial

Automates time tracking on Factorial HR using Playwright.

Fills open days with two shifts: **08:00–12:00** and **13:00–17:00**, with location set to **Trabalho remoto**.

## Setup

```bash
npm install
npx playwright install chromium
```

## Usage

### 1. Login (run once)

```bash
npm run login
```

A browser window will open. Sign in with your Google account, then press **ENTER** in the terminal. The session is saved to `./session` and reused on future runs.

> If the session expires, just run `npm run login` again.

### 2. Fill open days

```bash
node preencher.js
```

Finds all days in the current month with a `-8h` balance (no hours registered) and fills them automatically.

## Files

| File | Description |
|------|-------------|
| `login.js` | One-time Google SSO login |
| `preencher.js` | Fills all open days in the month |
| `session/` | Saved browser session (gitignored) |
