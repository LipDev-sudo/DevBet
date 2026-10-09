// Captura as telas principais (desktop 1280x900 e mobile 390x844) e roda checagens objetivas de layout:
// overflow horizontal, alvos de toque pequenos, texto cortado. Screenshots em E2E_OUT.
const f = require('./flow.cjs');
const log = console.log;
const errors = [];

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
      const skip = (el) => el.closest('.sr-only') || el.classList.contains('sr-only');
      for (const el of document.querySelectorAll(
        'button, a[href], input, select, summary, [role=button]',
      )) {
        const b = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (b.width === 0 || b.height === 0 || cs.visibility === 'hidden' || skip(el)) continue;
        const label = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24);
        if (mobile && (b.height < 36 || b.width < 36) && el.type !== 'radio')
          out.small.push(`${el.tagName}:${label} ${Math.round(b.width)}x${Math.round(b.height)}`);
        if (b.right > vw + 1 || b.left < -1) out.offscreen.push(label);
      }
      for (const el of document.querySelectorAll('h1,h2,h3,p,span,button,a,li,label')) {
        if (skip(el)) continue;
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
  const { ctx, page, errors: errs } = await f.open(browser, { mobile });
  const snap = async (name, full = true) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${f.OUT}/vis-${tag}-${name}.png`, fullPage: full });
    await layoutCheck(page, name, mobile);
  };
  await page.goto(f.BASE + '/', { waitUntil: 'load' });
  await snap('01-home');
  await page.goto(f.BASE + '/colecao', { waitUntil: 'load' });
  await snap('02-colecao');
  await page.goto(f.BASE + '/play', { waitUntil: 'load' });
  await snap('03-start');
  await f.startRun(page);
  await snap('04-blind');
  await f.startBlind(page);
  await snap('05-round');
  const cards = page.locator('[data-tutorial="hand"] button');
  for (let i = 0; i < 3; i++) await cards.nth(i).click();
  await snap('06-selected');
  await page.getByRole('button', { name: 'Jogar mão' }).click();
  await page.waitForTimeout(1500);
  await snap('07-quiz');
  await f.answerWrong(page, 1);
  await snap('08-quiz-wrong');
  await page.getByRole('button', { name: /Abandonar run/ }).click();
  await page.waitForTimeout(300);
  await snap('09-abandon-modal', false);
  await page.keyboard.press('Escape');
  await f.solveAndDeliver(page);
  await page.waitForTimeout(3500);
  await snap('10-score');
  await f.forge(
    page,
    "r.status='cleared'; r.round.roundScore = r.round.target; r.round.payout = { blind: 3, handsLeft: 3, interest: 1, total: 7 }; r.round.last = r.round.last;",
  );
  await snap('11-cleared');
  await f.forge(
    page,
    "r.status='shop'; r.round=null; r.money=14; r.jokers=['fstring']; r.shop={items:[{kind:'joker',id:'comprehension',price:8},{kind:'joker',id:'ternary',price:5},{kind:'card',cardId:'while',price:4},{kind:'card',cardId:'search',price:5},{kind:'hand',rank:'flush',price:5}],rerolls:0};",
  );
  await snap('12-shop');
  await f.forge(page, "r.status='blind'; r.ante=1; r.blindIndex=1; r.shop=null; r.round=null;");
  await snap('13-boss-blind');
  await f.startBlind(page);
  await snap('14-boss-round');
  await page.getByRole('button', { name: /Abandonar run/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abandonar' }).click();
  await snap('15-end');
  errors.push(...errs);
  await ctx.close();
}

(async () => {
  const browser = await f.launch();
  await run(browser, false);
  await run(browser, true);
  await browser.close();
  log('ERRORS', JSON.stringify(errors));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
