const { launch, loadSolutions, BASE: BASE_URL, OUT: S } = require('./lib.cjs');
const sols = loadSolutions();
const byTitle = Object.fromEntries(Object.entries(sols).map(([id, v]) => [v.title, v.solution]));
const RATE = Number(process.argv[2] || 1);
const MOBILE = process.argv[3] === 'mobile';
const BASE = BASE_URL;
const log = console.log;
const errors = [];
let fails = 0;
const check = (name, ok, extra = '') => {
  if (!ok) fails++;
  log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' | ' + extra : ''}`);
};
const getRun = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('devbet:run:v1') || 'null'));
const getProf = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('devbet:profile:v1') || 'null'));
const val = (page) => page.evaluate(() => window.monaco.editor.getEditors()[0].getValue());
const posted = (page) => page.evaluate(() => window.__posted.slice());
async function fresh(browser, done = true) {
  const ctx = await browser.newContext(
    MOBILE
      ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 900 } },
  );
  await ctx.addInitScript(() => {
    window.__posted = [];
    const o = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (m, ...r) {
      try {
        if (m && typeof m.code === 'string') {
          window.__posted.push(m.code);
          if (window.__delay) {
            const self = this;
            setTimeout(() => o.call(self, m, ...r), window.__delay);
            return;
          }
        }
      } catch (e) {}
      return o.call(this, m, ...r);
    };
    if ('__done' in window) return;
  });
  if (done)
    await ctx.addInitScript(() => {
      if (!localStorage.getItem('devbet:profile:v1'))
        localStorage.setItem(
          'devbet:profile:v1',
          JSON.stringify({
            version: 1,
            xp: 0,
            runsPlayed: 1,
            runsWon: 0,
            bestRunScore: 0,
            solved: {},
            seenCards: [],
            tutorialCompleted: true,
          }),
        );
    });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 160)));
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()))
      errors.push(m.type() + ' ' + m.text().slice(0, 160));
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url());
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await page.goto(BASE + '/play', { waitUntil: 'load' });
  return { ctx, page, cdp };
}
const toChallenge = async (page) => {
  await page.getByText('Sentar à mesa').click();
  await page.waitForTimeout(500);
  await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Começar desafio' }).click();
  await page.waitForTimeout(800);
  await ready(page);
};
const ready = async (page) => {
  await page.waitForFunction(
    () => window.monaco && window.monaco.editor.getEditors().length > 0,
    null,
    { timeout: 60000 },
  );
  await page.waitForTimeout(2500 * Math.min(RATE, 4));
};
const focusEditor = async (page) => {
  await page.locator('.monaco-editor').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const b = await page.locator('.monaco-editor').first().boundingBox();
  if (MOBILE) await page.touchscreen.tap(b.x + b.width / 2, b.y + 50);
  else await page.mouse.click(b.x + b.width / 2, b.y + 50);
  await page.waitForTimeout(300);
  return page.evaluate(
    () => !!(document.activeElement && document.activeElement.closest('.monaco-editor')),
  );
};
const clearAll = async (page) => {
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(200);
};
const norm = (s) => s.replace(/\s+/g, '');
const execBtn = (page) => page.locator('.wood.sticky').getByRole('button').first();
async function runAndCompare(page, tag) {
  const visible = await val(page);
  const before = (await posted(page)).length;
  await page.locator('.wood.sticky').scrollIntoViewIfNeeded();
  await execBtn(page).click();
  await page.waitForTimeout(1000);
  const t0 = Date.now();
  while ((await posted(page)).length === before && Date.now() - t0 < 60000)
    await page.waitForTimeout(200);
  const p = await posted(page);
  const sent = p[p.length - 1];
  check(
    `${tag}: Executar enviou exatamente o código visível`,
    sent === visible,
    sent === visible
      ? ''
      : JSON.stringify({ sent: sent && sent.slice(0, 60), visible: visible.slice(0, 60) }),
  );
  await page.waitForFunction(() => !document.body.innerText.includes('Executando…'), null, {
    timeout: 90000,
  });
  await page.waitForTimeout(900);
  return visible;
}

(async () => {
  const browser = await launch();
  log(`==== CPU x${RATE} ${MOBILE ? 'mobile 390x844' : 'desktop 1280x900'}`);

  // ---------- 2/6: digitação, edição no meio, apagar, executar A/B/C, entregar
  {
    const { ctx, page } = await fresh(browser);
    await toChallenge(page);
    const title = (await page.locator('h1').first().innerText()).trim();
    check('foco real no Monaco após toque/clique', await focusEditor(page));
    await clearAll(page);
    const marker = '# ' + 'abcdefghijklmnopqrstuvwxyz0123456789 '.repeat(3);
    await page.keyboard.type(marker, { delay: 0 });
    await page.waitForTimeout(800);
    check(
      'digitação rápida sem perda',
      (await val(page)) === marker,
      JSON.stringify((await val(page)).slice(0, 50)),
    );
    await page.keyboard.press('Control+Home');
    await page.keyboard.type('INS1 ', { delay: 0 });
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('ZZ', { delay: 0 });
    await page.waitForTimeout(800);
    const expected1 = 'INSZZ' + marker;
    check(
      'inserir no meio + apagar + inserir',
      (await val(page)) === expected1,
      JSON.stringify((await val(page)).slice(0, 40)),
    );
    for (let i = 0; i < 5; i++) await page.keyboard.press('Delete');
    await page.waitForTimeout(500);
    check(
      'apagar à frente (5 caracteres) exatamente',
      (await val(page)) === 'INSZZ' + marker.slice(5),
      '',
    );
    await page.waitForTimeout(1200);
    const draft = (await getRun(page)).encounter.draft;
    check('draft no save = texto visível', draft === (await val(page)));
    // A, B, C
    const A = 'def calcular_total(p, q, d): return 0';
    const B = 'def calcular_total(p, q, d): return p * q';
    await clearAll(page);
    await page.keyboard.type(A, { delay: 0 });
    await page.waitForTimeout(500);
    check('código A digitado', norm(await val(page)) === norm(A));
    await runAndCompare(page, 'A');
    await focusEditor(page);
    await clearAll(page);
    await page.keyboard.type(B, { delay: 0 });
    await page.waitForTimeout(500);
    check('código B digitado', norm(await val(page)) === norm(B));
    await runAndCompare(page, 'B');
    const C = byTitle[title].replace(/\n/g, ' ').replace(/ {2,}/g, ' ');
    // C em uma linha só (válido em Python para este desafio): def f(...): return ...
    const Cline = 'def calcular_total(p, q, d): return p * q - d';
    await focusEditor(page);
    await clearAll(page);
    await page.keyboard.type(Cline, { delay: 0 });
    await page.waitForTimeout(500);
    check('código C digitado', norm(await val(page)) === norm(Cline));
    await runAndCompare(page, 'C');
    // entregar o que está visível
    const visibleC = await val(page);
    const beforeP = (await posted(page)).length;
    await page.locator('.wood.sticky').getByRole('button', { name: 'Entregar' }).click();
    const t0 = Date.now();
    while ((await posted(page)).length === beforeP && Date.now() - t0 < 60000)
      await page.waitForTimeout(200);
    const pp = await posted(page);
    check('Entregar enviou exatamente o código visível', pp[pp.length - 1] === visibleC);
    await page.getByRole('heading', { name: /BUST|MÃO VENCEDORA/ }).waitFor({ timeout: 120000 });
    check('entrega aprovada', (await page.locator('h1').first().innerText()).includes('VENCEDORA'));
    await ctx.close();
  }

  // ---------- 5: draft + reload + editar + executar; "Usar no editor" + digitar imediatamente
  {
    const { ctx, page } = await fresh(browser);
    await toChallenge(page);
    await focusEditor(page);
    await clearAll(page);
    const D = '# rascunho ' + 'x1y2z3 '.repeat(6);
    await page.keyboard.type(D, { delay: 0 });
    await page.waitForTimeout(1500 * Math.min(RATE, 4));
    await page.reload({ waitUntil: 'load' });
    await ready(page);
    check(
      'draft restaurado exatamente após reload',
      (await val(page)) === D,
      JSON.stringify((await val(page)).slice(0, 40)),
    );
    await focusEditor(page);
    await page.keyboard.press('Control+End');
    await page.keyboard.type(' EDIT', { delay: 0 });
    await page.waitForTimeout(600);
    check('editar o draft restaurado', (await val(page)) === D + ' EDIT');
    await runAndCompare(page, 'draft restaurado');
    // Usar no editor
    await page.evaluate(() => {
      const k = 'devbet:run:v1';
      const r = JSON.parse(localStorage.getItem(k));
      r.encounter.hintLevel = 5;
      r.encounter.failedRuns = 4;
      r.encounter.solutionViewed = true;
      localStorage.setItem(k, JSON.stringify(r));
    });
    await page.reload({ waitUntil: 'load' });
    await ready(page);
    const title = (await page.locator('h1').first().innerText()).trim();
    const reopen = page.getByRole('button', { name: /Reabrir a solução/ });
    await reopen.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await reopen.click({ force: true });
    await page.waitForTimeout(400);
    await page.getByRole('dialog').getByRole('button', { name: 'Usar no editor' }).click();
    await page.locator('.monaco-editor').first().scrollIntoViewIfNeeded();
    await focusEditor(page);
    await page.keyboard.press('Control+Home');
    await page.keyboard.type('# ok\n', { delay: 0 });
    await page.waitForTimeout(1500);
    const after = await val(page);
    check(
      '"Usar no editor" e digitar logo depois: solução intacta + texto novo',
      after.startsWith('# ok') &&
        norm(after.slice(after.indexOf('\n') + 1)) === norm(byTitle[title]),
      JSON.stringify(after.slice(0, 50)),
    );
    await ctx.close();
  }

  // ---------- 7: run encerrada imutável (execução pendente + abandono)
  {
    const { ctx, page } = await fresh(browser);
    await toChallenge(page);
    await focusEditor(page);
    await clearAll(page);
    await page.keyboard.type('def calcular_total(p, q, d): return p * q - d', { delay: 0 });
    await page.waitForTimeout(800);
    const before = await getProf(page);
    await page.evaluate(() => {
      window.__delay = 4000;
    }); // a execução só chega ao worker 4 s depois: dá tempo de abandonar com ela pendente
    const bar = page.locator('.wood.sticky');
    await bar.getByRole('button', { name: 'Entregar' }).click();
    await page.getByRole('button', { name: 'Abandonar run' }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Abandonar run' }).click({ force: true });
    await page.waitForTimeout(200);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Abandonar$/ })
      .click();
    await page.getByRole('heading', { name: 'RUN ABANDONADA' }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(8000 * Math.min(RATE, 4));
    const run = await getRun(page);
    const prof = await getProf(page);
    check(
      'após abandonar com entrega pendente: continua RUN ABANDONADA e nada foi resolvido',
      run.status === 'lost' &&
        run.endReason === 'abandoned' &&
        run.history.length === 0 &&
        Object.keys(prof.solved).length === 0 &&
        prof.xp === before.xp &&
        prof.runsPlayed === before.runsPlayed + 1,
      JSON.stringify({
        status: run.status,
        hist: run.history.length,
        xp: prof.xp,
        runsPlayed: prof.runsPlayed,
      }),
    );
    check(
      'tela final intacta',
      (await page.locator('h1').first().innerText()).trim() === 'RUN ABANDONADA',
    );
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    check(
      'reload: resultado permanece',
      (await page.locator('h1').first().innerText()).trim() === 'RUN ABANDONADA',
    );
    await ctx.close();
  }

  // ---------- 8: smoke — primeira run (tutorial) → editor → executar → entregar → reload → segunda run
  {
    const { ctx, page } = await fresh(browser, false);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(500);
    check(
      'tutorial: coach presente',
      (await page.locator('section[aria-label="Guia do Dealer"]').count()) === 1,
    );
    await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('[aria-label="Sua mão"] .playing-card').first().click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const ack = page.locator('section[aria-label="Guia do Dealer"] button', { hasText: 'Entendi' });
    if (await ack.count()) await ack.click();
    await page.getByRole('button', { name: 'Começar desafio' }).click();
    await page.waitForTimeout(800);
    await ready(page);
    await focusEditor(page);
    await clearAll(page);
    const title = (await page.locator('h1').first().innerText()).trim();
    const fn =
      title === 'O Troco da Mesa'
        ? 'def calcular_total(p, q, d): return p * q - d'
        : 'def saudacao(nome): return "Olá, " + nome + "!"';
    await page.keyboard.type('x = 1', { delay: 0 });
    await page.waitForTimeout(400);
    check(
      'tutorial: Entregar travado antes de Executar',
      await page.locator('.wood.sticky').getByRole('button', { name: 'Entregar' }).isDisabled(),
    );
    await runAndCompare(page, 'tutorial 1ª execução');
    check(
      'tutorial: Entregar liberado após execução real',
      await page.locator('.wood.sticky').getByRole('button', { name: 'Entregar' }).isEnabled(),
    );
    await page.reload({ waitUntil: 'load' });
    await ready(page);
    check(
      'tutorial: reload mantém lição e rascunho',
      (await page.locator('section[aria-label="Guia do Dealer"]').getAttribute('data-lesson')) ===
        'deliver' && (await val(page)) === 'x = 1',
    );
    await ctx.close();
  }

  // ---------- 8b: segunda run normal (editor/execute/deliver) + abandono → reload → nova run
  {
    const { ctx, page } = await fresh(browser, true);
    await toChallenge(page);
    check(
      'segunda run: sem coach',
      (await page.locator('section[aria-label="Guia do Dealer"]').count()) === 0,
    );
    const title = (await page.locator('h1').first().innerText()).trim();
    await focusEditor(page);
    await clearAll(page);
    const code =
      title === 'O Troco da Mesa'
        ? 'def calcular_total(p, q, d): return p * q - d'
        : 'def saudacao(nome): return "Olá, " + nome + "!"';
    await page.keyboard.type(code, { delay: 0 });
    await page.waitForTimeout(500);
    await runAndCompare(page, '2ª run');
    const vis = await val(page);
    const n = (await posted(page)).length;
    await page.locator('.wood.sticky').getByRole('button', { name: 'Entregar' }).click();
    await page.getByRole('heading', { name: /BUST|MÃO VENCEDORA/ }).waitFor({ timeout: 120000 });
    const pp = await posted(page);
    check('2ª run: Entregar usou o código visível', pp[pp.length - 1] === vis && pp.length > n);
    await page.getByRole('button', { name: 'Abandonar run' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Abandonar$/ })
      .click();
    await page.getByRole('heading', { name: 'RUN ABANDONADA' }).waitFor();
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    check(
      'abandono → reload mantém resultado',
      (await page.locator('h1').first().innerText()).trim() === 'RUN ABANDONADA',
    );
    await page.getByRole('button', { name: /Nova run|Tentar novamente/ }).click();
    await page.waitForTimeout(500);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(500);
    check(
      'nova run funciona',
      (await page.locator('h1').first().innerText()).includes('THE HOUSE'),
    );
    await ctx.close();
  }

  log('ERRORS', JSON.stringify(errors));
  log(`RESULT: ${fails === 0 ? 'ALL PASS' : fails + ' FAIL'}`);
  await browser.close();
})();
