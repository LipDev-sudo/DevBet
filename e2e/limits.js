// Limites do exercício: 60 execuções (Entregar e Desistir seguem disponíveis) e desistir da mão.
// Uso: node e2e/limits.js [mobile]
const f = require('./flow.cjs');
const log = console.log;
const MOBILE = process.argv[2] === 'mobile';
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};

(async () => {
  const browser = await f.launch();
  const { page, errors } = await f.open(browser, { mobile: MOBILE });
  await f.startRun(page);
  await f.startBlind(page);
  await f.playCards(page, 2);
  const title = await f.exerciseTitle(page);
  await f.forge(page, 'r.round.play.runsUsed = 59');
  await f.setCode(page, f.solutionFor(title));
  const bar = page.locator('.wood.sticky');
  await bar.getByRole('button', { name: 'Executar' }).click();
  await page.waitForTimeout(4500);
  const barText = (await bar.innerText()).replace(/\s+/g, ' ');
  check(/60\/60/.test(barText), `Contador mostra 60/60 (${barText.slice(0, 60)})`);
  check(await bar.getByRole('button').first().isDisabled(), 'Executar fica indisponível no limite');
  check(
    !(await bar.getByRole('button', { name: 'Entregar' }).isDisabled()),
    'Entregar continua disponível',
  );
  check(
    !(await bar.getByRole('button', { name: 'Desistir' }).isDisabled()),
    'Desistir continua disponível',
  );
  check(/acabaram/.test(barText), 'A barra explica o que ainda dá para fazer');

  // Entregar depois do limite pontua normalmente
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await f.setCode(page, f.solutionFor(title));
  await bar.getByRole('button', { name: 'Entregar' }).click();
  await page
    .getByRole('button', { name: /Continuar|Blind vencida|Suas mãos acabaram/ })
    .waitFor({ timeout: 30000 });
  await page.waitForTimeout(700); // autosave
  let run = await f.getRun(page);
  check(
    run.status === 'scored' && run.round.roundScore > 0,
    `Entregar depois de 60 execuções pontuou (${run.round.roundScore})`,
  );

  // Desistir: a mão é gasta e vale zero
  await f.continueAfterScore(page);
  await f.playCards(page, 2);
  await page.getByRole('button', { name: 'Desistir' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Desistir' }).click();
  await page.waitForTimeout(800);
  run = await f.getRun(page);
  check(
    run.status === 'scored' && run.round.last.forfeit && run.round.handsLeft === 2,
    'Desistir gasta a mão e vale 0',
  );
  check(
    /MÃO DESISTIDA/.test(await page.locator('main').innerText()),
    'A tela diz que a mão foi desistida',
  );

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
