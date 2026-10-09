'use client';

import Link from 'next/link';
import { Dealer } from '@/components/dealer/Dealer';
import { DealerDialogue } from '@/components/dealer/DealerDialogue';
import { TableEnvironment } from '@/components/tables/TableEnvironment';
import { ScoreSubmit } from '@/components/leaderboard/ScoreSubmit';
import { Button } from '@/components/ui/Button';
import { JokerCard } from '@/components/ui/JokerCard';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { TABLES } from '@/content/tables';
import { BLIND_COUNT } from '@/engine/blind';
import { xpProgress } from '@/engine/progression';
import { useGame } from '../GameProvider';

const highTable = TABLES[TABLES.length - 1]!;

export function EndScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  if (!run) return null;
  const won = run.status === 'won';
  const abandoned = run.endReason === 'abandoned';
  const xp = xpProgress(state.profile.xp);
  const clearedCount = run.history.filter((h) => h.cleared).length;
  const lost = run.history.find((h) => !h.cleared);

  return (
    <div className="screen-enter mx-auto max-w-3xl text-center">
      <TableEnvironment
        table={highTable}
        inlay={false}
        feltHeight="40%"
        showLabel={false}
        className="text-center"
      >
        <div className="flex flex-col items-center px-4 pt-6 pb-6">
          <p className="table-label">{won ? 'Fim da trilha' : 'Fim da run'}</p>
          <h1
            className={`mt-2 text-5xl font-black tracking-tight sm:text-6xl ${won ? 'text-ivory' : 'text-crimson-hot'}`}
          >
            {won ? 'JACKPOT' : abandoned ? 'RUN ABANDONADA' : 'BUST'}
          </h1>
          <Dealer
            mood={won ? 'success' : 'serious'}
            tone="severe"
            lamp={highTable.scene.lamp}
            className="mt-4 h-32 w-[6.4rem]"
          />
          <DealerDialogue
            avatar={false}
            className="-mt-2 max-w-md text-left"
            kind={won ? 'success' : undefined}
            mood={won ? 'success' : 'serious'}
            tone="severe"
            text={
              won
                ? 'Boa mão. A casa perdeu desta vez.'
                : abandoned
                  ? 'Você abandonou a run. O XP que você ganhou continua salvo.'
                  : 'Suas mãos acabaram antes da meta. Revise os conceitos, junte combos e volte.'
            }
          />
        </div>
      </TableEnvironment>

      <dl className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['Pontuação', String(run.score)],
          ['Melhor mão', String(run.bestHand)],
          ['XP ganho', `+${run.xpEarned}`],
          ['Nível', String(xp.level)],
        ].map(([label, value]) => (
          <div key={label} className="panel rounded-lg px-3 py-4">
            <dt className="table-label !tracking-[0.2em]">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-black text-ivory tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <ScoreSubmit run={run} />

      {!won && !abandoned && lost && (
        <section
          aria-labelledby="motivo-titulo"
          className="panel mx-auto mt-6 max-w-xl p-5 text-left"
        >
          <h2 id="motivo-titulo" className="table-label">
            Por que a casa venceu
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ivory/90">
            Em <strong>{lost.name}</strong> você fez <strong>{lost.score} pontos</strong> e a meta
            era <strong>{lost.target}</strong>.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ivory-dim">
            Mãos maiores e combos de conceitos pontuam mais, e jokers dão bônus a mãos bem montadas.
            Use os descartes para buscar combos antes de jogar.
          </p>
        </section>
      )}

      <p className="mt-6 text-sm text-ivory-dim">
        {clearedCount} de {BLIND_COUNT} blinds vencidas nesta run.
      </p>

      <section className="mt-6 text-left" aria-labelledby="resumo-titulo">
        <h2 id="resumo-titulo" className="table-label mb-3 text-center">
          Blinds jogadas
        </h2>
        <ul className="panel divide-y divide-white/5 rounded-lg">
          {run.history.map((entry, index) => (
            <li key={index} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="text-ivory">{entry.name}</span>
              <span className={entry.cleared ? 'text-win' : 'text-crimson-hot'}>
                {entry.score} / {entry.target}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {run.jokers.length > 0 && (
        <section className="mt-10" aria-labelledby="jokers-final-titulo">
          <h2 id="jokers-final-titulo" className="table-label mb-4">
            Seus jokers
          </h2>
          <ul className="flex flex-wrap justify-center gap-3">
            {run.jokers.map((id) => (
              <li key={id}>
                <JokerCard id={id} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10" aria-labelledby="deck-final-titulo">
        <h2 id="deck-final-titulo" className="table-label mb-4">
          Seu baralho final
        </h2>
        <ul className="flex flex-wrap justify-center gap-3">
          {run.deck.map((card) => (
            <li key={card.uid}>
              <PlayingCard cardId={card.cardId} upgrade={card.upgrade} size="xs" />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button data-tutorial="new-run" onClick={() => dispatch({ type: 'dismiss-run' })}>
          {won ? 'Nova run' : 'Tentar novamente'}
        </Button>
        <Link href="/colecao" className="btn btn-ghost">
          Coleção
        </Link>
      </div>
    </div>
  );
}
