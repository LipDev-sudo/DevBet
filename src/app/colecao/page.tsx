import type { Metadata } from 'next';
import { CollectionView } from '@/components/game/CollectionView';
import { TopBar } from '@/components/ui/TopBar';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Coleção' };

export default function CollectionPage() {
  return (
    <>
      <TopBar>
        <Link href="/play" className="btn btn-ghost btn-sm">
          Jogar
        </Link>
      </TopBar>
      <main id="conteudo" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <CollectionView />
      </main>
    </>
  );
}
