// Duas abas: a aba parada adota o estado da outra e nunca o sobrescreve com um estado antigo.
const f = require('./flow.cjs');
const log = console.log;
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};
const text = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

(async () => {
  const browser = await f.launch();
  const { ctx, page: a, errors } = await f.open(browser);
  await f.startRun(a);
  await a.waitForTimeout(700); // autosave
  const b = await ctx.newPage();
  b.on('pageerror', (e) => errors.push('PAGEERROR(B) ' + e.message.slice(0, 160)));
  await b.goto(f.BASE + '/play', { waitUntil: 'load' });
  await b.waitForTimeout(1200);
  check(/jogar blind/i.test(await text(b)), 'A aba B abre na mesma run (tela da blind)');

  // A avança; B (parada) acompanha sem salvar
  await f.startBlind(a);
  await b.waitForTimeout(1000);
  check(
    (await b.locator('[data-tutorial="hand"] button').count()) === 8,
    'A aba B acompanha: mostra a mão de 8 cartas da aba A',
  );
  const mid = await f.getRun(a);
  check(mid.status === 'round', 'Storage: round');

  // B abandona; A (defasada) passa a mostrar a run abandonada
  await b.getByRole('button', { name: 'Abandonar run' }).click();
  await b.getByRole('dialog').getByRole('button', { name: 'Abandonar' }).click();
  await b.waitForTimeout(1200);
  await a.waitForTimeout(800);
  check(/run abandonada/i.test(await text(a)), 'A aba A passou a mostrar a run abandonada');
  let run = await f.getRun(a);
  check(
    run.status === 'lost' && run.endReason === 'abandoned',
    `Storage: ${run.status} ${run.endReason}`,
  );

  // Ação tardia na aba A não ressuscita a run
  await a.waitForTimeout(600);
  run = await f.getRun(a);
  const profile = await f.getProfile(a);
  check(
    run.status === 'lost' && profile.runsPlayed === 2,
    `Depois da ação da aba antiga: ${run.status}, runsPlayed=${profile.runsPlayed}`,
  );

  // Fechar a aba parada não altera o salvo
  await b.close();
  await a.waitForTimeout(600);
  run = await f.getRun(a);
  check(run.status === 'lost', 'Fechar a aba parada não altera o salvo');

  await browser.close();
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
