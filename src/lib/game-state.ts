import { reduceTutorial } from '@/engine/tutorial';
import type { TutorialEvent } from '@/engine/tutorial-state';
import type { Profile } from '@/engine/progression';
import {
  buyItem,
  continueAfterScore,
  createRun,
  discard,
  finishRunProfile,
  answerQuestion,
  leaveShop,
  moveJoker,
  openShop,
  playHand,
  rerollShop,
  sellJoker,
  startBlind,
  TUTORIAL_PACK_ID,
  type Result,
  type RunState,
} from '@/engine/blind';

export interface GameState {
  hydrated: boolean;
  profile: Profile;
  run: RunState | null;
  /** Mensagem de erro de regra (ex.: fichas insuficientes) para exibir ao jogador. */
  notice: { id: number; text: string } | null;
}

export type GameAction =
  | { type: 'hydrate'; profile: Profile; run: RunState | null }
  | { type: 'new-run'; packId: string; seed: number; guided?: boolean }
  | { type: 'skip-tutorial' }
  | { type: 'abandon-run' }
  | { type: 'dismiss-run' }
  | { type: 'start-blind' }
  | { type: 'discard'; uids: string[] }
  | { type: 'play'; uids: string[] }
  | { type: 'answer'; option: number }
  | { type: 'continue' }
  | { type: 'cash-out' }
  | { type: 'buy'; index: number }
  | { type: 'reroll' }
  | { type: 'sell'; id: string }
  | { type: 'move-joker'; from: number; to: number }
  | { type: 'leave-shop' }
  | { type: 'tutorial'; event: TutorialEvent }
  | { type: 'clear-notice' }
  | { type: 'reset'; profile: Profile };

export function initialGameState(profile: Profile): GameState {
  return { hydrated: false, profile, run: null, notice: null };
}

const FINAL = new Set(['won', 'lost']);

/** Aplica o resultado de uma regra do motor; erros viram `notice`. */
function applyResult(state: GameState, result: Result<RunState>): GameState {
  if (!result.ok)
    return { ...state, notice: { id: (state.notice?.id ?? 0) + 1, text: result.reason } };
  const run = result.state;
  const justEnded = FINAL.has(run.status) && !FINAL.has(state.run?.status ?? '');
  return {
    ...state,
    run,
    notice: null,
    profile: justEnded ? finishRunProfile(state.profile, run) : state.profile,
  };
}

/** Ações do jogo que o tutorial enxerga como eventos reais. */
function tutorialEventFor(action: GameAction): TutorialEvent | null {
  switch (action.type) {
    case 'tutorial':
      return action.event;
    case 'start-blind':
      return { kind: 'started' };
    case 'play':
      return { kind: 'played' };
    case 'discard':
      return { kind: 'discarded' };
    case 'answer':
      return { kind: 'answered' };
    case 'continue':
      return { kind: 'continued' };
    case 'cash-out':
      return { kind: 'cashed' };
    case 'buy':
      return { kind: 'bought' };
    case 'leave-shop':
      return { kind: 'left-shop' };
    default:
      return null;
  }
}

/** Depois que a run termina, só dá para dispensá-la ou começar outra: nada da run antiga volta a mudar. */
const ALLOWED_AFTER_END = new Set<GameAction['type']>([
  'hydrate',
  'new-run',
  'skip-tutorial',
  'dismiss-run',
  'clear-notice',
  'reset',
]);

/**
 * Só avança o tutorial quando a ação REALMENTE mudou a run (uma recusa de regra vira aviso e não conta).
 * A lição concluída é a que estava ativa antes da ação.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  const before = state.run;
  if (before && FINAL.has(before.status) && !ALLOWED_AFTER_END.has(action.type)) return state;
  if (action.type === 'tutorial') {
    if (!before?.tutorial) return state;
    return { ...state, run: { ...before, tutorial: reduceTutorial(before, action.event) } };
  }
  const next = reduceGame(state, action);
  const event = tutorialEventFor(action);
  if (!event || !before?.tutorial || !next.run || next.run === before) return next;
  // Uma resposta errada não conclui a lição: só a que pontua a mão.
  if (event.kind === 'answered' && next.run.status !== 'scored') return next;
  return { ...next, run: { ...next.run, tutorial: reduceTutorial(before, event) } };
}

function reduceGame(state: GameState, action: GameAction): GameState {
  const run = state.run;
  switch (action.type) {
    case 'hydrate':
      return { ...state, hydrated: true, profile: action.profile, run: action.run };
    case 'new-run': {
      // O guia do Dealer é opcional: com ele o baralho é o da Tutorial Run; sem ele, vale a escolha do jogador
      // (e o guia não volta a aparecer).
      const guided = action.guided ?? !state.profile.tutorialCompleted;
      const packId = guided ? TUTORIAL_PACK_ID : action.packId;
      const profile = guided ? state.profile : { ...state.profile, tutorialCompleted: true };
      const created = createRun(packId, action.seed, profile, guided);
      return created.ok
        ? { ...state, profile, run: created.state, notice: null }
        : applyResult(state, created);
    }
    case 'skip-tutorial':
      return {
        ...state,
        profile: { ...state.profile, tutorialCompleted: true },
        run: run ? { ...run, tutorial: null } : run,
      };
    case 'abandon-run': {
      if (!run || FINAL.has(run.status)) return state;
      // A run abandonada vira uma run encerrada: o resultado aparece na tela final e sobrevive ao reload.
      const abandoned: RunState = {
        ...run,
        status: 'lost',
        endReason: 'abandoned',
        shop: null,
      };
      return {
        ...state,
        run: abandoned,
        notice: null,
        profile: finishRunProfile(state.profile, abandoned),
      };
    }
    case 'dismiss-run':
      return { ...state, run: null };
    case 'start-blind':
      return run ? applyResult(state, startBlind(run)) : state;
    case 'discard':
      return run ? applyResult(state, discard(run, action.uids)) : state;
    case 'play':
      return run ? applyResult(state, playHand(run, action.uids)) : state;
    case 'answer':
      return run ? applyResult(state, answerQuestion(run, action.option)) : state;
    case 'continue':
      return run ? applyResult(state, continueAfterScore(run)) : state;
    case 'cash-out':
      return run ? applyResult(state, openShop(run)) : state;
    case 'buy':
      return run ? applyResult(state, buyItem(run, action.index)) : state;
    case 'reroll':
      return run ? applyResult(state, rerollShop(run)) : state;
    case 'sell':
      return run ? applyResult(state, sellJoker(run, action.id)) : state;
    case 'move-joker':
      return run ? applyResult(state, moveJoker(run, action.from, action.to)) : state;
    case 'leave-shop':
      return run ? applyResult(state, leaveShop(run)) : state;
    case 'tutorial':
      return state; // tratado em gameReducer
    case 'clear-notice':
      return { ...state, notice: null };
    case 'reset':
      return { ...initialGameState(action.profile), hydrated: true };
  }
}
