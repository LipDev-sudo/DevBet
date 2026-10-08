// Regressão da Etapa 6 no navegador real: recurso bloqueado, ponto duplo, código > 4000 caracteres.
const { launch, BASE } = require('./lib.cjs');
const log = console.log;
const errors = [];
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};
const setCode = async (page, code) => {
  await page.waitForFunction(() => window.monaco && window.monaco.editor.getEditors().length > 0);
  await page.waitForTimeout(1500);
  await page.evaluate((c) => window.monaco.editor.getEditors()[0].setValue(c), code);
  await page.waitForTimeout(300);
};
const body = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

(async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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
  page.on(
    'console',
    (m) =>
      ['error', 'warning'].includes(m.type()) &&
      errors.push(m.type() + ' ' + m.text().slice(0, 160)),
  );
  await page.goto(BASE + '/play', { waitUntil: 'load' });
  await page.getByText('Sentar à mesa').click();
  await page.waitForTimeout(600);
  await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
  await page.getByRole('button', { name: 'Começar desafio' }).click();
  await page.waitForTimeout(1200);

  const exec = async (code, wait = 3500) => {
    await setCode(page, code);
    await page.getByRole('button', { name: 'Executar' }).click();
    await page.waitForTimeout(wait);
    return body(page);
  };

  // A) recurso bloqueado: mensagem própria, não "variável não definida"
  let t = await exec(
    "def calcular_total(preco, quantidade, desconto):\n    open('x')\n    return 0",
  );
  check(/Recurso indisponível/.test(t), 'A: open() → "Recurso indisponível"');
  check(
    !/não foi definid/i.test(t.split('Recurso indisponível')[1]?.slice(0, 300) || ''),
    'A: sem conselho de "variável não definida"',
  );
  t = await exec('def calcular_total(preco, quantidade, desconto):\n    return eval("1")');
  check(/Recurso indisponível/.test(t), 'A: eval() → "Recurso indisponível"');
  t = await exec('def calcular_total(preco, quantidade, desconto):\n    return nome_inexistente');
  check(
    !/Recurso indisponível/.test(t) && /nome_inexistente/.test(t),
    'A: nome realmente inexistente continua como NameError comum',
  );

  // B) sem ponto duplo
  t = await exec('def calcular_total(:\n    pass');
  check(
    !/\.\./.test(t.replace(/\.\.\./g, '')),
    'B: nenhum ".." nas mensagens de erro de carregamento',
  );

  // C) > 4000 caracteres: botões indisponíveis com explicação
  await setCode(page, 'x = 1\n' + '# ' + 'a'.repeat(4100));
  await page.waitForTimeout(500);
  const alertText = await page.locator('[role=alert]').allInnerTexts();
  check(
    alertText.some((x) => /4000/.test(x)),
    `C: aviso role=alert explica o limite (${alertText.join('|').slice(0, 80)})`,
  );
  const bar = page.locator('.wood.sticky');
  check(
    (await bar.getByRole('button', { name: 'Executar' }).getAttribute('aria-disabled')) ===
      'true' || (await bar.getByRole('button', { name: 'Executar' }).isDisabled()),
    'C: Executar indisponível',
  );
  check(
    (await bar.getByRole('button', { name: 'Entregar' }).getAttribute('aria-disabled')) ===
      'true' || (await bar.getByRole('button', { name: 'Entregar' }).isDisabled()),
    'C: Entregar indisponível',
  );
  await setCode(page, 'x = 1');
  await page.waitForTimeout(400);
  check(
    (await page.locator('[role=alert]').filter({ hasText: '4000' }).count()) === 0,
    'C: aviso some ao voltar ao limite',
  );

  await browser.close();
  log('ERRORS', JSON.stringify(errors));
  log(problems.length ? 'RESULT: FAIL ' + JSON.stringify(problems) : 'RESULT: ALL PASS');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
