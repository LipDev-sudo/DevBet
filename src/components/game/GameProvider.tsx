'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
} from 'react';
import { createProfile } from '@/engine/progression';
import { gameReducer, initialGameState, type GameAction, type GameState } from '@/lib/game-state';
import { createLocalStorageRepository, STORAGE_KEYS, type SaveRepository } from '@/lib/storage';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  repository: SaveRepository;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const repository = useMemo(() => createLocalStorageRepository(), []);
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    initialGameState(createProfile()),
  );

  // `adopted`: o próximo estado já veio do armazenamento (carga inicial ou outra aba) e, portanto, não precisa
  // ser gravado de volta. Só mudanças feitas nesta aba são salvas.
  const adopted = useRef(false);

  // O estado salvo só existe no navegador: carrega depois da hidratação para não divergir do HTML do servidor.
  useEffect(() => {
    adopted.current = true;
    dispatch({ type: 'hydrate', profile: repository.loadProfile(), run: repository.loadRun() });
  }, [repository]);

  // Duas abas abertas: quando OUTRA aba salva, esta adota o estado dela em vez de continuar com um estado
  // antigo (e depois sobrescrever o progresso da outra no próximo salvamento). Adotar não grava de volta.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      const ours = event.key === null || Object.values(STORAGE_KEYS).some((k) => k === event.key);
      if (!ours) return;
      adopted.current = true;
      dispatch({ type: 'hydrate', profile: repository.loadProfile(), run: repository.loadRun() });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [repository]);

  // Salva logo após uma pausa de 250 ms (para não gravar a cada tecla do editor) e também ao sair da
  // página: fechar a aba ou recarregar logo depois de uma ação não pode perder essa ação.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  useEffect(() => {
    if (!state.hydrated) return;
    if (adopted.current) {
      adopted.current = false; // estado vindo do armazenamento: já está salvo
      return;
    }
    // Só grava ao sair se esta aba tem uma mudança ainda não salva: assim uma aba parada nunca
    // sobrescreve o progresso de outra aba com um estado antigo.
    let unsaved = true;
    const save = () => {
      unsaved = false;
      repository.saveProfile(latest.current.profile);
      // Runs encerradas também são salvas: o resultado final sobrevive ao reload até o jogador começar outra.
      repository.saveRun(latest.current.run);
    };
    const timer = setTimeout(save, 250);
    const flush = () => {
      if (unsaved) save();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [repository, state.hydrated, state.profile, state.run]);

  const value = useMemo(() => ({ state, dispatch, repository }), [state, repository]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame precisa estar dentro de <GameProvider>.');
  return context;
}
