// Captura as telas principais (desktop 1280x900 e mobile 390x844) e roda checagens objetivas de layout:
// overflow horizontal, alvos de toque pequenos, texto cortado. Screenshots em E2E_OUT.
const { launch, loadSolutions, BASE, OUT } = require('./lib.cjs');
const sols = loadSolutions();
const byTitle = Object.fromEntries(Object.entries(sols).map(([, v]) => [v.title, v.solution]));
const log = console.log;
const errors = [];
const setRun = (page, src) =>
  page.evaluate((s) => {
    const k = 'devbet:run:v1';
    const r = JSON.parse(localStorage.getItem(k));
    new Function('r', s)(r);
    localStorage.setItem(k, JSON.stringify(r));
  }, src);
const setCode = async (page, code) => {
  await page.waitForFunction(() => window.monaco && window.monaco.editor.getEditors().length > 0);
  await page.waitForTimeout(1500);
  await page.evaluate((c) => window.monaco.editor.getEditors()[0].setValue(c), code);
  await page.waitForTimeout(300);
};

async function layoutCheck(page, name, mobile) {
  const r = await page.evaluate(
    ({ mobile }) => {
      const doc = document.documentElement;
      const out = {
        hscroll: doc.scrollWidth > doc.clientWidth + 1,
        small: [],
        clipped: [],
        offscreen: [],
      };
      const vw = doc.clientWidth;
      for (const el of document.querySelectorAll(
        'button, a[href], input, select, summary, [role=button]',
      )) {
        const b = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (b.width === 0 || b.height === 0 || cs.visibility === 'hidden') continue;
        if (
          el.closest('.monaco-editor') ||
          el.classList.contains('sr-only') ||
          el.matches('a[href="#conteudo"]')
        )
          continue;
        if (mobile && (b.height < 36 || b.width < 36) && el.type !== 'radio')
          out.small.push(
            `${el.tagName}:${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24)} ${Math.round(b.width)}x${Math.round(b.height)}`,
          );
        if (b.right > vw + 1 || b.left < -1)
          out.offscreen.push((el.innerText || '').trim().slice(0, 24));
      }
      for (const el of document.querySelectorAll('h1,h2,h3,p,span,button,a,li,label')) {
        if (
          el.closest('.monaco-editor') ||
          el.classList.contains('sr-only') ||
          el.matches('a[href="#conteudo"]')
        )
          continue;
        const cs = getComputedStyle(el);
        if (
          el.scrollWidth > el.clientWidth + 2 &&
          ['hidden', 'clip'].includes(cs.overflowX) &&
          el.clientWidth > 0
        )
          out.clipped.push((el.innerText || '').trim().slice(0, 30));
      }
      return out;
    },
    { mobile },
  );
  const bad = r.hscroll || r.small.length || r.clipped.length || r.offscreen.length;
  log(
    `  [${name}] ${bad ? 'ATENÇÃO' : 'ok'} hscroll=${r.hscroll} small=${JSON.stringify(r.small.slice(0, 6))} clipped=${JSON.stringify(r.clipped.slice(0, 6))} offscreen=${JSON.stringify(r.offscreen.slice(0, 6))}`,
  );
}

async function run(browser, mobile) {
  const tag = mobile ? 'm' : 'd';
  log(`==== ${mobile ? 'mobile 390x844' : 'desktop 1280x900'}`);
  const ctx = await browser.newContext(
    mobile
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
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 160)));
  page.on(
    'console',
    (m) =>
      ['error', 'warning'].includes(m.type()) &&
      errors.push(m.type() + ' ' + m.text().slice(0, 160)),
  );
  const snap = async (name, full = true) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/vis-${tag}-${name}.png`, fullPage: full });
    await layoutCheck(page, name, mobile);
  };
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await snap('1-home');
  await page.goto(BASE + '/play', { waitUntil: 'load' });
  await snap('2-start');
  await page.getByText('Sentar à mesa').click();
  await snap('3-lobby');
  await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
  await snap('4-table');
  await page.getByRole('button', { name: 'Começar desafio' }).click();
  await page.waitForTimeout(800);
  const title = (await page.locator('h1').first().innerText()).trim();
  await snap('5-challenge');
  await setCode(page, 'def f(:\n  return 1/0');
  await page.getByRole('button', { name: 'Executar' }).click();
  await page.waitForTimeout(4000);
  await snap('6-challenge-error');
  await page.getByRole('button', { name: /Abandonar run/ }).click();
  await page.waitForTimeout(300);
  await snap('7-abandon-modal', false);
  await page.keyboard.press('Escape');
  await setCode(page, byTitle[title]);
  await page.getByRole('button', { name: 'Entregar' }).click();
  await page.getByRole('heading', { name: /BUST|MÃO VENCEDORA/ }).waitFor({ timeout: 25000 });
  await snap('8-result');
  await setRun(
    page,
    "r.status='shop'; r.layerIndex=2; r.chips=60; r.encounter=null; r.shop={offers:['while','set','search'],rerolls:0,boughtLife:false};",
  );
  await page.reload({ waitUntil: 'load' });
  await snap('9-shop');
  await setRun(page, "r.status='map'; r.layerIndex=8; r.encounter=null; r.shop=null;");
  await page.reload({ waitUntil: 'load' });
  await snap('10-boss-lobby');
  await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
  await snap('11-boss-table');
  await page.getByRole('button', { name: /Começar desafio/ }).click();
  await page.waitForTimeout(1500);
  await snap('12-boss-challenge');
  await page.getByRole('button', { name: /Abandonar run/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abandonar' }).click();
  await snap('13-end');
  await ctx.close();
}

(async () => {
  const browser = await launch();
  await run(browser, false);
  await run(browser, true);
  await browser.close();
  log('ERRORS', JSON.stringify(errors));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
