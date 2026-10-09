/**
 * Estado da Tutorial Run. Vive dentro da própria run (`RunState.tutorial`), então é salvo e restaurado
 * pelo mesmo SaveRepository: recarregar a página volta ao mesmo ponto, sem repetir o que já foi ensinado.
 * Este arquivo não depende do resto do engine (a run importa daqui).
 */

export type LessonId =
  'blind' | 'hand' | 'quiz' | 'score' | 'discard' | 'cleared' | 'shop' | 'boss';

/** O que o jogador (ou o jogo) fez de verdade. Cada lição declara quais eventos a concluem. */
export type TutorialEventKind =
  | 'ack' // "Entendi" numa lição só informativa
  | 'started' // começou uma blind
  | 'played' // jogou uma mão (abre a pergunta)
  | 'discarded' // descartou cartas
  | 'answered' // acertou a pergunta e a mão pontuou
  | 'continued' // seguiu depois do placar
  | 'cashed' // recolheu a recompensa da blind
  | 'bought' // comprou algo na loja
  | 'left-shop';

export interface TutorialEvent {
  kind: TutorialEventKind;
  /** Só em `ack`: a lição reconhecida. */
  lesson?: LessonId;
}

export interface TutorialState {
  /** Lições concluídas: não voltam a aparecer, nem depois de um reload. */
  done: LessonId[];
  /** Já comprou algo na loja. */
  bought: boolean;
}

export function initialTutorial(): TutorialState {
  return { done: [], bought: false };
}

const LESSON_IDS: readonly LessonId[] = [
  'blind',
  'hand',
  'quiz',
  'score',
  'discard',
  'cleared',
  'shop',
  'boss',
];

/** Lê o estado de um save; qualquer coisa fora do formato vira "sem tutorial". */
export function parseTutorial(raw: unknown): TutorialState | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const done = Array.isArray(value.done)
    ? value.done.filter((id): id is LessonId => LESSON_IDS.includes(id as LessonId))
    : [];
  return {
    done: [...new Set(done)],
    bought: value.bought === true,
  };
}
