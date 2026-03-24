import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { InailData } from '@/types';

export async function GET() {
  const data: InailData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/inail.json'), 'utf-8')
  );
  return NextResponse.json({ voci: data.voci });
}
