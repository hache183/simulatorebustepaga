'use client';

import { useEffect, useRef, type ElementType, type HTMLAttributes, type ReactNode } from 'react';

type Tag = 'div' | 'article' | 'section' | 'ul' | 'ol' | 'li' | 'figure';

type Props = {
  as?: Tag;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

/**
 * Mostra la sezione con una lieve dissolvenza allo scorrimento.
 * Senza JavaScript, senza IntersectionObserver o con «riduci le animazioni»
 * il contenuto resta visibile come oggi.
 */
export function Reveal({ as = 'div', className = '', children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as ElementType;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const rect = el.getBoundingClientRect();
    // Già visibile al caricamento: resta com'è, nessun lampeggio.
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          el.setAttribute('data-reveal', 'in');
          io.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
    );

    el.setAttribute('data-reveal', 'pending');
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
