import type { CcnlData, LivelloCcnl } from '@/types';

// Regex per prevenire path traversal: solo lettere minuscole, numeri e underscore
const CCNL_ID_PATTERN = /^[a-z0-9_]+$/;

// Static require map — webpack bundles all JSON at build time, no fs at runtime
/* eslint-disable @typescript-eslint/no-require-imports */
const CCNL_MAP: Record<string, CcnlData> = {
  acconciatura_estetica:      require('../data/ccnl/acconciatura_estetica.json'),
  amministratori_condominio: require('../data/ccnl/amministratori_condominio.json'),
  agricoltura_impiegati:      require('../data/ccnl/agricoltura_impiegati.json'),
  agricoltura_operai:         require('../data/ccnl/agricoltura_operai.json'),
  alimentari_industria:       require('../data/ccnl/alimentari_industria.json'),
  alimentari_artigianato:     require('../data/ccnl/alimentari_artigianato.json'),
  assicurazioni:              require('../data/ccnl/assicurazioni.json'),
  autorimesse:                require('../data/ccnl/autorimesse.json'),
  autoscuole:                 require('../data/ccnl/autoscuole.json'),
  calzature:                  require('../data/ccnl/calzature.json'),
  chimica:                    require('../data/ccnl/chimica.json'),
  comunicazione_grafica_editoria: require('../data/ccnl/comunicazione_grafica_editoria.json'),
  commercio:                  require('../data/ccnl/commercio.json'),
  facility_management:        require('../data/ccnl/facility_management.json'),
  edilizia_industria:         require('../data/ccnl/edilizia_industria.json'),
  edilizia_artigianato:       require('../data/ccnl/edilizia_artigianato.json'),
  farmacie_private:           require('../data/ccnl/farmacie_private.json'),
  gomma_plastica:             require('../data/ccnl/gomma_plastica.json'),
  grafica_aziende_industriali: require('../data/ccnl/grafica_aziende_industriali.json'),
  igiene_ambientale_private:  require('../data/ccnl/igiene_ambientale_private.json'),
  lavanderie_artigiane:       require('../data/ccnl/lavanderie_artigiane.json'),
  lavanderie_industriali:     require('../data/ccnl/lavanderie_industriali.json'),
  legno_arredamento:          require('../data/ccnl/legno_arredamento.json'),
  metalmeccanici:             require('../data/ccnl/metalmeccanici.json'),
  cooperative_sociali:       require('../data/ccnl/cooperative_sociali.json'),
  credito:                   require('../data/ccnl/credito.json'),
  informatica:               require('../data/ccnl/informatica.json'),
  domestici:                 require('../data/ccnl/domestici.json'),
  domestici_conviventi:      require('../data/ccnl/domestici_conviventi.json'),
  domestici_non_conviventi:  require('../data/ccnl/domestici.json'),
  multiservizi:              require('../data/ccnl/multiservizi.json'),
  pubblici_esercizi_turismo: require('../data/ccnl/pubblici_esercizi_turismo.json'),
  sanita_privata_unipresa:   require('../data/ccnl/sanita_privata.json'),
  case_di_cura_private:      require('../data/ccnl/case_di_cura_private.json'),
  scuole_private:            require('../data/ccnl/scuole_private.json'),
  servizi_postali_appalto:   require('../data/ccnl/servizi_postali_appalto.json'),
  studi_professionali:       require('../data/ccnl/studi_professionali.json'),
  telecomunicazioni:         require('../data/ccnl/telecomunicazioni.json'),
  tessile:                   require('../data/ccnl/tessile.json'),
  trasporti:                 require('../data/ccnl/trasporti.json'),
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
  if (!data.fonte || /TODO|Nessun PDF/i.test(data.fonte)) {
    throw new Error(`Fonte CCNL non verificata per '${ccnlId}'. Aggiornare 'fonte' con documento in LAVORO/.`);
  }
  if (!Array.isArray(data.livelli) || data.livelli.length === 0) {
    throw new Error(`Configurazione livelli mancante per CCNL '${ccnlId}'`);
  }
  for (const livello of data.livelli) {
    if (typeof livello.minimoTabellare !== 'number' || livello.minimoTabellare <= 0) {
      throw new Error(`Minimo tabellare non valido per CCNL '${ccnlId}', livello '${livello.codice}'`);
    }
  }
  return data;
}

/** Restituisce la lista degli ID dei CCNL disponibili */
export function listCcnlIds(): string[] {
  return Object.keys(CCNL_MAP);
}

const ALIAS_INTERNI = new Set(['domestici_non_conviventi', 'domestici_conviventi']);

export function listCcnlIdsUi(): string[] {
  return Object.keys(CCNL_MAP).filter(id => !ALIAS_INTERNI.has(id));
}

export function listCcnlUi(): { id: string; nome: string; fonte: string; validitaAl?: string | null }[] {
  return listCcnlIdsUi()
    .map(id => {
      const c = CCNL_MAP[id];
      return { id, nome: c.nome, fonte: c.fonte, validitaAl: c.validitaAl ?? null };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

export function fonteNonVerificata(fonte: string | undefined): boolean {
  return Boolean(fonte && /NON VERIFICATO|PROXY/i.test(fonte));
}

export function tabellaScaduta(validitaAl: string | null | undefined, oggi = new Date()): boolean {
  if (!validitaAl) return false;
  return new Date(validitaAl).getTime() < oggi.getTime();
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
