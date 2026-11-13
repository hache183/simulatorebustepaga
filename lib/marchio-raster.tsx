import { readFile } from 'fs/promises';
import { join } from 'path';
import { ImageResponse } from 'next/og';

/**
 * Rasterizza in PNG i master SVG carta e terracotta (public/brand) al momento della build.
 * icona.svg: simbolo chiaro su quadrato terracotta; anteprima.svg: marchio e titolo su carta.
 * Gli SVG sono generati da scripts/marchio-svg.py e hanno i glifi già in tracciati: non servono font.
 */
export async function svgComePng(file: string, width: number, height: number) {
  const svg = await readFile(join(process.cwd(), 'public/brand', file));
  const src = `data:image/svg+xml;base64,${svg.toString('base64')}`;
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} width={width} height={height} alt="" />
    ),
    { width, height },
  );
}
