import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nutri Guard',
  description: 'Nutrition tracking application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
