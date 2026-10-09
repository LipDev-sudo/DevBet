import { reduceTutorial } from '@/engine/tutorial';
import type { TutorialEvent } from '@/engine/tutorial-state';
import type { Profile } from '@/engine/progression';
import {
  buyItem,
  continueAfterScore,
  createRun,
  discard,
  finishRunProfile,
  forfeitHand,
  leaveShop,
  moveJoker,
  openShop,
  playHand,
  registerFailure,
  registerRun,
  requestHint,
  rerollShop,
  saveDraft,
  sellJoker,
  startBlind,
  submitHand,
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
  | { type: 'new-run'; packId: string; seed: number }
  | { type: 'abandon-run' }
  | { type: 'dismiss-run' }
  | { type: 'start-blind' }
  | { type: 'discard'; uids: string[] }
  | { type: 'play'; uids: string[] }
  | { type: 'draft'; code: string }
  | { type: 'ran' }
  | { type: 'failed'; kind: 'run' | 'submit' }
  | { type: 'hint' }
  | { type: 'submit'; code: string }
  | { type: 'forfeit' }
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

function withRun(state: GameState, fn: (run: RunState) => RunState): GameState {
  return state.run ? { ...state, run: fn(state.run) } : state;
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
    case 'submit':
    case 'forfeit':
      return { kind: 'scored' };
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
  return { ...next, run: { ...next.run, tutorial: reduceTutorial(before, event) } };
}

function reduceGame(state: GameState, action: GameAction): GameState {
  const run = state.run;
  switch (action.type) {
    case 'hydrate':
      return { ...state, hydrated: true, profile: action.profile, run: action.run };
    case 'new-run': {
      // Na primeira run o baralho é o da Tutorial Run; depois, vale a escolha do jogador.
      const packId = state.profile.tutorialCompleted ? action.packId : TUTORIAL_PACK_ID;
      const created = createRun(packId, action.seed, state.profile);
      return created.ok
        ? { ...state, run: created.state, notice: null }
        : applyResult(state, created);
    }
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
    case 'draft':
      return withRun(state, (r) => saveDraft(r, action.code));
    case 'ran':
      return withRun(state, registerRun);
    case 'failed':
      return withRun(state, (r) => registerFailure(r, action.kind));
    case 'hint':
      return run ? applyResult(state, requestHint(run)) : state;
    case 'submit':
      return run ? applyResult(state, submitHand(run, action.code)) : state;
    case 'forfeit':
      return run ? applyResult(state, forfeitHand(run)) : state;
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
