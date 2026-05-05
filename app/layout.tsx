import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ThemeSync } from '@/components/ThemeSync';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Alex Tutor — AI English Speaking Partner',
  description:
    'Practice English speaking with AI in real-time. Get instant grammar corrections, vocabulary upgrades, and fluency feedback powered by Gemini 2.0 Flash.',
  keywords: ['English learning', 'AI tutor', 'speaking practice', 'grammar correction', 'Gemini'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeSync />
      </head>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 dark:bg-[#0a0a0f] dark:text-white transition-colors duration-300`}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
