import type { CcnlData, LivelloCcnl } from '@/types';

// Regex per prevenire path traversal: solo lettere minuscole, numeri e underscore
const CCNL_ID_PATTERN = /^[a-z0-9_]+$/;

// Static require map — webpack bundles all JSON at build time, no fs at runtime
/* eslint-disable @typescript-eslint/no-require-imports */
const CCNL_MAP: Record<string, CcnlData> = {
  agricoltura:               require('../data/ccnl/agricoltura.json'),
  alimentari:                require('../data/ccnl/alimentari.json'),
  assicurazioni:             require('../data/ccnl/assicurazioni.json'),
  autorimesse:               require('../data/ccnl/autorimesse.json'),
  chimica:                   require('../data/ccnl/chimica.json'),
  commercio:                 require('../data/ccnl/commercio.json'),
  commercio_confesercenti:   require('../data/ccnl/commercio_confesercenti.json'),
  condomini:                 require('../data/ccnl/condomini.json'),
  cooperative_sociali:       require('../data/ccnl/cooperative_sociali.json'),
  credito:                   require('../data/ccnl/credito.json'),
  edilizia:                  require('../data/ccnl/edilizia.json'),
  gomma_plastica:            require('../data/ccnl/gomma_plastica.json'),
  grafica_editoria:          require('../data/ccnl/grafica_editoria.json'),
  informatica:               require('../data/ccnl/informatica.json'),
  lavoro_domestico:          require('../data/ccnl/lavoro_domestico.json'),
  domestici:                 require('../data/ccnl/lavoro_domestico.json'),
  legno_arredamento:         require('../data/ccnl/legno_arredamento.json'),
  metalmeccanici:            require('../data/ccnl/metalmeccanici.json'),
  metalmeccanici_artigianato: require('../data/ccnl/metalmeccanici_artigianato.json'),
  multiservizi:              require('../data/ccnl/multiservizi.json'),
  pubblici_esercizi:         require('../data/ccnl/pubblici_esercizi.json'),
  sanita_privata:            require('../data/ccnl/sanita_privata.json'),
  scuole_private:            require('../data/ccnl/scuole_private.json'),
  studi_professionali:       require('../data/ccnl/studi_professionali.json'),
  telecomunicazioni:         require('../data/ccnl/telecomunicazioni.json'),
  tessile:                   require('../data/ccnl/tessile.json'),
  trasporti:                 require('../data/ccnl/trasporti.json'),
  turismo:                   require('../data/ccnl/turismo.json'),
  vigilanza_privata:         require('../data/ccnl/vigilanza_privata.json'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Restituisce i dati di un CCNL dalla mappa statica.
 * @throws {Error} Se il CCNL non esiste
 */
export function getCcnlData(ccnlId: string): CcnlData {
  if (!CCNL_ID_PATTERN.test(ccnlId)) {
    throw new Error(`CCNL ID non valido: '${ccnlId}'. Sono ammessi solo caratteri a-z, 0-9, _`);
  }
  const data = CCNL_MAP[ccnlId];
  if (!data) throw new Error(`CCNL non trovato: '${ccnlId}'`);
  return data;
}

/** Restituisce la lista degli ID dei CCNL disponibili */
export function listCcnlIds(): string[] {
  return Object.keys(CCNL_MAP);
}

/** Restituisce un livello contrattuale o lancia errore se non esiste */
export function getLivello(ccnlId: string, codice: string): LivelloCcnl {
  const ccnl = getCcnlData(ccnlId);
  const livello = ccnl.livelli.find(l => l.codice === codice);
  if (!livello) throw new Error(`Livello '${codice}' non trovato nel CCNL '${ccnlId}'`);
  return livello;
}

/** No-op: i dati CCNL sono bundlati staticamente, nessuna cache runtime da invalidare */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function invalidateCcnlCache(_ccnlId?: string): void {
  // Intentionally a no-op: JSON data is bundled at build time
}
