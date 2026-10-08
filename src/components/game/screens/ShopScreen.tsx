'use client';

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
      </div>

      {hints.length > 0 && (
        <DealerDialogue
          className="mx-auto mt-5 max-w-2xl"
          text={`Faltou pouco para um combo: ${hints
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
            disabled={run.chips < rerollPrice(shop)}
            onClick={() => dispatch({ type: 'reroll' })}
          >
            Rolar de novo · {rerollPrice(shop)}
          </Button>
        </div>
        {shop.offers.length === 0 ? (
          <p className="panel rounded-lg p-6 text-center text-sm text-ivory-dim">
            A prateleira está vazia. Role de novo ou siga em frente.
          </p>
        ) : (
          <ul className="flex flex-wrap justify-center gap-6">
            {shop.offers.map((id, index) => {
              const card = getCard(id);
              const affordable = run.chips >= card.price;
              return (
                <li key={id} className="flex flex-col items-center gap-3">
                  <PlayingCard cardId={id} size="md" dealDelayMs={index * 100} />
                  <p className="text-xs text-ivory-dim">{RARITY_LABEL[card.rarity]}</p>
                  <Button
                    size="sm"
                    disabled={!affordable}
                    onClick={() => dispatch({ type: 'buy', cardId: id })}
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
          Cada melhoria soma +4 fichas e +5% de multiplicador (máx. {MAX_UPGRADE}). Remover cartas
          fracas aumenta a chance de sortear as boas.
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
                  className="w-28 !px-2"
                  disabled={maxed || run.chips < upPrice}
                  onClick={() => dispatch({ type: 'upgrade', uid: card.uid })}
                >
                  {maxed ? 'Máximo' : <>Melhorar · {upPrice}</>}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-28 !px-2"
                  disabled={!canRemove || run.chips < rmPrice}
                  onClick={() => dispatch({ type: 'remove', uid: card.uid })}
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
            +1 vida (você tem {run.lives}/{MAX_LIVES}). Uma por loja.
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="crimson"
            disabled={shop.boughtLife || run.lives >= MAX_LIVES || run.chips < LIFE_PRICE}
            onClick={() => dispatch({ type: 'buy-life' })}
          >
            {shop.boughtLife ? 'Já contratado' : <>Contratar · {LIFE_PRICE}</>}
          </Button>
        </div>
        <Button className="!px-12 !py-4" onClick={() => dispatch({ type: 'leave-shop' })}>
          Voltar à mesa
        </Button>
      </section>
    </div>
  );
}
