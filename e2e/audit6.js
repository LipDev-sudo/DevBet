const { launch, loadSolutions, BASE: BASE_URL, OUT: S } = require('./lib.cjs');
const sols = loadSolutions();
const byTitle = Object.fromEntries(Object.entries(sols).map(([id, v]) => [v.title, v.solution]));
const BASE = BASE_URL;
const log = console.log;
const errors = [];
const getRun = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('devbet:run:v1') || 'null'));
const getProf = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('devbet:profile:v1') || 'null'));
const setRun = (page, fn) =>
  page.evaluate((src) => {
    const k = 'devbet:run:v1';
    const r = JSON.parse(localStorage.getItem(k));
    new Function('r', src)(r);
    localStorage.setItem(k, JSON.stringify(r));
  }, fn);
const snap = async (page) => {
  const r = await getRun(page);
  const p = await getProf(page);
  return JSON.stringify({
    chips: r && r.chips,
    st: r && r.status,
    lives: r && r.lives,
    deck: r && r.deck.length,
    layer: r && r.layerIndex,
    xp: p.xp,
    rp: p.runsPlayed,
    rw: p.runsWon,
    runs: r && r.encounter && r.encounter.runsUsed,
  });
};
const editorReady = async (page) => {
  await page.waitForFunction(() => window.monaco && window.monaco.editor.getEditors().length > 0);
  await page.waitForTimeout(2500);
};
const type = async (page, code) => {
  await page.locator('.monaco-editor').first().scrollIntoViewIfNeeded();
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type(code, { delay: 0 });
  await page.waitForTimeout(400);
};
const setVal = async (page, code) => {
  await page.evaluate((c) => window.monaco.editor.getEditors()[0].setValue(c), code);
  await page.waitForTimeout(300);
};
const dealerText = async (page) =>
  (await page.locator('section[aria-label="Dealer"]').first().innerText())
    .replace(/\s+/g, ' ')
    .slice(0, 330);
async function fresh(browser, done = true) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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
  await page.goto(BASE + '/play', { waitUntil: 'load' });
  return { ctx, page };
}
const toChallenge = async (page, pick = 0) => {
  await page.getByText('Sentar à mesa').click();
  await page.waitForTimeout(500);
  await page.locator('ol button').filter({ hasText: 'Meta' }).nth(pick).click();
  await page.waitForTimeout(400);
};
const start = async (page) => {
  await page.getByRole('button', { name: 'Começar desafio' }).click();
  await page.waitForTimeout(800);
  await editorReady(page);
};

