import Link from 'next/link';

export const metadata = {
  title: 'Informativa privacy — Costi Lavoro Italia',
  description: 'Informativa sul trattamento dei dati inseriti per sbloccare il report del simulatore Costi Lavoro Italia.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Informativa privacy — Costi Lavoro Italia',
    description: 'Informativa sul trattamento dei dati inseriti per sbloccare il report del simulatore Costi Lavoro Italia.',
    url: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <main id="contenuto" style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: '80px 24px 48px',
      lineHeight: 1.65,
      color: 'var(--color-text-primary)',
    }}>
      <h1 style={{
        fontFamily: "var(--font-display), sans-serif",
        fontSize: '28px',
        fontWeight: 700,
        marginBottom: '16px',
      }}>
        Informativa privacy
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        Questa pagina descrive come vengono trattati i dati inseriti per sbloccare il report del simulatore Costi Lavoro Italia.
        Il titolare del trattamento deve completare questo testo con i propri riferimenti legali (ragione sociale, sede, contatti DPO).
      </p>
      <h2 style={{ fontSize: '16px', marginTop: '24px' }}>Finalità</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        I parametri del calcolo si possono inserire senza lasciare recapiti. Nome, email, telefono e, se indicati, azienda e ruolo
        si raccolgono solo quando si chiede il report, per generarlo e per ricontattare chi l&apos;ha richiesto. Le comunicazioni commerciali partono solo se è stato dato il consenso marketing, separato.
        Un identificativo tecnico associa le simulazioni successive allo stesso contatto. I parametri di simulazione non vengono
        inclusi nella email al consulente, salvo il modulo scelto (dipendenti, edili, domestici o soci).
      </p>
      <h2 style={{ fontSize: '16px', marginTop: '24px' }}>Base giuridica e conservazione</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Il consenso privacy è obbligatorio per generare il report. Il consenso marketing è facoltativo. I dati sono conservati
        per il tempo necessario alle finalità indicate e secondo gli obblighi di legge applicabili al titolare. I dati del contatto
        possono essere conservati anche su un foglio Google accessibile al titolare. Lo sblocco sul browser
        dura circa 30 giorni e non sostituisce il consenso.
      </p>
      <p style={{ marginTop: '32px' }}>
        <Link href="/calcolatore" style={{ color: 'var(--color-accent-bright)' }}>
          ← Torna al simulatore
        </Link>
      </p>
    </main>
  );
}
