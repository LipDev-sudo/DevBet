// Ações de alto nível do jogo para os scripts de e2e (Playwright): abrir, jogar mãos, resolver exercícios.
const { launch, loadSolutions, BASE, OUT } = require('./lib.cjs');

const sols = loadSolutions();
const byTitle = Object.fromEntries(Object.values(sols).map((v) => [v.title, v.solution]));
const byId = sols;

const PROFILE_DONE = JSON.stringify({
  version: 1,
  xp: 0,
  runsPlayed: 1,
  runsWon: 0,
  bestRunScore: 0,
  solved: {},
  seenCards: [],
  tutorialCompleted: true,
});

/** Contexto + página com coleta de erros de console. `tutorialDone` pula o tutorial (perfil de quem já jogou). */
async function open(browser, { mobile = false, tutorialDone = true, cpu = 1, spy = false } = {}) {
  const ctx = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 900 } },
  );
  if (spy) {
    // Registra o código que o jogo manda ao worker Python (o que realmente é executado).
    await ctx.addInitScript(() => {
      window.__posted = [];
      const original = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (message, ...rest) {
        if (message && typeof message.code === 'string') window.__posted.push(message.code);
        return original.call(this, message, ...rest);
      };
    });
  }
  if (tutorialDone) {
    await ctx.addInitScript((profile) => {
      if (!localStorage.getItem('devbet:profile:v1'))
        localStorage.setItem('devbet:profile:v1', profile);
    }, PROFILE_DONE);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()))
      errors.push(m.type() + ' ' + m.text().slice(0, 200));
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url());
  });
  if (cpu > 1) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  }
  await page.goto(BASE + '/play', { waitUntil: 'load' });
  return { ctx, page, errors };
}

const getRun = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('devbet:run:v1') || 'null'));
const getProfile = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('devbet:profile:v1') || 'null'));

/** Altera a run salva (para chegar rápido a um estado) e recarrega. Espera o autosave terminar antes. */
async function forge(page, src) {
  await page.waitForTimeout(600);
  await page.evaluate((s) => {
    const k = 'devbet:run:v1';
    const r = JSON.parse(localStorage.getItem(k));
    new Function('r', s)(r);
    localStorage.setItem(k, JSON.stringify(r));
  }, src);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);
}

const setCode = async (page, code) => {
  await page.waitForFunction(() => window.monaco && window.monaco.editor.getEditors().length > 0);
  await page.waitForTimeout(1500);
  await page.evaluate((c) => window.monaco.editor.getEditors()[0].setValue(c), code);
  await page.waitForTimeout(300);
};

async function startRun(page) {
  await page.getByText('Sentar à mesa').click();
  await page.waitForTimeout(600);
}

async function startBlind(page) {
  await page.getByRole('button', { name: 'Jogar blind' }).click();
  await page.waitForTimeout(600);
}

/** Escolhe `n` cartas da mão, na ordem (a 1ª lidera), e joga. */
async function playCards(page, n) {
  const cards = page.locator('[data-tutorial="hand"] button');
  for (let i = 0; i < n; i++) await cards.nth(i).click();
  await page.getByRole('button', { name: 'Jogar mão' }).click();
  await page.waitForTimeout(1200);
}

const exerciseTitle = async (page) => (await page.locator('h1').first().innerText()).trim();
const solutionFor = (title) => byTitle[title];

/** Resolve o exercício aberto com a solução oficial, testa com Executar e entrega. */
async function solveAndDeliver(page, { skipRun = false } = {}) {
  const title = await exerciseTitle(page);
  const code = byTitle[title];
  if (!code) throw new Error('sem solução para ' + title);
  await setCode(page, code);
  if (!skipRun) {
    await page.getByRole('button', { name: 'Executar' }).click();
    await page.waitForTimeout(4000);
  }
  await page.getByRole('button', { name: 'Entregar' }).click();
  await page
    .getByRole('button', { name: /Continuar|Blind vencida|Suas mãos acabaram/ })
    .waitFor({ timeout: 30000 });
  return title;
}

const continueBtn = (page) =>
  page.getByRole('button', { name: /Continuar|Blind vencida|Suas mãos acabaram/ });

/** Segue depois do placar (espera a animação liberar o botão). */
async function continueAfterScore(page) {
  const skip = page.getByRole('button', { name: 'Pular animação' });
  if (await skip.count()) await skip.click().catch(() => {});
  await continueBtn(page).click();
  await page.waitForTimeout(700);
}

/** Joga mãos de 5 cartas até a blind ser vencida ou perdida; devolve o estado final salvo. */
async function clearBlind(page, { cards = 5, maxHands = 4 } = {}) {
  for (let i = 0; i < maxHands; i++) {
    const run = await getRun(page);
    if (run.status !== 'round') break;
    await playCards(page, Math.min(cards, 5));
    await solveAndDeliver(page);
    await page.waitForTimeout(800);
    await continueAfterScore(page);
  }
  await page.waitForTimeout(500);
  return getRun(page);
}

module.exports = {
  launch,
  BASE,
  OUT,
  sols,
  byId,
  open,
  getRun,
  getProfile,
  forge,
  setCode,
  startRun,
  startBlind,
  playCards,
  exerciseTitle,
  solutionFor,
  solveAndDeliver,
  continueAfterScore,
  clearBlind,
};
