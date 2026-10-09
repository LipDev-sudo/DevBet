import type { AnswerDoc } from './answers';
import { getFirebase } from './firebase';
import { LEADERBOARD_SIZE, shouldReplace, type LeaderboardEntry } from './leaderboard';

/**
 * Como o jogador entra no placar. `anonymous`: sem janela do Google, cada navegador ganha um id próprio e só
 * escolhe um apelido (serve para a apresentação). `google`: login com Google (precisa da configuração OAuth).
 */
export const AUTH_MODE: 'anonymous' | 'google' = 'anonymous';

export interface SignedInUser {
  uid: string;
  /** Entrou sem conta (modo anônimo). */
  anonymous: boolean;
  /** Só para o próprio jogador ver que entrou; nunca vai para o placar público. */
  displayName: string;
}

export interface RankedEntry extends LeaderboardEntry {
  uid: string;
}

const COLLECTION = 'leaderboard';

/**
 * Acompanha o login. No modo anônimo, entra sozinho assim que descobre que não há ninguém logado.
 * Devolve a função que cancela a assinatura.
 */
export function watchAuth(
  callback: (user: SignedInUser | null) => void,
  onError: (code: string) => void = () => {},
): () => void {
  let stop = () => {};
  let cancelled = false;
  void getFirebase()
    .then(async ({ auth }) => {
      const { onAuthStateChanged, signInAnonymously } = await authModule();
      if (cancelled) return;
      stop = onAuthStateChanged(auth, (user) => {
        if (user) {
          callback({
            uid: user.uid,
            anonymous: user.isAnonymous,
            displayName: user.displayName ?? '',
          });
          return;
        }
        if (AUTH_MODE !== 'anonymous') {
          callback(null);
          return;
        }
        // O estado só muda quando o login anônimo termina (o listener roda de novo com o usuário).
        signInAnonymously(auth).catch((e: { code?: string }) => {
          callback(null);
          onError(e.code ?? 'erro');
        });
      });
    })
    .catch(() => callback(null));
  return () => {
    cancelled = true;
    stop();
  };
}

// Os módulos de login são carregados antes do clique: os navegadores só abrem a janela do Google se ela for
// aberta logo após o gesto do jogador, sem esperar o download do SDK.
const authModule = () => import('firebase/auth');

/** Tenta de novo o login anônimo (botão "Tentar de novo"). */
export async function signInAnonymouslyNow(): Promise<void> {
  const [{ auth }, { signInAnonymously }] = await Promise.all([getFirebase(), authModule()]);
  await signInAnonymously(auth);
}

export async function signInWithGoogle(): Promise<void> {
  const [{ auth }, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([
    getFirebase(),
    authModule(),
  ]);
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
  const { auth } = await getFirebase();
  const { signOut } = await import('firebase/auth');
  await signOut(auth);
}

/* ------------------------------------------------------------ respostas das perguntas */

/** Guarda a alternativa marcada numa pergunta (um documento por jogador e pergunta, com todas as marcações). */
export async function recordAnswer(
  uid: string,
  nickname: string,
  questionId: string,
  pick: number,
): Promise<void> {
  const { db } = await getFirebase();
  const { doc, runTransaction, serverTimestamp } = await import('firebase/firestore');
  const ref = doc(db, 'answers', `${questionId}__${uid}`);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const old = snap.exists() ? ((snap.data() as { picks?: number[] }).picks ?? []) : [];
    tx.set(ref, {
      questionId,
      uid,
      nickname,
      picks: [...old, pick].slice(-60),
      updatedAt: serverTimestamp(),
    });
  });
}

/** Todas as respostas registradas (só o administrador consegue ler). */
export async function listAnswers(): Promise<AnswerDoc[]> {
  const { db } = await getFirebase();
  const { collection, getDocs, limit, query } = await import('firebase/firestore');
  const snapshot = await getDocs(query(collection(db, 'answers'), limit(5000)));
  return snapshot.docs.map((d) => {
    const data = d.data() as Partial<AnswerDoc>;
    return {
      questionId: String(data.questionId ?? ''),
      nickname: String(data.nickname ?? '?'),
      picks: Array.isArray(data.picks) ? data.picks.filter((n) => Number.isInteger(n)) : [],
    };
  });
}

/* ----------------------------------------------------------------- moderação (admin) */

/** Entra com e-mail e senha (a conta do administrador, criada no console do Firebase). */
export async function signInAdmin(email: string, password: string): Promise<void> {
  const [{ auth }, { signInWithEmailAndPassword }] = await Promise.all([
    getFirebase(),
    authModule(),
  ]);
  await signInWithEmailAndPassword(auth, email, password);
}

/** Todos os registros do placar (até 200), do maior para o menor. Só para a tela de moderação. */
export async function listAllEntries(): Promise<RankedEntry[]> {
  const { db } = await getFirebase();
  const { collection, getDocs, limit, orderBy, query } = await import('firebase/firestore');
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy('score', 'desc'), limit(200)),
  );
  return snapshot.docs.map((d) => {
    const data = d.data() as LeaderboardEntry;
    return {
      uid: d.id,
      nickname: String(data.nickname ?? '?'),
      score: Number(data.score ?? 0),
      bestHand: Number(data.bestHand ?? 0),
      blindsCleared: Number(data.blindsCleared ?? 0),
      won: Boolean(data.won),
    };
  });
}

/** Apaga o registro do placar; com `ban`, também impede esse jogador de voltar a gravar. */
export async function deleteEntry(uid: string, ban: boolean): Promise<void> {
  const { db } = await getFirebase();
  const { deleteDoc, doc, serverTimestamp, setDoc } = await import('firebase/firestore');
  if (ban) await setDoc(doc(db, 'banned', uid), { at: serverTimestamp() });
  await deleteDoc(doc(db, COLLECTION, uid));
}

/** Grava a pontuação do jogador logado, substituindo a anterior se mudou (o placar mostra a run atual). `true` quando gravou. */
export async function submitScore(uid: string, entry: LeaderboardEntry): Promise<boolean> {
  const { db } = await getFirebase();
  const { doc, runTransaction, serverTimestamp } = await import('firebase/firestore');
  const ref = doc(db, COLLECTION, uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data() as { score: number }) : null;
    if (!shouldReplace(current, entry)) return false;
    tx.set(ref, { ...entry, updatedAt: serverTimestamp() });
    return true;
  });
}

/** Ranking em tempo real: o callback roda a cada mudança no banco. */
export function watchLeaderboard(
  callback: (entries: RankedEntry[]) => void,
  onError: (message: string) => void,
): () => void {
  let stop = () => {};
  let cancelled = false;
  void getFirebase()
    .then(async ({ db }) => {
      const { collection, limit, onSnapshot, orderBy, query } = await import('firebase/firestore');
      if (cancelled) return;
      const top = query(
        collection(db, COLLECTION),
        orderBy('score', 'desc'),
        limit(LEADERBOARD_SIZE),
      );
      stop = onSnapshot(
        top,
        (snapshot) =>
          callback(
            snapshot.docs.map((d) => {
              const data = d.data() as LeaderboardEntry;
              return {
                uid: d.id,
                nickname: String(data.nickname ?? '?'),
                score: Number(data.score ?? 0),
                bestHand: Number(data.bestHand ?? 0),
                blindsCleared: Number(data.blindsCleared ?? 0),
                won: data.won === true,
              };
            }),
          ),
        () => onError('Não foi possível carregar o placar agora.'),
      );
    })
    .catch(() => onError('O placar não está configurado.'));
  return () => {
    cancelled = true;
    stop();
  };
}
