import type { ExecutionReport } from '@/runner/types';
import { topLevelError } from './feedback';
import type { DealerTone } from '@/content/tables';
import type { Challenge } from './challenge';
import type { EncounterOutcome } from './run';
import type { previewHand } from './scoring';

/** Estados visuais do Dealer. */
export type Mood = 'idle' | 'thinking' | 'success' | 'error' | 'serious' | 'boss';

export type DealerKind =
  | 'brief'
  | 'success'
  | 'efficient'
  | 'syntax'
  | 'runtime'
  | 'logic'
  | 'partial'
  | 'timeout'
  | 'retry'
  | 'limit'
  | 'bust';

export interface DealerLine {
  mood: Mood;
  kind: DealerKind;
  text: string;
  /** Convite discreto para pedir ajuda; nunca abre dica sozinho. */
  nudge?: string;
}

/**
 * Expressão de repouso: idle nas mesas iniciais, serious nas avançadas ou em desafios difíceis,
 * boss no chefe.
 */
export function restingMood(tone: DealerTone, challenge?: Challenge): Mood {
  if (challenge?.boss) return 'boss';
  if (tone === 'severe') return 'serious';
  return challenge && challenge.difficulty >= 4 ? 'serious' : 'idle';
}

export function briefChallenge(challenge: Challenge): string {
  return challenge.boss
    ? 'Este é o High Table. Dois bugs, e um deles trava tudo. Leia o código antes de mexer.'
    : `Hoje o assunto é: ${challenge.concept.replace(/\.$/, '')}.`;
}

/** Reação a uma execução (EXECUTAR ou ENTREGAR) que não aprovou tudo. */
export function reactToRun(input: {
  report: ExecutionReport;
  allPassed: boolean;
  hasHidden: boolean;
  failures: number;
  hintLevel: number;
}): DealerLine {
  const { report, allPassed, hasHidden, failures, hintLevel } = input;
  const nudge = failures >= 2 && hintLevel === 0 ? 'Se quiser ajuda, peça uma dica.' : undefined;

  if (allPassed) {
    return {
      mood: 'success',
      kind: 'success',
      text: hasHidden ? 'Boa mão. Falta enfrentar os testes ocultos.' : 'Boa mão.',
    };
  }
  switch (report.status) {
    case 'syntax-error':
      return {
        mood: 'error',
        kind: 'syntax',
        text: 'A sintaxe está quebrada. Leia o erro antes de tentar novamente.',
        nudge,
      };
    case 'timeout':
      return {
        mood: 'serious',
        kind: 'timeout',
        text: 'Seu código não terminou a tempo. Procure um loop que nunca acaba ou um trabalho grande demais.',
        nudge,
      };
    case 'rejected':
    case 'crash':
      return {
        mood: 'error',
        kind: 'limit',
        text: 'Não consegui rodar isso. Simplifique e tente de novo.',
        nudge,
      };
    default: {
      const firstFailure = report.tests.find((t) => !t.passed && !t.skipped);
      const loadError = topLevelError(report);
      if (loadError?.startsWith('ImportError')) {
        return {
          mood: 'error',
          kind: 'runtime',
          text: 'Esse módulo não está liberado nos desafios. Use só o que o enunciado pede.',
          nudge,
        };
      }
      if (loadError || firstFailure?.error) {
        return {
          mood: 'error',
          kind: 'runtime',
          text: loadError
            ? 'O Python parou seu código antes de os testes rodarem. Leia o nome e a linha do erro.'
            : 'O Python levantou um erro ao rodar seu código. Leia o nome e a linha do erro: eles apontam onde olhar.',
          nudge,
        };
      }
      if (failures >= 3 && failures % 3 === 0) {
        return {
          mood: 'serious',
          kind: 'retry',
          text: 'Vamos voltar um passo. Qual é exatamente o problema que precisamos resolver?',
          nudge,
        };
      }
      const passed = report.tests.filter((t) => t.passed).length;
      return passed > 0
        ? { mood: 'error', kind: 'partial', text: 'Está perto. Revise essa parte.', nudge }
        : {
            mood: 'error',
            kind: 'logic',
            text: 'O código executou. O resultado está errado.',
            nudge,
          };
    }
  }
}

/** Explica o Bust pela causa real: desistência, precisão perdida ou mão que rendeu pouco. */
function explainBust(outcome: EncounterOutcome): string {
  if (outcome.forfeit) {
    return 'Você desistiu do desafio. A casa cobra uma vida e a aposta fica na mesa.';
  }
  const result = `${outcome.score.total} de ${outcome.target} pts`;
  if (outcome.score.precision < 1) {
    return `Bust. O código passou, mas entregas erradas e dicas baixaram a precisão para ×${outcome.score.precision.toFixed(2)}: ${result}.`;
  }
  return `Bust. O código passou sem perder precisão, mas a mão rendeu só ${result}. Cartas que casam com o desafio dobram de efeito.`;
}

/** Reação ao resultado final da mesa. */
export function reactToOutcome(challenge: Challenge, outcome: EncounterOutcome): DealerLine {
  if (outcome.bust) {
    return { mood: 'serious', kind: 'bust', text: explainBust(outcome) };
  }
  if (challenge.boss) {
    return { mood: 'success', kind: 'success', text: 'Boa mão. O boss caiu.' };
  }
  if (outcome.efficient) {
    return { mood: 'success', kind: 'efficient', text: 'Boa solução. E eficiente.' };
  }
  if (outcome.jackpot) return { mood: 'success', kind: 'success', text: 'Boa mão. De primeira.' };
  return { mood: 'success', kind: 'success', text: 'Boa mão.' };
}

/** O Dealer explica a mão: quais cartas representam conceitos do desafio e qual combo isso forma. */
export function explainHand(preview: ReturnType<typeof previewHand>): string {
  const boosted = preview.lines.filter((l) => l.boosted).map((l) => l.name);
  const sentences: string[] = [];
  if (boosted.length > 0) {
    sentences.push(
      `${boosted.join(', ')} ${boosted.length > 1 ? 'representam' : 'representa'} conceitos que este desafio usa: efeito dobrado.`,
    );
  }
  const combo = preview.combos[0];
  if (combo) sentences.push(`${combo.combo.name} está ativo: ${combo.combo.description}.`);
  if (sentences.length === 0) {
    sentences.push('Nenhuma carta desta mão se aplica a este desafio. Você pode trocá-la uma vez.');
  }
  return sentences.join(' ');
}
