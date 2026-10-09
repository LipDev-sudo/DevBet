'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  deleteEntry,
  listAllEntries,
  signInAdmin,
  signOutUser,
  type RankedEntry,
} from '@/lib/leaderboard-client';
import { useAccount } from './AccountProvider';

function describe(error: unknown): string {
  const code = (error as { code?: string }).code ?? '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'E-mail ou senha incorretos.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'O login por e-mail e senha não está ligado no Firebase (Authentication → Sign-in method).';
  }
  if (code === 'permission-denied') {
    return 'Sem permissão: este usuário não é o administrador das regras do Firestore.';
  }
  return `Algo deu errado. (${code || 'erro'})`;
}

/** Moderação do placar: só o administrador (conta do Firebase listada nas regras) consegue apagar de verdade. */
export function AdminPanel() {
  const { configured, user } = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [entries, setEntries] = useState<RankedEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const isAdminUser = Boolean(user && !user.anonymous);

  const load = useCallback(() => {
    listAllEntries()
      .then((list) => {
        setError('');
        setEntries(list);
      })
      .catch((e: unknown) => setError(describe(e)));
  }, []);

  useEffect(() => {
    if (isAdminUser) load();
  }, [isAdminUser, load]);

  if (!configured) {
    return <p className="panel rounded-lg p-5 text-sm text-ivory-dim">O placar não está ligado.</p>;
  }

  if (!isAdminUser) {
    return (
      <form
        className="panel mx-auto max-w-sm space-y-3 rounded-lg p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          try {
            await signInAdmin(email.trim(), password);
          } catch (e) {
            setError(describe(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm text-ivory" htmlFor="admin-email">
          E-mail do administrador
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg bg-black/50 px-3 text-ivory ring-1 ring-white/25 focus:ring-2 focus:ring-ivory focus:outline-none"
          />
        </label>
        <label className="block text-sm text-ivory" htmlFor="admin-senha">
          Senha
          <input
            id="admin-senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg bg-black/50 px-3 text-ivory ring-1 ring-white/25 focus:ring-2 focus:ring-ivory focus:outline-none"
          />
        </label>
        {error && (
          <p role="alert" className="text-xs text-crimson-hot">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !email || !password}>
          Entrar
        </Button>
      </form>
    );
  }

  const remove = async (entry: RankedEntry, ban: boolean) => {
    setBusy(true);
    setError('');
    try {
      await deleteEntry(entry.uid, ban);
      setEntries((list) => (list ?? []).filter((item) => item.uid !== entry.uid));
      setPending(null);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ivory-dim">
          Moderação: {entries ? `${entries.length} registros` : 'carregando…'}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={load}>
            Atualizar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void signOutUser()}>
            Sair
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-crimson-hot">
          {error}
        </p>
      )}
      <ol aria-label="Registros do placar" className="panel divide-y divide-white/5 rounded-lg">
        {(entries ?? []).map((entry, index) => (
          <li key={entry.uid} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="w-8 font-display text-lg font-black text-gold tabular-nums">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-bold text-ivory">{entry.nickname}</span>
            <span className="font-mono font-bold text-gold tabular-nums">{entry.score}</span>
            {pending === entry.uid ? (
              <span className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="crimson"
                  disabled={busy}
                  onClick={() => void remove(entry, false)}
                >
                  Apagar
                </Button>
                <Button
                  size="sm"
                  variant="crimson"
                  disabled={busy}
                  onClick={() => void remove(entry, true)}
                >
                  Apagar e bloquear
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
                  Cancelar
                </Button>
              </span>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setPending(entry.uid)}>
                Remover…
              </Button>
            )}
          </li>
        ))}
      </ol>
      {entries !== null && entries.length === 0 && (
        <p className="text-sm text-ivory-dim">O placar está vazio.</p>
      )}
    </div>
  );
}
