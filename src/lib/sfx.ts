/**
 * Pontos de integração de áudio. Nenhum som é tocado por padrão: o jogo só avisa que algo aconteceu.
 * Para ligar áudio no futuro, registre um handler (ex.: Howler, WebAudio) com `setSfxHandler`.
 */
export type SfxEvent = 'deal' | 'select' | 'combo' | 'correct' | 'error' | 'boss' | 'victory';

type SfxHandler = (event: SfxEvent) => void;

let handler: SfxHandler | null = null;

export function setSfxHandler(next: SfxHandler | null): void {
  handler = next;
}

export function playSfx(event: SfxEvent): void {
  try {
    handler?.(event);
  } catch {
    /* áudio nunca pode quebrar o jogo */
  }
}
