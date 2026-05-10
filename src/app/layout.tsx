import type { Metadata, Viewport } from 'next';

import { ScrollToTopOnPathname } from '@/components/layout/scroll-to-top-on-pathname';

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ScrollToTopOnPathname />
        {children}
      </body>
    </html>
  );
}
