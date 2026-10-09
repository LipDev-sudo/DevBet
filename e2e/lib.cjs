// Utilitários compartilhados dos scripts de validação em navegador (Playwright).
// Sem NODE_PATH global: `playwright-core` é devDependency do projeto. O Chromium vem de
// PLAYWRIGHT_CHROMIUM_PATH ou do cache do Playwright (`npx playwright-core install chromium`).
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');

/** Respostas certas de todas as perguntas, lidas direto do conteúdo (Node >= 22.18 executa .ts). */
function loadAnswers() {
  const script =
    "import('./src/content/quiz.ts').then((m) => console.log(JSON.stringify(Object.fromEntries(" +
    'm.ALL_QUESTIONS.map((q) => [q.id, { answer: q.answer, options: q.options.length }])))))';
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

module.exports = { chromium, launch, loadAnswers, BASE, OUT, root };
