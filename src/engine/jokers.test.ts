import { describe, expect, it } from 'vitest';
import {
  bodyLineCount,
  builtinCount,
  commentCount,
  hasAnyAll,
  hasComprehension,
  hasDocstring,
  hasFString,
  hasTernary,
  JOKERS,
  getJoker,
  stripLine,
} from './jokers';

describe('detectores de idiomas Python', () => {
  it('list comprehension: só quando é uma comprehension de verdade', () => {
    expect(hasComprehension('return [n * 2 for n in lista]')).toBe(true);
    expect(hasComprehension('return {k: v for k, v in itens}')).toBe(true);
    expect(hasComprehension('return sum(n for n in lista)')).toBe(true);
    expect(hasComprehension('for n in lista:\n    total += n')).toBe(false);
    expect(hasComprehension('texto = "[a for a in b]"')).toBe(false);
    expect(hasComprehension('# [a for a in b]\nreturn 1')).toBe(false);
  });

  it('ternário: expressão, não a instrução if', () => {
    expect(hasTernary('return "par" if n % 2 == 0 else "impar"')).toBe(true);
    expect(hasTernary('x = 1 if ok else 2')).toBe(true);
    expect(hasTernary('if n > 0:\n    return 1\nelse:\n    return 2')).toBe(false);
    expect(hasTernary('elif n > 0:\n    return 1 if a else 2')).toBe(true);
  });

  it('f-string', () => {
    expect(hasFString('return f"Olá, {nome}!"')).toBe(true);
    expect(hasFString("return f'{a}'")).toBe(true);
    expect(hasFString('return "Olá, " + nome')).toBe(false);
    expect(hasFString('prefixo = "f"')).toBe(false);
  });

  it('any/all, builtins, comentários, docstring e linhas', () => {
    expect(hasAnyAll('return all(n > 0 for n in lista)')).toBe(true);
    expect(hasAnyAll('# any(x)\nreturn 1')).toBe(false);
    expect(builtinCount('return max(lista) - min(lista)')).toBe(2);
    expect(builtinCount('return max(max(a), max(b))')).toBe(1);
    expect(commentCount('# um\nx = 1  # dois\n\n#\n')).toBe(2);
    expect(hasDocstring('def f():\n    """Faz algo."""\n    return 1')).toBe(true);
    expect(hasDocstring('def f():\n    return 1')).toBe(false);
    expect(bodyLineCount('def f(n):\n    # nota\n    return n\n')).toBe(1);
  });

  it('stripLine ignora comentários e conteúdo de strings', () => {
    expect(stripLine('x = "a # b"  # c')).toBe('x = ""  ');
  });

  it('todo joker tem id único, preço e dispara de forma determinística', () => {
    expect(new Set(JOKERS.map((j) => j.id)).size).toBe(JOKERS.length);
    const ctx = {
      code: 'return [n for n in x]',
      firstTry: true,
      handRankId: 'pair',
      comboCount: 1,
      playedCount: 5,
    };
    for (const joker of JOKERS) {
      expect(joker.price).toBeGreaterThan(0);
      expect(joker.triggers(ctx)).toBe(joker.triggers(ctx));
      expect(joker.snippet.length).toBeGreaterThan(3);
    }
    expect(getJoker('comprehension').triggers(ctx)).toBe(1);
    expect(getJoker('pair-master').triggers({ ...ctx, handRankId: 'flush' })).toBe(0);
  });
});
