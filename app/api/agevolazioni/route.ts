import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { AliquoteInpsData } from '@/types';

export async function GET() {
  const data: AliquoteInpsData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/aliquote-inps.json'), 'utf-8')
  );
  return NextResponse.json({ agevolazioni: data.agevolazioni });
}
