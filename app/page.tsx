'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Headphones,
  Play,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const lessons = [
  { id: '005', title: '地道法语积累005', french: 'Le jardin est si joli', creator: 'ella entwistle', level: '初级', topic: '法国乡村生活', minutes: 13, progress: 0, accent: 'from-[#d8c3df] via-[#8c75a6] to-[#51476d]', art: '🌿' },
];

const filters = ['全部', '初级'];

export default function Home() {
  const [activeFilter, setActiveFilter] = useState('全部');
  const [query, setQuery] = useState('');
  const [localProgress, setLocalProgress] = useState(0);
  useEffect(() => {
    const stored = window.localStorage.getItem('fr-vlog-lesson-01');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { completed?: string[] };
      setLocalProgress(Math.round(((parsed.completed?.length ?? 0) / 6) * 100));
    } catch {
      setLocalProgress(0);
    }
  }, []);
  const filteredLessons = useMemo(() => lessons.filter((lesson) => {
    const matchesLevel = activeFilter === '全部' || lesson.level === activeFilter;
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || `${lesson.title} ${lesson.french} ${lesson.creator} ${lesson.topic}`.toLowerCase().includes(needle);
    return matchesLevel && matchesQuery;
  }), [activeFilter, query]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-[#102c3d]/10 bg-[#f8f3e8]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <a href="#top" className="flex items-center gap-3" aria-label="法语，正在发生 首页">
            <span className="grid size-10 place-items-center rounded-full bg-[#123b50] font-serif text-lg italic text-white shadow-sm">Fr</span>
            <span><span className="block text-[15px] font-bold tracking-[0.12em] text-[#123b50]">法语，正在发生</span><span className="hidden text-[10px] uppercase tracking-[0.22em] text-[#6f796f] sm:block">Le français en vrai</span></span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#5c665f] md:flex" aria-label="主导航">
            <a className="text-[#c74438]" href="#courses">课程库</a><a className="transition hover:text-[#123b50]" href="#path">学习路径</a><a className="transition hover:text-[#123b50]" href="#review">复习本</a>
          </nav>
          <div className="flex items-center gap-2"><Button variant="ghost" className="hidden rounded-full text-[#123b50] sm:inline-flex">登录</Button><Button className="h-10 rounded-full bg-[#c74438] px-5 text-white shadow-[0_8px_24px_rgba(199,68,56,.22)] hover:bg-[#ad382f]">继续学习</Button></div>
        </div>
      </header>

      <section id="top" className="relative overflow-hidden border-b border-[#102c3d]/10">
        <div className="absolute inset-x-0 top-0 h-full opacity-10"><img src="./course-library-reference.png" alt="" className="h-full w-full object-cover object-top" /></div>
        <div className="paper-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-[1440px] gap-9 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-12 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c74438]/20 bg-white/65 px-3 py-1.5 text-xs font-semibold tracking-wide text-[#a8342c] shadow-sm backdrop-blur"><Sparkles className="size-3.5" /> 每天 15 分钟，听懂真实法语</div>
            <h1 className="font-display text-balance text-[clamp(3rem,7vw,6.6rem)] leading-[.88] tracking-[-0.055em] text-[#123b50]">别只背单词，<br /><span className="text-[#c74438]">去听法国人说话。</span></h1>
            <p className="mt-7 max-w-2xl text-pretty text-base leading-8 text-[#4d5b55] sm:text-lg">从 YouTube Vlog 里学习真正会用到的法语。先猜、再听、再跟读，最后把一句话变成你自己的表达。</p>
            <div className="mt-9 flex flex-wrap items-center gap-3"><Button className="h-12 rounded-full bg-[#123b50] px-6 text-white hover:bg-[#0c2c3d]" onClick={() => document.querySelector('#courses')?.scrollIntoView({ behavior: 'smooth' })}><Play className="size-4 fill-current" /> 开始第一课</Button><span className="ml-2 text-sm text-[#6c756f]">无需注册 · 进度保存在本机</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px] self-end lg:mx-0 lg:justify-self-end">
            <div className="rotate-[-1.5deg] rounded-[26px] border border-[#123b50]/15 bg-[#fffdf7] p-3 shadow-[0_28px_80px_rgba(18,59,80,.16)]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-gradient-to-br from-[#bfd1d8] to-[#486a75]">
                <img src="./course-library-reference.png" alt="法语 Vlog 课程示例" className="h-full w-full scale-[1.7] object-cover object-[20%_76%] mix-blend-multiply" /><div className="absolute inset-0 bg-gradient-to-t from-[#123b50]/85 via-transparent to-transparent" />
                <button type="button" className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full border border-white/50 bg-white/90 text-[#c74438] shadow-xl transition hover:scale-105" aria-label="播放课程预览"><Play className="ml-1 size-6 fill-current" /></button>
                  <div className="absolute inset-x-5 bottom-5 text-white"><p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-white/70">本期慢速 Vlog</p><p className="font-display text-2xl">Le jardin est si joli</p></div>
              </div>
              <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-4"><div><p className="text-sm font-bold text-[#123b50]">当前只有这一门完整课程</p><p className="mt-1 text-xs text-[#718078]">含盲听、10 题听写、精讲与口语输出</p></div><Volume2 className="size-5 text-[#c74438]" /></div>
            </div>
            <span className="absolute -right-3 -top-4 rotate-6 rounded-sm bg-[#f3c956] px-4 py-2 text-sm font-bold text-[#123b50] shadow-sm">Bon courage !</span>
          </div>
        </div>
      </section>

      <section id="courses" className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-[#c74438]">Vlog immersion</p><h2 className="font-display text-4xl tracking-tight text-[#123b50] sm:text-5xl">选择一个真实场景</h2><p className="mt-3 text-sm leading-6 text-[#67716b]">每一课都从“我想听懂”开始，以“我能说出来”结束。</p></div><div className="relative w-full lg:max-w-sm"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7e8982]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索场景、博主或主题" className="h-12 rounded-full border-[#123b50]/15 bg-white/75 pl-11 pr-4 shadow-sm focus-visible:border-[#c74438]/40 focus-visible:ring-[#c74438]/10" /></div></div>
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="按级别筛选课程">{filters.map((filter) => <Button key={filter} variant={activeFilter === filter ? 'default' : 'outline'} onClick={() => setActiveFilter(filter)} className={activeFilter === filter ? 'h-9 rounded-full bg-[#123b50] px-4 text-white' : 'h-9 rounded-full border-[#123b50]/15 bg-transparent px-4 text-[#56625b]'}>{filter}</Button>)}</div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredLessons.map((lesson) => (
            <article key={lesson.id} className="group overflow-hidden rounded-[24px] border border-[#123b50]/10 bg-[#fffdf8] shadow-[0_12px_34px_rgba(18,59,80,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(18,59,80,.12)]">
              <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${lesson.accent}`}><div className="paper-grain absolute inset-0 opacity-25" /><span className="absolute -bottom-5 right-6 select-none text-[7.5rem] leading-none drop-shadow-xl transition duration-500 group-hover:scale-110 group-hover:-rotate-3">{lesson.art}</span><span className="absolute left-5 top-5 font-display text-6xl italic text-white/25">{lesson.id}</span><div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4"><div className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-[#123b50] shadow-sm backdrop-blur">{lesson.creator}</div><div className="grid size-11 place-items-center rounded-full bg-[#fffdf8] text-[#c74438] shadow-lg"><Play className="ml-0.5 size-4 fill-current" /></div></div></div>
              <div className="p-5"><div className="flex items-center gap-2 text-xs text-[#6f7b74]"><Badge variant="outline" className="border-[#c74438]/20 bg-[#c74438]/5 text-[#b23931]">{lesson.level}</Badge><span>{lesson.topic}</span><span>·</span><span>{lesson.minutes} 分钟</span></div><h3 className="mt-4 text-xl font-bold tracking-tight text-[#123b50]">{lesson.title}</h3><p className="mt-1 font-display text-lg italic text-[#68756e]">{lesson.french}</p><div className="mt-5 flex items-center justify-between border-t border-[#123b50]/10 pt-4">{localProgress ? <div className="flex min-w-0 flex-1 items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#123b50]/10"><div className="h-full rounded-full bg-[#c74438]" style={{ width: `${localProgress}%` }} /></div><span className="text-xs font-bold text-[#c74438]">{localProgress}%</span></div> : <span className="flex items-center gap-1.5 text-xs text-[#718078]"><Clock3 className="size-3.5" /> 约 {lesson.minutes} 分钟</span>}<a href="./lesson/" className="ml-4 inline-flex items-center gap-1 text-sm font-bold text-[#123b50] transition group-hover:text-[#c74438]">{localProgress ? '继续' : '开始'} <ArrowRight className="size-4" /></a></div></div>
            </article>
          ))}
          <aside className="grid min-h-[390px] place-items-center rounded-[24px] border border-dashed border-[#123b50]/20 bg-white/30 p-8 text-center">
            <div><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#123b50]/8 text-xl">＋</span><h3 className="mt-5 font-display text-2xl text-[#123b50]">下一课，由你决定</h3><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#718078]">以后把想学的关键词或 YouTube URL 发给我，我会按同样的完整学习流程更新内容。</p></div>
          </aside>
        </div>
        {filteredLessons.length === 0 && <div className="mt-8 rounded-[24px] border border-dashed border-[#123b50]/20 bg-white/50 p-12 text-center"><p className="font-display text-2xl text-[#123b50]">没有找到对应课程</p><p className="mt-2 text-sm text-[#708078]">换一个关键词，或者查看全部级别。</p></div>}
      </section>

      <section id="path" className="border-y border-[#123b50]/10 bg-[#123b50] text-white"><div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:px-12 lg:py-18"><div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#f3c956]">A tiny ritual</p><h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">一支 Vlog，<br />四遍听懂。</h2></div><ol className="grid gap-4 sm:grid-cols-2">{[[BookOpen, '先猜意思', '浏览中文情境，用你会的法语先说一遍。'], [Headphones, '盲听抓词', '不开字幕，只捕捉你真正听到的声音。'], [Volume2, '逐句跟读', '点一句、听一句，录下自己的声音对比。'], [Check, '带走表达', '用今天的句型，写一句关于自己的话。']].map(([Icon, title, copy], index) => { const StepIcon = Icon as typeof BookOpen; return <li key={title as string} className="rounded-[20px] border border-white/12 bg-white/7 p-5"><div className="flex items-center justify-between"><StepIcon className="size-5 text-[#f3c956]" /><span className="font-display text-lg italic text-white/40">0{index + 1}</span></div><h3 className="mt-5 font-bold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-white/65">{copy as string}</p></li>; })}</ol></div></section>

      <footer className="bg-[#f8f3e8] px-5 py-8 text-[#647069] sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 text-xs sm:flex-row sm:items-center"><span>Le français en vrai · 为中文母语者设计的法语听力课</span><span>真实语境 · 小步练习 · 温柔坚持</span></div></footer>
    </main>
  );
}
