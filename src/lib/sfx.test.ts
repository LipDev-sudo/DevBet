import { afterEach, describe, expect, it, vi } from 'vitest';
import { playSfx, setSfxHandler } from './sfx';

afterEach(() => setSfxHandler(null));

describe('sfx', () => {
  it('não faz nada sem handler', () => {
    expect(() => playSfx('deal')).not.toThrow();
  });

  it('repassa o evento ao handler registrado', () => {
    const handler = vi.fn();
    setSfxHandler(handler);
    playSfx('combo');
    expect(handler).toHaveBeenCalledWith('combo');
  });

  it('um handler que falha nunca quebra o jogo', () => {
    setSfxHandler(() => {
      throw new Error('sem áudio');
    });
    expect(() => playSfx('victory')).not.toThrow();
  });
});
