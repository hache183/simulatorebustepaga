import { svgComePng } from '@/lib/marchio-raster';

export const alt = 'Costi Lavoro Italia — Lo stipendio è solo la prima riga. Simulatore del costo del lavoro.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return svgComePng('anteprima.svg', size.width, size.height);
}
