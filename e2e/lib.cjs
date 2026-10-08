// Utilitários compartilhados dos scripts de validação em navegador (Playwright).
// Sem NODE_PATH global: `playwright-core` é devDependency do projeto. O Chromium vem de
// PLAYWRIGHT_CHROMIUM_PATH ou do cache do Playwright (`npx playwright-core install chromium`).
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');

/** Soluções de referência, lidas direto do conteúdo do jogo (Node >= 22.18 executa .ts). */
function loadSolutions() {
  const script =
    "import('./src/content/challenges.ts').then((m) => console.log(JSON.stringify(Object.fromEntries(" +
    'm.ALL_CHALLENGES.map((c) => [c.id, { title: c.title, solution: c.solution.code }])))))';
  const out = execFileSync(process.execPath, ['--no-warnings', '-e', script], {
    cwd: root,
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

const BASE = process.env.DEVBET_URL || 'http://localhost:3100';
const OUT = process.env.E2E_OUT || path.join(root, 'e2e', '.out');
require('node:fs').mkdirSync(OUT, { recursive: true });

function launch() {
  return chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
}

module.exports = { chromium, launch, loadSolutions, BASE, OUT, root };
