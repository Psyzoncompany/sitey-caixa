import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PSYZON Caixa',
  description: 'Painel financeiro PSYZON Caixa.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
