import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: { default: 'Manifest', template: '%s | Manifest' },
  description: "Web3 intent board — declare what you're building toward and find the people who make it real.",
  metadataBase: new URL('https://manifest-bondmans-projects.vercel.app'),
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Suppress Privy async errors before any JS runs */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.__privyErrSuppressed = false;
          window.addEventListener('unhandledrejection', function(e) {
            var msg = (e.reason && e.reason.message) ? e.reason.message : String(e.reason || '');
            if (msg.indexOf('Privy') !== -1 || msg.indexOf('privy') !== -1 || msg.indexOf('app ID') !== -1) {
              e.preventDefault();
              window.__privyErrSuppressed = true;
            }
          });
          window.addEventListener('error', function(e) {
            var msg = e.message || '';
            if (msg.indexOf('Privy') !== -1 || msg.indexOf('privy') !== -1 || msg.indexOf('app ID') !== -1) {
              e.preventDefault();
              return true;
            }
          });
        `}} />
      </head>
      <body className="min-h-full flex flex-col bg-[#080810] text-white font-sans antialiased">
        <AppShell>
          {children}
        </AppShell>
        <Toaster theme="dark" richColors />
      </body>
    </html>
  );
}
