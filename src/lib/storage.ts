import { hasExercise } from '@/content/exercises';
import { CARDS, LEGACY_CARD_IDS } from '@/engine/cards';
import { createProfile, type Profile } from '@/engine/progression';
import { ANTES, type RunState, type RunStatus } from '@/engine/blind';
import { isJokerId } from '@/engine/jokers';
import { parseTutorial } from '@/engine/tutorial-state';
import type { CardId } from '@/engine/types';

/**
 * Persistência atrás de uma interface: hoje LocalStorage, amanhã uma API com PostgreSQL / cloud save.
 * Os métodos são síncronos no MVP; ao migrar para rede, basta torná-los assíncronos.
 */
export interface SaveRepository {
  loadProfile(): Profile;
  saveProfile(profile: Profile): void;
  loadRun(): RunState | null;
  saveRun(run: RunState | null): void;
  clear(): void;
}

export const STORAGE_KEYS = {
  profile: 'devbet:profile:v1',
  run: 'devbet:run:v1',
} as const;

const RUN_STATUSES: readonly RunStatus[] = [
  'blind',
  'round',
  'coding',
  'scored',
  'cleared',
  'shop',
  'won',
  'lost',
];

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseProfile(raw: unknown): Profile {
  if (!isRecord(raw) || raw.version !== 1) return createProfile();
  const base = createProfile();
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
  const solved: Profile['solved'] = {};
  if (isRecord(raw.solved)) {
    for (const [id, entry] of Object.entries(raw.solved)) {
      if (isRecord(entry) && typeof entry.best === 'number' && typeof entry.times === 'number') {
        solved[id] = { best: entry.best, times: entry.times };
      }
    }
  }
  const runsPlayed = num(raw.runsPlayed, 0);
  const xp = num(raw.xp, base.xp);
  return {
    version: 1,
    xp,
    runsPlayed,
    runsWon: num(raw.runsWon, 0),
    bestRunScore: num(raw.bestRunScore, 0),
    solved,
    seenCards: [...new Set(mapCardIds(raw.seenCards))],
    // Perfis anteriores ao tutorial não tinham o campo: quem já jogou não precisa de tutorial.
    tutorialCompleted:
      typeof raw.tutorialCompleted === 'boolean' ? raw.tutorialCompleted : runsPlayed > 0 || xp > 0,
  };
}

const KNOWN_CARDS = new Set<string>(CARDS.map((c) => c.id));

/** Converte um id de carta da versão JavaScript (ex.: "if") para o conceito Python atual. */
function migrateCardId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const next = LEGACY_CARD_IDS[id] ?? id;
  return KNOWN_CARDS.has(next) ? next : null;
}

const mapCardIds = (ids: unknown): string[] =>
  Array.isArray(ids) ? ids.map(migrateCardId).filter((id): id is string => id !== null) : [];

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** Aceita runs que o motor atual consegue retomar com segurança, inclusive as já encerradas (tela final). */
export function parseRun(input: unknown): RunState | null {
  // Saves de versões anteriores (outro formato de jogo) não são retomáveis; o perfil é sempre preservado.
  if (!isRecord(input) || input.version !== 3) return null;
  if (typeof input.status !== 'string' || !RUN_STATUSES.includes(input.status as RunStatus)) {
    return null;
  }
  if (!Array.isArray(input.deck) || input.deck.length === 0) return null;
  if (typeof input.money !== 'number' || typeof input.seed !== 'number') return null;
  if (typeof input.ante !== 'number' || (input.blindIndex !== 0 && input.blindIndex !== 1)) {
    return null;
  }
  if (!ANTES[input.ante]) return null;
  const deck = input.deck.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.uid !== 'string') return [];
    const cardId = migrateCardId(entry.cardId);
    const upgrade = typeof entry.upgrade === 'number' ? entry.upgrade : 0;
    return cardId ? [{ uid: entry.uid, cardId: cardId as CardId, upgrade }] : [];
  });
  if (deck.length !== input.deck.length) return null;
  const uids = new Set(deck.map((card) => card.uid));

  let round: RunState['round'] = null;
  if (input.round !== null && input.round !== undefined) {
    const r = input.round;
    if (!isRecord(r) || typeof r.blindId !== 'string') return null;
    const hand = strings(r.hand);
    const drawPile = strings(r.drawPile);
    const discardPile = strings(r.discardPile);
    if (![...hand, ...drawPile, ...discardPile].every((uid) => uids.has(uid))) return null;
    const play = r.play;
    if (isRecord(play)) {
      if (!hasExercise(String(play.exerciseId))) return null;
      if (!strings(play.uids).every((uid) => uids.has(uid))) return null;
    }
    const last = r.last;
    if (isRecord(last) && !hasExercise(String(last.exerciseId))) return null;
    round = r as unknown as NonNullable<RunState['round']>;
  }
  const status = input.status as RunStatus;
  if (['round', 'coding', 'scored', 'cleared'].includes(status) && !round) return null;
  if (status === 'coding' && !round?.play) return null;
  if (status === 'scored' && !round?.last) return null;
  if (status === 'shop' && !isRecord(input.shop)) return null;

  const history = Array.isArray(input.history)
    ? input.history.filter((entry) => isRecord(entry) && typeof entry.blindId === 'string')
    : [];
  return {
    ...(input as unknown as RunState),
    deck,
    jokers: strings(input.jokers).filter(isJokerId),
    usedExercises: strings(input.usedExercises).filter(hasExercise),
    handLevels: isRecord(input.handLevels) ? (input.handLevels as RunState['handLevels']) : {},
    history: history as RunState['history'],
    round,
    tutorial: parseTutorial(input.tutorial),
    endReason: input.endReason === 'abandoned' ? 'abandoned' : undefined,
  };
}

export function createLocalStorageRepository(storage?: StorageLike): SaveRepository {
  const resolve = (): StorageLike | null => {
    try {
      return storage ?? (typeof window === 'undefined' ? null : window.localStorage);
    } catch {
      return null; // navegação privada / bloqueio de cookies
    }
  };

  const read = (key: string): unknown => {
    try {
      const raw = resolve()?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const write = (key: string, value: unknown | null) => {
    try {
      const target = resolve();
      if (!target) return;
      if (value === null) target.removeItem(key);
      else target.setItem(key, JSON.stringify(value));
    } catch {
      /* cota cheia ou storage bloqueado: o jogo continua sem salvar */
    }
  };

  return {
    loadProfile: () => parseProfile(read(STORAGE_KEYS.profile)),
    saveProfile: (profile) => write(STORAGE_KEYS.profile, profile),
    loadRun: () => parseRun(read(STORAGE_KEYS.run)),
    saveRun: (run) => write(STORAGE_KEYS.run, run),
    clear: () => {
      write(STORAGE_KEYS.profile, null);
      write(STORAGE_KEYS.run, null);
    },
  };
}
