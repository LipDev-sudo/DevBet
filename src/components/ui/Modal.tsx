'use client';

import { useEffect, useId, useRef } from 'react';

/** Diálogo acessível baseado em <dialog>: foco preso, Esc fecha, clique no fundo fecha. Foco inicial: `[data-autofocus]` ou o 1º controle. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Confirmações destrutivas marcam a opção segura com data-autofocus: o foco inicial cai nela.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`panel m-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg p-0 text-ivory backdrop:bg-black/80 backdrop:backdrop-blur-[2px] ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
    >
      {open && (
        <div className="p-5 sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="gold-text font-display text-2xl font-black">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Fechar" className="modal-close" />
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
