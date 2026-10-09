// Bordas do jogo: regras de boss, loja (recusas explicadas), derrota, vitória e segunda run.
// Uso: node e2e/edge.js [mobile]
const f = require('./flow.cjs');
const log = console.log;
const MOBILE = process.argv[2] === 'mobile';
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};
const text = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

(async () => {
  const browser = await f.launch();
  const all = [];

  // ---- regras dos bosses
  {
    const { ctx, page, errors } = await f.open(browser, { mobile: MOBILE });
    all.push(errors);
    await f.startRun(page);
    await f.forge(page, 'r.ante = 0; r.blindIndex = 1;');
    await f.startBlind(page);
    const cards = page.locator('[data-tutorial="hand"] button');
    for (let i = 0; i < 4; i++) await cards.nth(i).click();
    const play = page.getByRole('button', { name: 'Jogar mão' });
    check(await play.isDisabled(), 'Boss 1: 4 cartas desabilitam Jogar mão');
    check(/no máximo 3/.test(await text(page)), 'Boss 1: a tela explica o limite de 3 cartas');
    await cards.nth(3).click();
    check(!(await play.isDisabled()), 'Boss 1: 3 cartas liberam Jogar mão');

    await f.forge(page, "r.status='blind'; r.ante = 1; r.blindIndex = 1; r.round = null;");
    await f.startBlind(page);
    const anuladas = await page.locator('text=ANULADA').count();
    const handNames = await cards.evaluateAll((els) =>
      els.map((e) => e.getAttribute('aria-label') || ''),
    );
    const controle = handNames.filter((n) => /Controle/.test(n)).length;
    check(anuladas === controle, `Boss 2: cartas de CONTROLE anuladas (${anuladas}/${controle})`);

    await f.forge(page, "r.status='blind'; r.ante = 2; r.blindIndex = 1; r.round = null;");
    await f.startBlind(page);
    check((await f.getRun(page)).round.handsLeft === 3, 'Boss 3: uma mão a menos (3)');

    await f.forge(page, "r.status='blind'; r.ante = 3; r.blindIndex = 1; r.round = null;");
    await f.startBlind(page);
    await cards.nth(0).click();
    const discard = page.getByRole('button', { name: /^Descartar/ });
    check(await discard.isDisabled(), 'Boss 4: Descartar desabilitado');
    check(/não permite descartes/.test(await text(page)), 'Boss 4: a razão aparece na tela');
    await ctx.close();
  }

  // ---- loja: recusas com motivo
  {
    const { ctx, page, errors } = await f.open(browser, { mobile: MOBILE });
    all.push(errors);
    await f.startRun(page);
    await f.forge(
      page,
      "r.status='shop'; r.round=null; r.money=1; r.shop={items:[{kind:'joker',id:'comprehension',price:8},{kind:'card',cardId:'for',price:3}],rerolls:0};",
    );
    await page
      .getByRole('button', { name: /^Comprar/ })
      .first()
      .click({ force: true });
    check(/Faltam 7 fichas/.test(await text(page)), 'Loja: sem fichas explica quanto falta');
    check((await f.getRun(page)).jokers.length === 0, 'Loja: a compra recusada não muda nada');
    await f.forge(
      page,
      "r.money=99; r.jokers=['fstring','ternary','any-all','stdlib','comments']; r.shop={items:[{kind:'joker',id:'comprehension',price:8}],rerolls:0};",
    );
    await page
      .getByRole('button', { name: /^Comprar/ })
      .first()
      .click();
    check(
      /espaços de joker estão cheios/.test(await text(page)),
      'Loja: joker com slots cheios explica',
    );
    await page.getByRole('button', { name: /^Vender F-STRING/ }).click();
    await page
      .getByRole('button', { name: /^Comprar/ })
      .first()
      .click();
    await page.waitForTimeout(500);
    const run = await f.getRun(page);
    check(
      run.jokers.includes('comprehension') && run.jokers.length === 5,
      'Loja: vender libera o espaço e a compra passa',
    );
    await ctx.close();
  }

  // ---- derrota: 4 mãos desistidas
  {
    const { ctx, page, errors } = await f.open(browser, { mobile: MOBILE });
    all.push(errors);
    await f.startRun(page);
    await f.startBlind(page);
    for (let i = 0; i < 4; i++) {
      await f.playCards(page, 1);
      await page.getByRole('button', { name: 'Desistir' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Desistir' }).click();
      await page.waitForTimeout(800);
      await f.continueAfterScore(page);
    }
    check(/BUST/.test(await text(page)), 'Derrota: a tela final mostra BUST');
    check(/por que a casa venceu/i.test(await text(page)), 'Derrota: explica o motivo');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1200);
    check(/BUST/.test(await text(page)), 'Derrota: o resultado sobrevive ao reload');
    check((await f.getProfile(page)).runsPlayed === 2, 'Derrota: conta uma vez no perfil');
    await page.getByRole('button', { name: /Tentar novamente/ }).click();
    await f.startRun(page);
    check((await f.getRun(page)).status === 'blind', 'Derrota: segunda run começa limpa');
    await ctx.close();
  }

  // ---- vitória: última blind
  {
    const { ctx, page, errors } = await f.open(browser, { mobile: MOBILE });
    all.push(errors);
    await f.startRun(page);
    await f.forge(page, 'r.ante = 4; r.blindIndex = 1;');
    await f.startBlind(page);
    await f.forge(page, 'r.round.target = 1;');
    await f.playCards(page, 1);
    check(
      (await f.exerciseTitle(page)) === 'THE INFINITE LOOP',
      'Boss final: a 1ª mão é THE INFINITE LOOP',
    );
    await f.solveAndDeliver(page);
    await f.continueAfterScore(page);
    await page.getByRole('button', { name: 'Concluir run' }).click();
    await page.waitForTimeout(800);
    check(/JACKPOT/.test(await text(page)), 'Vitória: a tela final mostra JACKPOT');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1200);
    check(/JACKPOT/.test(await text(page)), 'Vitória: sobrevive ao reload');
    const profile = await f.getProfile(page);
    check(
      profile.runsWon === 1 && profile.xp > 0,
      `Vitória: perfil com runsWon=${profile.runsWon} e xp=${profile.xp}`,
    );
    await ctx.close();
  }

  await browser.close();
  const errors = all.flat();
  log('ERRORS', JSON.stringify(errors));
  log(
    problems.length || errors.length
      ? 'RESULT: FAIL ' + JSON.stringify(problems)
      : 'RESULT: ALL PASS',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
