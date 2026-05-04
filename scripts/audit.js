#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const issues = [];
const ok = [];
const ACTIVE_CCNL_FILES = [
  'acconciatura_estetica.json',
  'agricoltura_impiegati.json',
  'agricoltura_operai.json',
  'alimentari_industria.json',
  'alimentari_artigianato.json',
  'amministratori_condominio.json',
  'assicurazioni.json',
  'autorimesse.json',
  'autoscuole.json',
  'calzature.json',
  'chimica.json',
  'commercio.json',
  'comunicazione_grafica_editoria.json',
  'facility_management.json',
  'edilizia_industria.json',
  'edilizia_artigianato.json',
  'farmacie_private.json',
  'gomma_plastica.json',
  'grafica_aziende_industriali.json',
  'igiene_ambientale_private.json',
  'lavanderie_artigiane.json',
  'lavanderie_industriali.json',
  'legno_arredamento.json',
  'metalmeccanici.json',
  'cooperative_sociali.json',
  'credito.json',
  'domestici.json',
  'domestici_conviventi.json',
  'informatica.json',
  'multiservizi.json',
  'pubblici_esercizi_turismo.json',
  'sanita_privata.json',
  'servizi_postali_appalto.json',
  'case_di_cura_private.json',
  'scuole_private.json',
  'studi_professionali.json',
  'telecomunicazioni.json',
  'tessile.json',
  'trasporti.json',
  'vigilanza_privata.json',
];

// ── 1. CCNL files ────────────────────────────────────────────────────────────
const ccnlDir = path.join(__dirname, '..', 'data', 'ccnl');
const ccnlFiles = ACTIVE_CCNL_FILES;
for (const f of ccnlFiles) {
  const d = JSON.parse(fs.readFileSync(path.join(ccnlDir, f), 'utf-8'));
  const tag = 'CCNL:' + f;
  if (!d.mensilita || d.mensilita < 13 || d.mensilita > 16)
    issues.push(tag + ' mensilita=' + d.mensilita + ' (atteso 13-16)');
  if (!d.livelli || d.livelli.length === 0)
    issues.push(tag + ' NO livelli');
  if (!d.scattiAnzianita)
    issues.push(tag + ' NO scattiAnzianita');
  const s = d.scattiAnzianita;
  if (s && s.periodicitaMesi <= 0)
    issues.push(tag + ' periodicitaMesi=' + s.periodicitaMesi);
  if (s && s.maxScatti < 0)
    issues.push(tag + ' maxScatti=' + s.maxScatti);
  for (const l of (d.livelli || [])) {
    if (l.moltiplicatore <= 0 || l.moltiplicatore > 5)
      issues.push(tag + ' livello ' + l.codice + ' moltiplicatore=' + l.moltiplicatore);
    if (l.minimoTabellare <= 0)
      issues.push(tag + ' livello ' + l.codice + ' minimoTabellare=' + l.minimoTabellare);
  }
  if (!d.fonte || /TODO|Nessun PDF/i.test(d.fonte))
    issues.push(tag + ' fonte non verificata: ' + d.fonte);
  if (issues.filter(i => i.startsWith(tag)).length === 0)
    ok.push(tag);
}

// ── 2. INAIL ─────────────────────────────────────────────────────────────────
const inail = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'inail.json'), 'utf-8'));
for (const v of inail.voci) {
  if (v.tassoPerMille <= 0 || v.tassoPerMille > 250)
    issues.push('INAIL:' + v.codice + ' tassoPerMille=' + v.tassoPerMille + ' (atteso 0-250)');
}
if (issues.filter(i => i.startsWith('INAIL:')).length === 0) ok.push('INAIL:tutte le voci OK (' + inail.voci.length + ')');

// ── 3. INPS ───────────────────────────────────────────────────────────────────
const inps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'aliquote-inps.json'), 'utf-8'));
if (inps.aliquotaBaseAzienda <= 0 || inps.aliquotaBaseAzienda > 0.5)
  issues.push('INPS: aliquotaBaseAzienda=' + inps.aliquotaBaseAzienda + ' fuori range 0-50%');
