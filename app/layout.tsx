import type { Metadata, Viewport } from 'next';
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
  title: 'Language Notebook｜英语与法语学习讲义',
  description:
    '六门英语与法语课程：完整课件、听写、逐句跟读、语法词汇和表达练习。学习笔记保存在本机。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${sans.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
