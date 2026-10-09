import type { Metadata } from 'next';
import { AdminPanel } from '@/components/leaderboard/AdminPanel';
import { TopBar } from '@/components/ui/TopBar';

// Fora dos buscadores e sem link no site: só quem sabe o endereço chega aqui, e só o administrador apaga algo.
export const metadata: Metadata = { title: 'Moderação', robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <>
      <TopBar />
      <main id="conteudo" className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
        <header className="pt-10 text-center">
          <p className="table-label">Administração</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ivory sm:text-4xl">
            Moderar placar
          </h1>
        </header>
        <div className="mt-8">
          <AdminPanel />
        </div>
      </main>
    </>
  );
}
