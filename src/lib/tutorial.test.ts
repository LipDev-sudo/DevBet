import { afterAll, describe, expect, it } from 'vitest';
import { getChallenge } from '@/content/challenges';
import { hintCost } from '@/engine/hints';
import { createProfile } from '@/engine/progression';
import { createRun, RISK_LEVELS, resolveEncounter, type RunState } from '@/engine/run';
import { RUN_LAYERS } from '@/content/map';
import { precisionFactor, FAIL_PENALTY, previewHand } from '@/engine/scoring';
import { currentLesson, isRealExecution, tutorialGate } from '@/engine/tutorial';
import { createNodeExecutor } from '@/runner/node-executor';
import type { ExecutionReport } from '@/runner/types';
import { gameReducer, initialGameState, type GameAction, type GameState } from './game-state';
import { createLocalStorageRepository, parseProfile, parseRun } from './storage';

const executor = createNodeExecutor();
afterAll(() => executor.dispose?.());

const act = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);
const newPlayer = (): GameState =>
  act(initialGameState(createProfile()), {
    type: 'hydrate',
    profile: createProfile(),
    run: null,
  });
const lessonOf = (state: GameState) => currentLesson(state.run, state.profile.tutorialCompleted);
const text = (state: GameState) => {
  const lesson = lessonOf(state);
  return lesson ? `${lesson.text} ${lesson.detail ?? ''}` : '';
};

/** Executa o código de verdade no Python e entrega o relatório, como a tela do desafio faz. */
async function execute(state: GameState, code: string, kind: 'run' | 'submit') {
  const run = state.run!;
  const challenge = getChallenge(run.encounter!.challengeId);
  const tests = kind === 'submit' ? challenge.tests : challenge.tests.filter((t) => !t.hidden);
  const report: ExecutionReport = await executor.run({ code, tests, timeoutMs: 400 });
  let next = act(state, { type: 'ran' });
  if (kind === 'run' && isRealExecution(report)) {
    next = act(next, { type: 'tutorial', event: { kind: 'executed' } });
  }
  return { state: next, report };
}

const wrong = 'def calcular_total(p, q, d):\n    return 0';

/** Leva um jogador novo até estar dentro do primeiro desafio (cartas vistas, desafio aberto). */
function intoFirstChallenge(): GameState {
  let s = act(newPlayer(), { type: 'new-run', packId: 'funcoes', seed: 5 });
  s = act(
    s,
    { type: 'choose', challengeId: 'calcular-total' },
    { type: 'tutorial', event: { kind: 'inspect' } },
  );
  return act(s, { type: 'start' });
}

async function winFirstChallenge(): Promise<GameState> {
  let s = intoFirstChallenge();
  s = (await execute(s, wrong, 'run')).state;
  const solved = await execute(s, getChallenge('calcular-total').solution.code, 'submit');
  expect(solved.report.tests.every((t) => t.passed)).toBe(true);
  return act(solved.state, { type: 'resolve' });
}

