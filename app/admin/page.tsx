'use client';

import { useState, useEffect } from 'react';

const FILE_MODIFICABILI = [
  { path: 'data/aliquote-inps.json',           label: 'Aliquote INPS e Agevolazioni 2026' },
  { path: 'data/inail.json',                   label: 'Tariffe INAIL 2025/2026' },
  { path: 'data/tfr.json',                     label: 'Parametri TFR (art. 2120 c.c.)' },
  { path: 'data/ccnl/commercio.json',          label: 'CCNL Commercio' },
  { path: 'data/ccnl/metalmeccanici.json',     label: 'CCNL Metalmeccanici' },
  { path: 'data/ccnl/edilizia.json',           label: 'CCNL Edilizia' },
  { path: 'data/ccnl/sanita_privata.json',     label: 'CCNL Sanità Privata' },
  { path: 'data/ccnl/studi_professionali.json', label: 'CCNL Studi Professionali' },
  { path: 'data/ccnl/cooperative_sociali.json', label: 'CCNL Cooperative Sociali' },
  { path: 'data/ccnl/trasporti.json',          label: 'CCNL Trasporti e Logistica' },
  { path: 'data/ccnl/pubblici_esercizi.json',  label: 'CCNL Pubblici Esercizi e Turismo' },
  { path: 'data/ccnl/chimica.json',            label: 'CCNL Chimica-Farmaceutica' },
  { path: 'data/ccnl/credito.json',            label: 'CCNL Credito (ABI)' },
  { path: 'data/ccnl/multiservizi.json',       label: 'CCNL Multiservizi' },
  { path: 'data/ccnl/telecomunicazioni.json',  label: 'CCNL Telecomunicazioni' },
  { path: 'data/ccnl/tessile.json',            label: 'CCNL Tessile-Abbigliamento' },
  { path: 'data/ccnl/informatica.json',        label: 'CCNL Informatica' },
  { path: 'data/ccnl/agricoltura.json',        label: 'CCNL Agricoltura' },
  { path: 'data/ccnl/scuole_private.json',     label: 'CCNL Scuole Private' },
];

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [autenticato, setAutenticato] = useState(false);
  const [erroreLogin, setErroreLogin] = useState('');
  const [fileSelezionato, setFileSelezionato] = useState(FILE_MODIFICABILI[0]);
  const [contenuto, setContenuto] = useState('');
  const [erroreJson, setErroreJson] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'errore'; messaggio: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!autenticato) return;
    fetch(`/api/admin/leggi-file?path=${encodeURIComponent(fileSelezionato.path)}&password=${encodeURIComponent(password)}`)
      .then(r => r.json())
      .then(d => setContenuto((d as { contenuto?: string }).contenuto ?? ''))
      .catch(() => setContenuto('Errore nel caricamento del file'));
  }, [fileSelezionato, autenticato, password]);

  const validaJson = (testo: string) => {
    try { JSON.parse(testo); setErroreJson(''); } catch (e) { setErroreJson(String(e)); }
    setContenuto(testo);
  };

  const salva = async () => {
    if (erroreJson) return;
    const conferma = window.confirm(`Stai per sovrascrivere ${fileSelezionato.label}. Continuare?`);
    if (!conferma) return;
    setSalvando(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/update-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, filePath: fileSelezionato.path, content: contenuto }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { errore?: string }).errore ?? 'Errore sconosciuto');
      setFeedback({ tipo: 'ok', messaggio: `Salvato — aggiornato al ${new Date((json as { updatedAt: string }).updatedAt).toLocaleString('it-IT')}` });
    } catch (e) {
      setFeedback({ tipo: 'errore', messaggio: e instanceof Error ? e.message : 'Errore sconosciuto' });
    } finally {
      setSalvando(false);
    }
  };

  if (!autenticato) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Pannello Admin</h1>
          <p className="text-sm text-gray-500">Inserisci la password per accedere alla gestione dei dati.</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setAutenticato(true)}
            placeholder="Password admin"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {erroreLogin && <p className="text-xs text-red-600">{erroreLogin}</p>}
          <button
            onClick={() => { if (password.trim()) setAutenticato(true); else setErroreLogin('Inserisci la password'); }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Accedi
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Gestione dati</h1>
          <a href="/calcolatore" className="text-sm text-blue-600 hover:underline">← Torna al calcolatore</a>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          ⚠️ Qualsiasi modifica viene applicata immediatamente. Verifica sempre la validità del JSON prima di salvare.
        </div>

        {/* Selezione file */}
        <div className="flex gap-2 flex-wrap">
          {FILE_MODIFICABILI.map(f => (
            <button
              key={f.path}
              onClick={() => { setFileSelezionato(f); setFeedback(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                fileSelezionato.path === f.path
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-mono text-gray-500">{fileSelezionato.path}</p>
            {erroreJson && <p className="text-xs text-red-600 font-mono">JSON non valido</p>}
          </div>
          <textarea
            value={contenuto}
            onChange={e => validaJson(e.target.value)}
            className={`w-full h-96 font-mono text-xs border rounded-lg p-3 focus:outline-none focus:ring-2 resize-y ${
              erroreJson ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'
            }`}
            spellCheck={false}
          />
          {erroreJson && <p className="text-xs text-red-600 font-mono bg-red-50 p-2 rounded">{erroreJson}</p>}

          {feedback && (
            <div className={`rounded-lg p-3 text-sm ${feedback.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {feedback.tipo === 'ok' ? '✅' : '❌'} {feedback.messaggio}
            </div>
          )}

          <button
            onClick={salva}
            disabled={!!erroreJson || salvando}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </main>
  );
}
