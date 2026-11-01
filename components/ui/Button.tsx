'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth,
  className = '',
  type = 'button',
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`ui-btn ui-btn--${variant}${fullWidth ? ' ui-btn--full' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
