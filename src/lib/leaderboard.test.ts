import { describe, expect, it } from 'vitest';
import { createRun, type RunState } from '@/engine/blind';
import { createProfile } from '@/engine/progression';
import {
  entryFromRun,
  MAX_SCORE,
  NICKNAME_MAX,
  sanitizeNickname,
  shouldReplace,
} from './leaderboard';

function endedRun(over: Partial<RunState> = {}): RunState {
  const made = createRun('logica', 1, { ...createProfile(), tutorialCompleted: true });
  if (!made.ok) throw new Error(made.reason);
  return {
    ...made.state,
    status: 'lost',
    score: 1500,
    bestHand: 700,
    history: [
      { blindId: 'a1b1', name: 'x', target: 600, score: 800, cleared: true, hands: 2 },
      { blindId: 'a1b2', name: 'y', target: 720, score: 400, cleared: false, hands: 4 },
    ],
    ...over,
  };
}

describe('apelido do placar', () => {
  it('aceita apelidos normais e normaliza espaços', () => {
    expect(sanitizeNickname('  Ana   Clara ')).toEqual({ ok: true, nickname: 'Ana Clara' });
    expect(sanitizeNickname('João_99')).toEqual({ ok: true, nickname: 'João_99' });
  });

  it('recusa curto, longo, símbolos, e-mail e palavrões, com motivo', () => {
    for (const bad of [
      'a',
      'x'.repeat(NICKNAME_MAX + 1),
      'a<b>',
      'ana@escola.com',
      'Fdp',
      'M3rda!',
    ]) {
      const result = sanitizeNickname(bad);
      expect(result.ok, bad).toBe(false);
      if (!result.ok) expect(result.reason.length).toBeGreaterThan(5);
    }
    expect(sanitizeNickname('PUTA').ok).toBe(false);
    expect(sanitizeNickname('Computador').ok).toBe(true); // "puta" dentro de outra palavra não bloqueia por engano
  });
});

describe('placar em tempo real', () => {
  it('uma run em andamento já gera a entrada, e cresce a cada mão', () => {
    const running = endedRun({ status: 'round', score: 400, bestHand: 400, history: [] });
    expect(entryFromRun(running, 'Ana')).toMatchObject({
      score: 400,
      won: false,
      blindsCleared: 0,
    });
    const later = endedRun({ status: 'shop', score: 950, bestHand: 550 });
    expect(entryFromRun(later, 'Ana')?.score).toBe(950);
    expect(shouldReplace({ score: 400 }, { score: 950 })).toBe(true);
  });

  it('sem pontos ou sem apelido válido, nada vai ao placar', () => {
    expect(entryFromRun(endedRun({ status: 'round', score: 0 }), 'Ana')).toBeNull();
    expect(entryFromRun(endedRun({ status: 'round', score: 300 }), '')).toBeNull();
  });
});

describe('entrada do placar', () => {
  it('monta só dados do jogo e o apelido', () => {
    const entry = entryFromRun(endedRun(), 'Ana')!;
    expect(entry).toEqual({
      nickname: 'Ana',
      score: 1500,
      bestHand: 700,
      blindsCleared: 1,
      won: false,
    });
    expect(Object.keys(entry).sort()).toEqual([
      'bestHand',
      'blindsCleared',
      'nickname',
      'score',
      'won',
    ]);
  });

  it('sem pontos ou com apelido inválido não pontuam', () => {
    expect(entryFromRun(endedRun({ score: 0 }), 'Ana')).toBeNull();
    expect(entryFromRun(endedRun(), 'x')).toBeNull();
  });

  it('limita a pontuação ao máximo aceito pelo banco', () => {
    expect(
      entryFromRun(endedRun({ score: MAX_SCORE * 10, bestHand: MAX_SCORE * 10 }), 'Ana')!.score,
    ).toBe(MAX_SCORE);
  });

  it('só um resultado melhor substitui o anterior', () => {
    expect(shouldReplace(null, { score: 1 })).toBe(true);
    expect(shouldReplace({ score: 100 }, { score: 101 })).toBe(true);
    expect(shouldReplace({ score: 100 }, { score: 100 })).toBe(false);
    expect(shouldReplace({ score: 100 }, { score: 50 })).toBe(false);
  });
});
