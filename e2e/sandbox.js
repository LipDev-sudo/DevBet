// Sandbox e feedback no navegador real: recurso bloqueado, import bloqueado, sintaxe, nome inexistente
// e código acima de 4000 caracteres.
const f = require('./flow.cjs');
const log = console.log;
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};
const body = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

(async () => {
  const browser = await f.launch();
  const { page, errors } = await f.open(browser);
  await f.startRun(page);
  await f.startBlind(page);
  await f.playCards(page, 2);
  const title = await f.exerciseTitle(page);
  const header = (f.solutionFor(title).match(/^def .*:/m) || ['def x():'])[0];
  const run = async (code, wait = 3500) => {
    await f.setCode(page, code);
    await page.getByRole('button', { name: 'Executar' }).click();
    await page.waitForTimeout(wait);
    return body(page);
  };

  let t = await run(`${header}\n    open('x')\n    return 0`);
  check(/Recurso indisponível/.test(t), 'open() → "Recurso indisponível"');
  check(
    !/não foi definid/i.test(t.split('Recurso indisponível')[1]?.slice(0, 300) || ''),
    'Sem conselho de "variável não definida"',
  );
  t = await run(`${header}\n    return eval("1")`);
  check(/Recurso indisponível/.test(t), 'eval() → "Recurso indisponível"');
  t = await run(`${header}\n    return nome_inexistente`);
  check(
    !/Recurso indisponível/.test(t) && /nome_inexistente/.test(t),
    'Nome realmente inexistente continua NameError comum',
  );
  t = await run(`import os\n${header}\n    return 1`);
  check(/Módulo indisponível|não está liberado/.test(t), 'import os → módulo não liberado');
  t = await run('def x(:\n    pass');
  check(/sintaxe/i.test(t), 'Erro de sintaxe é explicado');
  check(
    !/\.\./.test(t.replace(/\.\.\./g, '')),
    'Nenhum ".." nas mensagens de erro de carregamento',
  );

  // > 4000 caracteres: botões indisponíveis com explicação
  await f.setCode(page, 'x = 1\n# ' + 'a'.repeat(4100));
  await page.waitForTimeout(500);
  const alertText = await page.locator('[role=alert]').allInnerTexts();
  check(
    alertText.some((x) => /4000/.test(x)),
    'O aviso (role=alert) explica o limite de 4000',
  );
  const bar = page.locator('.wood.sticky');
  const off = async (name) => {
    const b = bar.getByRole('button', { name });
    return (await b.getAttribute('aria-disabled')) === 'true' || (await b.isDisabled());
  };
  check(await off('Executar'), 'Executar indisponível');
  check(await off('Entregar'), 'Entregar indisponível');
  check(
    !(await bar.getByRole('button', { name: 'Desistir' }).isDisabled()),
    'Desistir continua disponível',
  );
  await f.setCode(page, 'x = 1');
  await page.waitForTimeout(400);
  check(
    (await page.locator('[role=alert]').filter({ hasText: '4000' }).count()) === 0,
    'O aviso some ao voltar ao limite',
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
