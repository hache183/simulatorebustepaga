import { PNG_OG, pngResponse } from '@/lib/brand-png';

export const alt = 'Costi Lavoro Italia — Lo stipendio è solo la prima riga. Simulatore del costo del lavoro.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return pngResponse(PNG_OG);
}
