'use client';

import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...rest }: Props) {
  const inputId = id ?? rest.name;
  return (
    <div className={`ui-field ${className}`.trim()}>
      <label htmlFor={inputId} className="ui-field__label">{label}</label>
      <input id={inputId} className="ui-field__input" {...rest} />
      {error && <p className="ui-field__error">{error}</p>}
    </div>
  );
}