describe('Tutorial Run: início e persistência', () => {
  it('jogador novo: perfil sem tutorial concluído e a primeira lição é a boas-vindas', () => {
    const s = newPlayer();
    expect(s.profile.tutorialCompleted).toBe(false);
    expect(lessonOf(s)?.id).toBe('welcome');
    expect(text(s)).toMatch(/apostando na sua capacidade de resolver problemas/);
  });

  it('a primeira run é a Tutorial Run, com as regras de sempre (mesmo baralho, fichas e vidas)', () => {
    const s = act(newPlayer(), { type: 'new-run', packId: 'funcoes', seed: 5 });
    expect(s.run?.tutorial).toEqual({ done: [], inspected: false, executed: false, bought: false });
    expect(s.run?.chips).toBe(30);
    expect(s.run?.lives).toBe(3);
    expect(s.run?.deck).toHaveLength(7);
    expect(s.profile.tutorialCompleted).toBe(false); // só conclui quando a run termina
    expect(lessonOf(s)?.id).toBe('lobby');
  });

  it('o tutorial não muda nenhuma regra: o mesmo estado resolve igual com e sem ele', () => {
    const s = intoFirstChallenge();
    const withTutorial = resolveEncounter(s.run!, s.profile).run.encounter!.outcome;
    const without = resolveEncounter({ ...s.run!, tutorial: null }, s.profile).run.encounter!
      .outcome;
    expect(withTutorial).toEqual(without);
  });

  it('o progresso sobrevive ao reload: salvar, ler e continuar na mesma lição', async () => {
    let s = intoFirstChallenge();
    expect(lessonOf(s)?.id).toBe('editor');
    s = (await execute(s, wrong, 'run')).state;
    expect(lessonOf(s)?.id).toBe('deliver');
    const memory = new Map<string, string>();
    const repo = createLocalStorageRepository({
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    });
    repo.saveProfile(s.profile);
    repo.saveRun(s.run);
    const reloaded = act(initialGameState(createProfile()), {
      type: 'hydrate',
      profile: repo.loadProfile(),
      run: repo.loadRun(),
    });
    expect(lessonOf(reloaded)?.id).toBe('deliver');
    expect(reloaded.run?.tutorial?.executed).toBe(true);
    expect(reloaded.run?.tutorial?.done).toEqual(s.run?.tutorial?.done);
    expect(tutorialGate(reloaded.run)).toBeNull();
  });

  it('perfis e saves de antes do tutorial não ganham tutorial', () => {
    expect(parseProfile({ version: 1, xp: 120, runsPlayed: 3 }).tutorialCompleted).toBe(true);
    expect(parseProfile({ version: 1, xp: 0, runsPlayed: 0 }).tutorialCompleted).toBe(false);
    expect(parseProfile({ version: 1, tutorialCompleted: true }).tutorialCompleted).toBe(true);
    const base = createRun('logica', 1, { ...createProfile(), tutorialCompleted: true });
    if (!base.ok) throw new Error(base.reason);
    const legacy = JSON.parse(JSON.stringify(base.state));
    delete legacy.tutorial;
    expect(parseRun(legacy)?.tutorial).toBeNull();
    legacy.tutorial = 'lixo';
    expect(parseRun(legacy)?.tutorial).toBeNull();
  });
});

