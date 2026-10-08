import { describe, expect, it } from 'vitest';
import { createProfile } from '@/engine/progression';
import { chooseChallenge, createRun, registerRun, saveDraft, startChallenge } from '@/engine/run';
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

describe('persistência de campos novos de regra', () => {
  it('saves sem chipsBefore/chipsAfter/forfeit (versões anteriores) continuam válidos', () => {
    const base = createRun('logica', 3, createProfile());
    if (!base.ok) throw new Error(base.reason);
    const legacy = JSON.parse(JSON.stringify({ ...base.state, deck: base.state.deck.slice(0, 5) }));
    expect(parseRun(legacy)?.deck).toHaveLength(5);
  });

  it('um desafio em andamento volta do reload com contadores e rascunho', () => {
    const base = createRun('dados', 3, createProfile());
    if (!base.ok) throw new Error(base.reason);
    let run = base.state;
    const table = chooseChallenge(run, 'calcular-total');
    if (!table.ok) throw new Error(table.reason);
    const started = startChallenge(table.state);
    if (!started.ok) throw new Error(started.reason);
    run = saveDraft(registerRun(started.state), 'def calcular_total(p, q, d):\n    return 0');
    const restored = parseRun(JSON.parse(JSON.stringify(run)));
    expect(restored?.encounter?.runsUsed).toBe(1);
    expect(restored?.encounter?.draft).toMatch(/calcular_total/);
    expect(restored?.chips).toBe(run.chips);
    expect(restored?.deck).toHaveLength(7);
  });
});

describe('runs encerradas sobrevivem ao reload (tela final)', () => {
  it.each(['won', 'lost'] as const)(
    'uma run %s é restaurada como encerrada, não em andamento',
    (status) => {
      const run = { ...sampleRun(), status, encounter: null, shop: null, chips: 77, score: 1234 };
      const restored = parseRun(JSON.parse(JSON.stringify(run)));
      expect(restored?.status).toBe(status);
      expect(restored?.chips).toBe(77);
      expect(restored?.score).toBe(1234);
    },
  );

  it('preserva o motivo "abandonada"', () => {
    const run = { ...sampleRun(), status: 'lost' as const, endReason: 'abandoned' as const };
    expect(parseRun(JSON.parse(JSON.stringify(run)))?.endReason).toBe('abandoned');
    expect(parseRun({ ...run, endReason: 'qualquer' })?.endReason).toBeUndefined();
  });

  it('o repositório guarda e devolve a run encerrada até ela ser dispensada', () => {
    const storage = memoryStorage();
    const repo = createLocalStorageRepository(storage);
    repo.saveRun({ ...sampleRun(), status: 'won', encounter: null, shop: null });
    expect(repo.loadRun()?.status).toBe('won');
    repo.saveRun(null);
    expect(repo.loadRun()).toBeNull();
  });
});

describe('saves com histórico de desafios que não existem mais', () => {
  it('descarta as entradas inválidas em vez de quebrar a tela final', () => {
    const run = {
      ...sampleRun(),
      status: 'lost' as const,
      history: [
        { challengeId: 'calcular-total', score: 10, bust: false },
        { challengeId: 'removido-no-passado', score: 5, bust: true },
        'lixo',
      ],
    };
    const restored = parseRun(JSON.parse(JSON.stringify(run)));
    expect(restored?.history.map((h) => h.challengeId)).toEqual(['calcular-total']);
  });
});
