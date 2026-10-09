import { describe, expect, it } from 'vitest';
import { createRun, handCards, startBlind, type Result, type RunState } from './blind';
import { createProfile } from './progression';
import { currentLesson, reduceTutorial, tutorialGate } from './tutorial';

const unwrap = (r: Result<RunState>): RunState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

const fresh = () => unwrap(createRun('funcoes', 3, createProfile()));

describe('Tutorial Run', () => {
  it('sem run, o Dealer recebe quem nunca jogou; quem já terminou o tutorial não vê nada', () => {
    expect(currentLesson(null, false)?.id).toBe('welcome');
    expect(currentLesson(null, true)).toBeNull();
    const normal = unwrap(createRun('funcoes', 3, { ...createProfile(), tutorialCompleted: true }));
    expect(normal.tutorial).toBeNull();
    expect(currentLesson(normal, true)).toBeNull();
  });

  it('a primeira lição vem do estado real: a blind, e começar a blind a conclui', () => {
    const run = fresh();
    expect(currentLesson(run)?.id).toBe('blind');
    const next = reduceTutorial(run, { kind: 'started' })!;
    expect(next.done).toContain('blind');
  });

  it('a 1ª mão traz PARAMETER + RETURN e a lição cita PURE FUNCTION', () => {
    const run = unwrap(startBlind(fresh()));
    const ids = handCards(run).map((card) => card.cardId);
    expect(ids).toContain('parameter');
    expect(ids).toContain('return');
    const lesson = currentLesson({
      ...run,
      tutorial: { done: ['blind'], executed: false, bought: false },
    });
    expect(lesson?.id).toBe('hand');
    expect(lesson?.detail).toMatch(/PURE FUNCTION/);
  });

  it('só a Tutorial Run garante o combo: runs normais seguem o sorteio', () => {
    let guaranteed = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const run = unwrap(
        startBlind(
          unwrap(createRun('funcoes', seed, { ...createProfile(), tutorialCompleted: true })),
        ),
      );
      const ids = handCards(run).map((c) => c.cardId);
      if (ids.includes('parameter') && ids.includes('return')) guaranteed++;
    }
    expect(guaranteed).toBeLessThan(30);
  });

  it('ações que não concluem a lição ativa não a avançam; "Entendi" só vale para a lição certa', () => {
    const run = fresh();
    expect(reduceTutorial(run, { kind: 'bought' })!.done).toEqual([]);
    expect(reduceTutorial(run, { kind: 'ack', lesson: 'shop' })!.done).toEqual([]);
  });

  it('Entregar fica travado até a primeira execução real, e o travamento tem saída', () => {
    const base = unwrap(startBlind(fresh()));
    const coding: RunState = {
      ...base,
      status: 'coding',
      tutorial: { done: ['blind', 'hand'], executed: false, bought: false },
      round: {
        ...base.round!,
        play: {
          uids: [base.round!.hand[0] as string],
          exerciseId: 'mini-variable-1',
          failedRuns: 0,
          failedSubmissions: 0,
          hintLevel: 0,
          solutionViewed: false,
          runsUsed: 0,
          draft: null,
        },
      },
    };
    expect(currentLesson(coding)?.id).toBe('code');
    expect(tutorialGate(coding)).toBe('deliver');
    const withRuns = {
      ...coding,
      round: { ...coding.round!, play: { ...coding.round!.play!, runsUsed: 3 } },
    };
    expect(tutorialGate(withRuns)).toBeNull();
    const executed = { ...coding, tutorial: reduceTutorial(coding, { kind: 'executed' })! };
    expect(currentLesson(executed)?.id).toBe('deliver');
  });

  it('terminar a run mostra a lição de fim, sem botão de avançar', () => {
    const lost: RunState = { ...fresh(), status: 'lost', endReason: 'abandoned' };
    const lesson = currentLesson(lost);
    expect(lesson?.id).toBe('end');
    expect(lesson?.ack).toBe(false);
  });
});
