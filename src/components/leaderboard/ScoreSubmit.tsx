'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { RunState } from '@/engine/blind';
import { entryFromRun } from '@/lib/leaderboard';
import { submitScore } from '@/lib/leaderboard-client';
import { AccountMenu, NicknameForm } from './AccountMenu';
import { useAccount } from './AccountProvider';

type Status = 'idle' | 'sending' | 'sent' | 'kept' | 'error';

const sentKey = (runId: string) => `devbet:submitted:${runId}`;

function alreadySent(runId: string): boolean {
  try {
    return localStorage.getItem(sentKey(runId)) !== null;
  } catch {
    return false;
  }
}

/** Fim da run: envia a pontuação ao placar (uma vez por run) para quem está conectado ao placar e tem apelido. */
export function ScoreSubmit({ run }: { run: RunState }) {
  const { configured, user, nickname } = useAccount();
  const [status, setStatus] = useState<Status>('idle');
  const entry = entryFromRun(run, nickname);
  const runId = run.id;
  const uid = user?.uid;

  useEffect(() => {
    if (!configured || !uid || !entry || alreadySent(runId)) return;
    let cancelled = false;
    void (async () => {
      setStatus('sending');
      try {
        const saved = await submitScore(uid, entry);
        try {
          localStorage.setItem(sentKey(runId), String(entry.score));
        } catch {
          /* sem storage: pode reenviar, mas o banco só aceita um resultado melhor */
        }
        if (!cancelled) setStatus(saved ? 'sent' : 'kept');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, uid, runId, entry?.score, entry?.nickname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!configured || run.score <= 0) return null;

  return (
    <section aria-labelledby="placar-titulo" className="panel mx-auto mt-6 max-w-xl p-5 text-left">
      <h2 id="placar-titulo" className="table-label">
        Placar
      </h2>
      {user === undefined && <p className="mt-2 text-sm text-ivory-dim">Verificando login…</p>}
      {user === null && (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-ivory-dim">
            Não deu para conectar ao placar agora, então os {run.score} pontos ainda não foram
            registrados. Só o seu apelido aparece.
          </p>
          <AccountMenu />
        </div>
      )}
      {user && !nickname && (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-ivory-dim">Escolha um apelido para entrar no placar.</p>
          <NicknameForm />
        </div>
      )}
      {user && nickname && (
        <p role="status" className="mt-2 text-sm text-ivory">
          {status === 'sending' && 'Enviando sua pontuação…'}
          {status === 'sent' && `Pontuação enviada: ${run.score} pontos como ${nickname}.`}
          {status === 'kept' &&
            'Seu melhor resultado no placar continua maior que este. Boa tentativa!'}
          {status === 'error' &&
            'Não foi possível enviar agora. Confira a conexão e tente outra run.'}
          {status === 'idle' && alreadySent(run.id) && 'Esta run já foi enviada ao placar.'}
        </p>
      )}
      <p className="mt-3 text-sm">
        <Link
          href="/placar"
          className="inline-flex min-h-10 items-center underline underline-offset-4 hover:text-ivory"
        >
          Ver o placar ao vivo
        </Link>
      </p>
    </section>
  );
}
