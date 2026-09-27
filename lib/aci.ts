export interface VeicoloAci {
  idModello: string;
  marca: string;
  modello: string;
  alimentazione: string;
  inProduzione: boolean;
  costoKm: number;
}

export interface CatalogoAci {
  fonte: string;
  fileOrigine: string;
  validitaDal: string;
  veicoli: VeicoloAci[];
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Ricerca per sottostringa su marca + modello («panda», «golf 1.5», «fiat panda»). */
export function cercaVeicoli(veicoli: VeicoloAci[], query: string, limit = 40): VeicoloAci[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const hits: VeicoloAci[] = [];
  for (const v of veicoli) {
    if (norm(`${v.marca} ${v.modello}`).includes(q)) hits.push(v);
  }
  hits.sort((a, b) => Number(b.inProduzione) - Number(a.inProduzione) || a.marca.localeCompare(b.marca) || a.modello.localeCompare(b.modello));
  return hits.slice(0, limit);
}
