/**
 * IP del client. Su Vercel `x-real-ip` e `x-vercel-forwarded-for` sono
 * impostati dalla piattaforma e non dal browser: hanno priorità sul
 * `x-forwarded-for` che il client può prefissare.
 * In locale, senza quegli header, si usa il primo valore di x-forwarded-for.
 */
export function ipRichiesta(req: { headers: { get(name: string): string | null } }): string {
  const reale = primoIp(req.headers.get('x-real-ip'));
  if (reale) return reale;
  const vercel = primoIp(req.headers.get('x-vercel-forwarded-for'));
  if (vercel) return vercel;
  return primoIp(req.headers.get('x-forwarded-for')) ?? '0.0.0.0';
}

function primoIp(header: string | null): string | null {
  if (!header) return null;
  const primo = header.split(',')[0]?.trim() ?? '';
  if (!primo || primo.length > 80) return null;
  return primo;
}
