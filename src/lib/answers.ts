import { getQuestion, hasQuestion } from '@/content/quiz';
import type { RunState } from '@/engine/blind';

/** Um jogador numa pergunta: todas as alternativas que ele marcou, na ordem (erros e, por fim, o acerto). */
export interface AnswerDoc {
  questionId: string;
  nickname: string;
  picks: number[];
}

export interface OptionStat {
  index: number;
  text: string;
  correct: boolean;
  count: number;
  /** Percentual das marcações (0–100, uma casa decimal). */
  percent: number;
  /** Apelidos que marcaram esta alternativa, com quantas vezes cada um. */
  nicknames: { name: string; count: number }[];
}

export interface QuestionStat {
  id: string;
  prompt: string;
  topic: string;
  /** Total de marcações (cada tentativa conta). */
  total: number;
  players: number;
  options: OptionStat[];
}

const pct = (part: number, total: number) =>
  total === 0 ? 0 : Math.round((part / total) * 1000) / 10;

/** Junta as respostas de todos os jogadores em estatísticas por pergunta, da mais respondida para a menos. */
export function aggregateAnswers(docs: readonly AnswerDoc[]): QuestionStat[] {
  const byQuestion = new Map<string, AnswerDoc[]>();
  for (const doc of docs) {
    if (!hasQuestion(doc.questionId)) continue;
    byQuestion.set(doc.questionId, [...(byQuestion.get(doc.questionId) ?? []), doc]);
  }
  const stats: QuestionStat[] = [];
  for (const [id, list] of byQuestion) {
    const question = getQuestion(id);
    const counts = question.options.map(() => new Map<string, number>());
    let total = 0;
    for (const doc of list) {
      for (const pick of doc.picks) {
        const bucket = counts[pick];
        if (!bucket) continue;
        bucket.set(doc.nickname, (bucket.get(doc.nickname) ?? 0) + 1);
        total++;
      }
    }
    stats.push({
      id,
      prompt: question.prompt,
      topic: question.topic,
      total,
      players: list.length,
      options: question.options.map((text, index) => {
        const bucket = counts[index] ?? new Map<string, number>();
        const count = [...bucket.values()].reduce((sum, n) => sum + n, 0);
        return {
          index,
          text,
          correct: index === question.answer,
          count,
          percent: pct(count, total),
          nicknames: [...bucket.entries()]
            .map(([name, n]) => ({ name, count: n }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
        };
      }),
    });
  }
  return stats.sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
}

/** Memória do observador de respostas: qual pergunta está aberta e quantos erros dela já foram contados. */
export interface AnswerTracker {
  questionId: string | null;
  wrong: number;
  scored: boolean;
}

export const NO_TRACKER: AnswerTracker = { questionId: null, wrong: 0, scored: false };

/**
 * Compara a run com o que já foi contado e devolve as marcações novas. Ao carregar uma run no meio de uma pergunta
 * (reload), o que já estava lá é só memorizado: ninguém é contado duas vezes.
 */
export function trackAnswers(
  prev: AnswerTracker,
  run: RunState | null,
): { tracker: AnswerTracker; picks: { questionId: string; pick: number }[] } {
  const play = run?.round?.play;
  if (run?.status === 'quiz' && play) {
    if (prev.questionId !== play.questionId) {
      return {
        tracker: { questionId: play.questionId, wrong: play.wrong.length, scored: false },
        picks: [],
      };
    }
    const fresh = play.wrong.slice(prev.wrong);
    return {
      tracker: { ...prev, wrong: play.wrong.length },
      picks: fresh.map((pick) => ({ questionId: play.questionId, pick })),
    };
  }
  const last = run?.round?.last;
  if (run?.status === 'scored' && last && prev.questionId === last.questionId && !prev.scored) {
    return {
      tracker: { ...prev, scored: true },
      picks: [{ questionId: last.questionId, pick: getQuestion(last.questionId).answer }],
    };
  }
  return { tracker: prev, picks: [] };
}
