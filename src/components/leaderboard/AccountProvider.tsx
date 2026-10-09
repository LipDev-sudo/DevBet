'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isFirebaseConfigured } from '@/lib/firebase';
import { NICKNAME_STORAGE_KEY, sanitizeNickname } from '@/lib/leaderboard';
import {
  signInWithGoogle,
  signOutUser,
  watchAuth,
  type SignedInUser,
} from '@/lib/leaderboard-client';

interface AccountValue {
  /** O placar só existe quando o Firebase está configurado (variáveis de ambiente). */
  configured: boolean;
  /** `undefined` enquanto o login ainda está sendo verificado. */
  user: SignedInUser | null | undefined;
  nickname: string;
  error: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  saveNickname: (raw: string) => string | null;
}

const AccountContext = createContext<AccountValue | null>(null);

function readNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<SignedInUser | null | undefined>(configured ? undefined : null);
  // Lido já na primeira renderização no navegador: o apelido só aparece depois do login (assíncrono).
  const [nickname, setNickname] = useState(() =>
    typeof window === 'undefined' ? '' : readNickname(),
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (!configured) return;
    return watchAuth(setUser);
  }, [configured]);

  const signIn = useCallback(async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('A janela do Google foi fechada antes de concluir. Tente de novo.');
      } else if (code === 'auth/popup-blocked') {
        setError('O navegador bloqueou a janela do Google. Libere pop-ups para este site.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('Este endereço não está autorizado no Firebase (Authentication → Domínios).');
      } else {
        setError(`Não foi possível entrar com o Google agora. Tente de novo. (${code || 'erro'})`);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    setError('');
    try {
      await signOutUser();
    } catch {
      setError('Não foi possível sair agora.');
    }
  }, []);

  /** Valida e guarda o apelido público. Devolve a mensagem de erro, ou `null` quando salvou. */
  const saveNickname = useCallback((raw: string): string | null => {
    const result = sanitizeNickname(raw);
    if (!result.ok) return result.reason;
    try {
      localStorage.setItem(NICKNAME_STORAGE_KEY, result.nickname);
    } catch {
      /* storage bloqueado: vale só nesta sessão */
    }
    setNickname(result.nickname);
    return null;
  }, []);

  const value = useMemo(
    () => ({ configured, user, nickname, error, signIn, signOut, saveNickname }),
    [configured, user, nickname, error, signIn, signOut, saveNickname],
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccount precisa estar dentro de <AccountProvider>.');
  return context;
}
