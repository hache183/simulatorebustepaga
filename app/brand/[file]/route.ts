import { BRAND_FILES, pngResponse } from '@/lib/brand-png';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(BRAND_FILES).map(file => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const png = BRAND_FILES[file];
  if (!png) return new Response('Not found', { status: 404 });
  return pngResponse(png);
}