describe('Tutorial Run: as lições seguem ações reais', () => {
  it('cartas: a mão fica travada até o jogador abrir uma carta de verdade', () => {
    let s = act(newPlayer(), { type: 'new-run', packId: 'funcoes', seed: 5 });
    s = act(s, { type: 'choose', challengeId: 'calcular-total' });
    expect(lessonOf(s)?.id).toBe('cards');
    expect(lessonOf(s)?.ack).toBe(false);
    expect(tutorialGate(s.run)).toBe('start');
    expect(text(s)).toMatch(/conceitos reais de Python/);
    s = act(s, { type: 'tutorial', event: { kind: 'ack', lesson: 'cards' } });
    expect(tutorialGate(s.run)).toBe('start'); // "Entendi" não substitui a ação
    s = act(s, { type: 'tutorial', event: { kind: 'inspect' } });
    expect(s.run?.tutorial?.inspected).toBe(true);
    expect(tutorialGate(s.run)).toBeNull();
  });

  it('executar: só uma execução real destrava Entregar; sem executor a trava cai após 3 tentativas', async () => {
    const s = intoFirstChallenge();
    expect(lessonOf(s)?.id).toBe('editor');
    expect(tutorialGate(s.run)).toBe('deliver');
    // Um relatório que não veio do Python não conta.
    expect(isRealExecution({ status: 'crash', tests: [], logs: [], durationMs: 0 })).toBe(false);
    const attempted = act(s, { type: 'ran' }, { type: 'ran' });
    expect(tutorialGate(attempted.run)).toBe('deliver');
    expect(tutorialGate(act(attempted, { type: 'ran' }).run)).toBeNull(); // nunca sem saída
    const done = await execute(s, wrong, 'run');
    expect(done.report.status).toBe('ok');
    expect(done.state.run?.tutorial?.executed).toBe(true);
    expect(tutorialGate(done.state.run)).toBeNull();
    expect(lessonOf(done.state)?.id).toBe('deliver');
  });

  it('o texto de Executar × Entregar bate com as regras: executar não custa, entregar errado custa', async () => {
    const s = (await execute(intoFirstChallenge(), wrong, 'run')).state;
    const lesson = lessonOf(s)!;
    expect(lesson.text).toMatch(/Executar é testar sua solução/);
    expect(lesson.text).toMatch(/Entregar é assumir o risco/);
    expect(lesson.detail).toContain(`${Math.round(FAIL_PENALTY * 100)}% de precisão`);
    // Executar de verdade não alterou nada da pontuação nem os recursos.
    const e = s.run!.encounter!;
    expect(e.failedSubmissions).toBe(0);
    expect(precisionFactor(e.failedSubmissions, e.voluntaryHints, e.solutionViewed)).toBe(1);
    expect(s.run!.lives).toBe(3);
    expect(precisionFactor(1, 0, false)).toBe(1 - FAIL_PENALTY); // entrega errada: custa de fato
  });

  it('entrega real + recompensa: os números da lição vêm do estado real', async () => {
    const s = await winFirstChallenge();
    expect(s.run?.status).toBe('reward');
    const lesson = lessonOf(s)!;
    const o = s.run!.encounter!.outcome!;
    expect(lesson.id).toBe('reward');
    expect(lesson.text).toContain(`${o.score.total}`);
    expect(lesson.text).toContain(`${o.target}`);
    expect(lesson.text).toContain(`${o.chipsGained} fichas`);
    expect(lesson.text).toContain(`saldo ${o.chipsBefore} → ${o.chipsAfter}`);
    expect(o.chipsAfter).toBe(s.run!.chips);
    expect(lesson.detail).toContain(`Vidas: ${s.run!.lives}`);
    expect(lesson.action).toBe('Escolha uma carta ou pule');
    // Só a ação real (escolher a carta) avança.
    const stuck = act(s, { type: 'tutorial', event: { kind: 'ack', lesson: 'reward' } });
    expect(lessonOf(stuck)?.id).toBe('reward');
    const claimed = act(s, { type: 'claim', cardId: null });
    expect(claimed.run?.tutorial?.done).toContain('reward');
  });

  it('uma ação recusada pelo jogo (aviso de regra) não avança o tutorial', () => {
    let s = act(newPlayer(), { type: 'new-run', packId: 'funcoes', seed: 5 });
    const before = s.run!.tutorial;
    s = act(s, { type: 'choose', challengeId: 'boss-infinite-loop' }); // fora da mesa
    expect(s.notice?.text).toBeTruthy();
    expect(s.run?.tutorial).toEqual(before);
    expect(s.run?.status).toBe('map');
  });

  it('risco: só aparece quando está disponível (mesa 2) e descreve o que existe de verdade', async () => {
    let s = await winFirstChallenge();
    s = act(s, { type: 'claim', cardId: null }, { type: 'choose', challengeId: 'eh-bissexto' });
    // Primeiro a explicação curta de Bust e vidas; depois o risco.
    expect(lessonOf(s)?.id).toBe('lives');
    s = act(s, { type: 'tutorial', event: { kind: 'ack', lesson: 'lives' } });
    expect(lessonOf(s)?.id).toBe('risk');
    const t = text(s);
    expect(t).toContain(`aposta ${RISK_LEVELS.risky.wager} fichas, recompensa ×1.5`);
    expect(t).toContain(`aposta ${RISK_LEVELS.high.wager} fichas, recompensa ×2.0`);
    expect(t).toMatch(/não muda a meta nem a chance de Bust/);
    expect(t).not.toMatch(/probabilidade|mais difícil/i);
    // E na primeira mesa (risco travado) a lição de risco nunca apareceu.
    expect(s.run?.tutorial?.done).not.toContain('risk');
  });

  it('combo: destaca as cartas reais do combo e separa de Sequência', () => {
    // Procura uma semente cuja mão tenha as duas cartas do combo PURE FUNCTION.
    let s: GameState | null = null;
    for (let seed = 1; seed <= 80 && !s; seed++) {
      const t = act(
        newPlayer(),
        { type: 'new-run', packId: 'funcoes', seed },
        { type: 'choose', challengeId: 'calcular-total' },
        { type: 'tutorial', event: { kind: 'inspect' } },
      );
      const ids = t.run!.encounter!.hand.map(
        (uid) => t.run!.deck.find((c) => c.uid === uid)!.cardId,
      );
      if (ids.includes('parameter') && ids.includes('return')) s = t;
    }
    if (!s) throw new Error('nenhuma semente com o combo');
    const lesson = lessonOf(s)!;
    expect(lesson.id).toBe('combo');
    expect(lesson.text).toMatch(/PURE FUNCTION/);
    expect(lesson.detail).toMatch(/PARAMETER \+ RETURN/);
    expect(lesson.detail).toMatch(/Sequência/);
    expect(lesson.target).toContain('data-card-id="parameter"');
    expect(lesson.target).toContain('data-card-id="return"');
    const next = act(s, { type: 'tutorial', event: { kind: 'ack', lesson: 'combo' } });
    expect(lessonOf(next)).toBeNull();
  });

  it('dicas: o custo aparece na lição, igual ao que o botão mostra antes de pedir', async () => {
    let s = await winFirstChallenge();
    s = act(
      s,
      { type: 'claim', cardId: null },
      { type: 'choose', challengeId: 'eh-bissexto' },
      { type: 'start' },
    );
    const lesson = lessonOf(s)!;
    expect(lesson.id).toBe('hint');
    const ch = getChallenge('eh-bissexto');
    expect(lesson.detail).toContain(hintCost(ch, 0)!.label);
    expect(lesson.detail).toContain(hintCost(ch, 1)!.label);
    expect(lesson.detail).toContain(hintCost(ch, 4)!.label);
  });

  it('Bust e vidas: a lição explica a consequência real e fecha ao continuar', async () => {
    let s = await winFirstChallenge();
    s = act(
      s,
      { type: 'claim', cardId: null },
      { type: 'choose', challengeId: 'eh-bissexto' },
      { type: 'risk', risk: 'risky' },
      { type: 'start' },
    );
    const chipsInPlay = s.run!.chips;
    s = act(s, { type: 'forfeit' });
    const lesson = lessonOf(s)!;
    expect(lesson.id).toBe('bust');
    expect(lesson.text).toMatch(/desistiu/);
    expect(lesson.detail).toContain('−1 vida');
    expect(lesson.detail).toContain(`aposta de ${RISK_LEVELS.risky.wager} fichas`);
    expect(lesson.detail).toContain(`Vidas restantes: ${s.run!.lives}`);
    expect(s.run!.lives).toBe(2);
    expect(s.run!.chips).toBe(chipsInPlay);
    s = act(s, { type: 'claim', cardId: null });
    expect(s.run?.tutorial?.done).toContain('bust');
    expect(s.run?.status).toBe('shop'); // o jogador segue em frente com 2 vidas
  });

  it('loja: compra real altera fichas e baralho, e só "voltar à mesa" fecha a lição', async () => {
    let s = await winFirstChallenge();
    s = act(s, { type: 'claim', cardId: null });
    const second = await (async () => {
      let t = act(s, { type: 'choose', challengeId: 'eh-bissexto' }, { type: 'start' });
      t = (await execute(t, 'def eh_bissexto(a):\n    return False', 'run')).state;
      return act(t, { type: 'resolve' }, { type: 'claim', cardId: null });
    })();
    expect(second.run?.status).toBe('shop');
    const lesson = lessonOf(second)!;
    expect(lesson.id).toBe('shop');
    expect(lesson.text).toBe(
      'Suas fichas também servem para melhorar seu baralho nas próximas mesas.',
    );
    const offer = second.run!.shop!.offers[0]!;
    const before = second.run!;
    const bought = act(second, { type: 'buy', cardId: offer });
    if (bought.run === before) throw new Error(bought.notice?.text);
    expect(bought.run!.deck).toHaveLength(before.deck.length + 1);
    expect(bought.run!.chips).toBeLessThan(before.chips);
    expect(bought.run!.tutorial?.bought).toBe(true);
    expect(lessonOf(bought)?.text).toBe(lesson.text);
    expect(lessonOf(bought)?.detail).toMatch(/Compra feita/);
    const left = act(bought, { type: 'leave-shop' });
    expect(left.run?.tutorial?.done).toContain('shop');
  });

  it('compra recusada (sem fichas) não conta como compra', async () => {
    const s = await winFirstChallenge();
    const shop = {
      ...s.run!,
      status: 'shop' as const,
      chips: 0,
      shop: { offers: ['while' as const], rerolls: 0, boughtLife: false },
    };
    const refused = act({ ...s, run: shop }, { type: 'buy', cardId: 'while' });
    expect(refused.notice?.text).toMatch(/insuficientes/);
    expect(refused.run?.tutorial?.bought).toBe(false);
  });

  it('boss: apresenta as regras reais e o código travado como pista', () => {
    const base = act(newPlayer(), { type: 'new-run', packId: 'funcoes', seed: 5 });
    const atBoss: RunState = {
      ...base.run!,
      layerIndex: 8,
      history: [{ challengeId: 'x', score: 1, bust: false }],
    };
    let s: GameState = { ...base, run: atBoss };
    const intro = lessonOf(s)!;
    expect(intro.id).toBe('boss');
    expect(intro.text).toBe('Agora você vai enfrentar uma mesa diferente.');
    expect(intro.detail).toMatch(/revanche|precisa vencer/);
    expect(intro.detail).toMatch(/nível 3/);
    s = act(s, { type: 'choose', challengeId: 'boss-infinite-loop' });
    s = act(s, { type: 'tutorial', event: { kind: 'inspect' } }, { type: 'start' });
    const code = lessonOf(s)!;
    expect(code.id).toBe('boss-code');
    expect(code.detail).toMatch(/1\.5 s/);
    expect(code.detail).toMatch(/travou/);
  });
});

