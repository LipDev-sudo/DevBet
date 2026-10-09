import { getFirebase } from './firebase';
import { LEADERBOARD_SIZE, shouldReplace, type LeaderboardEntry } from './leaderboard';

export interface SignedInUser {
  uid: string;
  /** Só para o próprio jogador ver que entrou; nunca vai para o placar público. */
  displayName: string;
}

export interface RankedEntry extends LeaderboardEntry {
  uid: string;
}

const COLLECTION = 'leaderboard';

/** Acompanha o login. Devolve a função que cancela a assinatura. */
export function watchAuth(callback: (user: SignedInUser | null) => void): () => void {
  let stop = () => {};
  let cancelled = false;
  void getFirebase()
    .then(async ({ auth }) => {
      const { onAuthStateChanged } = await authModule();
      if (cancelled) return;
      stop = onAuthStateChanged(auth, (user) =>
        callback(user ? { uid: user.uid, displayName: user.displayName ?? '' } : null),
      );
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

/** Grava a pontuação do jogador logado, só se for melhor que a anterior. `true` quando gravou. */
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
