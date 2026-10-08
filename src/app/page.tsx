import Link from 'next/link';
import { HomeCta } from '@/components/game/HomeCta';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { Dealer } from '@/components/dealer/Dealer';
import { TableEnvironment } from '@/components/tables/TableEnvironment';
import { TABLES, type TableDef } from '@/content/tables';
import { TopBar } from '@/components/ui/TopBar';
import { Wordmark } from '@/components/ui/Wordmark';

const PILLARS = [
  { name: 'Cards', text: 'Conceitos de Python viram cartas: CONDITION, FOR, LIST, RECURSION.' },
  { name: 'Code', text: 'Cada mesa é um desafio. Você escreve Python e os testes decidem.' },
  { name: 'Combos', text: 'Cartas certas juntas somam ao multiplicador: LIST + FOR = ITERATOR.' },
  {
    name: 'Rewards',
    text: 'Fichas compram cartas e melhorias na loja; o XP desbloqueia novas cartas.',
  },
];

export default function Home() {
  return (
    <>
      <TopBar>
        <Link href="/play" className="btn btn-ghost btn-sm">
          Jogar
        </Link>
      </TopBar>

      <main id="conteudo" className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <section className="flex flex-col items-center pt-16 text-center sm:pt-24">
          <h1>
            <Wordmark className="text-6xl sm:text-8xl" />
          </h1>
          <p className="mt-5 text-lg text-ivory-dim sm:text-xl">Bet on your skills.</p>
          <div className="mt-10">
            <HomeCta />
          </div>

          <TableEnvironment
            table={TABLES[0] as TableDef}
            className="mt-16 w-full max-w-2xl"
            showLabel={false}
            feltHeight="55%"
          >
            <div className="flex flex-col items-center pt-4">
              <Dealer mood="idle" tone="warm" lamp={TABLES[0]?.scene.lamp} className="h-40 w-32" />
              <ul
                className="relative -mt-8 flex items-end justify-center gap-3 sm:gap-4"
                aria-label="Exemplo de mão"
              >
                {(['condition', 'list', 'for'] as const).map((id, index) => (
                  <li key={id} className={index === 1 ? 'sm:-translate-y-2' : ''}>
                    <PlayingCard cardId={id} size="md" dealDelayMs={index * 90} />
                  </li>
                ))}
              </ul>
              <p className="my-4 font-mono text-xs text-ivory/80">LIST + FOR → ITERATOR</p>
            </div>
          </TableEnvironment>
        </section>

        <section aria-label="O jogo" className="mt-24">
          <dl className="grid gap-px overflow-hidden rounded-lg bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <div key={pillar.name} className="bg-ink p-5">
                <dt className="font-mono text-sm font-bold tracking-widest text-ivory uppercase">
                  {pillar.name}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-ivory-dim">{pillar.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-ivory-dim">
        <p>
          DEVBet é um jogo educativo. As fichas são virtuais: não há dinheiro real, apostas reais
          nem compras.
        </p>
      </footer>
    </>
  );
}
