import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

/**
 * Configuração do Firebase vinda de variáveis de ambiente públicas. Essas chaves identificam o projeto e não são
 * segredos: quem protege os dados são as regras do Firestore (`firestore.rules`).
 * Sem as variáveis o placar fica desligado e o jogo funciona normalmente.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export interface FirebaseServices {
  auth: Auth;
  db: Firestore;
}

let servicesPromise: Promise<FirebaseServices> | null = null;

/** Carrega o Firebase só quando alguém usa o placar: o jogo em si não paga esse peso. */
export function getFirebase(): Promise<FirebaseServices> {
  if (!isFirebaseConfigured()) return Promise.reject(new Error('Firebase não configurado.'));
  servicesPromise ??= (async () => {
    const [{ getApp, getApps, initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    return { auth: getAuth(app), db: getFirestore(app) };
  })();
  return servicesPromise;
}
