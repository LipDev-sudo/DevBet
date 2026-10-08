/**
 * Estado da Tutorial Run. Vive dentro da própria run (`RunState.tutorial`), então é salvo e restaurado
 * pelo mesmo SaveRepository: recarregar a página volta ao mesmo ponto, sem repetir o que já foi ensinado.
 * Este arquivo não depende do resto do engine (a run importa daqui).
 */

export type LessonId =
  | 'lobby'
  | 'cards'
  | 'lives'
  | 'risk'
  | 'combo'
  | 'editor'
  | 'deliver'
  | 'hint'
  | 'boss'
  | 'boss-code'
  | 'reward'
  | 'bust'
  | 'shop';

/** O que o jogador (ou o jogo) fez de verdade. Cada lição declara quais eventos a concluem. */
export type TutorialEventKind =
  | 'inspect' // abriu uma carta da mão
  | 'executed' // o executor Python devolveu um relatório de Executar
  | 'ack' // "Entendi" numa lição só informativa
  | 'chose' // escolheu um desafio
  | 'started' // pagou a aposta e abriu o desafio
  | 'resolved' // entregou, ou desistiu
  | 'claimed' // escolheu a carta de recompensa (ou pulou)
  | 'bought' // comprou uma carta na loja
  | 'left-shop';

export interface TutorialEvent {
  kind: TutorialEventKind;
  /** Só em `ack`: a lição reconhecida. */
  lesson?: LessonId;
}

export interface TutorialState {
  /** Lições concluídas: não voltam a aparecer, nem depois de um reload. */
  done: LessonId[];
  /** Abriu pelo menos uma carta da mão. */
  inspected: boolean;
  /** Já fez uma execução real de código. */
  executed: boolean;
  /** Já comprou uma carta na loja. */
  bought: boolean;
}

export function initialTutorial(): TutorialState {
  return { done: [], inspected: false, executed: false, bought: false };
}

const LESSON_IDS: readonly LessonId[] = [
  'lobby',
  'cards',
  'lives',
  'risk',
  'combo',
  'editor',
  'deliver',
  'hint',
  'boss',
  'boss-code',
  'reward',
  'bust',
  'shop',
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
    inspected: value.inspected === true,
    executed: value.executed === true,
    bought: value.bought === true,
  };
}