describe('Tutorial Run: conclusão', () => {
  const firstOption = (s: GameState) => {
    const layer = RUN_LAYERS[s.run!.layerIndex];
    if (!layer || layer.kind === 'shop') throw new Error('sem desafio nesta camada');
    return layer.options[0]!;
  };
  const finishByLosing = (s: GameState) => {
    let t = act(s, { type: 'new-run', packId: 'funcoes', seed: 5 });
    for (let i = 0; i < 3; i++) {
      if (t.run!.status === 'shop') t = act(t, { type: 'leave-shop' });
      t = act(t, { type: 'choose', challengeId: firstOption(t) });
      t = act(t, { type: 'tutorial', event: { kind: 'inspect' } }, { type: 'start' });
      t = act(t, { type: 'forfeit' }, { type: 'claim', cardId: null });
    }
    return t;
  };

  it('perder a primeira run conclui o tutorial, com a mensagem certa, e ele não volta', () => {
    const lost = finishByLosing(newPlayer());
    expect(lost.run?.status).toBe('lost');
    const lesson = lessonOf(lost)!;
    expect(lesson.id).toBe('end');
    expect(lesson.text).toBe('Você perdeu sua primeira run. Mas agora você já conhece a mesa.');
    expect(lost.profile.tutorialCompleted).toBe(true);
    expect(lost.profile.runsPlayed).toBe(1);
    const second = act(lost, { type: 'dismiss-run' });
    expect(lessonOf(second)).toBeNull();
    const again = act(second, { type: 'new-run', packId: 'funcoes', seed: 6 });
    expect(again.run?.tutorial).toBeNull();
    expect(lessonOf(again)).toBeNull();
  });

  it('vencer a primeira run mostra a mensagem de vitória e conclui o tutorial', () => {
    let s = act(newPlayer(), { type: 'new-run', packId: 'funcoes', seed: 5 });
    s = { ...s, run: { ...s.run!, layerIndex: 8, streak: 6 } };
    s = act(
      s,
      { type: 'choose', challengeId: 'boss-infinite-loop' },
      { type: 'tutorial', event: { kind: 'inspect' } },
      { type: 'start' },
      { type: 'resolve' },
    );
    expect(s.run?.encounter?.outcome?.bust).toBe(false);
    s = act(s, { type: 'claim', cardId: null });
    expect(s.run?.status).toBe('won');
    expect(lessonOf(s)?.text).toBe(
      'Você terminou sua primeira run. Agora você conhece as regras da mesa.',
    );
    expect(s.profile.tutorialCompleted).toBe(true);
    expect(s.profile.runsWon).toBe(1);
    expect(
      act(s, { type: 'dismiss-run' }, { type: 'new-run', packId: 'logica', seed: 4 }).run?.tutorial,
    ).toBeNull();
  });

  it('abandonar a Tutorial Run também a conclui (nunca reaparece)', () => {
    let s = act(newPlayer(), { type: 'new-run', packId: 'funcoes', seed: 5 });
    s = act(s, { type: 'abandon-run' });
    expect(s.profile.tutorialCompleted).toBe(true);
    expect(s.run?.status).toBe('lost'); // a tela final mostra o resultado da run abandonada
    expect(lessonOf(s)?.text).toMatch(/abandonou sua primeira run/);
    s = act(s, { type: 'dismiss-run' });
    expect(lessonOf(s)).toBeNull();
    expect(act(s, { type: 'new-run', packId: 'logica', seed: 2 }).run?.tutorial).toBeNull();
  });

  it('reload depois de concluir mantém o tutorial concluído', () => {
    const lost = finishByLosing(newPlayer());
    const memory = new Map<string, string>();
    const repo = createLocalStorageRepository({
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    });
    repo.saveProfile(lost.profile);
    repo.saveRun(null);
    const reloaded = act(initialGameState(createProfile()), {
      type: 'hydrate',
      profile: repo.loadProfile(),
      run: repo.loadRun(),
    });
    expect(reloaded.profile.tutorialCompleted).toBe(true);
    expect(lessonOf(reloaded)).toBeNull();
    expect(act(reloaded, { type: 'new-run', packId: 'dados', seed: 3 }).run?.tutorial).toBeNull();
  });

  it('nenhuma lição prende o jogador: em qualquer etapa há uma saída real', async () => {
    // Cobre as etapas com trava: mão (abrir carta) e editor (executar). Ambas sempre possíveis.
    let s = act(newPlayer(), { type: 'new-run', packId: 'dados', seed: 9 });
    s = act(s, { type: 'choose', challengeId: 'saudacao' });
    expect(s.run!.encounter!.hand.length).toBe(5); // há cartas para abrir
    s = act(s, { type: 'tutorial', event: { kind: 'inspect' } }, { type: 'start' });
    expect(s.run!.status).toBe('challenge');
    // Mesmo gated, Desistir funciona (saída de gameplay).
    const out = act(s, { type: 'forfeit' });
    expect(out.run!.status).toBe('reward');
  });
});

