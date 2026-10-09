import { describe, expect, it } from 'vitest';
import { createRun, playHand, startBlind, type Result, type RunState } from '@/engine/blind';
import { createProfile } from '@/engine/progression';
import { aggregateAnswers, NO_TRACKER, trackAnswers } from './answers';
import { getQuestion } from '@/content/quiz';

const unwrap = (r: Result<RunState>): RunState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

describe('estatística das respostas', () => {
  it('calcula percentual por alternativa e lista os apelidos de cada uma', () => {
    const id = 'q-variable-1';
    const question = getQuestion(id);
    const wrong = question.options.findIndex((_, i) => i !== question.answer);
    const stats = aggregateAnswers([
      { questionId: id, nickname: 'Ana', picks: [wrong, question.answer] },
      { questionId: id, nickname: 'Bia', picks: [question.answer] },
      { questionId: id, nickname: 'Caio', picks: [question.answer] },
      { questionId: 'pergunta-que-sumiu', nickname: 'Dudu', picks: [0] },
    ]);
    expect(stats).toHaveLength(1);
    const [stat] = stats;
    expect(stat?.total).toBe(4);
    expect(stat?.players).toBe(3);
    const right = stat?.options[question.answer];
    expect(right).toMatchObject({ correct: true, count: 3, percent: 75 });
    expect(right?.nicknames.map((n) => n.name).sort()).toEqual(['Ana', 'Bia', 'Caio']);
    expect(stat?.options[wrong]).toMatchObject({ count: 1, percent: 25 });
    expect(stat?.options[wrong]?.nicknames).toEqual([{ name: 'Ana', count: 1 }]);
    const sum = (stat?.options ?? []).reduce((total, option) => total + option.percent, 0);
    expect(sum).toBe(100);
  });

  it('ignora alternativas inexistentes e ordena pela pergunta mais respondida', () => {
    const stats = aggregateAnswers([
      { questionId: 'q-variable-1', nickname: 'Ana', picks: [9] },
      { questionId: 'q-for-1', nickname: 'Ana', picks: [0, 1] },
    ]);
    expect(stats[0]?.id).toBe('q-for-1');
    expect(stats[1]?.total).toBe(0);
  });
});

describe('observador de respostas', () => {
  const quiz = () => {
    const run = unwrap(
      startBlind(unwrap(createRun('logica', 3, { ...createProfile(), tutorialCompleted: true }))),
    );
    return unwrap(playHand(run, [run.round!.hand[0]!]));
  };

  it('conta cada erro novo uma vez e o acerto quando a mão pontua', () => {
    const run = quiz();
    const id = run.round!.play!.questionId;
    const first = trackAnswers(NO_TRACKER, run); // carregou no meio da pergunta: só memoriza
    expect(first.picks).toEqual([]);
    const wrongRun = {
      ...run,
      round: { ...run.round!, play: { ...run.round!.play!, wrong: [0] } },
    };
    const second = trackAnswers(first.tracker, wrongRun);
    expect(second.picks).toEqual([{ questionId: id, pick: 0 }]);
    expect(trackAnswers(second.tracker, wrongRun).picks).toEqual([]); // sem repetir
    const scored = {
      ...wrongRun,
      status: 'scored' as const,
      round: { ...wrongRun.round!, play: null, last: { questionId: id } as never },
    };
    const third = trackAnswers(second.tracker, scored);
    expect(third.picks).toEqual([{ questionId: id, pick: getQuestion(id).answer }]);
    expect(trackAnswers(third.tracker, scored).picks).toEqual([]);
  });

  it('recarregar na tela do placar não conta o acerto de novo', () => {
    const run = quiz();
    const id = run.round!.play!.questionId;
    const scored = {
      ...run,
      status: 'scored' as const,
      round: { ...run.round!, play: null, last: { questionId: id } as never },
    };
    expect(trackAnswers(NO_TRACKER, scored).picks).toEqual([]);
  });
});
