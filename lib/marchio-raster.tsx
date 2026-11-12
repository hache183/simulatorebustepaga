import { readFile } from 'fs/promises';
import { join } from 'path';
import { ImageResponse } from 'next/og';

/**
 * Rasterizza in PNG i master SVG del marchio (public/brand) al momento della build.
 * Gli SVG hanno i glifi già in tracciati: non servono font.
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
