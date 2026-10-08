// Navegação formal só por teclado (desktop 1280x900): Home → Start → Lobby → Mesa → Editor → Executar →
// Entregar → Resultado → Loja → Abandono (modal: foco preso, Esc, retorno de foco) → Nova run.
const { launch, loadSolutions, BASE, OUT } = require('./lib.cjs');
const sols = loadSolutions();
const byTitle = Object.fromEntries(Object.entries(sols).map(([, v]) => [v.title, v.solution]));
const log = console.log;
const errors = [];
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
      type: el.type || '',
      name: name.replace(/\s+/g, ' ').slice(0, 60),
      visible: outline || shadow,
      inDialog: !!el.closest('dialog'),
      inMonaco: !!el.closest('.monaco-editor'),
      disabled: el.disabled === true,
    };
  });

/** Avança com Tab até o foco casar com `re` (nome acessível/texto). Verifica foco visível em cada parada. */
async function tabTo(page, re, label, { max = 80, back = false } = {}) {
  const seen = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
    const d = await describe(page);
    seen.push(d.name || d.tag);
    if (d.disabled) check(false, `${label}: botão disabled recebeu foco (${d.name})`);
    if (re.test(d.name) && !d.inMonaco) {
      check(d.visible, `${label}: alcançado com Tab em ${i + 1} passos, foco visível (${d.name})`);
      return d;
    }
    if (
      re.test(d.name + ' ' + (d.inMonaco ? 'MONACO' : '')) &&
      d.inMonaco &&
      /MONACO/.test(re.source)
    )
      return d;
  }
  check(false, `${label}: não alcançado em ${max} Tabs. Paradas: ${seen.slice(0, 25).join(' > ')}`);
  return null;
}

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
  const run = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('devbet:run:v1') || 'null'));

  // HOME
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.keyboard.press('Tab');
  let d = await describe(page);
  check(/Pular/.test(d.name) && d.visible, `Home: 1º Tab = skip link visível (${d.name})`);
  await tabTo(page, /Start run/i, 'Home: START RUN');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/play');

  // START
  await page.waitForTimeout(800);
  await tabTo(page, /Sentar à mesa/i, 'Start: Sentar à mesa');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);

  // LOBBY → escolher desafio
  const ch = await tabTo(page, /Meta|pts|Mesa|^[A-ZÀ-Ú]/, 'Lobby: 1º desafio');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check((await run()).status === 'table', 'Lobby: Enter no desafio abre a mesa');

  // MESA: carta (Space), risco (setas), começar
  const card = await tabTo(page, /carta (comum|rara|lendária)/i, 'Mesa: primeira carta');
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  check((await page.getByRole('dialog').count()) === 1, 'Mesa: Space na carta abre o inspetor');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  d = await describe(page);
  check(
    /carta/i.test(d.name),
    `Mesa: Esc fecha o inspetor e o foco volta à carta (${d.name.slice(0, 30)})`,
  );
  const radio = await tabTo(page, /SAFE|Seguro/i, 'Mesa: risco (radiogroup, 1 parada)');
  if (radio) {
    // Na 1ª mesa só SAFE está liberado: setas não podem ir a opções disabled nem perder o foco.
    await page.keyboard.press('ArrowRight');
    d = await describe(page);
    check(
      /SAFE/.test(d.name),
      `Risco (mesa 1): seta mantém SAFE, sem foco em opção disabled (${d.name.slice(0, 12)})`,
    );
  }
  await tabTo(page, /Começar desafio/i, 'Mesa: Começar desafio');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  const title = (await page.locator('h1').first().innerText()).trim();
  check((await run()).status === 'challenge', `Desafio "${title}" iniciado só com teclado`);

  // DESAFIO: dica antes do editor? Tab até o editor
  await page.waitForFunction(() => window.monaco && window.monaco.editor.getEditors().length > 0);
  await page.locator('.monaco-editor textarea').first().focus();
  await page.keyboard.press('Control+A');
  d = await describe(page);
  check(d.inMonaco, 'Editor: foco via teclado/programático chega ao Monaco');
  await page.keyboard.insertText('def x(:\n');
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(3500);
  const alertTxt = await page.locator('[role=status], [role=alert]').allInnerTexts();
  check(alertTxt.join(' ').length > 0, 'Executar (Ctrl+Enter) devolve feedback anunciável');

  // Desistir: confirmação destrutiva também abre na opção segura
  await page.getByRole('button', { name: 'Desistir' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  d = await describe(page);
  check(/Continuar jogando/i.test(d.name), `Desistir: foco inicial na opção segura (${d.name})`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  check((await run()).status === 'challenge', 'Desistir: Enter no foco inicial NÃO desiste');

  // Escapar do Monaco sem mouse
  await page.locator('.monaco-editor textarea').first().focus();
  await page.keyboard.press('Control+M');
  await page.keyboard.press('Tab');
  d = await describe(page);
  check(!d.inMonaco, `Editor: Ctrl+M + Tab sai do editor (foco em "${d.name}")`);
  await tabTo(page, /Dica/i, 'Desafio: botão de dica (após sair do editor)', { max: 6 });
  // Sem Ctrl+M, Tab insere indentação (esperado para um editor de código)
  await page.locator('.monaco-editor textarea').first().focus();
  await page.evaluate(({ c }) => window.monaco.editor.getEditors()[0].setValue(c), {
    c: byTitle[title],
  });
  await page.waitForTimeout(300);
  await page.locator('.monaco-editor textarea').first().focus();
  await page.keyboard.press('Control+M');
  await tabTo(page, /^Executar$/i, 'Desafio: Executar', { max: 10 }).catch(() => null);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(4500);
  await tabTo(page, /^Entregar$/i, 'Desafio: Entregar', { max: 6 });
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: /BUST|MÃO VENCEDORA/ }).waitFor({ timeout: 25000 });
  check(true, 'Entregar via teclado → resultado');

  // RESULTADO → pular recompensa
  const skip = await tabTo(page, /Pular|Continuar|Concluir/i, 'Resultado: pular/continuar');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);

  // RISCO com opções liberadas: setas movem a seleção e o foco
  await page.evaluate(() => {
    const k = 'devbet:run:v1';
    const r = JSON.parse(localStorage.getItem(k));
    r.status = 'map';
    r.layerIndex = 1;
    r.chips = 100;
    r.encounter = null;
    localStorage.setItem(k, JSON.stringify(r));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await tabTo(page, /●/, 'Lobby (mesa 2): desafio');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  await tabTo(page, /SAFE/i, 'Mesa 2: risco');
  await page.keyboard.press('ArrowDown');
  d = await describe(page);
  const checked = await page.evaluate(() => document.activeElement.getAttribute('aria-checked'));
  check(
    /RISKY/.test(d.name) && checked === 'true',
    `Risco: ArrowDown move seleção e foco para RISKY (${d.name.slice(0, 10)}, checked=${checked})`,
  );
  await page.keyboard.press('ArrowUp');
  d = await describe(page);
  check(/SAFE/.test(d.name), 'Risco: ArrowUp volta a SAFE');
  await page.keyboard.press('ArrowLeft');
  d = await describe(page);
  check(
    /HIGH/.test(d.name),
    `Risco: ArrowLeft em SAFE dá a volta até HIGH (${d.name.slice(0, 10)})`,
  );
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600); // deixa o autosave terminar antes de forjar o estado da loja

  // LOJA (estado forjado para chegar nela por teclado a partir daqui)
  await page.evaluate(() => {
    const k = 'devbet:run:v1';
    const r = JSON.parse(localStorage.getItem(k));
    r.status = 'shop';
    r.layerIndex = 2;
    r.chips = 80;
    r.encounter = null;
    r.shop = { offers: ['while', 'set', 'search'], rerolls: 0, boughtLife: false };
    localStorage.setItem(k, JSON.stringify(r));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const chipsBefore = (await run()).chips;
  await tabTo(page, /^Comprar/i, 'Loja: Comprar');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check((await run()).chips < chipsBefore, 'Loja: compra via Enter altera fichas');
  log(
    '  aviso da compra:',
    (await page.locator('p[role=status]').first().innerText()).replace(/\s+/g, ' ').slice(0, 90),
  );

  // ABANDONO: modal
  const trigger = await tabTo(page, /Abandonar run/i, 'Abandono: link/botão');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  d = await describe(page);
  check(d.inDialog, `Modal: foco entra no diálogo (${d.name})`);
  check(/Continuar jogando/i.test(d.name), `Modal: foco inicial na opção segura (${d.name})`);
  // Enter no foco inicial cancela: não abandona a run e devolve o foco ao acionador.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  check(
    (await page.getByRole('dialog').count()) === 0,
    'Modal: Enter no foco inicial fecha o diálogo',
  );
  check((await run()).status === 'shop', 'Modal: Enter no foco inicial NÃO abandona a run');
  d = await describe(page);
  check(/Abandonar run/i.test(d.name), `Modal: após cancelar, foco volta ao acionador (${d.name})`);
  // Space no foco inicial também é seguro
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  check((await run()).status === 'shop', 'Modal: Space no foco inicial NÃO abandona a run');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  d = await describe(page);
  check(/^Abandonar$/i.test(d.name), `Modal: Tab leva a confirmar (${d.name})`);
  const names = new Set();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    const x = await describe(page);
    names.add(x.name);
    if (!x.inDialog && x.tag !== 'BODY') check(false, `Modal: foco escapou do diálogo (${x.name})`);
  }
  check(names.size >= 2, `Modal: Tab cicla dentro (${[...names].join(' | ')})`);
  const dlgName = await page
    .getByRole('dialog')
    .getAttribute('aria-labelledby')
    .catch(() => null);
  check(
    !!dlgName ||
      !!(await page
        .getByRole('dialog')
        .getAttribute('aria-label')
        .catch(() => null)),
    'Modal: nome acessível',
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check((await page.getByRole('dialog').count()) === 0, 'Modal: Esc fecha');
  d = await describe(page);
  check(/Abandonar run/i.test(d.name), `Modal: foco retorna ao acionador (${d.name})`);
  check((await run()).status === 'shop', 'Modal: Esc não abandona a run');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await tabTo(page, /^Abandonar$/i, 'Modal: confirmar Abandonar');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  check((await run()).endReason === 'abandoned', 'Abandono confirmado só com teclado');
  d = await describe(page);
  check(
    !d.inDialog && !d.disabled,
    `Após confirmar: foco coerente (${d.tag} "${d.name.slice(0, 20)}")`,
  );

  // NOVA RUN
  await tabTo(page, /Tentar novamente|Nova run/i, 'Fim: nova run');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  await tabTo(page, /Sentar à mesa/i, 'Start: Sentar à mesa (2ª run)');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  check((await run()).status === 'map', 'Nova run iniciada só com teclado');

  await browser.close();
  log('ERRORS', JSON.stringify(errors));
  log(problems.length ? 'RESULT: FAIL ' + JSON.stringify(problems) : 'RESULT: ALL PASS');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
