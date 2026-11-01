import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  padding?: 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'lg' }: Props) {
  return (
    <div className={`ui-card ui-card--${padding} ${className}`.trim()}>
      {children}
    </div>
  );
}
