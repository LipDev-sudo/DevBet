import type { ButtonHTMLAttributes, Ref } from 'react';

type Variant = 'brass' | 'crimson' | 'felt' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  /** React 19 repassa `ref` como prop comum. */
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'brass',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : '', className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...props} />;
}
