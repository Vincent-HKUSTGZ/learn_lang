'use client';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Headphones,
  Search,
  Sparkles,
  Bookmark,
  Check,
  Clock3,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { catalog } from '@/lib/english/catalog';
import { emptyState, readState, today } from '@/lib/english/storage';

export default function Home() {
  const [state, setState] = useState(emptyState);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('全部课程');
  useEffect(() => {
    setState(readState());
  }, []);
  const current = catalog.find((l) => l.id === state.lastLesson) || catalog[0];
  const correct = Object.values(state.lessons).reduce(
    (sum, p) => sum + p.mastered.length,
    0,
  );
  const mistakes = Object.values(state.lessons).reduce(
    (sum, p) => sum + p.mistakes.length,
    0,
  );
  const completed = Object.values(state.lessons).filter(
    (p) => p.completed.length === 6,
  ).length;
  const lessons = catalog.filter(
    (l) =>
      `${l.title} ${l.subtitle} ${l.topic} ${l.level}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === '全部课程' ||
        (filter === '零基础 A1' && l.level === 'A1') ||
        (filter === '进行中' &&
          (state.lessons[l.id]?.completed.length ?? 0) > 0 &&
          (state.lessons[l.id]?.completed.length ?? 0) < 6)),
  );
  return (
    <div className="english-app">
      <header className="site-header">
        <a className="brand" href="./">
          <span className="brand-icon">
            <Headphones size={23} />
          </span>{' '}
          Little English<span className="brand-dot">.</span>
        </a>
        <nav>
          <a className="active" href="#courses">
            课程书架
          </a>
          <a href={`./lesson/?id=${current.id}&mode=review`}>
            我的复习 <span className="nav-count">{mistakes}</span>
          </a>
        </nav>
        <span className="local-tag">
          <span /> 进度保存在这台设备
        </span>
      </header>
      <main className="home-main">
        <div className="welcome-row">
          <div>
            <p className="eyebrow">A LITTLE EVERY DAY</p>
            <h1>今天，也和英语熟一点。</h1>
            <p className="muted">
              一段真实对话，一点小进步。选一课，现在就开始。
            </p>
          </div>
          <div className="daily-pill">
            <span>🌱</span>
            <div>
              <b>
                {state.activity.includes(today())
                  ? '今天已练习'
                  : '今天的 15 分钟'}
              </b>
              <small>
                {state.activity.length
                  ? `已学习 ${state.activity.length} 天，继续积累`
                  : '从第一句话开始就很好'}
              </small>
            </div>
          </div>
        </div>
        <section className="dashboard-grid">
          <a className="continue-card" href={`./lesson/?id=${current.id}`}>
            <div>
              <span className="pill light">
                <span className="pulse-dot" />{' '}
                {state.lessons[current.id] ? '继续你的学习' : '推荐从这里开始'}
              </span>
              <h2>{current.title}</h2>
              <p>{current.goal}</p>
              <span className="continue-link">
                {state.lessons[current.id] ? '回到上次的位置' : '开始第一课'}{' '}
                <ArrowRight size={20} />
              </span>
            </div>
            <div className="hello-tile" aria-hidden="true">
              <span>hello!</span>
              <span>你好呀 👋</span>
              <small>small steps. real progress.</small>
            </div>
          </a>
          <div className="progress-card">
            <p className="eyebrow">YOUR LITTLE WINS</p>
            <h2>
              每一步，都算数 <Sparkles size={20} />
            </h2>
            <div className="stat-row">
              <div>
                <strong>
                  {completed}
                  <small>/3</small>
                </strong>
                <span>完成课程</span>
              </div>
              <div>
                <strong>{correct}</strong>
                <span>独立答对</span>
              </div>
              <div>
                <strong>{mistakes}</strong>
                <span>待复习题</span>
              </div>
            </div>
            <a
              href={`./lesson/?id=${current.id}&mode=review`}
              className="review-link"
            >
              <RotateCcw size={16} />{' '}
              {mistakes ? '把错过的，再听懂一次' : '复习学过的句子'}{' '}
              <ArrowRight size={16} />
            </a>
          </div>
        </section>
        <section id="courses" className="course-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">YOUR LEARNING SHELF</p>
              <h2>把生活，变成英语练习</h2>
            </div>
            <span className="muted">3 门完整课程 · 循序渐进</span>
          </div>
          <div className="library-toolbar">
            <div className="filter-group">
              {['全部课程', '零基础 A1', '进行中'].map((f) => (
                <Button
                  key={f}
                  variant="ghost"
                  className={filter === f ? 'filter active' : 'filter'}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
            <label className="search-box">
              <Search size={18} />
              <Input
                aria-label="搜索课程"
                placeholder="搜索话题、难度…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="course-grid">
            {lessons.map((l) => {
              const percent = Math.round(
                ((state.lessons[l.id]?.completed.length ?? 0) / 6) * 100,
              );
              return (
                <a
                  href={`./lesson/?id=${l.id}`}
                  className={`course-card ${l.color}`}
                  key={l.id}
                >
                  <div className="course-image">
                    <img
                      src={`./english/${l.id}.jpg`}
                      alt={`BBC Learning English：${l.sourceTitle}`}
                      loading="lazy"
                    />
                    <span className="course-number">{l.number}</span>
                    <span className="image-play">
                      <Headphones size={21} />
                    </span>
                    <span className="source-tag">BBC Learning English ↗</span>
                  </div>
                  <div className="course-body">
                    <div className="course-meta">
                      <span className={`level ${l.color}`}>{l.level}</span>
                      <span>{l.topic}</span>
                      <span className="duration">
                        <Clock3 size={14} />
                        {l.minutes} 分钟
                      </span>
                    </div>
                    <h3>{l.title}</h3>
                    <p className="course-subtitle">{l.subtitle}</p>
                    <p className="course-goal">{l.goal}</p>
                    <div className="course-footer">
                      <span>
                        {percent === 100 ? (
                          <>
                            <Check size={15} />
                            已完成
                          </>
                        ) : percent ? (
                          `已完成 ${percent}%`
                        ) : (
                          '精听 · 听写 · 跟读'
                        )}
                      </span>
                      <span className="card-action">
                        {percent ? '继续学习' : '开始学习'}{' '}
                        <ArrowRight size={16} />
                      </span>
                    </div>
                    <div className="tiny-progress">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
          {!lessons.length && (
            <div className="empty-state">
              <Search />
              <h3>这里暂时没有匹配的课程</h3>
              <p>试试其他关键词，或看看全部课程。</p>
              <Button
                onClick={() => {
                  setQuery('');
                  setFilter('全部课程');
                }}
              >
                查看全部课程
              </Button>
            </div>
          )}
        </section>
        <section className="method-strip">
          <span className="method-icon">
            <BookOpen size={25} />
          </span>
          <div>
            <h3>听懂一次，还要会用一次。</h3>
            <p>
              先盲听，再听写，最后把句子换成你的故事。答错的题会留下来，明天再见。
            </p>
          </div>
          <Bookmark size={24} />
        </section>
        <footer className="site-footer">
          <span>Little English. 每天一点，慢慢会说。</span>
          <span>独立学习项目 · 素材来源标注于课程内 · 无需登录</span>
        </footer>
      </main>
    </div>
  );
}
