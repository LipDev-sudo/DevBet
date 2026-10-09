import { describe, expect, it } from 'vitest';
import { getQuestion } from '@/content/quiz';
import {
  ANTES,
  answerQuestion,
  buyItem,
  continueAfterScore,
  createRun,
  deckEntry,
  JOKER_SLOTS,
  leaveShop,
  MAX_PLAY,
  maxPlayFor,
  openShop,
  playHand,
  rerollShop,
  startBlind,
  STARTER_PACKS,
  type Result,
  type RunState,
} from './blind';
import { previewPlay } from './handscore';
import { createProfile } from './progression';

const profile = { ...createProfile(), tutorialCompleted: true };

function unwrap(result: Result<RunState>): RunState {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function subsets(items: string[], min: number, max: number): string[][] {
  const out: string[][] = [];
  const walk = (start: number, picked: string[]) => {
    if (picked.length >= min) out.push([...picked]);
    if (picked.length === max) return;
    for (let i = start; i < items.length; i++) walk(i + 1, [...picked, items[i] as string]);
  };
  walk(0, []);
  return out;
}

type Policy = 'best' | 'small';

function chooseCards(run: RunState, policy: Policy): string[] {
  const hand = run.round!.hand;
  const limit = Math.min(MAX_PLAY, maxPlayFor(run));
  const [min, max] = policy === 'small' ? [1, 2] : [1, limit];
  let best: string[] = [hand[0] as string];
  let bestScore = -1;
  for (const uids of subsets(hand, min, Math.min(max, limit))) {
    const cards = uids.map((uid) => deckEntry(run, uid));
    const preview = previewPlay(
      cards,
      cards.slice(0, 1).map((c) => c.cardId),
    );
    const value = preview.chips * preview.mult;
    if (value > bestScore) {
      bestScore = value;
      best = uids;
    }
  }
  return best;
}

/** Joga uma run inteira com um jogador perfeito (sempre acerta a pergunta de primeira) e compras simples. */
function simulate(seed: number, policy: Policy, pack = 'logica') {
  let run = unwrap(createRun(pack, seed, profile));
  let guard = 0;
  while (run.status !== 'won' && run.status !== 'lost' && guard++ < 2000) {
    switch (run.status) {
      case 'blind':
        run = unwrap(startBlind(run));
        break;
      case 'round': {
        run = unwrap(playHand(run, chooseCards(run, policy)));
        break;
      }
      case 'quiz': {
        const question = getQuestion(run.round!.play!.questionId);
        run = unwrap(answerQuestion(run, question.answer));
        break;
      }
      case 'scored':
        run = unwrap(continueAfterScore(run));
        break;
      case 'cleared':
        run = unwrap(openShop(run));
        break;
      case 'shop': {
        for (let i = 0; i < 4; i++) {
          const shop = run.shop!;
          const order = [...shop.items.keys()].sort(
            (a, b) =>
              rank(shop.items[a]!.kind) - rank(shop.items[b]!.kind) ||
              shop.items[a]!.price - shop.items[b]!.price,
          );
          const index = order.find((idx) => {
            const item = shop.items[idx]!;
            return (
              item.price <= run.money && (item.kind !== 'joker' || run.jokers.length < JOKER_SLOTS)
            );
          });
          if (index === undefined) break;
          run = unwrap(buyItem(run, index));
        }
        const reroll = run.money >= 6 && run.shop!.rerolls < 1 ? rerollShop(run) : null;
        if (reroll?.ok) {
          run = reroll.state;
          const index = run.shop!.items.findIndex(
            (item) => item.kind === 'joker' && item.price <= run.money,
          );
          if (index >= 0 && run.jokers.length < JOKER_SLOTS) run = unwrap(buyItem(run, index));
        }
        run = unwrap(leaveShop(run));
        break;
      }
    }
  }
  return run;
}

const rank = (kind: string) => (kind === 'joker' ? 0 : kind === 'hand' ? 1 : 2);

describe('balanceamento do loop (jogador que acerta a pergunta de primeira)', () => {
  it('um jogador que monta mãos fortes vence a maioria das runs, e as blinds crescem', () => {
    const results = Array.from({ length: 60 }, (_, i) => simulate(1000 + i, 'best'));
    const wins = results.filter((r) => r.status === 'won').length;
    const reached = results.map((r) => r.history.length);
    const avg = reached.reduce((a, b) => a + b, 0) / reached.length;
    console.log(
      `best: vitórias ${wins}/60, blinds médias vencidas ${avg.toFixed(1)}/${ANTES.length * 2}`,
    );
    expect(wins).toBeGreaterThan(15);
    expect(wins).toBeLessThan(58);
  });

  it('jogar só 1–2 cartas por mão é seguro no começo, mas não leva ao fim', () => {
    const results = Array.from({ length: 60 }, (_, i) => simulate(2000 + i, 'small'));
    const wins = results.filter((r) => r.status === 'won').length;
    const cleared = results.map((r) => r.history.filter((h) => h.cleared).length);
    const avg = cleared.reduce((a, b) => a + b, 0) / cleared.length;
    console.log(`small: vitórias ${wins}/60, blinds médias vencidas ${avg.toFixed(1)}`);
    expect(avg).toBeGreaterThan(1);
    expect(wins).toBeLessThan(30);
  });

  it('todos os pacotes iniciais são jogáveis até o fim', () => {
    for (const pack of STARTER_PACKS) {
      const run = simulate(77, 'best', pack.id);
      expect(['won', 'lost']).toContain(run.status);
    }
  });
});
