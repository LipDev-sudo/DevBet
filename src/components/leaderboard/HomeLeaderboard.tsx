'use client';

import { useAccount } from './AccountProvider';
import { LeaderboardView } from './LeaderboardView';

/** Login e ranking ao vivo na página inicial. Some quando o Firebase não está configurado. */
export function HomeLeaderboard() {
  const { configured } = useAccount();
  if (!configured) return null;
  return (
    <section aria-labelledby="placar-home" className="mt-12 w-full max-w-2xl text-left">
      <h2 id="placar-home" className="table-label mb-3 text-center">
        Placar ao vivo · Top 20
      </h2>
      <LeaderboardView compact />
    </section>
  );
}
