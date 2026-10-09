import type { DealerTone } from '@/content/tables';

/** Estados visuais do Dealer. */
export type Mood = 'idle' | 'thinking' | 'success' | 'error' | 'serious' | 'boss';

export type DealerKind = 'brief' | 'success' | 'wrong';

export interface DealerLine {
  mood: Mood;
  kind: DealerKind;
  text: string;
}

/** Expressão de repouso: idle nas mesas iniciais, serious nas avançadas, boss no chefe. */
export function restingMood(tone: DealerTone, boss = false): Mood {
  if (boss) return 'boss';
  return tone === 'severe' ? 'serious' : 'idle';
}

export function briefQuestion(boss: boolean): string {
  return boss
    ? 'Este é o High Table. Leia o código com calma antes de responder.'
    : 'Sua mão trouxe uma pergunta. Responda e a mão pontua.';
}

/** Reação a uma alternativa errada: não revela a resposta, só empurra o jogador a pensar de novo. */
export function reactToWrong(wrongCount: number): DealerLine {
  return wrongCount >= 2
    ? {
        mood: 'serious',
        kind: 'wrong',
        text: 'Leia o enunciado de novo, linha por linha. A resposta está no que o código faz, não no que parece.',
      }
    : {
        mood: 'error',
        kind: 'wrong',
        text: 'Essa não. Aquela alternativa saiu da mesa: pense de novo.',
      };
}
