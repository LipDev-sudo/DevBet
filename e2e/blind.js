// Fluxo completo do loop de blinds (estilo Balatro) no navegador: blind → mão → pergunta → placar → loja → boss.
const { launch, BASE, OUT } = require('./lib.cjs');
const { solveAndDeliver } = require('./flow.cjs');
const log = console.log;
const errors = [];
const problems = [];
const MOBILE = process.argv[2] === 'mobile';
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};

const getRun = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('devbet:run:v1') || 'null'));
const roundScore = async (page) => (await getRun(page))?.round?.roundScore ?? 0;

/** Escolhe `n` cartas da mão (a 1ª lidera) e joga. */
async function playCards(page, n) {
  const cards = page.locator('[data-tutorial="hand"] button');
  for (let i = 0; i < n; i++) await cards.nth(i).click();
  await page.getByRole('button', { name: 'Jogar mão' }).click();
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await launch();
  const ctx = await browser.newContext(
    MOBILE
      ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 900 } },
  );
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
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));
  page.on(
    'console',
    (m) =>
      ['error', 'warning'].includes(m.type()) &&
      errors.push(m.type() + ' ' + m.text().slice(0, 200)),
  );
  const shot = (n) =>
    page.screenshot({ path: `${OUT}/blind${MOBILE ? 'm' : ''}-${n}.png`, fullPage: true });

  await page.goto(BASE + '/play', { waitUntil: 'load' });
  await page.getByText('Sentar à mesa').click();
  await page.waitForTimeout(600);
  check(/900/.test(await page.locator('main').innerText()), 'Blind 1 mostra a meta 900');
  await shot('1-blind');
  await page.getByRole('button', { name: 'Jogar blind' }).click();
  await page.waitForTimeout(600);
  check((await page.locator('[data-tutorial="hand"] button').count()) === 8, 'A mão tem 8 cartas');
  await shot('2-round');

  // Mão 1: 3 cartas → pergunta → responder → placar
  await playCards(page, 3);
  await shot('3-quiz');
  const first = await solveAndDeliver(page);
  await page.waitForTimeout(500);
  await shot('4-score');
  const afterFirst = await getRun(page);
  check(
    afterFirst.status === 'scored' && afterFirst.round.roundScore > 0,
    `Mão 1 (${first}) pontuou ${afterFirst.round.roundScore}`,
  );

  // Recarregar no placar mantém a pontuação
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  check(
    (await roundScore(page)) === afterFirst.round.roundScore,
    'Reload no placar mantém a pontuação',
  );

  // Continua jogando mãos de 5 cartas até vencer a blind (até 4 mãos)
  for (let hand = 2; hand <= 4; hand++) {
    await page.getByRole('button', { name: /Continuar|Blind vencida|Suas mãos acabaram/ }).click();
    await page.waitForTimeout(800);
    if ((await getRun(page)).status !== 'round') break;
    await playCards(page, 5);
    await solveAndDeliver(page);
    await page.waitForTimeout(500);
  }
  const state = await getRun(page);
  if (state.status === 'scored') {
    await page.getByRole('button', { name: /Continuar|Blind vencida|Suas mãos acabaram/ }).click();
    await page.waitForTimeout(800);
  }
  const final = await getRun(page);
  check(
    final.status === 'cleared',
    `A blind 1 foi vencida (${final.round.roundScore}/900 em ${final.round.handsPlayed} mãos)`,
  );
  await shot('5-cleared');
  const payout = (await getRun(page)).round?.payout;
  check(Boolean(payout) && payout.total >= payout.blind, `Recompensa paga (${payout?.total})`);

  await page.getByRole('button', { name: 'Ir à loja' }).click();
  await page.waitForTimeout(800);
  await shot('6-shop');
  const money = (await getRun(page)).money;
  const buyButtons = page.getByRole('button', { name: /^Comprar/ });
  const n = await buyButtons.count();
  check(n === 5, `Loja com 5 itens (${n})`);
  await buyButtons.first().click();
  await page.waitForTimeout(500);
  const afterBuy = await getRun(page);
  check(
    afterBuy.money < money || afterBuy.shop.items.length === 5,
    'Compra processada ou recusada com aviso',
  );
  await page.getByRole('button', { name: 'Próxima blind' }).click();
  await page.waitForTimeout(800);
  const boss = await getRun(page);
  check(boss.status === 'blind' && boss.blindIndex === 1, 'A próxima é a blind boss');
  check(/Regra do boss/.test(await page.locator('main').innerText()), 'A regra do boss aparece');
  await shot('7-boss');

  await browser.close();
  log('ERRORS', JSON.stringify(errors));
  log(problems.length ? 'RESULT: FAIL ' + JSON.stringify(problems) : 'RESULT: ALL PASS');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