describe('Tutorial Run: composição controlada, sem tocar nas runs normais', () => {
  const handIds = (s: GameState) =>
    s.run!.encounter!.hand.map((uid) => s.run!.deck.find((c) => c.uid === uid)!.cardId);

  it('a primeira run sempre usa o Pacote Funções; depois vale a escolha do jogador', () => {
    const first = act(newPlayer(), { type: 'new-run', packId: 'logica', seed: 1 });
    expect(first.run?.deck.map((c) => c.cardId)).toEqual([
      'variable',
      'operator',
      'function',
      'parameter',
      'return',
      'condition',
      'list',
    ]);
    const done = act(first, { type: 'abandon-run' }, { type: 'dismiss-run' });
    const second = act(done, { type: 'new-run', packId: 'logica', seed: 1 });
    expect(second.run?.deck.map((c) => c.cardId)).toContain('boolean');
  });

  it('em qualquer semente, a 1ª mesa do tutorial traz um combo real que o desafio usa', () => {
    for (const challengeId of ['calcular-total', 'saudacao']) {
      for (let seed = 1; seed <= 120; seed++) {
        const s = act(
          newPlayer(),
          { type: 'new-run', packId: 'funcoes', seed },
          { type: 'choose', challengeId },
          { type: 'tutorial', event: { kind: 'inspect' } },
        );
        const ids = handIds(s);
        expect(ids, `${challengeId} seed ${seed}`).toContain('parameter');
        expect(ids).toContain('return');
        const lesson = lessonOf(s)!;
        expect(lesson.id, `${challengeId} seed ${seed}`).toBe('combo');
        // O efeito mostrado é o efeito real da pontuação.
        const preview = previewHand(
          s.run!.encounter!.hand.map((uid) => s.run!.deck.find((c) => c.uid === uid)!),
          getChallenge(challengeId).concepts,
        );
        const bonus = preview.combos.find((c) => c.combo.id === 'pure-function')!.bonus;
        expect(lesson.detail).toContain(`+${bonus.toFixed(2)} ao multiplicador`);
      }
    }
  });

  it('trocar a mão na 1ª mesa do tutorial muda as cartas, mas mantém o combo', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = act(
        newPlayer(),
        { type: 'new-run', packId: 'funcoes', seed },
        { type: 'choose', challengeId: 'calcular-total' },
      );
      const before = s.run!.encounter!.hand;
      const redrawn = act(s, { type: 'redraw' });
      expect(redrawn.run!.encounter!.hand).not.toEqual(before);
      expect(new Set(redrawn.run!.encounter!.hand)).not.toEqual(new Set(before));
      expect(handIds(redrawn)).toEqual(expect.arrayContaining(['parameter', 'return']));
    }
  });

  it('runs normais seguem o sorteio de sempre: o combo NÃO é garantido', () => {
    const done = { ...createProfile(), tutorialCompleted: true };
    let withoutCombo = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const s = act(
        { ...initialGameState(done), hydrated: true },
        { type: 'new-run', packId: 'funcoes', seed },
        { type: 'choose', challengeId: 'calcular-total' },
      );
      expect(s.run?.tutorial).toBeNull();
      const ids = handIds(s);
      if (!(ids.includes('parameter') && ids.includes('return'))) withoutCombo++;
    }
    expect(withoutCombo).toBeGreaterThan(10);
  });

  it('depois da 1ª mesa o tutorial também volta ao sorteio normal', () => {
    const s = act(
      newPlayer(),
      { type: 'new-run', packId: 'funcoes', seed: 7 },
      { type: 'choose', challengeId: 'calcular-total' },
      { type: 'tutorial', event: { kind: 'inspect' } },
      { type: 'start' },
      { type: 'forfeit' },
      { type: 'claim', cardId: null },
    );
    let seen = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const t = act(
        { ...s, run: { ...s.run!, seed } },
        { type: 'choose', challengeId: 'eh-bissexto' },
      );
      if (!handIds(t).includes('parameter')) seen++;
    }
    expect(seen).toBeGreaterThan(5); // 2ª mesa: mão sorteada normalmente
  });
});

