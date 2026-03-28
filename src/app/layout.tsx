import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LayoutContent } from '@/components/layout/LayoutContent';

const inter = Inter({ subsets: ['latin'] });

import { getStoreSettings } from '@/lib/db_extended';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    title: settings.storeName,
    description: `A responsive Point of Sale system built for ${settings.storeName} to simplify retail operations.`,
    icons: {
      icon: '/favicon.png',
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className}`} suppressHydrationWarning>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
