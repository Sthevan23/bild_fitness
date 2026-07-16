import type { Metadata } from 'next';
import { AppProviders } from '@/components/providers';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bild Fitness — ERP',
  description: 'ERP Bild Fitness · Hostinger (front estático + API)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