describe('Tutorial Run: Bust explicado sem ser forçado', () => {
  it('a lição de vidas usa os valores reais e não promete Bust por erro', async () => {
    let s = await winFirstChallenge();
    s = act(s, { type: 'claim', cardId: null }, { type: 'choose', challengeId: 'eh-bissexto' });
    const lesson = lessonOf(s)!;
    expect(lesson.id).toBe('lives');
    expect(lesson.ack).toBe(true);
    expect(lesson.text).toContain(`${getChallenge('eh-bissexto').target} pts`);
    expect(lesson.text).toMatch(/entrega aprovada pontuar abaixo/);
    expect(lesson.detail).toContain(`Você tem ${s.run!.lives} vidas`);
    expect(lesson.detail).toMatch(/Código que falha nos testes não é Bust/);
    expect(lesson.detail).toMatch(/não precisa provocar um Bust/);
    expect(`${lesson.text} ${lesson.detail}`).not.toMatch(/erro (causa|gera) Bust/i);
    // Aparecer não obriga ninguém a perder: dá para seguir sem nenhuma derrota.
    expect(s.run!.lives).toBe(3);
  });

  it('se o Bust já aconteceu, a lição de Bust já explicou: a de vidas não repete', async () => {
    let s = intoFirstChallenge();
    s = act(s, { type: 'forfeit' });
    expect(lessonOf(s)?.id).toBe('bust');
    s = act(s, { type: 'claim', cardId: null }, { type: 'choose', challengeId: 'eh-bissexto' });
    expect(lessonOf(s)?.id).toBe('risk'); // sem 'lives'
  });

  it('o jogador chega ao fim da tutorial sem nunca perder vida', async () => {
    const s = await winFirstChallenge();
    expect(s.run!.lives).toBe(3);
    expect(s.run!.history.every((h) => !h.bust)).toBe(true);
  });
});

