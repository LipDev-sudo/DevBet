import type { Metadata } from 'next';
import { LeaderboardView } from '@/components/leaderboard/LeaderboardView';
import { TopBar } from '@/components/ui/TopBar';

export const metadata: Metadata = { title: 'Placar' };

export default function LeaderboardPage() {
  return (
    <>
      <TopBar />
      <main id="conteudo" className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
        <header className="pt-10 text-center">
          <p className="table-label">Ao vivo</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ivory sm:text-5xl">Placar</h1>
        </header>
        <div className="mt-8">
          <LeaderboardView />
        </div>
      </main>
    </>
  );
}
