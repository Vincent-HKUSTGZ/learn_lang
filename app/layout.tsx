import type { Metadata } from 'next';
import { Noto_Sans_SC, Playfair_Display } from 'next/font/google';
import './globals.css';

const sans = Noto_Sans_SC({
  variable: '--font-sans-cn',
  subsets: ['latin'],
});

const display = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  icons: { icon: '/english/favicon.svg' },
  title: 'Little English｜每天听懂一点，开口多一点',
  description: '从 BBC 英语短片段开始，通过场景听写、逐句跟读、词汇与错题复习，把英语用进生活。进度本地保存。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${sans.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
