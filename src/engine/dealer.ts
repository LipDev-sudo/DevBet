import type { ExecutionReport } from '@/runner/types';
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
  if (failures >= 3 && failures % 3 === 0) {
    return {
      mood: 'serious',
      kind: 'retry',
      text: 'Vamos voltar um passo. Qual é exatamente o problema que precisamos resolver?',
      nudge,
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
        text: 'Seu código não terminou. Algo ali nunca para.',
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

/** Reação ao resultado final da mesa. */
export function reactToOutcome(challenge: Challenge, outcome: EncounterOutcome): DealerLine {
  if (outcome.bust) {
    return {
      mood: 'serious',
      kind: 'bust',
      text: 'Bust. Erros e dicas custaram pontos. Revise o que ficou fraco antes da próxima mesa.',
    };
  }
  if (challenge.boss) {
    return { mood: 'success', kind: 'success', text: 'Boa mão. Você não venceu por sorte.' };
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
