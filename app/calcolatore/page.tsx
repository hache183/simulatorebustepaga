import { Suspense } from 'react';
import { CalcolatorePageClient } from './CalcolatorePageClient';
import { AppHeader } from '@/components/AppHeader';
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
    <>
      <AppHeader />
      <main>
        <Suspense fallback={
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: 'var(--color-bg-base)',
          }}>
            <div className="skeleton" style={{ width: '200px', height: '4px', borderRadius: '2px' }} />
          </div>
        }>
          <CalcolatorePageClient updatedDates={updatedDates} />
        </Suspense>
      </main>
    </>
  );
}
