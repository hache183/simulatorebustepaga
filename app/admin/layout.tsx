import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — CostWork Pro',
  description: 'Pannello riservato per l\'aggiornamento dei parametri di CostWork Pro.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/admin' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
