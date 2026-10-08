'use client';

import Link from 'next/link';
import { Dealer } from '@/components/dealer/Dealer';
import { DealerDialogue } from '@/components/dealer/DealerDialogue';
import { TableEnvironment } from '@/components/tables/TableEnvironment';
import { TABLES } from '@/content/tables';
import { Button } from '@/components/ui/Button';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { getChallenge } from '@/content/challenges';
import { xpProgress } from '@/engine/progression';
import { useGame } from '../GameProvider';

/** Explica a derrota em termos de causa: precisão, ajuda ou falta de conceitos na mão. */
function lossAdvice(entry: { failedRuns?: number; hintLevel?: number; risk?: string }): string {
  const failed = entry.failedRuns ?? 0;
  const help = entry.hintLevel ?? 0;
  if (help >= 4 || failed >= 4) {
    return 'Tentativas erradas e ajuda pesada reduzem a pontuação. Reler o erro antes de rodar de novo costuma custar menos.';
  }
  if (failed > 0 || help > 0) {
    return 'Erros e dicas custaram pontos. Antes de pedir ajuda, releia a mensagem do teste: ela diz o que ficou diferente.';
  }
  return 'Seu código passou, mas a mão tinha poucos conceitos deste desafio. Escolha cartas que combinem com a mesa e procure combos.';
}

const highTable = TABLES[TABLES.length - 1]!;

export function EndScreen() {
  const { state, dispatch } = useGame();
  const run = state.run;
  if (!run) return null;
  const won = run.status === 'won';
  const xp = xpProgress(state.profile.xp);
  const lastBust = [...run.history].reverse().find((h) => h.bust);
  const solvedCount = run.history.filter((h) => !h.bust).length;

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
            {won ? 'JACKPOT' : 'BUST'}
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
            kind={won ? 'success' : 'bust'}
            mood={won ? 'success' : 'serious'}
            tone="severe"
            text={
              won
                ? 'Boa mão. Você não venceu por sorte.'
                : 'A casa levou esta run. Revise o que errou e volte com um baralho melhor.'
            }
          />
        </div>
      </TableEnvironment>

      <dl className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-4">
        {[
          ['Pontuação', String(run.score)],
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

      {!won && lastBust && (
        <section
          aria-labelledby="motivo-titulo"
          className="panel mx-auto mt-6 max-w-xl p-5 text-left"
        >
          <h2 id="motivo-titulo" className="table-label">
            Por que a casa venceu
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ivory/90">
            Em <strong>{getChallenge(lastBust.challengeId).title}</strong> você fez{' '}
            <strong>{lastBust.score} pts</strong> e a meta era{' '}
            <strong>{lastBust.target ?? '—'}</strong>. Foi o Bust que acabou com suas vidas.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ivory-dim">{lossAdvice(lastBust)}</p>
        </section>
      )}

      <p className="mt-6 text-sm text-ivory-dim">
        {solvedCount} {solvedCount === 1 ? 'desafio resolvido' : 'desafios resolvidos'} nesta run.
      </p>

      <section className="mt-6 text-left" aria-labelledby="resumo-titulo">
        <h2 id="resumo-titulo" className="table-label mb-3 text-center">
          Mesas jogadas
        </h2>
        <ul className="panel divide-y divide-white/5 rounded-lg">
          {run.history.map((entry, index) => (
            <li key={index} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="text-ivory">{getChallenge(entry.challengeId).title}</span>
              <span className={entry.bust ? 'text-crimson-hot' : 'text-win'}>
                {entry.bust ? 'Bust' : `+${entry.score}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

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
        <Button onClick={() => dispatch({ type: 'dismiss-run' })}>
          {won ? 'Nova run' : 'Tentar novamente'}
        </Button>
        <Link href="/colecao" className="btn btn-ghost">
          Coleção
        </Link>
      </div>
    </div>
  );
}
