import Link from 'next/link';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Brand } from './Brand';

export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <Brand />
      <nav aria-label="Principal" className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/colecao"
          className="table-label inline-flex min-h-10 items-center px-2 text-ivory-dim transition-colors hover:text-ivory"
        >
          Coleção
        </Link>
        {isFirebaseConfigured() && (
          <Link
            href="/placar"
            className="table-label inline-flex min-h-10 items-center px-2 text-ivory-dim transition-colors hover:text-ivory"
          >
            Placar
          </Link>
        )}
        {children}
      </nav>
    </header>
  );
}
