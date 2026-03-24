import { Suspense } from 'react';
import { CalcolatorePageClient } from './CalcolatorePageClient';
import fs from 'fs';
import path from 'path';
import type { AliquoteInpsData, InailData, TfrData, CcnlData } from '@/types';

function getUpdatedDates(): string[] {
  const dates: string[] = [];
  try {
    const inps: AliquoteInpsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/aliquote-inps.json'), 'utf-8'));
    dates.push(inps.updatedAt);
    const inail: InailData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/inail.json'), 'utf-8'));
    dates.push(inail.updatedAt);
    const tfr: TfrData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/tfr.json'), 'utf-8'));
    dates.push(tfr.updatedAt);
    const ccnlDir = path.join(process.cwd(), 'data/ccnl');
    if (fs.existsSync(ccnlDir)) {
      for (const file of fs.readdirSync(ccnlDir)) {
        if (file.endsWith('.json')) {
          const ccnl: CcnlData = JSON.parse(fs.readFileSync(path.join(ccnlDir, file), 'utf-8'));
          dates.push(ccnl.updatedAt);
        }
      }
    }
  } catch { /* ignora errori di lettura */ }
  return dates;
}

export default function CalcolatorePageWrapper() {
  const updatedDates = getUpdatedDates();
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Calcolatore Costo del Lavoro</h1>
          <p className="text-gray-500 mt-1">Strumento professionale multi-CCNL per studi di consulenza</p>
        </div>
        <Suspense fallback={<div className="animate-pulse h-96 bg-white rounded-xl" />}>
          <CalcolatorePageClient updatedDates={updatedDates} />
        </Suspense>
      </div>
    </main>
  );
}
