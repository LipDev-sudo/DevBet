/**
 * Caça-níquel animado em pixel art (Casino Tileset de Jephed, Game Between The Lines). É só decoração: a folha de
 * sprites tem 8×5 quadros de 32×48 px e a animação percorre todos eles. `scale` é o aumento inteiro dos pixels.
 */
export function SlotMachine({
  scale,
  offset = 0,
  className = '',
}: {
  /** Sem valor, usa 2× em telas médias e 3× em telas grandes. */
  scale?: 1 | 2 | 3;
  /** Atraso (s) para as máquinas não girarem em sincronia. */
  offset?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`slot-machine ${className}`}
      style={
        {
          ...(scale ? { '--s': scale } : {}),
          '--off': `${-offset}s`,
        } as React.CSSProperties
      }
    />
  );
}
