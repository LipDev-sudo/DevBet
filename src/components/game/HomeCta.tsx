'use client';

import Link from 'next/link';
import { useGame } from './GameProvider';

/** CTA da home: continua a run salva ou começa uma nova. */
export function HomeCta({ className = '' }: { className?: string }) {
  const { state } = useGame();
  const run = state.hydrated ? state.run : null;
  const finished = run?.status === 'won' || run?.status === 'lost';
  const resuming = run !== null && !finished;
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <Link href="/play" className="btn btn-brass animate-glow !px-10 !py-4 !text-base">
        {resuming ? 'Continue run' : finished ? 'Ver resultado' : 'Start run'}
      </Link>
      {resuming && <p className="text-xs text-ivory-dim">Você tem uma run em andamento.</p>}
      {finished && (
        <p className="text-xs text-ivory-dim">
          Sua última run terminou. Veja o resultado ou comece outra.
        </p>
      )}
    </div>
  );
}
