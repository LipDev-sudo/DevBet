'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { AREAS } from '@/content/areas';
import { ALL_CHALLENGES } from '@/content/challenges';
import { CARDS, getCard, RARITY_LABEL } from '@/engine/cards';
import { COMBOS, comboLabel } from '@/engine/combos';
import { HAND_RANKS } from '@/engine/hands';
import { isUnlocked, xpProgress } from '@/engine/progression';
import { CATEGORY_LABEL, type CardId } from '@/engine/types';
import { useGame } from './GameProvider';

export function CollectionView() {
  const { state } = useGame();
  const { profile } = state;
  const xp = xpProgress(profile.xp);
  const [selected, setSelected] = useState<CardId | null>(null);
  const selectedCard = selected ? getCard(selected) : null;

  return (
    <div className="animate-rise">
      <header className="pt-6 text-center">
        <p className="table-label">Coleção</p>
        <h1 className="mt-2 font-display text-3xl font-black text-ivory sm:text-5xl">
          O <span className="gold-text">livro da casa</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-ivory-dim">
          Cartas, combos e combinações. Suba de nível para destravar conceitos mais avançados.
        </p>
      </header>

      <dl className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4 text-center sm:grid-cols-4">
        {[
          ['Nível', String(xp.level)],
          ['XP', `${xp.intoLevel}/${xp.needed}`],
          ['Runs vencidas', `${profile.runsWon}/${profile.runsPlayed}`],
          ['Recorde', String(profile.bestRunScore)],
        ].map(([label, value]) => (
          <div key={label} className="panel rounded-lg px-3 py-3">
            <dt className="table-label !tracking-[0.2em]">{label}</dt>
            <dd className="mt-1 font-display text-xl font-bold text-ivory tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <hr className="my-10 border-white/10" />

      <section aria-labelledby="cartas-titulo">
        <h2 id="cartas-titulo" className="table-label mb-5">
          Cartas ({CARDS.filter((c) => isUnlocked(c, xp.level)).length}/{CARDS.length})
        </h2>
        <ul className="grid grid-cols-2 justify-items-center gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {CARDS.map((card) => {
            const unlocked = isUnlocked(card, xp.level);
            return (
              <li key={card.id} className="flex flex-col items-center gap-2">
                {unlocked ? (
                  <PlayingCard cardId={card.id} size="sm" onClick={() => setSelected(card.id)} />
                ) : (
                  <PlayingCard cardId={card.id} size="sm" faceDown />
                )}
                <span className="text-xs text-ivory-dim">
                  {unlocked ? RARITY_LABEL[card.rarity] : `Nível ${card.unlockLevel}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <hr className="my-10 border-white/10" />

      <section aria-labelledby="combos-titulo">
        <h2 id="combos-titulo" className="table-label mb-5">
          Combos
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMBOS.map((combo) => (
            <li key={combo.id} className="panel rounded-lg p-4">
              <p className="font-display text-lg font-bold text-ivory">{combo.name}</p>
              <p className="mt-0.5 font-mono text-xs text-ivory-dim">{comboLabel(combo)}</p>
              <p className="mt-2 text-sm text-ivory/90">{combo.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <hr className="my-10 border-white/10" />

      <section aria-labelledby="maos-titulo">
        <h2 id="maos-titulo" className="table-label mb-5">
          Combinações de mão
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {Object.values(HAND_RANKS).map((rank) => (
            <li
              key={rank.id}
              className="panel flex items-start justify-between gap-4 rounded-lg p-4"
            >
              <div>
                <p className="font-display text-lg font-bold text-ivory">{rank.name}</p>
                <p className="mt-1 text-sm text-ivory-dim">{rank.description}</p>
              </div>
              <span className="font-display text-xl font-black text-win tabular-nums">
                +{rank.mult.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <hr className="my-10 border-white/10" />

      <section aria-labelledby="desafios-titulo">
        <h2 id="desafios-titulo" className="table-label mb-5">
          Desafios resolvidos
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {AREAS.map((area) => {
            const challenges = ALL_CHALLENGES.filter((c) => c.areaId === area.id);
            return (
              <li key={area.id} className="panel rounded-lg p-4">
                <p className="font-display text-lg font-bold text-ivory">{area.name}</p>
                <p className="text-xs text-ivory-dim">{area.subtitle}</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {challenges.map((challenge) => {
                    const record = profile.solved[challenge.id];
                    return (
                      <li key={challenge.id} className="flex justify-between gap-3">
                        <span className={record ? 'text-ivory' : 'text-ivory-dim'}>
                          {challenge.title}
                        </span>
                        <span className={record ? 'text-win' : 'text-ivory-dim/50'}>
                          {record ? `✓ ${record.best}` : '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>

      <Modal
        open={selectedCard !== null}
        onClose={() => setSelected(null)}
        title={selectedCard?.name ?? ''}
      >
        {selectedCard && (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <PlayingCard cardId={selectedCard.id} size="md" />
            <div>
              <p className="table-label">
                {CATEGORY_LABEL[selectedCard.category]} · {RARITY_LABEL[selectedCard.rarity]}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ivory/90">{selectedCard.concept}</p>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-black/60 p-3 font-mono text-xs text-ivory ring-1 ring-white/25">
                {selectedCard.snippet}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