describe('Tela final: sobrevive ao reload', () => {
  const memoryRepo = () => {
    const memory = new Map<string, string>();
    return createLocalStorageRepository({
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    });
  };
  const reload = (s: GameState) => {
    const repo = memoryRepo();
    repo.saveProfile(s.profile);
    repo.saveRun(s.run);
    return act(initialGameState(createProfile()), {
      type: 'hydrate',
      profile: repo.loadProfile(),
      run: repo.loadRun(),
    });
  };

  it('derrota: o mesmo resultado volta, sem reabrir a run nem o tutorial', () => {
    let s = act(newPlayer(), { type: 'new-run', packId: 'funcoes', seed: 5 });
    for (let i = 0; i < 3; i++) {
      if (s.run!.status === 'shop') s = act(s, { type: 'leave-shop' });
      const layer = RUN_LAYERS[s.run!.layerIndex];
      if (!layer || layer.kind === 'shop') throw new Error('camada inválida');
      s = act(
        s,
        { type: 'choose', challengeId: layer.options[0]! },
        { type: 'tutorial', event: { kind: 'inspect' } },
        { type: 'start' },
        { type: 'forfeit' },
        { type: 'claim', cardId: null },
      );
    }
    expect(s.run?.status).toBe('lost');
    const back = reload(s);
    expect(back.run?.status).toBe('lost');
    expect(back.run?.history).toEqual(s.run?.history);
    expect(back.run?.chips).toBe(s.run?.chips);
    expect(back.run?.score).toBe(s.run?.score);
    expect(back.run?.xpEarned).toBe(s.run?.xpEarned);
    expect(back.profile.tutorialCompleted).toBe(true);
    expect(back.profile.runsPlayed).toBe(1); // o perfil não conta a run de novo
    expect(lessonOf(back)?.id).toBe('end');
    const fresh = act(back, { type: 'dismiss-run' });
    expect(fresh.run).toBeNull();
    expect(reload(fresh).run).toBeNull();
    expect(lessonOf(reload(fresh))).toBeNull();
  });

  it('abandono e vitória também voltam como resultado final', () => {
    const abandoned = act(
      newPlayer(),
      { type: 'new-run', packId: 'funcoes', seed: 5 },
      { type: 'abandon-run' },
    );
    const back = reload(abandoned);
    expect(back.run?.status).toBe('lost');
    expect(back.run?.endReason).toBe('abandoned');
    expect(back.profile.runsPlayed).toBe(1);

    let s = act(newPlayer(), { type: 'new-run', packId: 'funcoes', seed: 5 });
    s = { ...s, run: { ...s.run!, layerIndex: 8, streak: 6 } };
    s = act(
      s,
      { type: 'choose', challengeId: 'boss-infinite-loop' },
      { type: 'tutorial', event: { kind: 'inspect' } },
      { type: 'start' },
      { type: 'resolve' },
      { type: 'claim', cardId: null },
    );
    const won = reload(s);
    expect(won.run?.status).toBe('won');
    expect(won.profile.runsWon).toBe(1);
    expect(lessonOf(won)?.text).toMatch(/terminou sua primeira run/);
  });
});

describe('Tutorial Run: recompensa sem cartas novas', () => {
  it('a lição de recompensa não manda escolher uma carta que não existe', async () => {
    const s = await winFirstChallenge();
    const outcome = s.run!.encounter!.outcome!;
    const none = {
      ...s,
      run: {
        ...s.run!,
        encounter: { ...s.run!.encounter!, outcome: { ...outcome, rewardOptions: [] } },
      },
    };
    const lesson = lessonOf(none)!;
    expect(lesson.id).toBe('reward');
    expect(lesson.detail).toMatch(/Não há cartas novas/);
    expect(lesson.detail).not.toMatch(/Escolha uma carta/);
    expect(lesson.action).toBe('Toque em Continuar');
  });
});
