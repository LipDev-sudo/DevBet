import type { ExecutionReport } from '@/runner/types';
import { topLevelError } from './feedback';
import type { DealerTone } from '@/content/tables';
import type { Challenge } from './challenge';

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
