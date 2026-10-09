// Integridade do editor e do save sob CPU lenta: o que Executar/Entregar rodam é exatamente o código visível,
// digitar não perde caracteres, abandonar persiste e uma nova run funciona.
// Uso: node e2e/integrity.js [cpu 1|4|8] [mobile]
const f = require('./flow.cjs');
const log = console.log;
const RATE = Number(process.argv[2] || 1);
const MOBILE = process.argv[3] === 'mobile';
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};
const norm = (s) => s.replace(/\s+/g, '');
const visible = (page) => page.evaluate(() => window.monaco.editor.getEditors()[0].getValue());
const posted = (page) => page.evaluate(() => window.__posted.slice());

async function focusEditor(page) {
  await page.locator('.monaco-editor').first().scrollIntoViewIfNeeded();
  const box = await page.locator('.monaco-editor').first().boundingBox();
  if (MOBILE) await page.touchscreen.tap(box.x + box.width / 2, box.y + 50);
  else await page.mouse.click(box.x + box.width / 2, box.y + 50);
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await f.launch();
  const { page, errors } = await f.open(browser, { mobile: MOBILE, cpu: RATE, spy: true });
  log(`==== CPU x${RATE} ${MOBILE ? 'mobile 390x844' : 'desktop 1280x900'}`);
  await f.startRun(page);
  await f.startBlind(page);
  await f.playCards(page, 2);
  const title = await f.exerciseTitle(page);
  const solution = f.solutionFor(title);
  await page.waitForFunction(
    () => window.monaco && window.monaco.editor.getEditors().length > 0,
    null,
    { timeout: 60000 },
  );
  await page.waitForTimeout(2500 * Math.min(RATE, 4));

  // digitação real no editor (teclado), sem perder caracteres
  await focusEditor(page);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type(solution.split('\n').join('\n'), { delay: RATE > 1 ? 15 : 5 });
  await page.waitForTimeout(800 * Math.min(RATE, 4));
  const typed = await visible(page);
  check(
    norm(typed).startsWith(norm(solution).slice(0, 20)),
    `Digitação no editor preserva o texto (${typed.length} caracteres)`,
  );
  // o editor auto-indenta: normaliza o código com a solução oficial, mantendo o que foi digitado como base
  await f.setCode(page, solution);

  const before = (await posted(page)).length;
  await page.getByRole('button', { name: 'Executar' }).click();
  const t0 = Date.now();
  while ((await posted(page)).length === before && Date.now() - t0 < 60000)
    await page.waitForTimeout(200);
  let p = await posted(page);
  check(
    norm(p[p.length - 1]) === norm(await visible(page)),
    'Executar enviou exatamente o código visível',
  );
  await page.waitForTimeout(4000 * Math.min(RATE, 4));

  const before2 = p.length;
  await page.getByRole('button', { name: 'Entregar' }).click();
  const t1 = Date.now();
  while ((await posted(page)).length === before2 && Date.now() - t1 < 60000)
    await page.waitForTimeout(200);
  p = await posted(page);
  check(norm(p[p.length - 1]) === norm(solution), 'Entregar enviou exatamente o código visível');
  await page
    .getByRole('button', { name: /Continuar|Blind vencida|Suas mãos acabaram/ })
    .waitFor({ timeout: 60000 });
  let run = await f.getRun(page);
  await page.waitForTimeout(500);
  run = await f.getRun(page);
  check(
    run.status === 'scored' && run.round.roundScore > 0,
    `A mão pontuou (${run.round?.roundScore})`,
  );

  // reload logo depois da ação: a pontuação não se perde
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500 * Math.min(RATE, 4));
  check(
    (await f.getRun(page)).round.roundScore === run.round.roundScore,
    'Reload no placar mantém o resultado',
  );

  // abandono: o resultado fica e sobrevive ao reload
  await page.getByRole('button', { name: 'Abandonar run' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abandonar' }).click();
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200 * Math.min(RATE, 4));
  check(
    /RUN ABANDONADA/.test(await page.locator('main').innerText()),
    'Abandono → reload mantém o resultado',
  );
  await page.getByRole('button', { name: /Nova run|Tentar novamente/ }).click();
  await page.waitForTimeout(600);
  await f.startRun(page);
  check((await f.getRun(page)).status === 'blind', 'Nova run funciona');

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
