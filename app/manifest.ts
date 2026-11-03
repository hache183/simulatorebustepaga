import type { MetadataRoute } from 'next';
import { NOME_SITO } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOME_SITO,
    short_name: 'CostiLavoro',
    description: 'Simulatore del costo aziendale del lavoro in Italia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F3EE',
    theme_color: '#0C2340',
    lang: 'it',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
