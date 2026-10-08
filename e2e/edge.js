const { launch, loadSolutions, BASE: BASE_URL, OUT: S } = require('./lib.cjs');
const sols = loadSolutions();
const byTitle = Object.fromEntries(Object.entries(sols).map(([id, v]) => [v.title, v.solution]));
const MOBILE = process.argv[2] === 'mobile';
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
const setCode = async (page, code) => {
  await page.waitForFunction(() => window.monaco && window.monaco.editor.getEditors().length > 0);
  await page.waitForTimeout(2000);
  await page.evaluate((c) => window.monaco.editor.getEditors()[0].setValue(c), code);
  await page.waitForTimeout(300);
};
const shot = (page, n) => page.screenshot({ path: `${S}/edge${MOBILE ? 'm' : ''}-${n}.png` });
const notice = async (page) =>
  (await page.locator('[role=status]').filter({ hasText: /./ }).allInnerTexts())
    .join(' | ')
    .replace(/\s+/g, ' ');
async function fresh(browser, tutorialDone) {
  const ctx = await browser.newContext(
    MOBILE
      ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 900 } },
  );
  if (tutorialDone)
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
(async () => {
  const browser = await launch();

  // ---- D: abandono (global) + reload na tela final + segunda run
  {
    const { ctx, page } = await fresh(browser, false);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(500);
    await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Abandonar run' }).click();
    await page.waitForTimeout(300);
    log(
      'abandon modal:',
      (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ').slice(0, 160),
    );
    await shot(page, 'abandon-modal');
    await page.getByRole('dialog').getByRole('button', { name: 'Abandonar' }).click();
    await page.waitForTimeout(700);
    log(
      'after abandon: h1 =',
      (await page.locator('h1').first().innerText()).trim(),
      '| coach:',
      (await page.locator('section[aria-label="Guia do Dealer"]').innerText())
        .replace(/\s+/g, ' ')
        .slice(0, 120),
      '| profile',
      JSON.stringify(await getProf(page)).slice(0, 140),
    );
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    log(
      'after reload: h1 =',
      (await page.locator('h1').first().innerText()).trim(),
      '| run status =',
      (await getRun(page)).status,
      (await getRun(page)).endReason,
      '| runsPlayed =',
      (await getProf(page)).runsPlayed,
    );
    await shot(page, 'abandoned-reloaded');
    await page.goto(BASE + '/');
    await page.waitForTimeout(800);
    log('home CTA after ended run:', (await page.locator('main a.btn').first().innerText()).trim());
    await page.goto(BASE + '/play');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Nova run|Tentar novamente/ }).click();
    await page.waitForTimeout(600);
    log(
      'second run: coach =',
      await page.locator('section[aria-label="Guia do Dealer"]').count(),
      '| packs enabled =',
      await page.locator('input[name=pack]:not(:disabled)').count(),
    );
    await ctx.close();
  }

  // ---- I/J: limite de 60 execuções + entregar depois (run normal)
  {
    const { ctx, page } = await fresh(browser, true);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(500);
    await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Começar desafio' }).click();
    await page.waitForTimeout(800);
    const title = (await page.locator('h1').first().innerText()).trim();
    await setRun(page, 'r.encounter.runsUsed = 59');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await setCode(page, byTitle[title]);
    await page.getByRole('button', { name: 'Executar' }).click();
    await page.waitForTimeout(4500);
    const bar = page.locator('.wood.sticky');
    log(
      '60/60: bar =',
      (await bar.innerText()).replace(/\s+/g, ' ').slice(0, 160),
      '| Executar disabled =',
      await bar.getByRole('button').first().isDisabled(),
      '| Entregar disabled =',
      await bar.getByRole('button', { name: 'Entregar' }).isDisabled(),
    );
    await shot(page, 'limit');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await setCode(page, byTitle[title]);
    await bar.getByRole('button', { name: 'Entregar' }).click();
    await page.getByRole('heading', { name: /BUST|MÃO VENCEDORA/ }).waitFor({ timeout: 25000 });
    log('deliver after 60 →', (await page.locator('h1').first().innerText()).trim());
    await ctx.close();
  }

  // ---- K: loja (recibos, avisos), L: risco indisponível, troca de mão com 5 cartas
  {
    const { ctx, page } = await fresh(browser, true);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(500);
    await setRun(
      page,
      "r.status='shop'; r.layerIndex=2; r.chips=10; r.encounter=null; r.shop={offers:['while','set','search'],rerolls:0,boughtLife:false};",
    );
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page
      .getByRole('button', { name: /^Comprar/ })
      .first()
      .click({ force: true });
    await page.waitForTimeout(400);
    log(
      'shop 10 chips, tap Comprar →',
      await notice(page),
      '| chips =',
      (await getRun(page)).chips,
    );
    await page.getByRole('button', { name: /^Contratar/ }).click({ force: true });
    await page.waitForTimeout(300);
    log('tap Seguro without chips →', await notice(page));
    await setRun(page, 'r.chips=200');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const before = await getRun(page);
    await page
      .getByRole('button', { name: /^Comprar/ })
      .first()
      .click();
    await page.waitForTimeout(500);
    log(
      'buy →',
      await page.locator('p[role=status]').first().innerText(),
      '| deck',
      before.deck.length,
      '->',
      (await getRun(page)).deck.length,
    );
    await page
      .getByRole('button', { name: /^Melhorar/ })
      .first()
      .click();
    await page.waitForTimeout(400);
    log('upgrade →', await page.locator('p[role=status]').first().innerText());
    await page
      .getByRole('button', { name: /^Remover/ })
      .first()
      .click();
    await page.waitForTimeout(400);
    log('remove →', await page.locator('p[role=status]').first().innerText());
    await page.getByRole('button', { name: /^Rolar de novo/ }).click();
    await page.waitForTimeout(400);
    log('reroll →', await page.locator('p[role=status]').first().innerText());
    await page.getByRole('button', { name: /^Contratar/ }).click();
    await page.waitForTimeout(400);
    log(
      'insurance →',
      await page.locator('p[role=status]').first().innerText(),
      '| lives =',
      (await getRun(page)).lives,
    );
    await shot(page, 'shop-receipt');
    // troca de mão com exatamente 5 cartas
    await setRun(
      page,
      "r.status='table'; r.layerIndex=3; r.shop=null; r.deck=r.deck.slice(0,5); r.encounter={challengeId:'somar-ate',hand:r.deck.map(c=>c.uid),redrawsLeft:1,risk:'safe',failedRuns:0,failedSubmissions:0,voluntaryHints:0,hintLevel:0,solutionViewed:false,runsUsed:0,draft:null,outcome:null};",
    );
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const redraw = page.getByRole('button', { name: /Trocar mão/ });
    log(
      'deck 5: Trocar mão disabled =',
      await redraw.isDisabled(),
      '| reason visible:',
      (await page.getByText(/não há cartas novas/).count()) > 0,
    );
    await shot(page, 'redraw5');
    // risco indisponível na mesa 1
    await setRun(page, "r.layerIndex=0; r.chips=5; r.encounter.challengeId='calcular-total';");
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1200);
    log(
      'risk options:',
      (await page.getByRole('radiogroup').innerText()).replace(/\s+/g, ' ').slice(0, 280),
    );
    await ctx.close();
  }

  // ---- fim: sem fichas/sem vidas
  {
    const { ctx, page } = await fresh(browser, true);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(500);
    await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Começar desafio' }).click();
    await page.waitForTimeout(2500); // deixa o autosave (250 ms) terminar antes de forjar o estado
    await setRun(page, 'r.lives=1');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Desistir' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Desistir' }).click();
    await page.getByRole('heading', { name: 'BUST' }).waitFor();
    log(
      'last life lost: button =',
      await page.getByRole('button', { name: /Encerrar|Continuar|revanche/ }).innerText(),
    );
    await page.getByRole('button', { name: /Encerrar run/ }).click();
    await page.waitForTimeout(600);
    log('end h1 =', (await page.locator('h1').first().innerText()).trim());
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    log(
      'reload h1 =',
      (await page.locator('h1').first().innerText()).trim(),
      '| stats:',
      (await page.locator('dl').first().innerText()).replace(/\s+/g, ' '),
    );
    await shot(page, 'lost-reloaded');
    await ctx.close();
  }
  log('ERRORS', JSON.stringify(errors));
  await browser.close();
})();
