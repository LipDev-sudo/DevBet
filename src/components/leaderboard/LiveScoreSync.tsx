'use client';

import { useEffect, useRef } from 'react';
import { entryFromRun } from '@/lib/leaderboard';
import { submitScore } from '@/lib/leaderboard-client';
import { useGame } from '../game/GameProvider';
import { useAccount } from './AccountProvider';

/**
 * Placar em tempo real: a cada mão que pontua, o registro do jogador no placar sobe junto, sem esperar o fim da run.
 * Só grava quando a pontuação da run supera a que já foi enviada (o banco também só aceita um resultado melhor).
 */
export function LiveScoreSync() {
  const { state } = useGame();
  const { configured, user, nickname } = useAccount();
  const run = state.run;
  const uid = user?.uid;
  const entry = configured && run ? entryFromRun(run, nickname) : null;
  const runId = run?.id;
  const sent = useRef<{ runId: string; score: number } | null>(null);

  useEffect(() => {
    if (!configured || !uid || !entry || !runId) return;
    if (sent.current?.runId === runId && sent.current.score >= entry.score) return;
    // Pequeno atraso: mãos seguidas viram uma única gravação com o valor mais recente.
    const timer = setTimeout(() => {
      sent.current = { runId, score: entry.score };
      submitScore(uid, entry).catch(() => {
        sent.current = null; // tenta de novo na próxima mudança
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [configured, uid, runId, entry?.score, entry?.nickname]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
