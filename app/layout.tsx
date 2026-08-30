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
  title: '法语，正在发生｜从真实 Vlog 学会开口',
  description: '为中文母语初学者设计的沉浸式法语学习网站：真实 Vlog、逐句听力、听写、跟读、词汇与文化。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${sans.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
