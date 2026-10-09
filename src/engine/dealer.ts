import type { DealerTone } from '@/content/tables';
import { currentBlind, type RunState } from './blind';

/** Estados visuais do Dealer: cada um é um emoji da folha de sprites. */
export type Mood =
  | 'idle'
  | 'thinking'
  | 'success'
  | 'error'
  | 'serious'
  | 'boss'
  | 'happy'
  | 'cheer'
  | 'love'
  | 'laugh'
  | 'jackpot'
  | 'nervous'
  | 'wink'
  | 'shy'
  | 'angel';

/** Quadro (0–15, da esquerda para a direita e de cima para baixo) de cada humor em `dealer.png`. */
export const DEALER_FRAME: Record<Mood, number> = {
  error: 0, // chorando
  idle: 1, // sorriso
  thinking: 2, // desconfiado
  happy: 3, // sorrisão
  success: 4, // contente
  cheer: 15, // olhos de estrela
  serious: 6, // olhos espremidos
  nervous: 7, // gota de suor
  laugh: 8, // chorando de rir
  wink: 9, // piscadinha
  shy: 10, // bochechas rosadas
  jackpot: 11, // rolando de rir
  angel: 12, // auréola
  boss: 6, // mesmo olhar, com tom avermelhado (CSS)
  love: 14, // olhos de coração
};

export const MOOD_LABEL: Record<Mood, string> = {
  idle: 'sorrindo',
  thinking: 'desconfiado',
  success: 'contente',
  error: 'chorando',
  serious: 'sério',
  boss: 'em postura de boss',
  happy: 'feliz',
  cheer: 'comemorando',
  love: 'apaixonado',
  laugh: 'rindo até chorar',
  jackpot: 'rolando de rir',
  nervous: 'nervoso',
  wink: 'piscando',
  shy: 'tímido',
  angel: 'inocente',
};

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

/** O humor do Dealer segue o que acontece na run: ele reage à pontuação, aos erros e ao fim da run. */
export function moodForRun(run: RunState | null): Mood {
  if (!run) return 'wink';
  const round = run.round;
  switch (run.status) {
    case 'blind':
      return currentBlind(run).boss ? 'boss' : 'idle';
    case 'round':
      if (!round) return 'idle';
      return round.handsLeft === 1 && round.roundScore < round.target ? 'nervous' : 'idle';
    case 'quiz': {
      const wrong = round?.play?.wrong.length ?? 0;
      return wrong >= 2 ? 'error' : wrong === 1 ? 'nervous' : 'thinking';
    }
    case 'scored': {
      const last = round?.last;
      if (!round || !last) return 'happy';
      if (round.roundScore >= round.target) return 'laugh';
      if (last.score.combos.length > 0) return 'love';
      return last.wrongAnswers === 0 ? 'cheer' : 'happy';
    }
    case 'cleared':
      return 'jackpot';
    case 'shop':
      return 'wink';
    case 'won':
      return 'cheer';
    case 'lost':
      return run.endReason === 'abandoned' ? 'shy' : 'error';
  }
}
