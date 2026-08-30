import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '地道法语积累005｜Le jardin est si joli',
  description: '跟着 ella entwistle 的花园 Vlog 完成盲听、10 题听写、逐句精听、语法词汇与口语输出。',
};

export default function LessonLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
