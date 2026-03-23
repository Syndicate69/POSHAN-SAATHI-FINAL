import type { Metadata, Viewport } from 'next';
import './globals.css'; // Global styles
import { ThemeProvider } from '../components/ThemeProvider';
import { LanguageProvider } from '../components/LanguageProvider';
import ReCaptchaWrapper from '../components/ReCaptchaWrapper';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { Inter, Outfit, Noto_Sans_Devanagari } from 'next/font/google';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['devanagari', 'latin'],
  variable: '--font-devanagari',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Poshan Saathi',
  description: 'Intelligent Nutrition Companion, An AI powered personal Nutrition Counselor.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Poshan Saathi',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${notoSansDevanagari.variable}`}>
      <body className="font-sans bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">
        <ThemeProvider>
          <LanguageProvider>
            <ReCaptchaWrapper>
              {children}
              <OfflineIndicator />
              <Toaster position="top-center" richColors />
            </ReCaptchaWrapper>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
