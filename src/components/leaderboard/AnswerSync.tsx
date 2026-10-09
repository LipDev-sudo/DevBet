'use client';

import { useEffect, useRef } from 'react';
import { NO_TRACKER, trackAnswers, type AnswerTracker } from '@/lib/answers';
import { recordAnswer } from '@/lib/leaderboard-client';
import { useGame } from '../game/GameProvider';
import { useAccount } from './AccountProvider';

/** Registra cada alternativa marcada nas perguntas, para o administrador ver os percentuais e quem marcou o quê. */
export function AnswerSync() {
  const { state } = useGame();
  const { configured, user, nickname } = useAccount();
  const tracker = useRef<AnswerTracker>(NO_TRACKER);
  const uid = user?.uid;
  const run = state.run;

  useEffect(() => {
    const result = trackAnswers(tracker.current, run);
    tracker.current = result.tracker;
    if (!configured || !uid) return;
    for (const { questionId, pick } of result.picks) {
      // Falha de rede não pode atrapalhar o jogo: a marcação simplesmente não é contada.
      recordAnswer(uid, nickname || 'anônimo', questionId, pick).catch(() => {});
    }
  }, [run, configured, uid, nickname]);

  return null;
}
