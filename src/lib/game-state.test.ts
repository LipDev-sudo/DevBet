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
    expect(abandoned.run).toBeNull();
    expect(abandoned.profile.runsPlayed).toBe(1);
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
    expect(leveled.levelUp).toBe(2);
  });

  it('atualiza o perfil exatamente uma vez ao encerrar a run', () => {
    let state = start();
    state = run(state, { type: 'choose', challengeId: 'calcular-total' }, { type: 'start' });
    for (let i = 0; i < 9; i++) state = gameReducer(state, { type: 'failed', kind: 'submit' });
    state = run(
      { ...state, run: state.run && { ...state.run, lives: 1 } },
      { type: 'resolve' },
      { type: 'claim', cardId: null },
    );
    expect(state.run?.status).toBe('lost');
    expect(state.profile.runsPlayed).toBe(1);
    expect(gameReducer(state, { type: 'clear-notice' }).profile.runsPlayed).toBe(1);
  });
});
