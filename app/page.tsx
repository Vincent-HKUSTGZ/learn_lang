'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { handoutCatalog } from '@/lib/handouts/catalog';
export default function Home() {
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const [status, setStatus] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      if (localStorage.getItem('handout-language') === 'fr') setLanguage('fr');
    } catch {}
    const saved: Record<string, string> = {};
    for (const c of handoutCatalog) {
      try {
        const raw = localStorage.getItem(`language-handouts-v2:${c.id}`);
        if (raw) {
          const p = JSON.parse(raw);
          saved[c.id] =
            p?.done === true ? '✓ 精练已完成' : '继续学习 · 笔记已保存';
        }
      } catch {}
    }
    setStatus(saved);
  }, []);
  function choose(lang: 'en' | 'fr') {
    setLanguage(lang);
    try {
      localStorage.setItem('handout-language', lang);
    } catch {}
  }
  return (
    <div className="handout-app">
      <main className="simple-library">
        <header>
          <p className="library-brand">LANGUAGE NOTEBOOK</p>
          <h1>把语言，用在生活里。</h1>
          <p>选一种语言，打开一份讲义。从听懂，到自然地说出来。</p>
        </header>
        <div className="language-switch" aria-label="课程语言">
          <button aria-pressed={language === 'en'} onClick={() => choose('en')}>
            英语 <span>English</span>
          </button>
          <button aria-pressed={language === 'fr'} onClick={() => choose('fr')}>
            法语 <span>Français</span>
          </button>
        </div>
        <p className="library-count">
          {language === 'en' ? '英语' : '法语'} · 3 门课程 · 来自你的学习课件
        </p>
        <section
          className="simple-course-grid"
          aria-label={`${language === 'en' ? '英语' : '法语'}课程`}
        >
          {handoutCatalog
            .filter((c) => c.language === language)
            .map((c, index) => (
              <a
                key={c.id}
                href={`./lesson/?id=${c.id}`}
                className="simple-course"
              >
                <div className={`course-book-cover ${language}`}>
                  <BookOpen size={30} />
                  <span>{c.subtitle}</span>
                  <small>NOTEBOOK {String(index + 1).padStart(2, '0')}</small>
                </div>
                <div>
                  <p className="simple-course-meta">
                    {c.level} · {c.pages} 页课件
                  </p>
                  <h2>{c.title}</h2>
                  <p className="simple-course-english">{c.description}</p>
                  <footer>
                    <span>{status[c.id] ?? '打开讲义'}</span>
                    <ArrowRight size={17} />
                  </footer>
                </div>
              </a>
            ))}
        </section>
        <footer className="simple-library-footer">
          六份课件，两个语言书架。练习和笔记保存在当前浏览器，无需登录。
        </footer>
      </main>
    </div>
  );
}
