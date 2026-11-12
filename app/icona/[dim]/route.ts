import { svgComePng } from '@/lib/marchio-raster';

/** Icone PNG per il manifest PWA (192 e 512), generate in build dall'SVG del marchio. */
const DIMENSIONI = ['192', '512'] as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return DIMENSIONI.map(dim => ({ dim }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ dim: string }> }) {
  const { dim } = await params;
  const lato = Number(dim);
  return svgComePng('icona.svg', lato, lato);
}
