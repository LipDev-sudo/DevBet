// Persistência: ação -> reload em ~120 ms (antes do autosave de 250 ms) e hidratação sem save espúrio.
const { launch, loadSolutions, BASE } = require('./lib.cjs');
const sols = loadSolutions();
const byTitle = Object.fromEntries(Object.entries(sols).map(([, v]) => [v.title, v.solution]));
const log = console.log;
const errors = [];
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};
const MS = Number(process.argv[2] || 120);

async function fresh(browser) {
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
  return { ctx, page };
}
const snap = (page) =>
  page.evaluate(() => ({
    h1: (document.querySelector('h1')?.innerText || '').trim(),
    chips: (document.querySelector('header dd')?.innerText || '').trim(),
    risk: document.querySelector('[role=radio][aria-checked=true]')?.id || null,
    runs: (document.body.innerText.match(/Execuções (\d+)\/60/) || [])[1] || null,
    result: /MÃO VENCEDORA|BUST/.exec(document.body.innerText)?.[0] || null,
    ended: /RUN ABANDONADA/.test(document.body.innerText),
  }));
async function reloadFast(page) {
  await page.waitForTimeout(MS);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
}
const setRun = (page, src) =>
  page.evaluate((s) => {
    const k = 'devbet:run:v1';
    const r = JSON.parse(localStorage.getItem(k));
    new Function('r', s)(r);
    localStorage.setItem(k, JSON.stringify(r));
  }, src);

(async () => {
  const browser = await launch();
  log(`reload ${MS} ms após cada ação`);
  {
    const { ctx, page } = await fresh(browser);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(600);
    await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    const a = await snap(page);
    await reloadFast(page);
    const b = await snap(page);
    check(
      a.h1 === b.h1 && /Troco|Mesa|Boas|Maior|Pilha|Ano|Pir/i.test(b.h1),
      `Lobby→Mesa: sobrevive (${a.h1} → ${b.h1})`,
    );

    await page.getByRole('button', { name: 'Começar desafio' }).click();
    await page.waitForTimeout(1500);
    const title = (await page.locator('h1').first().innerText()).trim();
    await page.waitForFunction(() => window.monaco && window.monaco.editor.getEditors().length > 0);
    await page.waitForTimeout(1500);
    await page.evaluate((c) => window.monaco.editor.getEditors()[0].setValue(c), 'def x(:\n  pass');
    await page.getByRole('button', { name: 'Executar' }).click();
    await page.waitForFunction(() => /Execuções 1\/60/.test(document.body.innerText));
    const e1 = await snap(page);
    await reloadFast(page);
    const e2 = await snap(page);
    check(
      e1.runs === '1' && e2.runs === '1',
      `Executar: contador sobrevive (${e1.runs} → ${e2.runs})`,
    );

    await page.waitForFunction(() => window.monaco && window.monaco.editor.getEditors().length > 0);
    await page.waitForTimeout(1500);
    await page.evaluate((c) => window.monaco.editor.getEditors()[0].setValue(c), byTitle[title]);
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Entregar' }).click();
    await page.getByRole('heading', { name: /BUST|MÃO VENCEDORA/ }).waitFor({ timeout: 25000 });
    const r1 = await snap(page);
    await reloadFast(page);
    const r2 = await snap(page);
    check(
      r1.result && r1.result === r2.result && r1.chips === r2.chips,
      `Resultado: sobrevive (${r1.result}, fichas ${r1.chips} → ${r2.chips})`,
    );

    // recompensa: pular (+8) e reload imediato
    await page.getByRole('button', { name: /Pular|Continuar/ }).click();
    const s1 = await snap(page);
    await reloadFast(page);
    const s2 = await snap(page);
    check(
      s1.chips === s2.chips && s1.h1 === s2.h1,
      `Pular recompensa: sobrevive (fichas ${s1.chips} → ${s2.chips}; ${s1.h1} → ${s2.h1})`,
    );
    await ctx.close();
  }
  {
    const { ctx, page } = await fresh(browser);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(600);
    await setRun(page, "r.status='map'; r.layerIndex=1; r.chips=100; r.encounter=null;");
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('radio', { name: /RISKY/ }).click();
    const a = await snap(page);
    await reloadFast(page);
    const b = await snap(page);
    check(a.risk && a.risk === b.risk, `Risco: sobrevive (${a.risk} → ${b.risk})`);
    await ctx.close();
  }
  {
    const { ctx, page } = await fresh(browser);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(600);
    await setRun(
      page,
      "r.status='shop'; r.layerIndex=2; r.chips=100; r.encounter=null; r.shop={offers:['while','set','search'],rerolls:0,boughtLife:false};",
    );
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const c0 = (await snap(page)).chips;
    await page
      .getByRole('button', { name: /^Comprar/ })
      .first()
      .click();
    await page.waitForFunction(
      (c) => (document.querySelector('header dd')?.innerText || '').trim() !== c,
      c0,
    );
    const a = await snap(page);
    const deckA = await page.getByRole('button', { name: /Baralho/i }).innerText();
    await reloadFast(page);
    const b = await snap(page);
    const deckB = await page.getByRole('button', { name: /Baralho/i }).innerText();
    check(
      a.chips === b.chips && deckA === deckB && a.chips !== c0,
      `Compra: sobrevive (fichas ${c0} → ${a.chips} → ${b.chips}; ${deckA} → ${deckB})`,
    );
    await page.getByRole('button', { name: 'Abandonar run' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Abandonar' }).click();
    await page.waitForFunction(() => /RUN ABANDONADA/.test(document.body.innerText));
    await reloadFast(page);
    const e = await snap(page);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('devbet:run:v1')));
    check(e.ended && stored.endReason === 'abandoned', 'Abandono: sobrevive ao reload imediato');
    await ctx.close();
  }
  {
    // Hidratação não escreve nada: o espião é instalado antes da página carregar (addInitScript).
    const { ctx, page } = await fresh(browser);
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(800);
    await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await page.waitForTimeout(800);
    const before = await page.evaluate(() => localStorage.getItem('devbet:run:v1'));
    await ctx.addInitScript(() => {
      window.__w = [];
      const o = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        window.__w.push(k);
        return o.call(this, k, v);
      };
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const after = await page.evaluate(() => localStorage.getItem('devbet:run:v1'));
    const writes = await page.evaluate(() => window.__w);
    check(Array.isArray(writes), 'Hidratação: espião ativo');
    check(before === after, 'Hidratação: run em storage idêntica após reload ocioso');
    check(
      writes.length === 0,
      `Hidratação: nenhuma escrita espúria (writes = ${JSON.stringify(writes)})`,
    );
    await ctx.close();
  }
  await browser.close();
  log('ERRORS', JSON.stringify(errors));
  log(problems.length ? 'RESULT: FAIL ' + JSON.stringify(problems) : 'RESULT: ALL PASS');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
