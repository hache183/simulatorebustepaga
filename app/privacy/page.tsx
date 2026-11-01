import Link from 'next/link';

export const metadata = {
  title: 'Informativa privacy — CostWork Pro',
};

export default function PrivacyPage() {
  return (
    <main style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: '80px 24px 48px',
      lineHeight: 1.65,
      color: 'var(--color-text-primary)',
    }}>
      <h1 style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: '28px',
        fontWeight: 700,
        marginBottom: '16px',
      }}>
        Informativa privacy
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        Questa pagina descrive come vengono trattati i dati inseriti per sbloccare il report del simulatore CostWork Pro.
        Il titolare del trattamento deve completare questo testo con i propri riferimenti legali (ragione sociale, sede, contatti DPO).
      </p>
      <h2 style={{ fontSize: '16px', marginTop: '24px' }}>Finalità</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        I dati (nome, email e campi opzionali) sono raccolti per inviare il report richiesto, per eventuale ricontatto commerciale
        e per migliorare il servizio. I parametri di simulazione non vengono inclusi nella notifica email al consulente, salvo metadati generici (es. tipo modulo).
      </p>
      <h2 style={{ fontSize: '16px', marginTop: '24px' }}>Base giuridica e conservazione</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Il trattamento si basa sul consenso espresso tramite checkbox. I dati sono conservati per il tempo necessario alle finalità indicate
        e secondo gli obblighi di legge applicabili al titolare.
      </p>
      <p style={{ marginTop: '32px' }}>
        <Link href="/calcolatore" style={{ color: 'var(--color-accent-bright)' }}>
          ← Torna al simulatore
        </Link>
      </p>
    </main>
  );
}
