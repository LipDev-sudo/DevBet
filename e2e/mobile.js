// Auditoria em vários tamanhos de tela (celulares pequenos e grandes, paisagem e tablet), em emulação de toque:
// roda uma mão inteira em cada tamanho e confere overflow horizontal, alvos de toque, texto cortado e legibilidade.
// Uso: node e2e/mobile.js
const f = require('./flow.cjs');
const log = console.log;
const problems = [];
const check = (ok, msg) => {
  log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) problems.push(msg);
};

const SIZES = [
  { name: 'iPhone SE 320x568', width: 320, height: 568 },
  { name: 'Android 360x740', width: 360, height: 740 },
  { name: 'iPhone 375x667', width: 375, height: 667 },
  { name: 'iPhone 390x844', width: 390, height: 844 },
  { name: 'Android grande 412x915', width: 412, height: 915 },
  { name: 'Paisagem 844x390', width: 844, height: 390 },
  { name: 'Tablet 768x1024', width: 768, height: 1024 },
];

async function audit(page, label, { touch = true } = {}) {
  const r = await page.evaluate(
    ({ touch }) => {
      const doc = document.documentElement;
      const vw = doc.clientWidth;
      const out = {
        hscroll: doc.scrollWidth > vw + 1,
        small: [],
        offscreen: [],
        clipped: [],
        tiny: 0,
      };
      for (const el of document.querySelectorAll(
        'button, a[href], input, select, summary, [role=button]',
      )) {
        const b = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (b.width === 0 || b.height === 0 || cs.visibility === 'hidden') continue;
        if (el.closest('.sr-only') || el.classList.contains('sr-only') || el.type === 'radio')
          continue;
        const name = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24);
        if (touch && (b.height < 32 || b.width < 32))
          out.small.push(`${name} ${Math.round(b.width)}x${Math.round(b.height)}`);
        if (b.right > vw + 1 || b.left < -1) out.offscreen.push(name);
      }
      for (const el of document.querySelectorAll('h1,h2,h3,p,span,button,a,li,label')) {
        const cs = getComputedStyle(el);
        if (
          el.scrollWidth > el.clientWidth + 2 &&
          ['hidden', 'clip'].includes(cs.overflowX) &&
          el.clientWidth > 0 &&
          !el.closest('.sr-only')
        )
          out.clipped.push((el.innerText || '').trim().slice(0, 30));
      }
      // legibilidade: o texto principal das cartas e jokers não pode ficar abaixo de 7 px
      for (const el of document.querySelectorAll('.pc-name, .pc-band span, .jk-name, .jk-effect')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0) continue;
        if (parseFloat(getComputedStyle(el).fontSize) < 7) out.tiny++;
      }
      return out;
    },
    { touch },
  );
  check(!r.hscroll, `${label}: sem rolagem horizontal`);
  check(r.small.length === 0, `${label}: alvos de toque ok ${JSON.stringify(r.small.slice(0, 4))}`);
  check(
    r.offscreen.length === 0,
    `${label}: nada fora da tela ${JSON.stringify(r.offscreen.slice(0, 4))}`,
  );
  check(
    r.clipped.length === 0,
    `${label}: sem texto cortado ${JSON.stringify(r.clipped.slice(0, 4))}`,
  );
  check(r.tiny === 0, `${label}: texto das cartas legível (${r.tiny} abaixo de 7px)`);
}

(async () => {
  const browser = await f.launch();
  const all = [];
  for (const size of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      hasTouch: true,
      isMobile: size.width < 700,
      deviceScaleFactor: 2,
    });
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
    const errors = [];
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 160)));
    page.on(
      'console',
      (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text().slice(0, 160)),
    );
    log(`==== ${size.name}`);
    const L = (s) => `${size.name} · ${s}`;
    await page.goto(f.BASE + '/', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await audit(page, L('home'));
    await page.goto(f.BASE + '/play', { waitUntil: 'load' });
    await page.waitForTimeout(600);
    await audit(page, L('início'));
    await f.startRun(page);
    await audit(page, L('blind'));
    await f.startBlind(page);
    await audit(page, L('mão'));
    // toca em 3 cartas e joga: tudo precisa ser alcançável por toque
    const cards = page.locator('[data-tutorial="hand"] button');
    for (let i = 0; i < 3; i++) await cards.nth(i).tap();
    await audit(page, L('mão com seleção'));
    await page.getByRole('button', { name: 'Jogar mão' }).tap();
    await page.waitForTimeout(900);
    await audit(page, L('pergunta'));
    await f.answerWrong(page, 1);
    await audit(page, L('pergunta após erro'));
    await f.solveAndDeliver(page);
    await page.waitForTimeout(3500);
    await audit(page, L('placar'));
    const run = await f.getRun(page);
    check(run?.round?.roundScore > 0, L(`mão pontuou (${run?.round?.roundScore})`));
    await f.forge(
      page,
      "r.status='shop'; r.round=null; r.money=14; r.jokers=['fstring','ternary','any-all','stdlib','comments']; r.shop={items:[{kind:'joker',id:'comprehension',price:8},{kind:'card',cardId:'while',price:4},{kind:'hand',rank:'flush',price:5}],rerolls:0};",
    );
    await audit(page, L('loja'));
    await page.getByRole('button', { name: 'Abandonar run' }).tap();
    await page.getByRole('dialog').getByRole('button', { name: 'Abandonar' }).tap();
    await page.waitForTimeout(900);
    await audit(page, L('fim'));
    await page.goto(f.BASE + '/colecao', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await audit(page, L('coleção'));
    check(
      errors.filter((e) => !/firestore|firebase/i.test(e)).length === 0,
      L(`sem erros de console ${JSON.stringify(errors.slice(0, 2))}`),
    );
    all.push(errors);
    await ctx.close();
  }
  await browser.close();
  log(
    problems.length ? 'RESULT: FAIL ' + JSON.stringify(problems.slice(0, 20)) : 'RESULT: ALL PASS',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
