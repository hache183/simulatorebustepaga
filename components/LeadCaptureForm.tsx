'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { LeadModulo } from '@/lib/lead-unlock';

const PRIVACY_HREF = process.env.NEXT_PUBLIC_PRIVACY_URL ?? '/privacy';

interface Props {
  modulo: LeadModulo;
  onSuccess: () => void;
  onAnnulla?: () => void;
}

function emailValida(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function telefonoValido(telefono: string): boolean {
  return /^[+0-9][0-9\s()./-]{5,39}$/.test(telefono.trim());
}

export function LeadCaptureForm({ modulo, onSuccess, onAnnulla }: Props) {
  const [passo, setPasso] = useState<1 | 2>(1);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [azienda, setAzienda] = useState('');
  const [ruolo, setRuolo] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [website, setWebsite] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const continua = (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    if (nome.trim().length < 2) {
      setErrore('Inserisci nome e cognome.');
      return;
    }
    if (!emailValida(email)) {
      setErrore('Inserisci un\'email valida.');
      return;
    }
    if (!telefonoValido(telefono)) {
      setErrore('Inserisci un numero di telefono valido.');
      return;
    }
    setPasso(2);
  };

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    if (!privacy) {
      setErrore('Il consenso privacy è obbligatorio per continuare.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          email,
          telefono,
          azienda,
          ruolo,
          privacy: true,
          marketing,
          modulo,
          website,
        }),
      });
      const json = await res.json() as { errore?: string };
      if (!res.ok) {
        setErrore(json.errore ?? 'Invio non riuscito');
        return;
      }
      const check = await fetch('/api/leads', { cache: 'no-store' });
      const stato = await check.json() as { unlocked?: boolean };
      if (!stato.unlocked) {
        setErrore('Non è stato possibile sbloccare il simulatore. Riprova.');
        return;
      }
      onSuccess();
    } catch {
      setErrore('Errore di connessione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lead-funnel__card" data-testid="lead-form">
      <p className="lead-funnel__kicker">Prospetto</p>
      <h1 id="lead-dialog-title" className="lead-funnel__title">Per vedere il prospetto</h1>
      <p className="lead-funnel__subtitle">
        {passo === 1
          ? 'I parametri che hai inserito restano salvati. Lascia i tuoi recapiti per generare il prospetto: dopo l\'invio il calcolo parte da solo. Niente account, sblocco per 30 giorni su questo browser.'
          : 'Azienda e ruolo ci aiutano a ricontattarti nel modo giusto. Il consenso privacy è necessario; le comunicazioni commerciali sono facoltative.'}
      </p>

      <ol className="lead-funnel__steps">
        <li className={passo === 1 ? 'is-active' : 'is-done'}>1. Contatti</li>
        <li className={passo === 2 ? 'is-active' : ''}>2. Azienda</li>
      </ol>

      {passo === 1 ? (
        <form onSubmit={continua} className="lead-form" noValidate>
          <Input
            label="Nome e cognome *"
            name="nome"
            required
            autoComplete="name"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />
          <Input
            label="Email *"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <Input
            label="Telefono *"
            name="telefono"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
          />
          <input
            type="text"
            name="website"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="lead-form__honeypot"
          />
          <p className="lead-funnel__hint">I campi con * sono obbligatori.</p>
          {errore && <p className="lead-form__error" role="alert">{errore}</p>}
          <Button type="submit" variant="primary" fullWidth>
            Continua
          </Button>
          {onAnnulla && (
            <Button type="button" variant="secondary" fullWidth onClick={onAnnulla}>
              Torna ai parametri
            </Button>
          )}
        </form>
      ) : (
        <form onSubmit={invia} className="lead-form" noValidate>
          <Input
            label="Azienda"
            name="azienda"
            autoComplete="organization"
            value={azienda}
            onChange={e => setAzienda(e.target.value)}
            placeholder="es. Rossi Srl"
          />
          <Input
            label="Ruolo"
            name="ruolo"
            autoComplete="organization-title"
            value={ruolo}
            onChange={e => setRuolo(e.target.value)}
            placeholder="es. Responsabile HR"
          />
          <label className="lead-form__privacy">
            <input
              type="checkbox"
              checked={privacy}
              onChange={e => setPrivacy(e.target.checked)}
              required
            />
            <span>
              Acconsento al trattamento dei dati personali per usare il simulatore ed essere ricontattato,
              come descritto nell&apos;
              {' '}
              <a href={PRIVACY_HREF} target="_blank" rel="noopener noreferrer">informativa privacy</a>.
            </span>
          </label>
          <label className="lead-form__privacy">
            <input
              type="checkbox"
              checked={marketing}
              onChange={e => setMarketing(e.target.checked)}
            />
            <span>Acconsento a ricevere comunicazioni commerciali e aggiornamenti (facoltativo).</span>
          </label>
          {errore && <p className="lead-form__error" role="alert">{errore}</p>}
          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? 'Invio in corso…' : 'Genera il report'}
          </Button>
          <Button type="button" variant="secondary" fullWidth onClick={() => { setErrore(null); setPasso(1); }}>
            Torna ai contatti
          </Button>
          {onAnnulla && (
            <Button type="button" variant="ghost" fullWidth onClick={onAnnulla}>
              Torna ai parametri
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
