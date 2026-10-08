import type { CardId } from '@/engine/types';
import { levelFromXp, type Profile } from '@/engine/progression';
import {
  buyCard,
  buyLife,
  chooseChallenge,
  claimReward,
  createRun,
  finishRunProfile,
  leaveShop,
  redrawHand,
  registerFailure,
  registerRun,
  requestHint,
  removeCard,
  rerollShop,
  resolveEncounter,
  saveDraft,
  setRisk,
  startChallenge,
  upgradeCard,
  type Result,
  type RiskLevel,
  type RunState,
} from '@/engine/run';

export interface GameState {
  hydrated: boolean;
  profile: Profile;
  run: RunState | null;
  /** Mensagem de erro de regra (ex.: fichas insuficientes) para exibir ao jogador. */
  notice: { id: number; text: string } | null;
  /** Nível alcançado no último desafio, se houve subida. */
  levelUp: number | null;
}

export type GameAction =
  | { type: 'hydrate'; profile: Profile; run: RunState | null }
  | { type: 'new-run'; packId: string; seed: number }
  | { type: 'abandon-run' }
  | { type: 'dismiss-run' }
  | { type: 'choose'; challengeId: string }
  | { type: 'redraw' }
  | { type: 'risk'; risk: RiskLevel }
  | { type: 'start' }
  | { type: 'draft'; code: string }
  | { type: 'ran' }
  | { type: 'failed'; kind: 'run' | 'submit' }
  | { type: 'hint' }
  | { type: 'resolve' }
  | { type: 'claim'; cardId: CardId | null }
  | { type: 'buy'; cardId: CardId }
  | { type: 'reroll' }
  | { type: 'upgrade'; uid: string }
  | { type: 'remove'; uid: string }
  | { type: 'buy-life' }
  | { type: 'leave-shop' }
  | { type: 'clear-notice' }
  | { type: 'reset'; profile: Profile };

export function initialGameState(profile: Profile): GameState {
  return { hydrated: false, profile, run: null, notice: null, levelUp: null };
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

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, hydrated: true, profile: action.profile, run: action.run };
    case 'new-run': {
      const created = createRun(action.packId, action.seed, state.profile);
      return created.ok
        ? { ...state, run: created.state, levelUp: null, notice: null }
        : applyResult(state, created);
    }
    case 'abandon-run': {
      if (!state.run) return state;
      const abandoned = { ...state.run, status: 'lost' as const };
      return { ...state, run: null, profile: finishRunProfile(state.profile, abandoned) };
    }
    case 'dismiss-run':
      return { ...state, run: null, levelUp: null };
    case 'choose':
      return state.run ? applyResult(state, chooseChallenge(state.run, action.challengeId)) : state;
    case 'redraw':
      return state.run ? applyResult(state, redrawHand(state.run)) : state;
    case 'risk':
      return state.run ? applyResult(state, setRisk(state.run, action.risk)) : state;
    case 'start':
      return state.run ? applyResult(state, startChallenge(state.run)) : state;
    case 'draft':
      return withRun(state, (run) => saveDraft(run, action.code));
    case 'ran':
      return withRun(state, registerRun);
    case 'failed':
      return withRun(state, (run) => registerFailure(run, action.kind));
    case 'hint':
      return state.run ? applyResult(state, requestHint(state.run)) : state;
    case 'resolve': {
      if (!state.run) return state;
      const before = levelFromXp(state.profile.xp);
      const { run, profile } = resolveEncounter(state.run, state.profile);
      const after = levelFromXp(profile.xp);
      return {
        ...state,
        run,
        profile,
        notice: null,
        levelUp: after > before ? after : state.levelUp,
      };
    }
    case 'claim':
      return state.run ? applyResult(state, claimReward(state.run, action.cardId)) : state;
    case 'buy':
      return state.run ? applyResult(state, buyCard(state.run, action.cardId)) : state;
    case 'reroll':
      return state.run ? applyResult(state, rerollShop(state.run)) : state;
    case 'upgrade':
      return state.run ? applyResult(state, upgradeCard(state.run, action.uid)) : state;
    case 'remove':
      return state.run ? applyResult(state, removeCard(state.run, action.uid)) : state;
    case 'buy-life':
      return state.run ? applyResult(state, buyLife(state.run)) : state;
    case 'leave-shop':
      return state.run ? applyResult(state, leaveShop(state.run)) : state;
    case 'clear-notice':
      return { ...state, notice: null };
    case 'reset':
      return { ...initialGameState(action.profile), hydrated: true };
  }
}
