import { describe, expect, it } from 'vitest';
import { createProfile } from '@/engine/progression';
import { createRun } from '@/engine/run';
import { createLocalStorageRepository, parseProfile, parseRun, STORAGE_KEYS } from './storage';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

function sampleRun() {
  const result = createRun('logica', 5, createProfile());
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

describe('storage', () => {
  it('salva e recarrega perfil e run', () => {
    const repo = createLocalStorageRepository(memoryStorage());
    const profile = { ...createProfile(), xp: 120, runsPlayed: 2 };
    const run = sampleRun();
    repo.saveProfile(profile);
    repo.saveRun(run);
    expect(repo.loadProfile()).toEqual(profile);
    expect(repo.loadRun()).toEqual(run);
  });

  it('devolve valores padrão com storage vazio ou corrompido', () => {
    const repo = createLocalStorageRepository(
      memoryStorage({ [STORAGE_KEYS.profile]: '{nope', [STORAGE_KEYS.run]: '42' }),
    );
    expect(repo.loadProfile()).toEqual(createProfile());
    expect(repo.loadRun()).toBeNull();
  });

  it('descarta runs de versões ou formatos desconhecidos', () => {
    expect(parseRun({ version: 99 })).toBeNull();
    expect(parseRun({ ...sampleRun(), status: 'voando' })).toBeNull();
    expect(parseRun({ ...sampleRun(), deck: [] })).toBeNull();
    expect(parseRun({ ...sampleRun(), status: 'won' })).toBeNull();
    expect(parseRun({ ...sampleRun(), encounter: { challengeId: 'inexistente' } })).toBeNull();
  });

  it('sanitiza perfis com campos inválidos', () => {
    const parsed = parseProfile({
      version: 1,
      xp: -5,
      solved: { a: { best: 1 }, b: { best: 2, times: 3 } },
      seenCards: [1, 'if'],
    });
    expect(parsed.xp).toBe(0);
    expect(parsed.solved).toEqual({ b: { best: 2, times: 3 } });
    expect(parsed.seenCards).toEqual(['condition']);
  });

  it('não quebra quando o storage lança (modo privado)', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('cheio');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    const repo = createLocalStorageRepository(broken);
    expect(() => repo.saveProfile(createProfile())).not.toThrow();
    expect(repo.loadProfile()).toEqual(createProfile());
    expect(() => repo.clear()).not.toThrow();
  });

  it('clear remove tudo', () => {
    const repo = createLocalStorageRepository(memoryStorage());
    repo.saveRun(sampleRun());
    repo.clear();
    expect(repo.loadRun()).toBeNull();
  });

  it('carrega saves antigos de encontros sem nível de dica', () => {
    const run = sampleRun();
    const legacy = {
      ...run,
      status: 'challenge',
      encounter: {
        challengeId: 'calcular-total',
        hand: [],
        redrawsLeft: 0,
        stake: 0,
        failedRuns: 0,
        failedSubmissions: 0,
        voluntaryHints: 0,
        solutionViewed: false,
        runsUsed: 0,
        draft: null,
        outcome: null,
      },
    };
    expect(parseRun(legacy)?.encounter?.hintLevel).toBe(0);
  });

  describe('migração de saves da versão JavaScript', () => {
    const legacy = (overrides: Record<string, unknown> = {}) => ({
      version: 1,
      id: 'run-x',
      seed: 7,
      step: 3,
      nextUid: 5,
      unlockLevel: 1,
      status: 'challenge',
      layerIndex: 0,
      chips: 40,
      lives: 3,
      streak: 1,
      score: 100,
      xpEarned: 20,
      removals: 0,
      deck: [
        { uid: 'd0', cardId: 'var', upgrade: 0 },
        { uid: 'd1', cardId: 'if', upgrade: 1 },
        { uid: 'd2', cardId: 'array', upgrade: 0 },
        { uid: 'd3', cardId: 'binary-search', upgrade: 0 },
        { uid: 'd4', cardId: 'carta-inexistente', upgrade: 0 },
      ],
      encounter: {
        challengeId: 'calcular-total',
        hand: ['d0', 'd1'],
        redrawsLeft: 1,
        stake: 10,
        failedRuns: 1,
        failedSubmissions: 0,
        voluntaryHints: 0,
        solutionViewed: false,
        runsUsed: 2,
        draft: 'function calcularTotal() {}',
        outcome: null,
      },
      shop: null,
      history: [],
      ...overrides,
    });

    it('converte cartas para conceitos Python e aposta em risco, e descarta o rascunho em JavaScript', () => {
      const run = parseRun(legacy());
      expect(run?.version).toBe(2);
      expect(run?.deck.map((c) => c.cardId)).toEqual(['variable', 'condition', 'list', 'search']);
      expect(run?.deck[1]?.upgrade).toBe(1);
      expect(run?.encounter?.risk).toBe('risky');
      expect(run?.encounter?.draft).toBeNull();
      expect(run?.encounter?.hintLevel).toBe(0);
      expect(run?.chips).toBe(40);
    });

    it('apostas altas viram HIGH RISK e sem aposta vira SAFE', () => {
      const withStake = (stake: number) =>
        parseRun(legacy({ encounter: { ...legacy().encounter, stake } }))?.encounter?.risk;
      expect(withStake(0)).toBe('safe');
      expect(withStake(25)).toBe('high');
    });

    it('descarta runs presas a desafios que deixaram de existir', () => {
      const gone = legacy({
        encounter: { ...legacy().encounter, challengeId: 'aplicar-duas-vezes' },
      });
      expect(parseRun(gone)).toBeNull();
    });

    it('migra as cartas oferecidas na loja e nas recompensas', () => {
      const run = parseRun(
        legacy({
          status: 'shop',
          encounter: null,
          shop: { offers: ['array', 'for', 'object'], rerolls: 0, boughtLife: false },
        }),
      );
      expect(run?.shop?.offers).toEqual(['list', 'for', 'dictionary']);
    });
  });
});
