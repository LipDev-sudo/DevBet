// Tutorial Run guiada no jogo real: cada lição nasce do estado real e termina com uma ação real.
// Uso: node e2e/tutorial.js [mobile]
const f = require('./flow.cjs');
const log = console.log;
const MOBILE = process.argv[2] === 'mobile';
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};
const lesson = async (page) => {
  const el = page.locator('section[aria-label="Guia do Dealer"]');
  if (!(await el.count())) return null;
  return {
    id: await el.getAttribute('data-lesson'),
    text: (await el.innerText()).replace(/\s+/g, ' '),
  };
};
const seen = [];
const note = async (page) => {
  const l = await lesson(page);
  if (l && !seen.includes(l.id)) seen.push(l.id);
  return l;
};

(async () => {
  const browser = await f.launch();
  const { page, errors } = await f.open(browser, { mobile: MOBILE, tutorialDone: false });
  await page.locator('section[aria-label="Guia do Dealer"]').waitFor({ timeout: 15000 });
  let l = await note(page);
  check(l?.id === 'welcome', `Primeira visita: lição "welcome" (${l?.id})`);
  check(
    (await page.locator('input[name=pack]:disabled').count()) === 2,
    'Só o pacote da Tutorial Run está liberado',
  );
  await f.startRun(page);

  l = await note(page);
  check(l?.id === 'blind', `Na blind: lição "${l?.id}"`);
  await f.startBlind(page);

  l = await note(page);
  check(
    l?.id === 'hand' && /PURE FUNCTION/.test(l.text),
    `Na mão: lição "hand" cita o combo da mão (${l?.id})`,
  );
  const hand = page.locator('[data-tutorial="hand"] button');
  const names = await hand.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || ''));
  const iParam = names.findIndex((n) => n.startsWith('PARAMETER'));
  const iReturn = names.findIndex((n) => n.startsWith('RETURN'));
  check(iParam >= 0 && iReturn >= 0, 'A mão da Tutorial Run traz PARAMETER e RETURN');
  await hand.nth(iParam).click();
  await hand.nth(iReturn).click();
  await page.getByRole('button', { name: 'Jogar mão' }).click();
  await page.waitForTimeout(1500);

  l = await note(page);
  check(l?.id === 'code', `No exercício: lição "${l?.id}"`);
  const deliver = page.getByRole('button', { name: 'Entregar' });
  check(await deliver.isDisabled(), 'Entregar fica travado até executar de verdade');
  const title = await f.exerciseTitle(page);
  await f.setCode(page, f.solutionFor(title));
  await page.getByRole('button', { name: 'Executar' }).click();
  await page.waitForTimeout(4500);
  l = await note(page);
  check(l?.id === 'deliver', `Depois de executar: lição "${l?.id}"`);
  check(!(await deliver.isDisabled()), 'Entregar liberado após uma execução real');
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  l = await note(page);
  check(l?.id === 'deliver', 'Reload mantém a lição e o rascunho');
  await f.setCode(page, f.solutionFor(title));
  await deliver.click();
  await page
    .getByRole('button', { name: /Continuar|Blind vencida|Suas mãos acabaram/ })
    .waitFor({ timeout: 30000 });
  l = await note(page);
  check(l?.id === 'score', `No placar: lição "${l?.id}"`);
  await page.getByRole('button', { name: 'Entendi' }).click();
  await f.continueAfterScore(page);

  // Joga mãos até vencer a blind (cada mão grande pede um desafio completo)
  let run = await f.getRun(page);
  for (let i = 0; i < 3 && run.status === 'round'; i++) {
    l = await note(page);
    if (l?.id === 'discard') await page.getByRole('button', { name: 'Entendi' }).click();
    await f.playCards(page, 5);
    await f.solveAndDeliver(page);
    await page.waitForTimeout(800);
    await f.continueAfterScore(page);
    run = await f.getRun(page);
  }
  check(run.status === 'cleared', `Blind 1 vencida na Tutorial Run (${run.status})`);
  l = await note(page);
  check(l?.id === 'cleared', `Blind vencida: lição "${l?.id}"`);
  await page.getByRole('button', { name: 'Ir à loja' }).click();
  await page.waitForTimeout(800);
  l = await note(page);
  check(l?.id === 'shop', `Na loja: lição "${l?.id}"`);
  const buy = page.getByRole('button', { name: /^Comprar/ }).first();
  await buy.click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Próxima blind' }).click();
  await page.waitForTimeout(800);
  l = await note(page);
  check(l?.id === 'boss', `Na blind boss: lição "${l?.id}"`);

  // Abandona: a Tutorial Run termina e nunca volta
  await page.getByRole('button', { name: 'Abandonar run' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abandonar' }).click();
  await page.waitForTimeout(800);
  l = await note(page);
  check(l?.id === 'end', `Fim: lição "${l?.id}"`);
  check(
    (await f.getProfile(page)).tutorialCompleted === true,
    'O perfil marca o tutorial como concluído',
  );
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);
  check((await lesson(page))?.id === 'end', 'Reload na tela final mantém a lição de fim');
  await page.getByRole('button', { name: /Nova run|Tentar novamente/ }).click();
  await page.waitForTimeout(600);
  check((await lesson(page)) === null, 'Segunda run: sem tutorial');
  check(
    (await page.locator('input[name=pack]:disabled').count()) === 0,
    'Segunda run: todos os pacotes liberados',
  );

  log('lições vistas:', seen.join(', '));
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
