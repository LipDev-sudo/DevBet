'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { NICKNAME_MAX } from '@/lib/leaderboard';
import { useAccount } from './AccountProvider';

/** Campo de apelido: o único dado que aparece no placar público. */
export function NicknameForm({ onDone }: { onDone?: () => void }) {
  const { nickname, saveNickname } = useAccount();
  const [value, setValue] = useState(nickname);
  const [error, setError] = useState('');
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const problem = saveNickname(value);
        setError(problem ?? '');
        if (!problem) onDone?.();
      }}
    >
      <label className="text-sm text-ivory" htmlFor="apelido">
        Apelido público
      </label>
      <input
        id="apelido"
        value={value}
        maxLength={NICKNAME_MAX}
        autoComplete="off"
        onChange={(event) => setValue(event.target.value)}
        aria-describedby="apelido-ajuda"
        aria-invalid={error ? true : undefined}
        className="min-h-11 rounded-lg bg-black/50 px-3 text-ivory ring-1 ring-white/25 focus:ring-2 focus:ring-ivory focus:outline-none"
      />
      <p id="apelido-ajuda" className="text-xs text-ivory-dim">
        É o que aparece no placar. Não use seu nome completo nem e-mail.
      </p>
      {error && (
        <p role="alert" className="text-xs text-crimson-hot">
          {error}
        </p>
      )}
      <Button type="submit" size="sm" className="self-start">
        Salvar apelido
      </Button>
    </form>
  );
}

/** Entrar com Google / sair. Some por completo quando o placar não está configurado. */
export function AccountMenu() {
  const { configured, user, nickname, error, signIn, signOut } = useAccount();
  const [editing, setEditing] = useState(false);
  if (!configured || user === undefined) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button size="sm" variant="ghost" onClick={() => void signIn()}>
          Entrar com Google
        </Button>
        {error && (
          <p role="alert" className="text-xs text-crimson-hot">
            {error}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <p role="status" className="text-sm font-bold text-ivory">
        ✓ Conectado{user.displayName ? ` como ${user.displayName}` : ''}
      </p>
      <p className="text-xs text-ivory-dim">
        No placar como <strong className="text-ivory">{nickname || 'sem apelido'}</strong>
      </p>
      {editing || !nickname ? (
        <NicknameForm onDone={() => setEditing(false)} />
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Trocar apelido
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void signOut()}>
            Sair
          </Button>
        </div>
      )}
    </div>
  );
}