(async () => {
  const browser = await launch();

  // ===== A: matriz do sandbox + classificação do Dealer (primeiro desafio: calcular_total)
  if (!process.env.SKIPA) {
    const { ctx, page } = await fresh(browser);
    await toChallenge(page, 0);
    const title = (await page.locator('h1').first().innerText()).trim();
    const fn = title === 'O Troco da Mesa' ? 'calcular_total(p, q, d)' : 'saudacao(nome)';
    // estimativa na mesa
    const est = (
      await page
        .getByText(/Sua estimativa/)
        .locator('xpath=following-sibling::*')
        .first()
        .innerText()
    ).replace(/[^\d]/g, '');
    await start(page);
    log('A0: título', title, '| estimativa na mesa =', est);
    const cases =
      title === 'O Troco da Mesa'
        ? {
            correto: byTitle[title],
            sintaxe: 'def calcular_total(p, q, d)\n    return 1',
            nome: 'def calcular_total(p, q, d):\n    return p * qtd - d',
            tipo: "def calcular_total(p, q, d):\n    return p + 'x'",
            timeout: 'def calcular_total(p, q, d):\n    while True:\n        pass',
            import_ok:
              'import math\ndef calcular_total(p, q, d):\n    return math.floor(p * q - d)',
            import_bloq: 'import os\ndef calcular_total(p, q, d):\n    return 1',
            open_proibido: "def calcular_total(p, q, d):\n    open('/etc/passwd')\n    return 1",
            breakpoint_bloq: 'def calcular_total(p, q, d):\n    breakpoint()\n    return p * q - d',
            getattr_bloq: 'def calcular_total(p, q, d):\n    return getattr(p, "real") * q - d',
            vazio: '',
          }
        : {};
    for (const [name, code] of Object.entries(cases)) {
      await setVal(page, code);
      await page.waitForTimeout(700);
      await page.locator('.wood.sticky').getByRole('button').first().click();
      await page.waitForTimeout(4200);
      log(`A[${name}]:`, await dealerText(page));
    }
    // código longo
    await setVal(page, '# ' + 'x'.repeat(4100) + '\n' + byTitle[title]);
    await page.waitForTimeout(500);
    const bar = page.locator('.wood.sticky');
    log(
      'A[longo]: Executar disabled =',
      await bar.getByRole('button').first().isDisabled(),
      '| Entregar disabled =',
      await bar.getByRole('button', { name: 'Entregar' }).isDisabled(),
      '| contador =',
      await page.getByText(/\/4000/).innerText(),
      '| explicação visível =',
      (await page.getByText(/4000 caracteres|limite|muito longo|passou de/i).allInnerTexts())
        .join(' // ')
        .slice(0, 200),
    );
    await ctx.close();
  }

  // ===== B: estimativa × pontuação real (entrega de primeira, SAFE, sem dicas)
  {
    const { ctx, page } = await fresh(browser);
    await toChallenge(page, 0);
    const estText = await page.evaluate(() => {
      const el = [...document.querySelectorAll('dt')].find((d) =>
        d.textContent.includes('Sua estimativa'),
      );
      return el.nextElementSibling.textContent;
    });
    const est = Number(estText.replace(/[^\d]/g, ''));
    await start(page);
    const title = (await page.locator('h1').first().innerText()).trim();
    await setVal(page, byTitle[title]);
    await page.waitForTimeout(500);
    await page.locator('.wood.sticky').getByRole('button').first().click();
    await page.waitForTimeout(4200);
    await page.locator('.wood.sticky').getByRole('button', { name: 'Entregar' }).click();
    await page.getByRole('heading', { name: /BUST|MÃO VENCEDORA/ }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(700);
    const o = (await getRun(page)).encounter.outcome;
    log(
      'B: estimativa',
      est,
      '| pontuação real',
      o.score.total,
      '| iguais =',
      est === o.score.total,
      '| chipsBefore/After',
      o.chipsBefore,
      o.chipsAfter,
      '| UI saldo =',
      await page.getByText(/Saldo de fichas/).innerText(),
    );
    await ctx.close();
  }

  // ===== C: boss — Bust → revanche → vidas → fim
  {
    const { ctx, page } = await fresh(browser);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(500);
    await setRun(
      page,
      "r.layerIndex=8; r.history=[{challengeId:'calcular-total',score:1,bust:false}]; r.chips=100;",
    );
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await page.waitForTimeout(400);
    log('C: regras do boss visíveis =', (await page.getByText('Regras do boss').count()) > 0);
    for (let i = 1; i <= 3; i++) {
      await page.getByRole('radio', { name: /RISKY/ }).click();
      await page.getByRole('button', { name: 'Começar desafio' }).click();
      await page.waitForTimeout(700);
      const mid = await snap(page);
      await page.getByRole('button', { name: 'Desistir' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Desistir' }).click();
      await page.getByRole('heading', { name: 'BUST' }).waitFor();
      const btn = await page
        .getByRole('button', { name: /revanche|Encerrar|Continuar/ })
        .innerText();
      log(`C: boss derrota ${i}: antes ${mid} | botão = ${btn} | depois ${await snap(page)}`);
      await page.getByRole('button', { name: /revanche|Encerrar|Continuar/ }).click();
      await page.waitForTimeout(700);
      if (i < 3)
        log(
          'C:   revanche: tela =',
          (await page.locator('h1').first().innerText()).trim(),
          '| risco volta a SAFE =',
          await page.getByRole('radio', { name: /SAFE/ }).getAttribute('aria-checked'),
        );
    }
    log('C: fim =', (await page.locator('h1').first().innerText()).trim());
    await ctx.close();
  }

  // ===== D: reload em pontos críticos (comparar snapshot e tela)
  {
    const { ctx, page } = await fresh(browser);
    const reloadCheck = async (label) => {
      const s0 = await snap(page);
      const h0 = (await page.locator('h1').first().innerText()).trim();
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(1200);
      const s1 = await snap(page);
      const h1 = (await page.locator('h1').first().innerText()).trim();
      log(
        `D[${label}]: snapshot igual = ${s0 === s1} | tela ${h0 === h1 ? 'igual' : h0 + ' -> ' + h1}`,
      );
    };
    await reloadCheck('home/start');
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(400);
    await reloadCheck('lobby');
    await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await page.waitForTimeout(400);
    await reloadCheck('mesa/mão');
    await page.getByRole('radio', { name: /^SAFE/ }).click();
    await page.getByRole('button', { name: 'Começar desafio' }).click();
    await page.waitForTimeout(800);
    await editorReady(page);
    await reloadCheck('desafio/editor');
    const title = (await page.locator('h1').first().innerText()).trim();
    await type(page, '# rascunho');
    await page.waitForTimeout(400);
    await reloadCheck('editor com rascunho');
    await editorReady(page);
    await setVal(page, byTitle[title]);
    await page.waitForTimeout(500);
    await page.locator('.wood.sticky').getByRole('button').first().click();
    await page.waitForTimeout(4500);
    await reloadCheck('depois de Executar');
    await editorReady(page);
    await setVal(page, byTitle[title]);
    await page.waitForTimeout(500);
    await page.locator('.wood.sticky').getByRole('button', { name: 'Entregar' }).click();
    await page.getByRole('heading', { name: /BUST|MÃO VENCEDORA/ }).waitFor({ timeout: 30000 });
    await reloadCheck('depois de Entregar (resultado)');
    await page
      .locator('section[aria-labelledby="recompensa-titulo"] button.playing-card')
      .first()
      .click();
    await page.waitForTimeout(500);
    await reloadCheck('próxima mesa (lobby)');
    await setRun(
      page,
      "r.status='shop'; r.layerIndex=2; r.encounter=null; r.chips=90; r.shop={offers:['while','set'],rerolls:0,boughtLife:false};",
    );
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    await reloadCheck('loja');
    await ctx.close();
  }

  // ===== E: duas abas (mesmo contexto)
  {
    const { ctx, page: a } = await fresh(browser);
    await a.getByText('Sentar à mesa').click();
    await a.waitForTimeout(500);
    const b = await ctx.newPage();
    await b.goto(BASE + '/play', { waitUntil: 'load' });
    await b.waitForTimeout(1200);
    log('E: aba B vê a run da aba A =', (await b.locator('h1').first().innerText()).trim());
    // A avança (escolhe desafio)
    await a.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await a.waitForTimeout(800);
    log(
      'E: após A escolher desafio: storage status =',
      (await getRun(a)).status,
      '| aba B mostra =',
      (await b.locator('h1').first().innerText()).trim(),
    );
    // B (parada, possivelmente defasada) age: abandona
    await b.getByRole('button', { name: 'Abandonar run' }).click();
    await b.waitForTimeout(300);
    await b
      .getByRole('dialog')
      .getByRole('button', { name: /^Abandonar$/ })
      .click();
    await b.waitForTimeout(800);
    const st = await getRun(b);
    log(
      'E: depois de B abandonar: storage =',
      st && st.status,
      st && st.endReason,
      '| runsPlayed =',
      (await getProf(b)).runsPlayed,
    );
    await a.waitForTimeout(500);
    log('E: aba A mostra =', (await a.locator('h1').first().innerText()).trim());
    // A (defasada) tenta agir
    const startBtn = a.getByRole('button', { name: 'Começar desafio' });
    if (await startBtn.count()) {
      await startBtn.click();
      await a.waitForTimeout(800);
    }
    const st2 = await getRun(a);
    log(
      'E: depois de A (defasada) agir: storage =',
      st2 && st2.status,
      st2 && st2.endReason,
      '| runsPlayed =',
      (await getProf(a)).runsPlayed,
    );
    await ctx.close();
  }

  // ===== E2: aba parada não sobrescreve ao fechar; aba que avança é seguida pela outra
  {
    const { ctx, page: a } = await fresh(browser);
    await a.getByText('Sentar à mesa').click();
    await a.waitForTimeout(500);
    const b = await ctx.newPage();
    await b.goto(BASE + '/play', { waitUntil: 'load' });
    await b.waitForTimeout(1500);
    await a.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await a.waitForTimeout(500);
    await a.getByRole('button', { name: 'Começar desafio' }).click();
    await a.waitForTimeout(900);
    await b.waitForTimeout(600);
    log(
      'E2: aba B (parada) segue a aba A =',
      (await b.locator('h1').first().innerText()).trim(),
      '| status em B =',
      await b.evaluate(() => JSON.parse(localStorage.getItem('devbet:run:v1')).status),
    );
    await b.close();
    await a.waitForTimeout(500);
    log(
      'E2: depois de fechar a aba parada, storage =',
      (await getRun(a)).status,
      '(esperado challenge)',
    );
    await ctx.close();
  }

  log('ERRORS', JSON.stringify(errors));
  await browser.close();
})();
