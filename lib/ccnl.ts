import fs from 'fs';
import path from 'path';
import type { CcnlData, LivelloCcnl } from '@/types';

const cache = new Map<string, CcnlData>();
const DATA_DIR = path.join(process.cwd(), 'data', 'ccnl');

/**
 * Carica i dati di un CCNL dal file JSON.
 * Usa cache in-memory per evitare letture disco ripetute.
 * @throws {Error} Se il CCNL non esiste o il JSON non è valido
 */
export function getCcnlData(ccnlId: string): CcnlData {
  if (cache.has(ccnlId)) return cache.get(ccnlId)!;
  const filePath = path.join(DATA_DIR, `${ccnlId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`CCNL non trovato: '${ccnlId}'. File atteso: ${filePath}`);
  }
  const data: CcnlData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  cache.set(ccnlId, data);
  return data;
}

/** Restituisce la lista degli ID dei CCNL disponibili */
export function listCcnlIds(): string[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

/** Restituisce un livello contrattuale o lancia errore se non esiste */
export function getLivello(ccnlId: string, codice: string): LivelloCcnl {
  const ccnl = getCcnlData(ccnlId);
  const livello = ccnl.livelli.find(l => l.codice === codice);
  if (!livello) throw new Error(`Livello '${codice}' non trovato nel CCNL '${ccnlId}'`);
  return livello;
}

/** Invalida la cache (usata dal pannello admin dopo aggiornamento JSON) */
export function invalidateCcnlCache(ccnlId?: string): void {
  if (ccnlId) cache.delete(ccnlId);
  else cache.clear();
}
