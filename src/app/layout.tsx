import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import ClientProviders from '@/components/client-providers';
import { Navbar } from '@/components/navbar';

// Force all routes dynamic
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Manifest', template: '%s | Manifest' },
  description: "Web3 intent board — declare what you're building toward and find the people who make it real.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://manifest.xyz'),
  openGraph: {
    type: 'website',
    siteName: 'Manifest',
    title: 'Manifest — Web3 Intent Board',
    description: "Declare what you're building toward. Find verified Web3 partners, investors, and builders.",
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manifest — Web3 Intent Board',
    description: "Declare what you're building toward. Find verified Web3 partners, investors, and builders.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-surface-page text-white font-sans antialiased">
        <ClientProviders>
          <Navbar />
          {children}
        </ClientProviders>
        <Toaster theme="dark" richColors />
      </body>
    </html>
  );
}
