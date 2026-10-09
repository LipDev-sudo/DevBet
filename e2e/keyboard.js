// Navegação formal só por teclado (desktop 1280x900): Home → Start → Blind → mão (cartas com Space) → exercício
// (Ctrl+Enter, Ctrl+M) → Entregar → placar → loja → modais (foco seguro, Esc, retorno de foco) → nova run.
const f = require('./flow.cjs');
const log = console.log;
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};

const describe = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { tag: 'BODY', name: '', visible: false };
    const cs = getComputedStyle(el);
    const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
    const shadow = cs.boxShadow !== 'none';
    const name =
      el.getAttribute('aria-label') ||
      (el.innerText || el.value || el.getAttribute('title') || '').trim();
    return {
      tag: el.tagName,
      name: name.replace(/\s+/g, ' ').slice(0, 70),
      visible: outline || shadow,
      inDialog: !!el.closest('dialog'),
      inMonaco: !!el.closest('.monaco-editor'),
      disabled: el.disabled === true,
      pressed: el.getAttribute('aria-pressed'),
    };
  });

/** Avança com Tab até o foco casar com `re`. Verifica foco visível e que nada desabilitado recebe foco. */
async function tabTo(page, re, label, { max = 40 } = {}) {
  const seen = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const d = await describe(page);
    seen.push(d.name || d.tag);
    if (d.disabled) check(false, `${label}: controle desabilitado recebeu foco (${d.name})`);
    if (re.test(d.name) && !d.inMonaco) {
      check(
        d.visible,
        `${label}: alcançado com ${i + 1} Tab, foco visível (${d.name.slice(0, 40)})`,
      );
      return d;
    }
  }
  check(false, `${label}: não alcançado em ${max} Tabs. Paradas: ${seen.slice(0, 16).join(' > ')}`);
  return null;
}

