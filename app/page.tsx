'use client';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { catalog } from '@/lib/english/catalog';
import { emptyState, readState } from '@/lib/english/storage';
export default function Home() {
  const [state, setState] = useState(emptyState);
  useEffect(() => setState(readState()), []);
  return (
    <div className="handout-app">
      <main className="simple-library">
        <header>
          <p className="library-brand">LITTLE ENGLISH</p>
          <h1>跟着生活学英语</h1>
          <p>选一课，打开讲义，从上往下慢慢学。</p>
        </header>
        <section className="simple-course-grid" aria-label="全部课程">
          {catalog.map((c) => (
            <a
              key={c.id}
              href={`./lesson/?id=${c.id}`}
              className="simple-course"
            >
              <img src={`./english/${c.id}.jpg`} alt={c.sourceTitle} />
              <div>
                <p className="simple-course-meta">
                  讲义 {c.number} · {c.level} · {c.topic}
                </p>
                <h2>{c.title}</h2>
                <p className="simple-course-english">{c.subtitle}</p>
                <footer>
                  <span>
                    {state.lessons[c.id]?.completed.length === 6
                      ? '✓ 已学过'
                      : state.lessons[c.id]
                        ? '上次的笔记已保存'
                        : '中文预习 · 听写 · 精讲'}
                  </span>
                  <ArrowRight size={17} />
                </footer>
              </div>
            </a>
          ))}
        </section>
        <footer className="simple-library-footer">
          <span>学习笔记与答案保存在当前浏览器，无需登录。</span>
          <a href={`./lesson/?id=${state.lastLesson}&mode=review`}>
            学习记录与备份 →
          </a>
        </footer>
      </main>
    </div>
  );
}
