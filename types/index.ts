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
  includiAssistenzaSanitaria: boolean; // se true, include contributi sanitari CCNL
  aliquotaInps: number;               // aliquota INPS datoriale personalizzata (es. 0.2676 per 26,76%)
  retribuzionePersonalizzata?: number; // RAL personalizzata concordata tra le parti (euro/anno)

  // ─── Campi specifici per CCNL Lavoro Domestico ───
  tipoRetribuzione?: 'mensile' | 'oraria';  // default: 'mensile'
  pagaOraria?: number;                       // paga oraria per lavoro domestico (euro)
  oreSettimanali?: number;                   // ore settimanali effettive per lavoro domestico
  convivente?: boolean;                      // se true, aggiunge indennità vitto e alloggio
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
  nettoDipendente: NettoDipendente;
}

export interface NettoDipendente {
  ralLorda: number;
  inpsDipendente: number;
  imponibileIrpef: number;
  irpefLorda: number;
  detrazioneLavoroDip: number;
  bonusCuneoFiscale: number;
  irpefNetta: number;
  addizionaleRegionale: number;
  addizionaleComunale: number;
  nettoAnnuo: number;
  nettoMensile12: number;
  nettoPerMensilita: number;
  disclaimer: string;
}

// ─── TIPI PER I FILE JSON ─────────────────────────────────────────────────

export interface ContributoContrattuale {
  tipo: 'sanitario' | 'previdenziale' | 'bilaterale';
  modalita: 'fisso' | 'percentuale';
  importoMensile?: number | null;
  percentuale: number | null;
  descrizione: string;
  notaLegge: string;
}

export interface ElementoAggiuntivo {
  importoMensile: number;
  mensilita: number;
  condizione: string | null;
  descrizione: string;
}

export interface LivelloCcnl {
  codice: string;
  descrizione: string;
  qualifica: string;
  minimoTabellare: number; // minimo tabellare mensile in euro
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
  elementiAggiuntivi?: Record<string, ElementoAggiuntivo>;
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
  settoriContributivi: Record<string, SettoreContributivo>;
  mappaCcnlSettore: Record<string, string>;
  agevolazioni: AgevolazioneInps[];
}

export interface SettoreContributivo {
  nome: string;
  aliquotaDatore: number;
  aliquotaDipendente: number;
  dettaglio: Record<string, number>;
}

export interface VoceInail {
  codice: string;
  settore: string;
  gestione?: string;
  tassoPerMille: number;
  rangeOscillazione?: { min: number; max: number };
  note?: string;
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
