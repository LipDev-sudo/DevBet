import { describe, expect, it } from 'vitest';
import { getQuestion } from '@/content/quiz';
import {
  answerQuestion,
  continueAfterScore,
  createRun,
  playHand,
  startBlind,
  type Result,
  type RunState,
} from '@/engine/blind';
import { createProfile } from '@/engine/progression';
import { createLocalStorageRepository, parseProfile, parseRun, STORAGE_KEYS } from './storage';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const unwrap = (r: Result<RunState>): RunState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

const profile = { ...createProfile(), tutorialCompleted: true };
const sampleRun = () => unwrap(createRun('logica', 5, profile));
const inRound = () => unwrap(startBlind(sampleRun()));
const inQuiz = () => {
  const run = inRound();
  return unwrap(playHand(run, [run.round!.hand[0]!]));
};
const reload = (run: RunState) => parseRun(JSON.parse(JSON.stringify(run)));

describe('storage', () => {
  it('salva e recarrega perfil e run', () => {
    const repo = createLocalStorageRepository(memoryStorage());
    const saved = { ...createProfile(), xp: 120, runsPlayed: 2 };
    const run = sampleRun();
    repo.saveProfile(saved);
    repo.saveRun(run);
    expect(repo.loadProfile()).toEqual(saved);
    expect(repo.loadRun()).toEqual({ ...run, tutorial: null });
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
    expect(parseRun({ ...sampleRun(), version: 2 })).toBeNull();
    expect(parseRun({ ...sampleRun(), status: 'voando' })).toBeNull();
    expect(parseRun({ ...sampleRun(), deck: [] })).toBeNull();
    expect(parseRun({ ...sampleRun(), ante: 99 })).toBeNull();
  });

  it('um save do jogo antigo (outro formato) é descartado, mas o perfil é preservado', () => {
    const repo = createLocalStorageRepository(
      memoryStorage({
        [STORAGE_KEYS.profile]: JSON.stringify({ ...createProfile(), xp: 300, runsPlayed: 4 }),
        [STORAGE_KEYS.run]: JSON.stringify({
          version: 2,
          status: 'challenge',
          layerIndex: 2,
          chips: 40,
          lives: 3,
          seed: 1,
          deck: [{ uid: 'd0', cardId: 'variable', upgrade: 0 }],
        }),
      }),
    );
    expect(repo.loadRun()).toBeNull();
    expect(repo.loadProfile().xp).toBe(300);
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
});

describe('retomar a run em cada etapa', () => {
  it('na rodada, a mão, o monte e os contadores voltam iguais', () => {
    const run = inRound();
    const back = reload(run)!;
    expect(back.status).toBe('round');
    expect(back.round).toEqual(run.round);
  });

  it('na pergunta, volta com a pergunta da mão e as alternativas já erradas', () => {
    const quiz = inQuiz();
    const question = getQuestion(quiz.round!.play!.questionId);
    const wrong = question.options.findIndex((_, i) => i !== question.answer);
    const run = unwrap(answerQuestion(quiz, wrong));
    const back = reload(run)!;
    expect(back.status).toBe('quiz');
    expect(back.round?.play?.wrong).toEqual([wrong]);
    expect(back.round?.play?.questionId).toBe(run.round?.play?.questionId);
  });

  it('no placar, volta com a pontuação da mão e continua dali', () => {
    const quiz = inQuiz();
    const scored = unwrap(answerQuestion(quiz, getQuestion(quiz.round!.play!.questionId).answer));
    const back = reload(scored)!;
    expect(back.status).toBe('scored');
    expect(back.round?.last?.score.total).toBe(scored.round?.last?.score.total);
    const next = continueAfterScore(back);
    expect(next.ok).toBe(true);
  });

  it('descarta uma run cuja pergunta sumiu, com alternativa inválida ou cartas fora do baralho', () => {
    const run = inQuiz();
    const broken = JSON.parse(JSON.stringify(run));
    broken.round.play.questionId = 'pergunta-que-sumiu';
    expect(parseRun(broken)).toBeNull();
    const invalid = JSON.parse(JSON.stringify(run));
    invalid.round.play.wrong = [42];
    expect(parseRun(invalid)).toBeNull();
    const ghost = JSON.parse(JSON.stringify(inRound()));
    ghost.round.hand[0] = 'uid-fantasma';
    expect(parseRun(ghost)).toBeNull();
  });

  it('filtra jokers e perguntas usadas desconhecidos, sem perder a run', () => {
    const run = {
      ...inRound(),
      jokers: ['comprehension', 'joker-que-sumiu'],
      usedQuestions: ['x'],
    };
    const back = reload(run)!;
    expect(back.jokers).toEqual(['comprehension']);
    expect(back.usedQuestions).toEqual([]);
  });

  it('runs encerradas (vitória, derrota, abandono) sobrevivem ao reload', () => {
    const lost = { ...sampleRun(), status: 'lost' as const, endReason: 'abandoned' as const };
    const back = reload(lost)!;
    expect(back.status).toBe('lost');
    expect(back.endReason).toBe('abandoned');
  });
});
