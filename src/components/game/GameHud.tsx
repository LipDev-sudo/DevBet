'use client';

import { useState } from 'react';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { ChipCount } from '@/components/ui/Chip';
import { Brand } from '@/components/ui/Brand';
import { Modal } from '@/components/ui/Modal';
import { tableForLayer, tableLabel } from '@/content/tables';
import { CARDS } from '@/engine/cards';
import { xpProgress } from '@/engine/progression';
import { START_LIVES } from '@/engine/run';
import { STREAK_CAP, STREAK_STEP, streakMultiplier } from '@/engine/scoring';
import { useGame } from './GameProvider';

/** Um coração por vida real. Vazios só aparecem para as vidas perdidas do começo da run (até START_LIVES). */
function Lives({ lives }: { lives: number }) {
  const slots = Math.max(START_LIVES, lives);
  return (
    <span
      key={lives}
      className="bump inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${lives} ${lives === 1 ? 'vida' : 'vidas'}`}
    >
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`font-display text-lg ${i < lives ? 'text-crimson-hot' : 'text-ivory-dim/25'}`}
        >
          ♥&#xFE0E;
        </span>
      ))}
    </span>
  );
}

export function GameHud() {
  const { state } = useGame();
  const [deckOpen, setDeckOpen] = useState(false);
  const run = state.run;
  if (!run) return null;
  const xp = xpProgress(state.profile.xp);
  const nextUnlocks = CARDS.filter((card) => card.unlockLevel === xp.level + 1).map((c) => c.name);

  return (
    <header className="wood relative z-20 border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="hidden items-center gap-4 sm:flex">
          <Brand />
          <span className="table-label hidden border-l border-white/10 pl-4 lg:inline">
            {run.status === 'shop' ? 'Loja' : tableLabel(tableForLayer(run.layerIndex))}
          </span>
        </div>
        <dl className="flex flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-1.5 sm:flex-none">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Fichas</dt>
            <dd key={run.chips} className="bump">
              <ChipCount amount={run.chips} />
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Vidas</dt>
            <dd data-tutorial="lives">
              <Lives lives={run.lives} />
            </dd>
          </div>
          <div
            className="flex items-center gap-2"
            title={`Sequência: cada vitória seguida soma ${STREAK_STEP.toFixed(2)} ao multiplicador da pontuação (até ×${streakMultiplier(STREAK_CAP).toFixed(2)}). Um Bust zera.`}
          >
            <dt className="table-label !tracking-[0.2em]">Sequência</dt>
            <dd key={run.streak} className="bump font-display font-bold text-win tabular-nums">
              ×{streakMultiplier(run.streak).toFixed(2)}
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
            <dt className="table-label !tracking-[0.2em]">Nv {xp.level}</dt>
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
            Baralho ({run.deck.length})
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
          A cada mesa, 5 cartas do baralho são sorteadas para sua mão.
        </p>
      </Modal>
    </header>
  );
}
