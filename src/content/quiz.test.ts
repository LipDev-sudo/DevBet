import { describe, expect, it } from 'vitest';
import { CARDS } from '@/engine/cards';
import {
  ALL_QUESTIONS,
  BOSS_QUESTION,
  getQuestion,
  hasQuestion,
  questionPool,
  QUESTIONS,
} from './quiz';

describe('perguntas', () => {
  it('têm ids únicos, alternativas distintas e uma resposta válida', () => {
    expect(new Set(ALL_QUESTIONS.map((q) => q.id)).size).toBe(ALL_QUESTIONS.length);
    for (const q of ALL_QUESTIONS) {
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
      expect(new Set(q.options).size, q.id).toBe(q.options.length);
      expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, q.id).toBe(
        true,
      );
      expect(q.explanation.length, q.id).toBeGreaterThan(20);
      expect(q.prompt.length, q.id).toBeGreaterThan(8);
    }
  });

  it('toda carta tem perguntas fáceis e difíceis', () => {
    for (const card of CARDS) {
      const own = QUESTIONS.filter((q) => q.card === card.id);
      expect(own.filter((q) => !q.hard).length, card.id).toBeGreaterThanOrEqual(2);
      expect(own.filter((q) => q.hard).length, card.id).toBeGreaterThanOrEqual(1);
      expect(questionPool(card.id, false).every((q) => !q.hard)).toBe(true);
      expect(questionPool(card.id, true).every((q) => q.hard)).toBe(true);
    }
  });

  it('as respostas certas não ficam todas na mesma posição', () => {
    const positions = new Set(ALL_QUESTIONS.map((q) => q.answer));
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });

  it('a pergunta do boss existe e é encontrada pelo id', () => {
    expect(hasQuestion(BOSS_QUESTION.id)).toBe(true);
    expect(getQuestion(BOSS_QUESTION.id)).toBe(BOSS_QUESTION);
    expect(hasQuestion('nao-existe')).toBe(false);
    expect(() => getQuestion('nao-existe')).toThrow();
  });
});
