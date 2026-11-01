'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { LeadModulo } from '@/lib/lead-unlock';

const PRIVACY_HREF = process.env.NEXT_PUBLIC_PRIVACY_URL ?? '/privacy';

interface Props {
  open: boolean;
  modulo: LeadModulo;
  meta?: Record<string, string>;
  onSuccess: () => void;
}

export function LeadCaptureModal({ open, modulo, meta, onSuccess }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [azienda, setAzienda] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    if (!privacy) {
      setErrore('Devi accettare l\'informativa privacy.');
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
          privacy: true,
          modulo,
          meta,
          website: '',
        }),
      });
      const json = await res.json() as { errore?: string; unlocked?: boolean };
      if (!res.ok) {
        setErrore(json.errore ?? 'Invio non riuscito');
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
    <Modal
      open={open}
      title="Sblocca il report dettagliato gratuito"
      subtitle="Inserisci i tuoi dati per visualizzare il prospetto completo e stamparlo. Nessuna registrazione."
    >
      <form onSubmit={submit} className="lead-form">
        <Input
          label="Nome e cognome"
          name="nome"
          required
          autoComplete="name"
          value={nome}
          onChange={e => setNome(e.target.value)}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          label="Telefono (opzionale)"
          name="telefono"
          type="tel"
          autoComplete="tel"
          value={telefono}
          onChange={e => setTelefono(e.target.value)}
        />
        <Input
          label="Azienda (opzionale)"
          name="azienda"
          autoComplete="organization"
          value={azienda}
          onChange={e => setAzienda(e.target.value)}
        />
        <label className="lead-form__privacy">
          <input
            type="checkbox"
            checked={privacy}
            onChange={e => setPrivacy(e.target.checked)}
          />
          <span>
            Acconsento al trattamento dei dati per ricevere il report e essere ricontattato.
            {' '}
            <a href={PRIVACY_HREF} target="_blank" rel="noopener noreferrer">Informativa privacy</a>
          </span>
        </label>
        {errore && <p className="lead-form__error">{errore}</p>}
        <Button type="submit" variant="primary" fullWidth disabled={loading}>
          {loading ? 'Invio in corso…' : 'Sblocca report'}
        </Button>
      </form>
    </Modal>
  );
}
