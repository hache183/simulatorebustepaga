import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CostWork Pro',
    short_name: 'CostWork',
    description: 'Simulatore del costo aziendale del lavoro in Italia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F6FA',
    theme_color: '#5B5CE2',
    lang: 'it',
    icons: [
      { src: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' },
      { src: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
  };
}
