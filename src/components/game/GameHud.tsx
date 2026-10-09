'use client';

import { useState } from 'react';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { Dealer } from '@/components/dealer/Dealer';
import { moodForRun } from '@/engine/dealer';
import { ChipCount } from '@/components/ui/Chip';
import { Brand } from '@/components/ui/Brand';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { Modal } from '@/components/ui/Modal';
import { ANTES, currentBlind, JOKER_SLOTS } from '@/engine/blind';
import { CARDS } from '@/engine/cards';
import { xpProgress } from '@/engine/progression';
import { useGame } from './GameProvider';

export function GameHud() {
  const { state } = useGame();
  const [deckOpen, setDeckOpen] = useState(false);
  const run = state.run;
  if (!run) return null;
  const xp = xpProgress(state.profile.xp);
  const nextUnlocks = CARDS.filter((card) => card.unlockLevel === xp.level + 1).map((c) => c.name);

  return (
    <header className="wood table-rail relative z-20 border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="hidden items-center gap-4 sm:flex">
          <Brand />
          <span className="table-label hidden border-l border-white/10 pl-4 lg:inline">
            <span aria-hidden="true" className="text-gold">
              ${' '}
            </span>
            {run.status === 'shop'
              ? 'loja'
              : `ante ${run.ante + 1}/${ANTES.length} · ${currentBlind(run).name}`}
          </span>
        </div>
        <Dealer mood={moodForRun(run)} className="size-9 shrink-0 lg:hidden" />
        <dl className="flex flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-1.5 sm:flex-none">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Fichas</dt>
            <dd key={run.money} className="bump">
              <ChipCount amount={run.money} />
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="table-label !tracking-[0.2em]">Jokers</dt>
            <dd className="font-display font-bold text-ivory tabular-nums">
              {run.jokers.length}/{JOKER_SLOTS}
            </dd>
          </div>
          <div
            className="flex items-center gap-2"
            title={
              nextUnlocks.length > 0
                ? `Nível ${xp.level}. XP só desbloqueia cartas: no nível ${xp.level + 1} entram ${nextUnlocks.join(', ')} nas lojas e recompensas.`
                : `Nível ${xp.level}. XP só desbloqueia cartas, e você já liberou todas.`
            }
          >
            <dt className="table-label flex items-center gap-1 !tracking-[0.2em]">
              <PixelIcon name="star" />
              Nv {xp.level}
            </dt>
            <dd className="w-20">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={xp.needed}
                aria-valuenow={xp.intoLevel}
                aria-label="Experiência"
                className="h-1.5 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/25"
              >
                <div
                  className="h-full bg-ivory"
                  style={{ width: `${Math.round(xp.ratio * 100)}%` }}
                />
              </div>
            </dd>
          </div>
          <button
            type="button"
            onClick={() => setDeckOpen(true)}
            className="table-label min-h-10 rounded-lg px-3 py-2 ring-1 ring-white/25 hover:bg-white/8"
          >
            <span className="inline-flex items-center gap-1.5">
              <PixelIcon name="stack" />
              Baralho ({run.deck.length})
            </span>
          </button>
        </dl>
      </div>

      <Modal open={deckOpen} onClose={() => setDeckOpen(false)} title="Seu baralho" wide>
        <ul className="flex flex-wrap justify-center gap-4">
          {run.deck.map((card) => (
            <li key={card.uid}>
              <PlayingCard cardId={card.cardId} upgrade={card.upgrade} size="sm" />
            </li>
          ))}
        </ul>
        <p className="mt-5 text-center text-xs text-ivory-dim">
          A cada blind o baralho é embaralhado e você compra 8 cartas. Você joga de 1 a 5.
        </p>
      </Modal>
    </header>
  );
}
