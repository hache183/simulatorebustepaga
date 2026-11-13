import Link from 'next/link';

export const metadata = {
  title: 'Informativa privacy — Costi Lavoro Italia',
  description: 'Informativa sul trattamento dei dati inseriti per sbloccare il report del simulatore Costi Lavoro Italia.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Informativa privacy — Costi Lavoro Italia',
    description: 'Informativa sul trattamento dei dati inseriti per sbloccare il report del simulatore Costi Lavoro Italia.',
    url: '/privacy',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Costi Lavoro Italia — Lo stipendio è solo la prima riga. Simulatore del costo del lavoro.' }],
  },
};

export default function PrivacyPage() {
  return (
    <main id="contenuto" style={{
      maxWidth: '760px',
      margin: '0 auto',
      padding: '72px 24px 24px',
      lineHeight: 1.65,
      color: 'var(--color-text-primary)',
    }}>
      <h1 style={{
        fontFamily: "var(--font-display), Georgia, serif",
        fontSize: '48px',
        fontWeight: 500,
        lineHeight: 1.08,
        letterSpacing: '-0.015em',
        marginBottom: '20px',
      }}>
        Informativa privacy
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        Questa pagina descrive come vengono trattati i dati inseriti per sbloccare il report del simulatore Costi Lavoro Italia.
        Il titolare del trattamento deve completare questo testo con i propri riferimenti legali (ragione sociale, sede, contatti DPO).
      </p>
      <h2 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '28px', fontWeight: 500, margin: '36px 0 8px' }}>Finalità</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        I parametri del calcolo si possono inserire senza lasciare recapiti. Nome, email, telefono e, se indicati, azienda e ruolo
        si raccolgono solo quando si chiede il report, per generarlo e per ricontattare chi l&apos;ha richiesto. Le comunicazioni commerciali partono solo se è stato dato il consenso marketing, separato.
        Un identificativo tecnico associa le simulazioni successive allo stesso contatto. I parametri di simulazione non vengono
        inclusi nella email al consulente, salvo il modulo scelto (dipendenti, edili, domestici o soci).
      </p>
      <h2 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '28px', fontWeight: 500, margin: '36px 0 8px' }}>Base giuridica e conservazione</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Il consenso privacy è obbligatorio per generare il report. Il consenso marketing è facoltativo. I dati sono conservati
        per il tempo necessario alle finalità indicate e secondo gli obblighi di legge applicabili al titolare. I dati del contatto
        possono essere conservati anche su un foglio Google accessibile al titolare. Lo sblocco sul browser
        dura circa 30 giorni e non sostituisce il consenso.
      </p>
      <p style={{ marginTop: '32px' }}>
        <Link href="/calcolatore" className="ui-btn ui-btn--secondary">
          ← Torna al simulatore
        </Link>
      </p>
    </main>
  );
}
