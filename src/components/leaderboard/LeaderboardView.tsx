'use client';

import { useEffect, useState } from 'react';
import { watchLeaderboard, type RankedEntry } from '@/lib/leaderboard-client';
import { AccountMenu } from './AccountMenu';
import { useAccount } from './AccountProvider';

/** Ranking ao vivo: a lista se atualiza sozinha quando alguém termina uma run. */
export function LeaderboardView({ compact = false }: { compact?: boolean }) {
  const { configured, user } = useAccount();
  const [entries, setEntries] = useState<RankedEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!configured) return;
    return watchLeaderboard(setEntries, setError);
  }, [configured]);

  if (!configured) {
    if (compact) return null;
    return (
      <p className="panel rounded-lg p-5 text-sm text-ivory-dim">
        O placar não está ligado nesta versão do jogo. O jogo continua funcionando normalmente.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-label="Sua conta" className="panel rounded-lg p-4">
        <AccountMenu />
        {user === null && (
          <p className="mt-2 text-xs text-ivory-dim">
            Entre para registrar sua pontuação. Só o apelido aparece no placar.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-crimson-hot">
          {error}
        </p>
      )}
      {entries === null && !error && (
        <p role="status" className="text-sm text-ivory-dim">
          Carregando o placar…
        </p>
      )}
      {entries !== null && entries.length === 0 && (
        <p className="text-sm text-ivory-dim">Ninguém no placar ainda. Seja o primeiro!</p>
      )}
      {entries !== null && entries.length > 0 && (
        <ol
          aria-label="Melhores pontuações"
          className={`panel divide-y divide-white/5 rounded-lg ${compact ? 'max-h-64 overflow-y-auto' : ''}`}
        >
          {entries.map((entry, index) => (
            <li
              key={entry.uid}
              aria-current={user?.uid === entry.uid ? 'true' : undefined}
              className={`flex items-center gap-3 px-4 py-3 text-sm ${user?.uid === entry.uid ? 'bg-white/8' : ''}`}
            >
              <span className="w-7 font-display text-lg font-black text-gold tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-bold text-ivory">{entry.nickname}</span>
              <span className="hidden text-xs text-ivory-dim sm:inline">
                {entry.blindsCleared}/10 blinds{entry.won ? ' · venceu' : ''}
              </span>
              <span className="font-mono font-bold text-gold tabular-nums">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