if (inps.aliquotaBaseDipendente <= 0 || inps.aliquotaBaseDipendente > 0.5)
  issues.push('INPS: aliquotaBaseDipendente=' + inps.aliquotaBaseDipendente + ' fuori range 0-50%');
for (const a of (inps.agevolazioni || [])) {
  if (a.percentualeEsonero <= 0 || a.percentualeEsonero > 1)
    issues.push('AGEV:' + a.id + ' percentualeEsonero=' + a.percentualeEsonero + ' fuori range 0-1');
  if (a.massimaleAnnuo !== null && a.massimaleAnnuo <= 0)
    issues.push('AGEV:' + a.id + ' massimaleAnnuo=' + a.massimaleAnnuo);
  if (a.scadenza !== null && new Date(a.scadenza) < new Date())
    issues.push('AGEV:' + a.id + ' SCADUTA il ' + a.scadenza);
}
if (issues.filter(i => i.startsWith('INPS:') || i.startsWith('AGEV:')).length === 0)
  ok.push('INPS & Agevolazioni OK');

// ── 4. TFR ────────────────────────────────────────────────────────────────────
const tfr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'tfr.json'), 'utf-8'));
if (tfr.divisoreAnnuo !== 13.5)
  issues.push('TFR: divisoreAnnuo=' + tfr.divisoreAnnuo + ' (atteso 13.5)');
else
  ok.push('TFR OK (divisore 13.5)');

// ── 5. Admin warn range (INAIL) ──────────────────────────────────────────────
// Allineato alla UI: warn solo oltre 200‰ (0.1–200)
const inailWarnings = inail.voci.filter(v => v.tassoPerMille > 200);
if (inailWarnings.length > 0)
  issues.push('ADMIN UI: ' + inailWarnings.length + ' voci INAIL sopra 200‰ mostrano warning arancione: ' +
    inailWarnings.map(v => v.codice + '(' + v.tassoPerMille + '‰)').join(', ') +
    ' → verificare se il range UI va esteso oltre 200');

// ── 6. Agevolazioni scadute/in scadenza ──────────────────────────────────────
const oggi = new Date();
for (const a of (inps.agevolazioni || [])) {
  if (a.scadenza) {
    const scad = new Date(a.scadenza);
    const giorni = Math.ceil((scad - oggi) / 86400000);
    if (giorni < 0)
      issues.push('AGEV SCADUTA: ' + a.nome + ' scaduta il ' + a.scadenza);
    else if (giorni < 90)
      issues.push('AGEV IN SCADENZA: ' + a.nome + ' scade tra ' + giorni + ' giorni (' + a.scadenza + ')');
  }
}

// ── 7. ENV vars ───────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf-8');
  const hasAdminPw = env.includes('ADMIN_PASSWORD=');
  const hasAuthPw = env.includes('AUTH_PASSWORD=');
  const hasAuthEmail = env.includes('AUTH_EMAIL=');
  const hasAuthToken = env.includes('AUTH_TOKEN=');
  if (!hasAdminPw) issues.push('ENV: ADMIN_PASSWORD mancante in .env.local');
  if (!hasAuthPw)  issues.push('ENV: AUTH_PASSWORD mancante in .env.local');
  if (!hasAuthEmail) issues.push('ENV: AUTH_EMAIL mancante in .env.local');
  if (!hasAuthToken) issues.push('ENV: AUTH_TOKEN mancante in .env.local');
  if (hasAdminPw && hasAuthPw && hasAuthEmail && hasAuthToken)
    ok.push('ENV vars OK');
} else {
  ok.push('ENV: .env.local assente (accettabile se non usi API/autenticazione locale)');
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log('\n✅ OK (' + ok.length + ')');
ok.forEach(m => console.log('  ✓ ' + m));
console.log('\n⚠️  Issues (' + issues.length + ')');
issues.forEach(m => console.log('  ✗ ' + m));
console.log('');
