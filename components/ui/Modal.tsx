'use client';

import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose?: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Modal({ open, title, subtitle, children }: Props) {
  if (!open) return null;
  return (
    <div className="ui-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
      <div className="ui-modal">
        <h2 id="lead-modal-title" className="ui-modal__title">{title}</h2>
        {subtitle && <p className="ui-modal__subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
