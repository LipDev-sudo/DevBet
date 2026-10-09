import { describe, expect, it } from 'vitest';
import { getQuestion } from '@/content/quiz';
import { createProfile } from '@/engine/progression';
import { currentBlind, type RunState } from '@/engine/blind';
import { gameReducer, initialGameState, type GameAction, type GameState } from './game-state';

const done = { ...createProfile(), tutorialCompleted: true };

function play(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function started(profile = done): GameState {
  return play(gameReducer(initialGameState(profile), { type: 'hydrate', profile, run: null }), {
    type: 'new-run',
    packId: 'dados',
    seed: 11,
  });
}

const run = (state: GameState): RunState => state.run!;

/** Responde a pergunta aberta com a alternativa certa. */
const correct = (state: GameState): GameAction => ({
  type: 'answer',
  option: getQuestion(run(state).round!.play!.questionId).answer,
});

describe('reducer do jogo', () => {
  it('a primeira run usa sempre o baralho da Tutorial Run; depois vale a escolha', () => {
    const first = started(createProfile());
    expect(run(first).tutorial).not.toBeNull();
    // o pacote Funções tem RECURSION; o Dados tem DICTIONARY
    expect(run(first).deck.some((c) => c.cardId === 'recursion')).toBe(true);
    expect(run(started()).deck.some((c) => c.cardId === 'dictionary')).toBe(true);
    expect(run(started()).tutorial).toBeNull();
  });

  it('segue o fluxo: começar blind, jogar, responder e continuar', () => {
    let s = play(started(), { type: 'start-blind' });
    expect(run(s).status).toBe('round');
    const lead = run(s).round!.hand[0]!;
    s = play(s, { type: 'play', uids: [lead] });
    expect(run(s).status).toBe('quiz');
    s = play(s, correct(s));
    expect(run(s).status).toBe('scored');
    expect(run(s).round!.roundScore).toBeGreaterThan(0);
    s = play(s, { type: 'continue' });
    expect(['round', 'cleared']).toContain(run(s).status);
  });

  it('uma regra recusada vira aviso e não muda a run', () => {
    const s = play(started(), { type: 'start-blind' });
    const blocked = play(s, { type: 'play', uids: [] });
    expect(blocked.notice?.text).toMatch(/Escolha/);
    expect(blocked.run).toBe(s.run);
    expect(play(blocked, { type: 'clear-notice' }).notice).toBeNull();
  });

  it('errar a pergunta não pontua e some com a alternativa; a rejeitada vira aviso', () => {
    let s = play(started(), { type: 'start-blind' });
    s = play(s, { type: 'play', uids: [run(s).round!.hand[0]!] });
    const question = getQuestion(run(s).round!.play!.questionId);
    const wrong = question.options.findIndex((_, i) => i !== question.answer);
    s = play(s, { type: 'answer', option: wrong });
    expect(run(s).status).toBe('quiz');
    expect(run(s).round!.play!.wrong).toEqual([wrong]);
    const again = play(s, { type: 'answer', option: wrong });
    expect(again.notice?.text).toMatch(/já tentou/);
    expect(run(again)).toBe(run(s));
  });

  it('abandonar encerra a run, conta no perfil e a run encerrada fica imutável', () => {
    let s = play(started(), { type: 'start-blind' }, { type: 'abandon-run' });
    expect(run(s).status).toBe('lost');
    expect(run(s).endReason).toBe('abandoned');
    expect(s.profile.runsPlayed).toBe(1);
    const frozen = s.run;
    s = play(s, { type: 'start-blind' }, { type: 'play', uids: ['x'] }, { type: 'abandon-run' });
    expect(s.run).toBe(frozen);
    expect(s.profile.runsPlayed).toBe(1);
    expect(play(s, { type: 'dismiss-run' }).run).toBeNull();
  });

  it('perder por falta de mãos encerra a run uma vez e soma o XP ao perfil', () => {
    let s = play(started(), { type: 'start-blind' });
    s = { ...s, run: { ...run(s), round: { ...run(s).round!, target: 999999 } } };
    for (let i = 0; i < 4 && run(s).status !== 'lost'; i++) {
      s = play(s, { type: 'play', uids: [run(s).round!.hand[0]!] });
      s = play(s, correct(s), { type: 'continue' });
    }
    expect(run(s).status).toBe('lost');
    expect(s.profile.runsPlayed).toBe(1);
    expect(s.profile.xp).toBe(run(s).xpEarned);
    expect(currentBlind(run(s)).id).toBe('a1b1');
  });

  it('o tutorial só avança com ações reais que mudaram a run', () => {
    let s = started(createProfile());
    s = play(s, { type: 'start-blind' });
    expect(run(s).tutorial!.done).toContain('blind');
    const noop = play(s, { type: 'play', uids: [] });
    expect(run(noop).tutorial).toEqual(run(s).tutorial);
    s = play(s, { type: 'play', uids: [run(s).round!.hand[0]!] });
    expect(run(s).tutorial!.done).toContain('hand');
  });

  it('o perfil de quem terminou o tutorial marca tutorialCompleted ao fim da primeira run', () => {
    const s = play(started(createProfile()), { type: 'abandon-run' });
    expect(s.profile.tutorialCompleted).toBe(true);
  });
});
