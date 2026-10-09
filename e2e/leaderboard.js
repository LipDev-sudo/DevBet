// Placar: sem as variáveis do Firebase ele fica desligado (o jogo segue normal); com elas, mostra o login com Google.
// Uso: node e2e/leaderboard.js off        (build SEM NEXT_PUBLIC_FIREBASE_*)
//      node e2e/leaderboard.js configured (build com valores de teste em NEXT_PUBLIC_FIREBASE_*)
const f = require('./flow.cjs');
const log = console.log;
const MODE = process.argv[2] === 'configured' ? 'configured' : 'off';
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};
const text = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

(async () => {
  const browser = await f.launch();
  const { page, errors } = await f.open(browser);
  // abandona uma run com pontuação para chegar à tela final
  await f.startRun(page);
  await f.startBlind(page);
  await f.playCards(page, 2);
  await f.solveAndDeliver(page);
  await page.waitForTimeout(800);
  await f.continueAfterScore(page);
  await page.getByRole('button', { name: 'Abandonar run' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abandonar' }).click();
  await page.waitForTimeout(1200);
  const end = await text(page);

  if (MODE === 'off') {
    check(!/placar/i.test(end), 'Tela final: nenhuma menção ao placar quando está desligado');
    await page.goto(f.BASE + '/', { waitUntil: 'load' });
    check(
      (await page.getByRole('link', { name: 'Placar' }).count()) === 0,
      'Home: sem link para o placar',
    );
    await page.goto(f.BASE + '/placar', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    check(
      /não está ligado/i.test(await text(page)),
      '/placar explica que está desligado e não quebra',
    );
  } else {
    await page.waitForTimeout(1500);
    check(
      /placar/i.test(end) || /placar/i.test(await text(page)),
      'Tela final: seção do placar aparece',
    );
    check(
      !/Entrar com Google/i.test(await text(page)),
      'Tela final: sem login do Google (modo anônimo)',
    );
    check(
      !/e-?mail/i.test(
        await page
          .locator('main')
          .innerText()
          .then((t) => t.replace(/Não use seu nome completo nem e-mail\./, '')),
      ),
      'Nada de e-mail na tela',
    );
    await page.goto(f.BASE + '/', { waitUntil: 'load' });
    check(
      (await page.getByRole('link', { name: 'Placar' }).count()) > 0,
      'Home: link para o placar',
    );
    await page.goto(f.BASE + '/placar', { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const t = await text(page);
    check(!/Entrar com Google/i.test(t), '/placar: sem botão do Google (modo anônimo)');
    check(
      /Escolha um apelido|Tentar de novo|Apelido público/i.test(t),
      '/placar: pede apelido (ou oferece tentar de novo se a conexão falhar)',
    );
    check(!/não está ligado/i.test(t), '/placar: ligado com a configuração de teste');
  }
  // o jogo não depende do placar
  await page.goto(f.BASE + '/play', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  check(
    /RUN ABANDONADA/i.test(await text(page)) || /Sentar/i.test(await text(page)),
    'O jogo continua funcionando',
  );

  await browser.close();
  const real = errors.filter(
    (e) =>
      !/firestore|firebase|network|ERR_|HTTP 4|HTTP 5|googleapis|identitytoolkit|Failed to load resource/i.test(
        e,
      ),
  );
  log('ERRORS', JSON.stringify(real));
  log(
    problems.length || real.length
      ? 'RESULT: FAIL ' + JSON.stringify(problems)
      : 'RESULT: ALL PASS',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
