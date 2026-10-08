import { ALL_CHALLENGES } from '@/content/challenges';
import { CARDS, LEGACY_CARD_IDS } from '@/engine/cards';
import { createProfile, type Profile } from '@/engine/progression';
import type { RunState, RunStatus } from '@/engine/run';
import { parseTutorial } from '@/engine/tutorial-state';

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
  'map',
  'table',
  'challenge',
  'reward',
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

/**
 * Saves da versão 1 (JavaScript): converte cartas para conceitos Python, aposta em risco e descarta
 * o rascunho de código (era JavaScript). Runs presas a desafios que não existem mais são descartadas;
 * o perfil (XP, recordes) sempre é preservado.
 */
function migrateV1(raw: Record<string, unknown>): Record<string, unknown> | null {
  const deck = Array.isArray(raw.deck)
    ? raw.deck.flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const cardId = migrateCardId(entry.cardId);
        return cardId ? [{ ...entry, cardId }] : [];
      })
    : [];
  const next: Record<string, unknown> = { ...raw, version: 2, deck };
  if (isRecord(raw.shop)) next.shop = { ...raw.shop, offers: mapCardIds(raw.shop.offers) };
  if (isRecord(raw.encounter)) {
    const encounter = { ...raw.encounter } as Record<string, unknown>;
    const stake = typeof encounter.stake === 'number' ? encounter.stake : 0;
    encounter.risk = stake === 0 ? 'safe' : stake <= 10 ? 'risky' : 'high';
    delete encounter.stake;
    encounter.draft = null;
    if (isRecord(encounter.outcome)) {
      encounter.outcome = {
        ...encounter.outcome,
        risk: encounter.risk,
        rewardOptions: mapCardIds(encounter.outcome.rewardOptions),
      };
    }
    next.encounter = encounter;
  }
  return next;
}

/** Aceita runs que o motor atual consegue retomar com segurança, inclusive as já encerradas (tela final). */
export function parseRun(input: unknown): RunState | null {
  let raw = input;
  if (isRecord(raw) && raw.version === 1) raw = migrateV1(raw);
  if (!isRecord(raw) || raw.version !== 2) return null;
  if (typeof raw.status !== 'string' || !RUN_STATUSES.includes(raw.status as RunStatus))
    return null;
  if (!Array.isArray(raw.deck) || raw.deck.length === 0) return null;
  if (typeof raw.layerIndex !== 'number' || typeof raw.chips !== 'number') return null;
  if (typeof raw.lives !== 'number' || typeof raw.seed !== 'number') return null;
  const knownChallenges = new Set(ALL_CHALLENGES.map((c) => c.id));
  const encounter = raw.encounter;
  if (isRecord(encounter) && !knownChallenges.has(String(encounter.challengeId))) return null;
  const parsed = raw as unknown as RunState;
  // O histórico alimenta a tela final: entradas de desafios que não existem mais seriam um erro de tela.
  const history = Array.isArray(raw.history)
    ? raw.history.filter(
        (entry) => isRecord(entry) && knownChallenges.has(String(entry.challengeId)),
      )
    : [];
  const run: RunState = {
    ...parsed,
    history: history as RunState['history'],
    tutorial: parseTutorial(raw.tutorial),
    endReason: raw.endReason === 'abandoned' ? 'abandoned' : undefined,
  };
  // Saves anteriores à escada de dicas não têm hintLevel.
  if (run.encounter && typeof run.encounter.hintLevel !== 'number') {
    return { ...run, encounter: { ...run.encounter, hintLevel: 0 } };
  }
  return run;
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
