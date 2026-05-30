import type { Metadata, Viewport } from 'next';

import { CapacitorRootProvider } from '@/components/capacitor/capacitor-root-provider';
import { ScrollToTopOnPathname } from '@/components/layout/scroll-to-top-on-pathname';
import { AppMessageDialog } from '@/components/ui/app-message-dialog';

import './globals.css';

export const metadata: Metadata = {
  title: 'Nutri Guard',
  description: 'Nutrition tracking application',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <CapacitorRootProvider>
          <ScrollToTopOnPathname />
          <AppMessageDialog />
          {children}
        </CapacitorRootProvider>
      </body>
    </html>
  );
}
