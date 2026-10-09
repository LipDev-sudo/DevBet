// Persistência: ação -> reload em ~<ms> (por padrão 120, antes do autosave de 250 ms) e hidratação sem save espúrio.
// Uso: node e2e/persist.js [ms]
const f = require('./flow.cjs');
const log = console.log;
const MS = Number(process.argv[2] || 120);
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};
const snap = (page) =>
  page.evaluate(() => ({
    h1: (document.querySelector('h1')?.innerText || '').trim(),
    money: (document.querySelector('header dd')?.innerText || '').trim(),
    hands: (document.body.innerText.match(/MÃOS\s*(\d)/i) || [])[1] || null,
    discards: (document.body.innerText.match(/DESCARTES\s*(\d)/i) || [])[1] || null,
    runs: (document.body.innerText.match(/Execuções (\d+)\/60/) || [])[1] || null,
    result:
      /BLIND VENCIDA|MÃO DESISTIDA|HIGH CARD|PAIR|FLUSH|STRAIGHT/.exec(
        document.body.innerText,
      )?.[0] || null,
    ended: /RUN ABANDONADA/.test(document.body.innerText),
  }));
const reloadFast = async (page) => {
  await page.waitForTimeout(MS);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
};

(async () => {
  const browser = await f.launch();
  log(`reload ${MS} ms após cada ação`);
  {
    const { ctx, page, errors } = await f.open(browser);
    await f.startRun(page);
    await page.getByRole('button', { name: 'Jogar blind' }).click();
    await reloadFast(page);
    let run = await f.getRun(page);
    check(
      run.status === 'round' && run.round.hand.length === 8,
      'Começar a blind sobrevive ao reload',
    );
    const handBefore = run.round.hand.join();

    // descarte: a mão nova e o contador sobrevivem
    const cards = page.locator('[data-tutorial="hand"] button');
    await cards.nth(0).click();
    await page.getByRole('button', { name: /^Descartar/ }).click();
    const afterDiscard = await snap(page);
    await reloadFast(page);
    run = await f.getRun(page);
    check(
      run.round.discardsLeft === 2 && run.round.hand.join() !== handBefore,
      'Descartar sobrevive ao reload (contador e mão nova)',
    );
    check(
      (await snap(page)).discards === afterDiscard.discards,
      `Descartes na tela iguais (${afterDiscard.discards})`,
    );

    // jogar mão: abre o exercício, e Executar conta
    await f.playCards(page, 2);
    const title = await f.exerciseTitle(page);
    await f.setCode(page, 'def x():\n    pass');
    await page.getByRole('button', { name: 'Executar' }).click();
    await page.waitForFunction(() => /Execuções 1\/60/.test(document.body.innerText));
    await reloadFast(page);
    run = await f.getRun(page);
    check(run.status === 'coding' && run.round.play.runsUsed === 1, 'Executar: contador sobrevive');
    check((await f.exerciseTitle(page)) === title, 'O mesmo exercício volta após o reload');

    // entregar: o resultado sobrevive
    await f.setCode(page, f.solutionFor(title));
    await page.getByRole('button', { name: 'Entregar' }).click();
    await page
      .getByRole('button', { name: /Continuar|Blind vencida|Suas mãos acabaram/ })
      .waitFor({ timeout: 30000 });
    const score = (await snap(page)).result;
    await reloadFast(page);
    run = await f.getRun(page);
    check(
      run.status === 'scored' && run.round.roundScore > 0 && run.round.handsLeft === 3,
      `Resultado sobrevive (${run.round.roundScore} pts, ${run.round.handsLeft} mãos)`,
    );
    check(Boolean(score), 'O placar aparece na tela');

    // abandono
    await page.getByRole('button', { name: 'Abandonar run' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Abandonar' }).click();
    await page.waitForFunction(() => /RUN ABANDONADA/.test(document.body.innerText));
    await reloadFast(page);
    run = await f.getRun(page);
    check(
      (await snap(page)).ended && run.endReason === 'abandoned',
      'Abandono sobrevive ao reload',
    );
    check((await f.getProfile(page)).runsPlayed === 2, 'O perfil contou a run uma vez só');
    check(errors.length === 0, 'Sem erros de console: ' + JSON.stringify(errors));
    await ctx.close();
  }
  {
    // compra: dinheiro, item e deck sobrevivem
    const { ctx, page } = await f.open(browser);
    await f.startRun(page);
    await f.forge(
      page,
      "r.status='shop'; r.ante=0; r.blindIndex=0; r.money=100; r.round=null; r.shop={items:[{kind:'joker',id:'fstring',price:4},{kind:'card',cardId:'for',price:3},{kind:'hand',rank:'pair',price:5}],rerolls:0};",
    );
    await page
      .getByRole('button', { name: /^Comprar/ })
      .first()
      .click();
    await page.waitForFunction(() => /Compra de/.test(document.body.innerText));
    await reloadFast(page);
    const run = await f.getRun(page);
    check(
      run.jokers.join() === 'fstring' && run.money === 96,
      `Compra sobrevive (joker, ${run.money} fichas)`,
    );
    check(
      (await page.locator('[data-joker="fstring"]').count()) > 0,
      'O joker comprado aparece depois do reload',
    );
    await ctx.close();
  }
  {
    // hidratação não escreve nada
    const { ctx, page } = await f.open(browser);
    await f.startRun(page);
    await page.waitForTimeout(800);
    const before = await page.evaluate(() => localStorage.getItem('devbet:run:v1'));
    await ctx.addInitScript(() => {
      window.__w = [];
      const o = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        window.__w.push(k);
        return o.call(this, k, v);
      };
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const after = await page.evaluate(() => localStorage.getItem('devbet:run:v1'));
    const writes = await page.evaluate(() => window.__w);
    check(Array.isArray(writes), 'Hidratação: espião ativo');
    check(before === after, 'Hidratação: run idêntica após reload ocioso');
    check(writes.length === 0, `Hidratação: nenhuma escrita espúria (${JSON.stringify(writes)})`);
    await ctx.close();
  }
  await browser.close();
  log(problems.length ? 'RESULT: FAIL ' + JSON.stringify(problems) : 'RESULT: ALL PASS');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
