// ─── INPUT UTENTE ─────────────────────────────────────────────────────────

export type TipoContratto =
  | 'tempo_indeterminato'
  | 'tempo_determinato'
  | 'apprendistato'
  | 'somministrazione';

export interface CalcolatoreInput {
  ccnlId: string;
  livello: string;
  ral: number;                        // RAL annua lorda in euro
  tipoContratto: TipoContratto;
  oreLavoro: number;                  // ore settimanali (full-time = 40)
  mensilita: number;                   // numero di mensilità effettive (13-16, default dal CCNL)
  anzianitaAnni: number;              // anni di anzianità nel CCNL
  numeroDipendenti: number;           // dimensione azienda
  regione: string;
  codiceInail: string;                // codice voce tariffaria INAIL
  agevolazioniSelezionate: string[];  // array di id agevolazioni
}

// ─── OUTPUT CALCOLATORE ───────────────────────────────────────────────────

export type CategoriaVoce =
  | 'ral'
  | 'inps_azienda'
  | 'agevolazione'
  | 'ccnl_contrattuale'
  | 'tfr'
  | 'inail'
  | 'tredicesima'
  | 'quattordicesima';

export interface DettaglioCosto {
  id: string;
  categoria: CategoriaVoce;
  descrizione: string;
  importoAnnuo: number;
  importoMensile: number;
  percentualeRal: number;
  notaLegge?: string;
}

export interface AgevolazioneApplicata {
  id: string;
  nome: string;
  risparmioAnnuo: number;
  avvertenza?: string;
}

export interface AlertScadenza {
  agevolazioneId: string;
  nome: string;
  scadenza: string;
  giorniRimanenti: number;
}

export interface CalcolatoreOutput {
  input: CalcolatoreInput;
  costoTotaleAnnuo: number;
  costoTotaleMensile: number;
  percentualeRal: number;
  voci: DettaglioCosto[];
  agevolazioniApplicate: AgevolazioneApplicata[];
  alertScadenze: AlertScadenza[];
  calcolatoIl: string;
}

// ─── TIPI PER I FILE JSON ─────────────────────────────────────────────────

export interface ContributoContrattuale {
  percentuale: number;
  descrizione: string;
  notaLegge: string;
}

export interface LivelloCcnl {
  codice: string;
  descrizione: string;
  moltiplicatore: number;
}

export interface ScattiAnzianita {
  periodicitaMesi: number;
  importoPerScattoEuro: number;
  maxScatti: number;
}

export interface CcnlData {
  id: string;
  nome: string;
  fonte: string;
  updatedAt: string;
  contributiContrattuali: {
    azienda: Record<string, ContributoContrattuale>;
  };
  livelli: LivelloCcnl[];
  scattiAnzianita: ScattiAnzianita;
  mensilita: number;
}

export interface AgevolazioneInps {
  id: string;
  nome: string;
  descrizione: string;
  fonteLegge: string;
  percentualeEsonero: number;
  massimaleAnnuo: number | null;
  requisiti: Record<string, unknown>;
  cumulabileCon: string[];
  nonCumulabileCon: string[];
  scadenza: string | null;
  scadenzaAlertGiorni: number | null;
}

export interface AliquoteInpsData {
  updatedAt: string;
  fonte: string;
  aliquotaBaseAzienda: number;
  aliquotaBaseDipendente: number;
  agevolazioni: AgevolazioneInps[];
}

export interface VoceInail {
  codice: string;
  settore: string;
  tassoPerMille: number;
}

export interface InailData {
  updatedAt: string;
  fonte: string;
  voci: VoceInail[];
}

export interface TfrData {
  updatedAt: string;
  fonte: string;
  divisoreAnnuo: number;
  rivalutazione: {
    quotaFissa: number;
    quotaVariabileCpi: number;
    descrizione: string;
  };
}
