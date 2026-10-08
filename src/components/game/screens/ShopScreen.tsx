'use client';

import { useEffect, useRef, useState } from 'react';
import { DealerDialogue } from '@/components/dealer/DealerDialogue';
import { Button } from '@/components/ui/Button';
import { Chip, ChipCount } from '@/components/ui/Chip';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { tableForLayer } from '@/content/tables';
import { comboLabel, nearCombos } from '@/engine/combos';
import { restingMood } from '@/engine/dealer';
import { getCard, RARITY_LABEL } from '@/engine/cards';
import {
  LIFE_PRICE,
  MAX_LIVES,
  MAX_UPGRADE,
  MIN_DECK_SIZE,
  removePrice,
  rerollPrice,
  upgradePrice,
} from '@/engine/run';
import type { GameAction } from '@/lib/game-state';
import { useGame } from '../GameProvider';

function Price({ amount, affordable }: { amount: number; affordable: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-display font-bold tabular-nums ${affordable ? 'text-gold-light' : 'text-crimson-hot'}`}
    >
      <Chip tone="gold" className="!w-5" />
      {amount}
    </span>
  );
}

export function ShopScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  const shop = run?.shop;
  const chips = run?.chips ?? 0;
  const [receipt, setReceipt] = useState<{ label: string; before: number; after: number } | null>(
    null,
  );
  const pending = useRef<{ label: string; before: number } | null>(null);
  /** Despacha a ação e guarda o que ela é; o recibo só aparece se o saldo mudou de verdade. */
  const act = (label: string, action: GameAction) => {
    pending.current = { label, before: chips };
    dispatch(action);
  };
  useEffect(() => {
    const p = pending.current;
    if (p && chips !== p.before) {
      setReceipt({ label: p.label, before: p.before, after: chips });
      pending.current = null;
    }
  }, [chips]);
  if (!run || !shop) return null;

  const table = tableForLayer(run.layerIndex);
  const hints = nearCombos(run.deck.map((card) => card.cardId));
  const canRemove = run.deck.length > MIN_DECK_SIZE;

  return (
    <div className="animate-rise">
      <div className="text-center">
        <p className="table-label">Loja</p>
        <h1 className="gold-text mt-2 font-display text-3xl font-black sm:text-4xl">
          Troque fichas por cartas
        </h1>
        <p className="mt-4 flex justify-center">
          <ChipCount amount={run.chips} />
        </p>
        <p role="status" className="mt-2 min-h-5 text-xs text-ivory-dim">
          {receipt &&
            `${receipt.label}: ${receipt.before} → ${receipt.after < receipt.before ? '−' : '+'}${Math.abs(receipt.after - receipt.before)} → ${receipt.after}`}
        </p>
      </div>

      {hints.length > 0 && (
        <DealerDialogue
          className="mx-auto mt-5 max-w-2xl"
          text={`Faltou pouco para um combo de conceitos: ${hints
            .slice(0, 2)
            .map(
              ({ combo, missing }) =>
                `${combo.name} (${comboLabel(combo)}) precisa de ${getCard(missing).name}`,
            )
            .join(' · ')}.`}
          tone={table.tone}
          mood={restingMood(table.tone)}
        />
      )}

      <section className="mt-8" aria-labelledby="venda-titulo">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="venda-titulo" className="table-label">
            Cartas à venda
          </h2>
          <Button
            variant="ghost"
            size="sm"
            aria-disabled={run.chips < rerollPrice(shop) || undefined}
            title={
              run.chips < rerollPrice(shop)
                ? `Fichas insuficientes: faltam ${rerollPrice(shop) - run.chips}.`
                : undefined
            }
            onClick={() => act('Rolar de novo', { type: 'reroll' })}
          >
            Rolar de novo · {rerollPrice(shop)}
          </Button>
        </div>
        {shop.offers.length === 0 ? (
          <p className="panel rounded-lg p-6 text-center text-sm text-ivory-dim">
            A prateleira está vazia. Role de novo ou siga em frente.
          </p>
        ) : (
          <ul className="flex flex-wrap justify-center gap-6" data-tutorial="shop-offers">
            {shop.offers.map((id, index) => {
              const card = getCard(id);
              const affordable = run.chips >= card.price;
              return (
                <li key={id} className="flex flex-col items-center gap-3">
                  <PlayingCard cardId={id} size="md" dealDelayMs={index * 100} />
                  <p className="text-xs text-ivory-dim">{RARITY_LABEL[card.rarity]}</p>
                  <Button
                    size="sm"
                    aria-disabled={!affordable || undefined}
                    title={
                      affordable
                        ? undefined
                        : `Fichas insuficientes: faltam ${card.price - run.chips}.`
                    }
                    onClick={() => act(`Compra de ${card.name}`, { type: 'buy', cardId: id })}
                  >
                    Comprar · <Price amount={card.price} affordable={affordable} />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <hr className="my-10 border-white/10" />

      <section aria-labelledby="baralho-titulo">
        <h2 id="baralho-titulo" className="table-label mb-1">
          Seu baralho — melhorar ou remover
        </h2>
        <p className="mb-5 text-xs text-ivory-dim">
          Cada melhoria soma +4 fichas e +0,05 de multiplicador ao efeito da carta (máx.{' '}
          {MAX_UPGRADE}). Remover uma carta faz as outras aparecerem mais na sua mão; o baralho
          nunca fica com menos de {MIN_DECK_SIZE}.
        </p>
        <ul className="flex flex-wrap justify-center gap-6">
          {run.deck.map((card) => {
            const upPrice = upgradePrice(card);
            const maxed = card.upgrade >= MAX_UPGRADE;
            const rmPrice = removePrice(run);
            return (
              <li key={card.uid} className="flex flex-col items-center gap-2">
                <PlayingCard cardId={card.cardId} upgrade={card.upgrade} size="sm" />
                <Button
                  size="sm"
                  variant="felt"
                  className="w-32 !px-1 whitespace-nowrap"
                  aria-disabled={maxed || run.chips < upPrice || undefined}
                  title={
                    maxed
                      ? 'Esta carta já está no nível máximo.'
                      : run.chips < upPrice
                        ? `Fichas insuficientes: faltam ${upPrice - run.chips}.`
                        : undefined
                  }
                  onClick={() =>
                    act(`Melhoria de ${getCard(card.cardId).name}`, {
                      type: 'upgrade',
                      uid: card.uid,
                    })
                  }
                >
                  {maxed ? 'Máximo' : <>Melhorar · {upPrice}</>}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-32 !px-1 whitespace-nowrap"
                  aria-disabled={!canRemove || run.chips < rmPrice || undefined}
                  title={
                    !canRemove
                      ? `Mantenha ao menos ${MIN_DECK_SIZE} cartas no baralho.`
                      : run.chips < rmPrice
                        ? `Fichas insuficientes: faltam ${rmPrice - run.chips}.`
                        : undefined
                  }
                  onClick={() =>
                    act(`Remoção de ${getCard(card.cardId).name}`, {
                      type: 'remove',
                      uid: card.uid,
                    })
                  }
                >
                  Remover · {rmPrice}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <hr className="my-10 border-white/10" />

      <section className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
        <div className="panel w-full rounded-lg p-5">
          <p className="font-display text-lg font-bold text-ivory">Seguro de mesa</p>
          <p className="mt-1 text-sm text-ivory-dim">
            +1 vida (você tem {run.lives}, máximo {MAX_LIVES}). Uma por loja. Vidas são o que mantém
            a run viva depois de um Bust.
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="crimson"
            aria-disabled={
              shop.boughtLife || run.lives >= MAX_LIVES || run.chips < LIFE_PRICE || undefined
            }
            onClick={() => act('Seguro de mesa', { type: 'buy-life' })}
          >
            {shop.boughtLife ? 'Já contratado' : <>Contratar · {LIFE_PRICE}</>}
          </Button>
          {!shop.boughtLife && run.lives >= MAX_LIVES && (
            <p className="mt-2 text-xs text-ivory-dim">Você já está com o máximo de vidas.</p>
          )}
          {!shop.boughtLife && run.lives < MAX_LIVES && run.chips < LIFE_PRICE && (
            <p className="mt-2 text-xs text-ivory-dim">
              Fichas insuficientes: faltam {LIFE_PRICE - run.chips}.
            </p>
          )}
        </div>
        <Button
          className="!px-12 !py-4"
          data-tutorial="leave-shop"
          onClick={() => dispatch({ type: 'leave-shop' })}
        >
          Voltar à mesa
        </Button>
      </section>
    </div>
  );
}
