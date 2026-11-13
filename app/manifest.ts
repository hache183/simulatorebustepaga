import type { MetadataRoute } from 'next';
import { NOME_SITO } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOME_SITO,
    short_name: 'Costi Lavoro',
    description: 'Simulatore gratuito del costo del lavoro in Italia: stima indicativa e preventivo gratuito di un consulente del lavoro.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F0E6',
    theme_color: '#B4432A',
    lang: 'it',
    icons: [
      { src: '/icona/192', sizes: '192x192', type: 'image/png' },
      { src: '/icona/512', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icona.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
