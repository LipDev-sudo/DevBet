'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { JokerCard, JokerLesson } from '@/components/ui/JokerCard';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { ChipCount } from '@/components/ui/Chip';
import { getCard } from '@/engine/cards';
import { handLevel, JOKER_SLOTS, rerollPrice, sellPrice, type ShopItem } from '@/engine/blind';
import { HAND_RANKS } from '@/engine/hands';
import { LEVEL_CHIPS, LEVEL_MULT, RANK_BASE } from '@/engine/handscore';
import { getJoker } from '@/engine/jokers';
import { playSfx } from '@/lib/sfx';
import { useGame } from '../GameProvider';
import { JokerRow } from './RoundScreen';

function itemName(item: ShopItem): string {
  if (item.kind === 'joker') return getJoker(item.id).name;
  if (item.kind === 'card') return getCard(item.cardId).name;
  return `Aula de ${HAND_RANKS[item.rank].name}`;
}

export function ShopScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  const [message, setMessage] = useState('');
  if (!run || !run.shop) return null;
  const shop = run.shop;
  const reroll = rerollPrice(shop);

  const buy = (index: number) => {
    const item = shop.items[index];
    if (!item) return;
    if (item.price > run.money) {
      setMessage(`Faltam ${item.price - run.money} fichas para comprar ${itemName(item)}.`);
      return;
    }
    if (item.kind === 'joker' && run.jokers.length >= JOKER_SLOTS) {
      setMessage(`Seus ${JOKER_SLOTS} espaços de joker estão cheios. Venda um para liberar.`);
      return;
    }
    playSfx('select');
    setMessage(
      `Compra de ${itemName(item)}: ${run.money} → −${item.price} → ${run.money - item.price} fichas.`,
    );
    dispatch({ type: 'buy', index });
  };

  return (
    <div className="screen-enter mx-auto max-w-5xl">
      <header className="text-center">
        <p className="table-label">Loja</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ivory sm:text-4xl">
          Jokers, cartas e aulas
        </h1>
        <p className="mt-3 flex justify-center">
          <ChipCount amount={run.money} />
        </p>
      </header>

      <p role="status" className="mt-3 min-h-5 text-center text-xs text-ivory-dim">
        {message}
      </p>

      <ul
        data-tutorial="shop-offers"
        className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="À venda"
      >
        {shop.items.map((item, index) => (
          <li
            key={`${item.kind}-${index}`}
            className="panel flex flex-col items-center gap-3 rounded-lg p-4"
          >
            {item.kind === 'joker' && (
              <>
                <JokerCard id={item.id} />
                <JokerLesson id={item.id} />
              </>
            )}
            {item.kind === 'card' && (
              <>
                <PlayingCard cardId={item.cardId} size="md" />
                <p className="text-center text-xs text-ivory-dim">{getCard(item.cardId).concept}</p>
              </>
            )}
            {item.kind === 'hand' && (
              <div className="text-center">
                <p className="font-display text-xl font-black text-ivory">
                  {HAND_RANKS[item.rank].name}
                </p>
                <p className="mt-1 text-xs text-ivory-dim">{HAND_RANKS[item.rank].description}</p>
                <p className="mt-3 font-mono text-sm">
                  <span className="text-ivory-dim">nv.{handLevel(run, item.rank)} → </span>
                  <span className="font-bold text-ivory">nv.{handLevel(run, item.rank) + 1}</span>
                </p>
                <p className="mt-1 font-mono text-xs text-gold">
                  +{LEVEL_CHIPS} fichas · +{LEVEL_MULT} mult (hoje{' '}
                  {RANK_BASE[item.rank].chips + (handLevel(run, item.rank) - 1) * LEVEL_CHIPS} ×{' '}
                  {RANK_BASE[item.rank].mult + (handLevel(run, item.rank) - 1) * LEVEL_MULT})
                </p>
              </div>
            )}
            <Button
              size="sm"
              className="mt-auto"
              aria-disabled={item.price > run.money || undefined}
              onClick={() => buy(index)}
            >
              Comprar · {item.price}
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button
          size="sm"
          variant="felt"
          aria-disabled={reroll > run.money || undefined}
          onClick={() => {
            if (reroll > run.money) {
              setMessage(`Rolar de novo custa ${reroll} fichas e você tem ${run.money}.`);
              return;
            }
            setMessage(
              `Nova prateleira: ${run.money} → −${reroll} → ${run.money - reroll} fichas.`,
            );
            dispatch({ type: 'reroll' });
          }}
        >
          Rolar de novo · {reroll}
        </Button>
      </div>

      <section className="mt-10" aria-labelledby="meus-jokers">
        <h2 id="meus-jokers" className="table-label mb-3 text-center">
          Seus jokers ({run.jokers.length}/{JOKER_SLOTS}) · disparam da esquerda para a direita
        </h2>
        <JokerRow run={run} />
        {run.jokers.length > 0 && (
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {run.jokers.map((id) => (
              <li key={id}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMessage(`Venda de ${getJoker(id).name}: +${sellPrice(id)} fichas.`);
                    dispatch({ type: 'sell', id });
                  }}
                >
                  Vender {getJoker(id).name} · +{sellPrice(id)}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 flex justify-center">
        <Button data-tutorial="leave-shop" onClick={() => dispatch({ type: 'leave-shop' })}>
          Próxima blind
        </Button>
      </div>
    </div>
  );
}
