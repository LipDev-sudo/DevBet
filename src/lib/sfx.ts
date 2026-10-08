/**
 * Pontos de integração de áudio. O DevBet NÃO distribui áudio: não há assets, então nenhum som toca
 * e a interface não promete som. Os eventos abaixo já são disparados nos pontos do jogo; para ligar
 * áudio no futuro, registre um handler (ex.: Howler, WebAudio) com `setSfxHandler`.
 */
export type SfxEvent = 'deal' | 'select' | 'combo' | 'correct' | 'error' | 'boss';

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
