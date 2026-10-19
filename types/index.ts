// ─── INPUT UTENTE ─────────────────────────────────────────────────────────

export type TipoContratto =
  | 'tempo_indeterminato'
  | 'tempo_determinato';

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
  includiAssistenzaSanitaria: boolean; // dipendenti: forfait sempre applicato dal motore; flag legacy API
  aliquotaInps: number;               // aliquota INPS datoriale (es. 0.2880 per 28,80%)
  quotaNonGodute?: number;           // domestici; dipendenti: ignorato (formula fissa)
  retribuzionePersonalizzata?: number; // RAL personalizzata concordata tra le parti (euro/anno)
  pagaOraria?: number;                // solo domestici: retribuzione oraria effettiva
  oreSettimanali?: number;            // solo domestici: ore settimanali dedicate al rapporto
  convivente?: boolean;               // solo domestici: lavoratore convivente con vitto e alloggio
  includiCassaColf?: boolean;         // domestici: quota oraria Cassacolf (default off)
  sostituzioneTitolare?: boolean;     // conviventi: apre la tabella C (oraria CS/DS)
  oreNonGodute?: number;              // domestici non conviventi: ferie/permessi/festività non godute
  oreAssenzeAnnue?: number;           // legacy API; dipendenti: ignorato (formula fissa 173 h)
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
  perOra?: boolean; // true per contributi a tariffa oraria (es. CassaColf domestici)
  mensilitaMaturazione?: number; // mesi su cui matura un importo fisso (default 12)
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
  contingenza?: number;
  edr?: number;
  altreIndennitaFisse?: number;
  superminimoCollettivo?: number;
  indennitaFunzione?: number;
  scattoEuro?: number;
  terzoElemento?: number;
  elementoDistinto?: number;
  retribuzioneMensileTabella?: number;
  /** Tab edili: false = quadro/impiegato, non selezionabile */
  categoriaOperaio?: boolean;
}

export interface MotoreEdiliCassaConfig {
  percentSuF: number;
  coeffOrario1: number;
  coeffFisso2: number;
  coeffFisso3: number;
  percentSuF2: number;
}

export interface MotoreEdiliConfig {
  cassaProvincia: string;
  oreMensiliPieno: number;
  oreSettimanaliPieno: number;
  gratificaFeriePercent: number;
  permessiFestivitaPercent: number;
  indennitaMensaGiorno: number;
  indennitaTrasportoGiorno: number;
  giorniIndennitaMese: number;
  inpsDatorePercent: number;
  inpsDipendentePercent: number;
  cassaEdile: MotoreEdiliCassaConfig;
}

export interface ScattiAnzianita {
  periodicitaMesi: number;
  importoPerScattoEuro: number | null;
  percentualeScatto?: number; // se impostato, scatto = percentualeScatto × ralEffettiva (es. domestici 4%)
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
  retribuzioneOraria?: boolean; // true se minimoTabellare è €/ora (es. domestici)
  coefficienteOreMese?: number; // domestici: ore settimanali → mensile (4,33)
  oreSettimanaliPieno?: number;
  oreFerieAnnue?: number;
  orePermessiAnnue?: number;
  oreFestivitaAnnue?: number;
  elementiAggiuntivi?: Record<string, ElementoAggiuntivo>;
  tabellaA?: { codice: string; descrizione?: string; mensile: number; indennitaFunzione: number }[];
  tabellaB?: { codice: string; descrizione?: string; mensile30h: number; oreBase?: number }[];
  tabellaC?: { codice: string; descrizione?: string; orario: number }[];
  motoreEdili?: MotoreEdiliConfig;
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