(async () => {
  const browser = await f.launch();
  const { page, errors } = await f.open(browser);
  const run = () => f.getRun(page);

  // HOME → START
  await page.goto(f.BASE + '/', { waitUntil: 'load' });
  await page.keyboard.press('Tab');
  let d = await describe(page);
  check(/Pular/.test(d.name) && d.visible, `Home: 1º Tab = skip link visível (${d.name})`);
  await tabTo(page, /Start run/i, 'Home: START RUN');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/play');
  await page.waitForTimeout(800);
  await tabTo(page, /Sentar à mesa/i, 'Start: Sentar à mesa');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  await tabTo(page, /Jogar blind/i, 'Blind: Jogar blind');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  check((await run()).status === 'round', 'Blind iniciada só com teclado');

  // MÃO: cartas com Space, ordem de seleção, Jogar mão
  const card = await tabTo(page, /carta (comum|rara|lendária)/i, 'Mão: 1ª carta');
  check(card?.pressed === 'false', 'Mão: carta começa não selecionada (aria-pressed=false)');
  await page.keyboard.press('Space');
  d = await describe(page);
  check(d.pressed === 'true', 'Mão: Space seleciona a carta (aria-pressed=true)');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  check(
    /decide o exercício/.test(await page.locator('[role=status]').first().innerText()),
    'Mão: a 1ª carta escolhida lidera e a tela avisa',
  );
  const play = await tabTo(page, /Jogar mão/i, 'Mão: Jogar mão');
  check(play !== null, 'Mão: Jogar mão alcançável');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  check((await run()).status === 'coding', 'Jogar mão por teclado abre o exercício');

  // EXERCÍCIO: editor, Ctrl+Enter, Ctrl+M, Executar/Entregar
  const title = await f.exerciseTitle(page);
  await f.setCode(page, 'def x(:\n');
  await page.locator('.monaco-editor textarea').first().focus();
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(3500);
  check(
    (await page.locator('[role=status]').allInnerTexts()).join(' ').length > 0,
    'Ctrl+Enter executa e devolve feedback anunciável',
  );
  await page.locator('.monaco-editor textarea').first().focus();
  await page.keyboard.press('Control+M');
  await page.keyboard.press('Tab');
  d = await describe(page);
  check(!d.inMonaco, `Editor: Ctrl+M + Tab sai do editor (foco em "${d.name.slice(0, 30)}")`);
  await f.setCode(page, f.solutionFor(title));
  await page.locator('.monaco-editor textarea').first().focus();
  await page.keyboard.press('Control+M');
  await tabTo(page, /^Executar$/i, 'Exercício: Executar', { max: 12 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(4500);
  await tabTo(page, /^Entregar$/i, 'Exercício: Entregar', { max: 6 });
  await page.keyboard.press('Enter');
  await page
    .getByRole('button', { name: /Continuar|Blind vencida|Suas mãos acabaram/ })
    .waitFor({ timeout: 30000 });

  // PLACAR: Pular animação / Continuar por teclado
  await page.waitForTimeout(500);
  const skip = page.getByRole('button', { name: 'Pular animação' });
  if (await skip.count()) {
    await tabTo(page, /Pular animação/i, 'Placar: Pular animação');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    d = await describe(page);
    check(
      /continuar|blind vencida/i.test(d.name),
      `Placar: depois de pular, o foco vai para Continuar (${d.name})`,
    );
  } else {
    await tabTo(page, /continuar|blind vencida/i, 'Placar: Continuar');
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);

  // DESISTIR: confirmação destrutiva abre na opção segura
  await f.playCards(page, 1);
  await page.getByRole('button', { name: 'Desistir' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  d = await describe(page);
  check(/Continuar jogando/i.test(d.name), `Desistir: foco inicial na opção segura (${d.name})`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  check((await run()).status === 'coding', 'Desistir: Enter no foco inicial NÃO desiste');
  await page.keyboard.press('Control+End'); // não faz nada de especial; garante o foco fora de modais

  // LOJA (estado forjado) por teclado
  await f.forge(
    page,
    "r.status='shop'; r.round=null; r.money=100; r.shop={items:[{kind:'joker',id:'fstring',price:4},{kind:'card',cardId:'for',price:3}],rerolls:0};",
  );
  await tabTo(page, /^Comprar/i, 'Loja: Comprar');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check((await run()).jokers.includes('fstring'), 'Loja: compra via Enter');
  check(
    /Compra de/.test(await page.locator('p[role=status]').first().innerText()),
    'Loja: recibo anunciável',
  );

  // MODAL DE ABANDONO
  await tabTo(page, /Abandonar run/i, 'Abandono: botão');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  d = await describe(page);
  check(
    d.inDialog && /Continuar jogando/i.test(d.name),
    `Modal: foco inicial na opção segura (${d.name})`,
  );
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  check(
    (await page.getByRole('dialog').count()) === 0 && (await run()).status === 'shop',
    'Modal: Enter no foco inicial fecha e NÃO abandona',
  );
  d = await describe(page);
  check(
    /Abandonar run/i.test(d.name),
    `Modal: após cancelar, o foco volta ao acionador (${d.name})`,
  );
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  check((await run()).status === 'shop', 'Modal: Space no foco inicial NÃO abandona');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const names = new Set();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const x = await describe(page);
    names.add(x.name);
    if (!x.inDialog && x.tag !== 'BODY') check(false, `Modal: foco escapou do diálogo (${x.name})`);
  }
  check(names.size >= 2, `Modal: Tab cicla dentro (${[...names].join(' | ')})`);
  check(
    !!(await page.getByRole('dialog').getAttribute('aria-labelledby')),
    'Modal: nome acessível',
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(
    (await page.getByRole('dialog').count()) === 0 && (await run()).status === 'shop',
    'Modal: Esc fecha sem abandonar',
  );
  d = await describe(page);
  check(/Abandonar run/i.test(d.name), `Modal: foco retorna ao acionador (${d.name})`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await tabTo(page, /^Abandonar$/i, 'Modal: confirmar Abandonar');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  check((await run()).endReason === 'abandoned', 'Abandono confirmado só com teclado');

  // NOVA RUN
  await tabTo(page, /Tentar novamente|Nova run/i, 'Fim: nova run');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  await tabTo(page, /Sentar à mesa/i, 'Start: Sentar à mesa (2ª run)');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  check((await run()).status === 'blind', 'Nova run iniciada só com teclado');

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
