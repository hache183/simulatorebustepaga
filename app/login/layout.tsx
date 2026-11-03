import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accesso consulente — CostWork Pro',
  description: 'Accesso riservato all\'area consulente di CostWork Pro.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
