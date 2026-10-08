'use client';

import Link from 'next/link';
import { useGame } from './GameProvider';

/** CTA da home: continua a run salva ou começa uma nova. */
export function HomeCta({ className = '' }: { className?: string }) {
  const { state } = useGame();
  const resuming = state.hydrated && state.run !== null;
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <Link href="/play" className="btn btn-brass animate-glow !px-10 !py-4 !text-base">
        {resuming ? 'Continue run' : 'Start run'}
      </Link>
      {resuming && <p className="text-xs text-ivory-dim">Você tem uma run em andamento.</p>}
    </div>
  );
}
