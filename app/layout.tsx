import type { Metadata } from 'next';
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/AppProviders';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PyMentor AI — Python Programming Tutor & Interactive Sandbox',
  description:
    'An interactive AI Python programming tutor with structured explanations, line-by-line code walkthroughs, dry-run variable traces, guided practice, and an isolated Python 3 sandbox.',
  openGraph: {
    title: 'PyMentor AI — Python Programming Tutor & Interactive Sandbox',
    description:
      'An interactive AI Python programming tutor with structured explanations, line-by-line code walkthroughs, dry-run variable traces, guided practice, and an isolated Python 3 sandbox.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PyMentor AI — Python Programming Tutor & Interactive Sandbox',
    description:
      'Learn Python through structured reasoning, line-by-line walkthroughs, dry-run traces, and live code execution.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning className="min-h-screen antialiased selection:bg-[var(--accent-soft)] selection:text-[var(--ink)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--accent-ink)]"
        >
          Skip to main content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
