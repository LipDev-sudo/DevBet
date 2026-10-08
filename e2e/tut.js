const { launch, loadSolutions, BASE: BASE_URL, OUT: S } = require('./lib.cjs');
const sols = loadSolutions();
const byTitle = Object.fromEntries(Object.entries(sols).map(([id, v]) => [v.title, v.solution]));
const BASE = BASE_URL;
const log = console.log;
const errors = [];
const mode = process.argv[2] || 'full';
const getRun = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('devbet:run:v1') || 'null'));
const getProf = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('devbet:profile:v1') || 'null'));
const setCode = async (page, code) => {
  await page.waitForFunction(() => window.monaco && window.monaco.editor.getEditors().length > 0);
  await page.waitForTimeout(2000);
  await page.evaluate((c) => window.monaco.editor.getEditors()[0].setValue(c), code);
  await page.waitForTimeout(300);
};
const lesson = async (page) => {
  const el = page.locator('section[aria-label="Guia do Dealer"]');
  if (!(await el.count())) return null;
  return {
    id: await el.getAttribute('data-lesson'),
    text: (await el.innerText()).replace(/\s+/g, ' '),
  };
};
const shot = (page, name) => page.screenshot({ path: `${S}/tut-${name}.png`, fullPage: false });
const seen = new Set();
const note = async (page, tag) => {
  const l = await lesson(page);
  if (l && !seen.has(l.id)) {
    seen.add(l.id);
    log(`[${tag}] LESSON ${l.id}:`, l.text.slice(0, 330));
    await shot(page, l.id);
  }
  return l;
};
(async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 160)));
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()))
      errors.push(m.type() + ' ' + m.text().slice(0, 160));
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url());
  });
  await page.goto(BASE + '/play', { waitUntil: 'load' });
  let l = await note(page, 'start');
  log(
    'profile tutorialCompleted at start:',
    (await getProf(page))?.tutorialCompleted,
    '| pack checked:',
    await page.locator('input[name=pack]:checked').getAttribute('value'),
  );
  await page.getByText('Sentar à mesa').click();
  await page.waitForTimeout(600);
  log('run.tutorial after start:', JSON.stringify((await getRun(page)).tutorial));
  let reloaded = false,
    bought = false,
    riskPicked = false,
    bossSeen = false,
    losses = 0;
  for (let guard = 0; guard < 300; guard++) {
    await page.waitForTimeout(500);
    l = await note(page, 'play');
    const h1 = (await page.locator('h1').first().innerText()).trim();
    if (l && l.id === 'end') {
      log(
        'END lesson:',
        l.text.slice(0, 200),
        '| profile.tutorialCompleted:',
        (await getProf(page))?.tutorialCompleted,
      );
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(800);
      const h = (await page.locator('h1').first().innerText()).trim();
      log(
        'after reload on end screen: heading =',
        h,
        '| coach lesson:',
        (await lesson(page))?.id,
        '| run in storage status:',
        (await getRun(page))?.status,
        '| tutorialCompleted:',
        (await getProf(page))?.tutorialCompleted,
      );
      await shot(page, 'end-reloaded');
      break;
    }
    // lições informativas: Entendi
    const ackBtn = page.locator('section[aria-label="Guia do Dealer"] button', {
      hasText: 'Entendi',
    });
    if (await ackBtn.count()) {
      log('  ack', l.id);
      await ackBtn.click();
      continue;
    }
    if (await page.getByRole('button', { name: 'Voltar à mesa' }).count()) {
      if (!bought) {
        const buy = page.getByRole('button', { name: /^Comprar/ }).first();
        const before = await getRun(page);
        if ((await buy.count()) && (await buy.isEnabled())) {
          await buy.click();
          await page.waitForTimeout(500);
          const after = await getRun(page);
          bought = true;
          log(
            '  BOUGHT: chips',
            before.chips,
            '->',
            after.chips,
            '| deck',
            before.deck.length,
            '->',
            after.deck.length,
            '| tutorial.bought',
            after.tutorial.bought,
            '| lesson:',
            (await lesson(page)).text.slice(-110),
          );
          await shot(page, 'shop-bought');
        }
      }
      await page.getByRole('button', { name: 'Voltar à mesa' }).click();
      continue;
    }
    if (await page.getByText('THE HOUSE').count()) {
      await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
      continue;
    }
    if (await page.getByRole('button', { name: 'Começar desafio' }).count()) {
      const start = page.getByRole('button', { name: 'Começar desafio' });
      if (l && l.id === 'cards') {
        log('  gate: Começar desafio disabled =', await start.isDisabled());
        await page.locator('[aria-label="Sua mão"] .playing-card').first().click();
        await page.waitForTimeout(500);
        log(
          '  card modal:',
          (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ').slice(0, 200),
        );
        await shot(page, 'card-modal');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        log(
          '  after inspect: disabled =',
          await start.isDisabled(),
          '| tutorial',
          JSON.stringify((await getRun(page)).tutorial),
        );
        continue;
      }
      if (l && l.id === 'risk' && !riskPicked) {
        await page.getByRole('radio', { name: /RISKY/ }).click();
        riskPicked = true;
        log('  picked RISKY');
      }
      await start.click();
      continue;
    }
    if (await page.getByRole('button', { name: 'Entregar' }).count()) {
      const deliver = page.getByRole('button', { name: 'Entregar' });
      if (l && l.id === 'editor') {
        log('  gate: Entregar disabled =', await deliver.isDisabled());
        await setCode(page, 'x = 1\n');
        await page.getByRole('button', { name: 'Executar' }).click();
        await page.waitForTimeout(4500);
        const l2 = await note(page, 'after-run');
        log(
          '  after real run: lesson',
          l2.id,
          '| Entregar disabled =',
          await deliver.isDisabled(),
          '| tutorial',
          JSON.stringify((await getRun(page)).tutorial),
        );
        if (!reloaded) {
          reloaded = true;
          await page.reload({ waitUntil: 'load' });
          await page.waitForTimeout(1500);
          const l3 = await lesson(page);
          log(
            '  RELOAD mid-tutorial → lesson',
            l3 && l3.id,
            '| Entregar disabled =',
            await deliver.isDisabled(),
          );
        }
        continue;
      }
      if (mode === 'lose') {
        await page.getByRole('button', { name: 'Desistir' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Desistir' }).click();
        await page.waitForTimeout(800);
        continue;
      }
      const title = h1;
      if (l && l.id === 'hint')
        log('  hint button:', await page.getByRole('button', { name: /^Dica/ }).innerText());
      await setCode(page, byTitle[title]);
      await page.getByRole('button', { name: 'Executar' }).click();
      await page.waitForTimeout(4500);
      await page.getByRole('button', { name: 'Entregar' }).click();
      await page
        .getByRole('heading', { name: /BUST|MÃO VENCEDORA/ })
        .waitFor({ timeout: 25000 })
        .catch(() => {});
      await page.waitForTimeout(600);
      const lr = await note(page, 'result');
      if (lr)
        log(
          '  result lesson',
          lr.id,
          '| strip:',
          (
            await page
              .getByLabel('Aposta, solução, resultado e recompensa')
              .innerText()
              .catch(() => 'n/a')
          ).replace(/\s+/g, ' '),
        );
      continue;
    }
    const claimBtn = page
      .locator('section[aria-labelledby="recompensa-titulo"] button.playing-card')
      .first();
    if (await claimBtn.count()) {
      await claimBtn.click();
      continue;
    }
    const cont = page
      .getByRole('button', { name: /Continuar|Encerrar|revanche|Pular|Concluir/ })
      .first();
    if (await cont.count()) {
      if (mode === 'lose') losses++;
      await cont.click();
      continue;
    }
  }
  {
    const r = await getRun(page);
    log(
      'LOOP END: status',
      r && r.status,
      'layer',
      r && r.layerIndex,
      'lives',
      r && r.lives,
      'h1',
      (await page.locator('h1').first().innerText()).trim(),
      '| lesson',
      JSON.stringify(await lesson(page)),
      '| buttons',
      (await page.getByRole('button').allInnerTexts()).join(' / ').slice(0, 200),
    );
  }
  // segunda run
  const next = page.getByRole('button', { name: /Nova run|Tentar novamente/ });
  if (true) {
    if (await next.count()) await next.click();
    await page.waitForTimeout(600);
    log(
      'second run start: coach present =',
      await page.locator('section[aria-label="Guia do Dealer"]').count(),
      '| pack default =',
      await page.locator('input[name=pack]:checked').getAttribute('value'),
    );
    await page.getByText('Sentar à mesa').click();
    await page.waitForTimeout(600);
    const r2 = await getRun(page);
    log(
      'second run: tutorial =',
      JSON.stringify(r2.tutorial),
      '| coach =',
      await page.locator('section[aria-label="Guia do Dealer"]').count(),
    );
    await page.locator('ol button').filter({ hasText: 'Meta' }).first().click();
    await page.waitForTimeout(400);
    log(
      'second run table: coach =',
      await page.locator('section[aria-label="Guia do Dealer"]').count(),
      '| Começar enabled =',
      await page.getByRole('button', { name: 'Começar desafio' }).isEnabled(),
    );
  }
  log('lessons seen:', [...seen].join(', '));
  log('ERRORS', JSON.stringify(errors));
  await browser.close();
})();
