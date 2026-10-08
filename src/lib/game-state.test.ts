import { describe, expect, it } from 'vitest';
import { createProfile } from '@/engine/progression';
import { gameReducer, initialGameState, type GameAction, type GameState } from './game-state';

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);
const start = () =>
  run(
    initialGameState(createProfile()),
    { type: 'hydrate', profile: createProfile(), run: null },
    {
      type: 'new-run',
      packId: 'logica',
      seed: 3,
    },
  );

describe('estado do jogo', () => {
  it('cria e abandona uma run contando no perfil', () => {
    const state = start();
    expect(state.run?.status).toBe('map');
    const abandoned = gameReducer(state, { type: 'abandon-run' });
    // A run abandonada vira run encerrada: o resultado fica na tela final até o jogador dispensá-lo.
    expect(abandoned.run?.status).toBe('lost');
    expect(abandoned.run?.endReason).toBe('abandoned');
    expect(abandoned.profile.runsPlayed).toBe(1);
    expect(gameReducer(abandoned, { type: 'abandon-run' })).toBe(abandoned); // só conta uma vez
    expect(gameReducer(abandoned, { type: 'dismiss-run' }).run).toBeNull();
  });

  it('erros de regra viram aviso sem alterar a run', () => {
    const state = start();
    const next = gameReducer(state, { type: 'redraw' });
    expect(next.notice?.text).toBeTruthy();
    expect(next.run).toBe(state.run);
  });

  it('percorre mesa → desafio → resultado e detecta subida de nível', () => {
    let state = start();
    state = run(
      state,
      { type: 'choose', challengeId: 'calcular-total' },
      { type: 'start' },
      { type: 'resolve' },
    );
    expect(state.run?.status).toBe('reward');
    expect(state.profile.xp).toBeGreaterThan(0);
    const leveled = run(
      { ...start(), profile: { ...createProfile(), xp: 79 } },
      { type: 'choose', challengeId: 'calcular-total' },
      { type: 'start' },
      { type: 'resolve' },
    );
    expect(leveled.levelUp).toEqual({ from: 1, to: 2 });
  });

  it('atualiza o perfil exatamente uma vez ao encerrar a run', () => {
    let state = start();
    state = run(state, { type: 'choose', challengeId: 'calcular-total' }, { type: 'start' });
    state = run(
      { ...state, run: state.run && { ...state.run, lives: 1 } },
      { type: 'forfeit' },
      { type: 'claim', cardId: null },
    );
    expect(state.run?.status).toBe('lost');
    expect(state.profile.runsPlayed).toBe(1);
    expect(gameReducer(state, { type: 'clear-notice' }).profile.runsPlayed).toBe(1);
  });

  it('60 execuções esgotadas: Entregar ainda conclui o desafio e Desistir é uma saída', () => {
    let state = start();
    state = run(state, { type: 'choose', challengeId: 'calcular-total' }, { type: 'start' });
    for (let i = 0; i < 61; i++) state = gameReducer(state, { type: 'ran' });
    expect(state.run?.encounter?.runsUsed).toBe(61);
    const delivered = gameReducer(state, { type: 'resolve' });
    expect(delivered.run?.status).toBe('reward');
    const gaveUp = gameReducer(state, { type: 'forfeit' });
    expect(gaveUp.run?.status).toBe('reward');
    expect(gaveUp.run?.encounter?.outcome?.forfeit).toBe(true);
    expect(gaveUp.run?.lives).toBe(2);
    expect(gaveUp.levelUp).toBeNull();
  });

  it('desistir só existe dentro de um desafio', () => {
    const state = start();
    expect(gameReducer(state, { type: 'forfeit' })).toBe(state);
  });

  it('o aviso de subida de nível não vaza para o desafio seguinte', () => {
    let state = {
      ...start(),
      profile: { ...createProfile(), xp: 79 },
    };
    state = run(
      state,
      { type: 'choose', challengeId: 'calcular-total' },
      { type: 'start' },
      { type: 'resolve' },
    );
    expect(state.levelUp).not.toBeNull();
    state = run(
      state,
      { type: 'claim', cardId: null },
      { type: 'choose', challengeId: 'eh-bissexto' },
      { type: 'start' },
      { type: 'resolve' },
    );
    expect(state.levelUp).toBeNull();
  });

  it('retry depois de perder: nova run com baralho do pacote, fichas e vidas zeradas', () => {
    let state = start();
    state = run(state, { type: 'choose', challengeId: 'calcular-total' }, { type: 'start' });
    state = run(
      { ...state, run: state.run && { ...state.run, lives: 1, chips: 5 } },
      { type: 'forfeit' },
      { type: 'claim', cardId: null },
    );
    expect(state.run?.status).toBe('lost');
    state = run(state, { type: 'dismiss-run' }, { type: 'new-run', packId: 'dados', seed: 8 });
    expect(state.run?.status).toBe('map');
    expect(state.run?.lives).toBe(3);
    expect(state.run?.chips).toBe(30);
    expect(state.run?.history).toEqual([]);
    expect(state.run?.deck).toHaveLength(7);
  });

  it('depois de encerrada, nenhuma ação da run antiga altera o estado', () => {
    const live = run(start(), { type: 'choose', challengeId: 'calcular-total' }, { type: 'start' });
    const ended = gameReducer(live, { type: 'abandon-run' });
    expect(ended.run?.status).toBe('lost');
    const actions: GameAction[] = [
      { type: 'resolve' },
      { type: 'forfeit' },
      { type: 'start' },
      { type: 'choose', challengeId: 'eh-bissexto' },
      { type: 'claim', cardId: null },
      { type: 'buy', cardId: 'while' },
      { type: 'leave-shop' },
      { type: 'draft', code: 'x' },
      { type: 'ran' },
      { type: 'failed', kind: 'submit' },
      { type: 'hint' },
      { type: 'redraw' },
      { type: 'abandon-run' },
      { type: 'tutorial', event: { kind: 'executed' } },
    ];
    for (const action of actions) expect(gameReducer(ended, action), action.type).toBe(ended);
    expect(ended.profile.runsPlayed).toBe(1);
  });

  it('recarregar a run encerrada não aplica nada de novo (sem duplicar XP, fichas ou runs)', () => {
    let s = start();
    s = run(
      s,
      { type: 'choose', challengeId: 'calcular-total' },
      { type: 'start' },
      { type: 'resolve' },
      { type: 'claim', cardId: null },
      { type: 'abandon-run' },
    );
    const finished = { profile: s.profile, run: s.run! };
    let reloaded = initialGameState(createProfile());
    for (let i = 0; i < 3; i++) {
      reloaded = gameReducer(reloaded, {
        type: 'hydrate',
        profile: JSON.parse(JSON.stringify(finished.profile)),
        run: JSON.parse(JSON.stringify(finished.run)),
      });
    }
    expect(reloaded.profile).toEqual(finished.profile);
    expect(reloaded.run).toEqual(finished.run);
    expect(reloaded.profile.runsPlayed).toBe(1);
    expect(reloaded.profile.xp).toBe(finished.profile.xp);
    expect(reloaded.run?.chips).toBe(finished.run.chips);
    // E dispensar e começar outra continua funcionando.
    const next = run(
      reloaded,
      { type: 'dismiss-run' },
      { type: 'new-run', packId: 'logica', seed: 9 },
    );
    expect(next.run?.status).toBe('map');
    expect(next.profile.runsPlayed).toBe(1);
  });
});
