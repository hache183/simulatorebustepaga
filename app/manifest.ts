import type { MetadataRoute } from 'next';
import { NOME_SITO } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOME_SITO,
    short_name: 'Costi Lavoro',
    description: 'Simulatore del costo aziendale del lavoro in Italia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0B0D',
    theme_color: '#0A0B0D',
    lang: 'it',
    icons: [
      { src: '/brand/seal-clean-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/seal-clean-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
