'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  ChevronRight,
  CirclePlay,
  ExternalLink,
  Headphones,
  Lightbulb,
  Mic2,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const steps = [
  ['context', '先说一遍'],
  ['blind', '盲听抓词'],
  ['dictation', '听写挑战'],
  ['transcript', '逐句精听'],
  ['notes', '表达笔记'],
  ['speak', '开口带走'],
];

const transcript = [
  { fr: 'Le jardin est si joli. Je vais quand même vous le montrer.', zh: '花园太漂亮了，我还是想给你们看看。', focus: 'quand même' },
  { fr: "L'arbre qui est au-dessus de moi est un pommier et là-bas il y a un cerisier.", zh: '我头顶上这棵是苹果树，那边有一棵樱桃树。', focus: 'au-dessus de moi' },
  { fr: "À l'autre côté, on a beaucoup de framboisiers, mais c'est trop tôt dans l'année pour avoir des framboises.", zh: '另一边种着许多覆盆子，不过现在还太早，还没有果子。', focus: "c'est trop tôt" },
  { fr: "On aura plein de framboises dans l'été et elles sont délicieuses.", zh: '夏天我们会有很多覆盆子，而且特别美味。', focus: 'plein de' },
  { fr: "Elles sont meilleures que celles qu'on achète au supermarché.", zh: '它们比超市买的好吃多了。', focus: 'meilleures que' },
  { fr: 'Et on a tellement de fleurs différentes.', zh: '我们还种了好多不同的花。', focus: 'tellement de' },
  { fr: "J'ai une tasse de thé vert et un morceau de gâteau aux carottes qui est un de mes gâteaux préférés.", zh: '我喝着一杯绿茶，吃着一块胡萝卜蛋糕，这是我最喜欢的蛋糕之一。', focus: 'un de mes gâteaux préférés' },
  { fr: "J'ai aussi mon livre qui s'appelle Wool.", zh: '我还带着一本叫《Wool》的书。', focus: "qui s'appelle" },
  { fr: "C'est un genre de roman de science-fiction ou dystopique et je suis accro.", zh: '这是一本科幻或反乌托邦类型的小说，我已经看上瘾了。', focus: 'je suis accro' },
];

const blanks = [
  { before: 'Je vais', answer: 'quand même', after: 'vous le montrer.', hint: '还是／尽管如此' },
  { before: "L'arbre qui est", answer: 'au-dessus de moi', after: 'est un pommier.', hint: '在我的上方' },
  { before: 'Et', answer: 'là-bas', after: 'il y a un cerisier.', hint: '那边' },
  { before: "À l'autre côté, on a beaucoup de framboisiers, mais", answer: "c'est trop tôt dans l'année", after: 'pour avoir des framboises.', hint: '现在一年中还太早' },
  { before: 'On aura', answer: 'plein de framboises', after: "dans l'été et elles sont délicieuses.", hint: '很多覆盆子' },
  { before: 'Elles sont', answer: "meilleures que celles qu'on achète au supermarché", after: '.', hint: '比超市买的更好吃' },
  { before: 'Et on a', answer: 'tellement de fleurs différentes', after: '.', hint: '这么多不同的花' },
  { before: "J'ai une tasse de thé vert et un morceau de gâteau aux carottes qui est", answer: 'un de mes gâteaux préférés', after: '.', hint: '我最喜欢的蛋糕之一' },
  { before: "J'ai aussi mon livre qui s'appelle Wool. C'est", answer: 'un genre de roman de science-fiction ou dystopique', after: '.', hint: '一种科幻或反乌托邦小说' },
  { before: 'Et je suis', answer: 'accro', after: '.', hint: '上瘾了／着迷了' },
];

const vocab = [
  { word: 'délicieux · délicieuse', ipa: '[de.li.sjø · de.li.sjøz]', zh: '美味的；令人愉快的', example: 'Ce gâteau est délicieux.' },
  { word: 'un pommier', ipa: '[œ̃ pɔ.mje]', zh: '苹果树', example: 'Il y a un pommier dans le jardin.' },
  { word: 'une framboise', ipa: '[yn fʁɑ̃.bwaz]', zh: '覆盆子', example: "J'adore les framboises fraîches." },
  { word: 'accro', ipa: '[a.kʁo]', zh: '上瘾的；着迷的（口语）', example: 'Je suis accro à cette série.' },
];

function normalize(value: string) {
  return value.toLocaleLowerCase('fr').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export default function LessonPage() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [videoVisible, setVideoVisible] = useState(false);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [speechMessage, setSpeechMessage] = useState('');
  const [dictationPlaying, setDictationPlaying] = useState(false);
  const [dictationProgress, setDictationProgress] = useState(0);
  const [dictationCurrentTime, setDictationCurrentTime] = useState(0);
  const [dictationDuration, setDictationDuration] = useState(35.4);
  const [dictationPlaybackRate, setDictationPlaybackRate] = useState(0.8);
  const [answers, setAnswers] = useState<string[]>(() => blanks.map(() => ''));
  const [checked, setChecked] = useState(false);
  const [showChinese, setShowChinese] = useState(true);
  const [speakingDraft, setSpeakingDraft] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const speechRunId = useRef(0);
  const dictationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem('fr-vlog-lesson-01');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { completed?: string[]; speakingDraft?: string };
      setCompleted(parsed.completed ?? []);
      setSpeakingDraft(parsed.speakingDraft ?? '');
    } catch {
      // A malformed local preference should never block the lesson.
    }
  }, []);

  useEffect(() => () => {
    speechRunId.current += 1;
    window.speechSynthesis?.cancel();
    dictationAudioRef.current?.pause();
  }, []);

  const progress = Math.round((completed.length / steps.length) * 100);
  const score = useMemo(() => answers.filter((answer, index) => normalize(answer) === normalize(blanks[index].answer)).length, [answers]);

  function markComplete(id: string) {
    const next = completed.includes(id) ? completed : [...completed, id];
    setCompleted(next);
    window.localStorage.setItem('fr-vlog-lesson-01', JSON.stringify({ completed: next, speakingDraft }));
  }

  function saveSpeaking() {
    const next = completed.includes('speak') ? completed : [...completed, 'speak'];
    setCompleted(next);
    window.localStorage.setItem('fr-vlog-lesson-01', JSON.stringify({ completed: next, speakingDraft }));
    setSavedMessage('已保存到你的本地复习本 ✓');
    window.setTimeout(() => setSavedMessage(''), 2600);
  }

  function speakFrench(text: string, key: string, rate = 0.82, restart = false) {
    if (!('speechSynthesis' in window)) {
      setSpeechMessage('当前浏览器不支持机器朗读，请尝试 Chrome、Safari 或 Edge。');
      return;
    }

    if (speakingKey === key && !restart) {
      speechRunId.current += 1;
      window.speechSynthesis.cancel();
      setSpeakingKey(null);
      setSpeechMessage('已停止朗读');
      return;
    }

    dictationAudioRef.current?.pause();
    setDictationPlaying(false);
    const runId = speechRunId.current + 1;
    speechRunId.current = runId;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const frenchVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('fr'));
    utterance.lang = 'fr-FR';
    utterance.rate = rate;
    utterance.pitch = 1;
    if (frenchVoice) utterance.voice = frenchVoice;
    utterance.onend = () => {
      if (speechRunId.current !== runId) return;
      setSpeakingKey(null);
      setSpeechMessage('朗读完成');
    };
    utterance.onerror = () => {
      if (speechRunId.current !== runId) return;
      setSpeakingKey(null);
      setSpeechMessage('朗读没有成功，请检查设备音量后重试。');
    };
    setSpeakingKey(key);
    setSpeechMessage(key === 'dictation' ? '正在播放慢速法语听写' : '正在朗读这一句');
    window.speechSynthesis.speak(utterance);
  }

  async function toggleDictationAudio(restart = false) {
    const audio = dictationAudioRef.current;
    if (!audio) return;

    speechRunId.current += 1;
    window.speechSynthesis?.cancel();
    setSpeakingKey(null);

    if (!restart && !audio.paused) {
      audio.pause();
      setDictationPlaying(false);
      setSpeechMessage('听写音频已暂停');
      return;
    }

    if (restart) audio.currentTime = 0;
    audio.playbackRate = dictationPlaybackRate;
    try {
      await audio.play();
      setDictationPlaying(true);
      setSpeechMessage(`正在播放 ${dictationPlaybackRate === 0.8 ? '入门超慢速' : '慢速'}法语听写`);
    } catch {
      setDictationPlaying(false);
      setSpeechMessage('音频没有成功播放，请检查设备音量后重试。');
    }
  }

  function changeDictationRate(rate: number) {
    setDictationPlaybackRate(rate);
    if (dictationAudioRef.current) dictationAudioRef.current.playbackRate = rate;
  }

  return (
    <main className="min-h-screen bg-[#f8f3e8] text-[#153545]">
      <header className="sticky top-0 z-50 border-b border-[#123b50]/10 bg-[#f8f3e8]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1500px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <a href="../" className="inline-flex items-center gap-2 text-sm font-bold text-[#123b50]"><ArrowLeft className="size-4" /> 返回课程库</a>
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 md:flex"><span className="truncate text-sm font-bold">005 · 地道法语积累005</span><Badge variant="outline" className="border-[#c74438]/20 bg-[#c74438]/5 text-[#b23931]">初级</Badge></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-[11px] font-bold text-[#c74438]">{progress}% 完成</p><div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[#123b50]/10"><div className="h-full bg-[#c74438] transition-all" style={{ width: `${progress}%` }} /></div></div><Button variant="outline" className="rounded-full border-[#123b50]/15 bg-white/50">我的笔记 <NotebookPen className="size-4" /></Button></div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#123b50]/10 bg-[#123b50] text-white">
        <div className="paper-grid absolute inset-0 opacity-15" />
        <div className="relative mx-auto grid max-w-[1500px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_auto] lg:px-12 lg:py-16">
          <div><div className="flex flex-wrap gap-2"><Badge className="bg-[#f3c956] text-[#123b50]">初级 · A1–A2</Badge><Badge variant="outline" className="border-white/20 text-white">法国乡村生活</Badge><Badge variant="outline" className="border-white/20 text-white">13 分钟</Badge></div><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#f3c956]">ella entwistle · Vlog immersion</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">地道法语积累005</h1><p className="mt-2 font-display text-2xl italic text-white/70 sm:text-3xl">Le jardin est si joli</p><p className="mt-6 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">跟着博主参观春天的法国乡村花园，听她介绍苹果树、樱桃树、覆盆子、花朵、下午茶与正在读的小说。</p></div>
          <div className="self-end rounded-[22px] border border-white/10 bg-white/8 p-5 backdrop-blur sm:min-w-[285px]"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/55">本课目标</p><ul className="mt-4 space-y-3 text-sm">{['听懂 9 句自然表达', '完成 10 题听写挑战', '掌握语法、短语与词汇', '完成 1 次开口输出'].map((item) => <li key={item} className="flex items-center gap-2"><Check className="size-4 text-[#f3c956]" /> {item}</li>)}</ul></div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[235px_minmax(0,1fr)] lg:px-12">
        <aside className="hidden lg:block"><nav className="sticky top-28 space-y-1 rounded-[20px] border border-[#123b50]/10 bg-white/45 p-3" aria-label="课程步骤">{steps.map(([id, label], index) => <a key={id} href={`#${id}`} className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#66736c] transition hover:bg-white/70 hover:text-[#123b50]"><span className={`grid size-7 place-items-center rounded-full text-[11px] font-bold ${completed.includes(id) ? 'bg-[#4c8a6c] text-white' : 'bg-[#123b50]/8 text-[#123b50]'}`}>{completed.includes(id) ? <Check className="size-3.5" /> : index + 1}</span>{label}<ChevronRight className="ml-auto size-3.5 opacity-0 transition group-hover:opacity-100" /></a>)}</nav></aside>

        <div className="min-w-0 space-y-8">
          <LessonSection id="context" number="01" eyebrow="Warm up" title="先用你会的法语说一遍" description="不要追求完美。把中文情境变成最简单的法语，是建立表达回路的第一步。" done={completed.includes('context')} onDone={() => markComplete('context')}>
            <div className="rounded-[20px] border border-[#123b50]/10 bg-[#fffdf8] p-5 sm:p-7"><p className="text-sm font-bold text-[#c74438]">情境</p><p className="mt-3 text-lg leading-8 text-[#273f48]">“春天的花园很漂亮。你想带大家看看头顶的苹果树、远处的樱桃树，以及夏天会结满果实的覆盆子。”</p><Textarea className="mt-5 min-h-28 rounded-2xl border-[#123b50]/15 bg-white/70 p-4 text-base leading-7" placeholder="试着写下来：Le jardin est si joli. Je vais…" /><p className="mt-3 flex items-center gap-2 text-xs text-[#748078]"><Lightbulb className="size-3.5 text-[#d49b2a]" /> 不会完整表达也没关系，先把会的词拼起来。</p></div>
          </LessonSection>

          <LessonSection id="blind" number="02" eyebrow="Listen" title="第一遍：关掉字幕，只抓关键词" description="不用每个词都听懂。先判断人物、地点和发生了什么。" done={completed.includes('blind')} onDone={() => markComplete('blind')}>
            <div className="overflow-hidden rounded-[22px] border border-[#123b50]/10 bg-[#0d2532] shadow-[0_20px_50px_rgba(18,59,80,.14)]">
              <div className="relative aspect-video">
                {videoVisible ? <iframe className="absolute inset-0 h-full w-full" src="https://www.youtube-nocookie.com/embed/sRsyn7P3wKA?rel=0" title="法语 Vlog 原视频" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_35%,#6f947f,transparent_35%),linear-gradient(135deg,#254e62,#0d2532)]"><div className="paper-grain absolute inset-0 opacity-25" /><button type="button" onClick={() => setVideoVisible(true)} className="absolute inset-0 m-auto grid size-20 place-items-center rounded-full border border-white/40 bg-white/90 text-[#c74438] shadow-2xl transition hover:scale-105" aria-label="播放无字幕视频"><Play className="ml-1 size-8 fill-current" /></button><div className="absolute inset-x-6 bottom-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-white/50">Listen without subtitles</p><p className="mt-2 text-xl font-bold text-white">先别看字幕，给耳朵一次机会</p></div></div>}
              </div>
              <div className="flex flex-col justify-between gap-3 border-t border-white/10 px-5 py-4 text-white sm:flex-row sm:items-center"><span className="flex items-center gap-2 text-sm text-white/70"><Headphones className="size-4 text-[#f3c956]" /> 建议戴耳机，播放 0:00–1:03</span><a href="https://youtu.be/sRsyn7P3wKA" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f3c956]">打开原视频 <ExternalLink className="size-3.5" /></a></div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">{['她在哪里？', '她提到了哪些食物？', '她的语气是什么？'].map((question) => <div key={question} className="rounded-2xl border border-[#123b50]/10 bg-white/55 p-4 text-sm font-bold text-[#506059]">{question}</div>)}</div>
          </LessonSection>

          <LessonSection id="dictation" number="03" eyebrow="Dictation" title="第二遍：听声音，把词补回来" description="输入不区分大小写。先听三遍，再看中文提示。" done={completed.includes('dictation')} onDone={() => markComplete('dictation')}>
            <div className="rounded-[22px] border border-[#123b50]/10 bg-[#fffdf8] p-5 sm:p-7">
              <audio
                ref={dictationAudioRef}
                src="../dictation-005.wav"
                preload="metadata"
                onLoadedMetadata={(event) => setDictationDuration(event.currentTarget.duration)}
                onTimeUpdate={(event) => {
                  const audio = event.currentTarget;
                  setDictationCurrentTime(audio.currentTime);
                  setDictationProgress(audio.duration ? Math.min(100, (audio.currentTime / audio.duration) * 100) : 0);
                }}
                onPlay={() => setDictationPlaying(true)}
                onPause={() => setDictationPlaying(false)}
                onEnded={() => {
                  setDictationPlaying(false);
                  setDictationProgress(100);
                  setSpeechMessage('整段听写播放完成，可以逐题再听一遍。');
                }}
              />
              <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[#123b50] px-4 py-3 text-white">
                <button type="button" onClick={() => toggleDictationAudio()} className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#c74438]" aria-label={dictationPlaying ? '暂停听写音频' : '播放听写音频'}>{dictationPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}</button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold">本地法语听写 · 10 题</p><span className="shrink-0 text-[10px] tabular-nums text-white/60">{formatAudioTime(dictationCurrentTime)} / {formatAudioTime(dictationDuration)}</span></div>
                  <p className="mt-1 truncate text-[11px] text-white/55">内容已按原视频顺序核对 · 开头为 Le jardin est si joli</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#f3c956] transition-[width] duration-150" style={{ width: `${dictationProgress}%` }} /></div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => toggleDictationAudio(true)} className="shrink-0 rounded-full text-white hover:bg-white/10" aria-label="从头重新播放听写"><RotateCcw className="size-4" /></Button>
              </div>
              <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-[#123b50]/10 bg-[#f3eee4] px-4 py-3 sm:flex-row sm:items-center">
                <div><p className="text-xs font-bold text-[#123b50]">听不清时，先选“入门超慢速”，再用每题右侧喇叭反复听。</p><p className="mt-1 text-[11px] text-[#718078]">整段大意：她在花园里介绍果树、覆盆子、花、下午茶和正在读的书。</p></div>
                <div className="flex shrink-0 gap-2" role="group" aria-label="听写播放速度">
                  {[{ value: 0.8, label: '0.8× 入门' }, { value: 1, label: '1× 慢速' }].map((option) => <Button key={option.value} type="button" size="sm" variant="outline" onClick={() => changeDictationRate(option.value)} className={`rounded-full ${dictationPlaybackRate === option.value ? 'border-[#c74438] bg-[#c74438] text-white hover:bg-[#ad382f]' : 'border-[#123b50]/15 bg-white text-[#123b50]'}`}>{option.label}</Button>)}
                </div>
              </div>
              {speechMessage && <p className="mb-5 rounded-xl bg-[#123b50]/6 px-4 py-2 text-xs font-medium text-[#52645b]" aria-live="polite">{speechMessage}</p>}
              <div className="space-y-5">{blanks.map((blank, index) => { const isCorrect = normalize(answers[index]) === normalize(blank.answer); const sentence = `${blank.before} ${blank.answer} ${blank.after}`; const itemKey = `dictation-item-${index}`; return <div key={blank.answer} className="rounded-2xl border border-[#123b50]/10 bg-white/70 p-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-3 text-base leading-8"><span>{index + 1}.</span><span>{blank.before}</span><Input value={answers[index]} onChange={(event) => { const next = [...answers]; next[index] = event.target.value; setAnswers(next); setChecked(false); }} aria-label={`第 ${index + 1} 空`} className={`h-10 w-full rounded-xl sm:w-64 ${checked ? isCorrect ? 'border-[#4c8a6c] bg-[#4c8a6c]/5' : 'border-[#c74438] bg-[#c74438]/5' : 'border-[#123b50]/15'}`} /><span>{blank.after}</span>{checked && <span className={`text-xs font-bold ${isCorrect ? 'text-[#4c8a6c]' : 'text-[#c74438]'}`}>{isCorrect ? '正确 ✓' : `答案：${blank.answer}`}</span>}</div><p className="mt-2 text-xs text-[#7a857f]">提示：{blank.hint}</p></div><button type="button" onClick={() => speakFrench(sentence, itemKey, 0.7)} className={`grid size-9 shrink-0 place-items-center rounded-full border transition ${speakingKey === itemKey ? 'border-[#c74438] bg-[#c74438] text-white' : 'border-[#123b50]/10 bg-white text-[#c74438] hover:border-[#c74438]/30'}`} aria-label={speakingKey === itemKey ? `停止第 ${index + 1} 题朗读` : `慢速朗读第 ${index + 1} 题`}>{speakingKey === itemKey ? <Pause className="size-3.5 fill-current" /> : <Volume2 className="size-3.5" />}</button></div></div>; })}</div>
              <div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={() => setChecked(true)} className="h-10 rounded-full bg-[#c74438] px-5 text-white hover:bg-[#ad382f]">检查答案</Button><Button variant="ghost" onClick={() => { setAnswers(blanks.map((blank) => blank.answer)); setChecked(true); }} className="rounded-full text-[#123b50]">显示答案</Button>{checked && <span className="ml-auto text-sm font-bold text-[#123b50]">{score} / {blanks.length} 题正确</span>}</div>
            </div>
          </LessonSection>

          <LessonSection id="transcript" number="04" eyebrow="Line by line" title="第三遍：逐句听懂，跟着节奏读" description="点击每句右侧的喇叭，听法语机器朗读；彩色语块是本课要带走的表达。" done={completed.includes('transcript')} onDone={() => markComplete('transcript')}>
            <div className="overflow-hidden rounded-[22px] border border-[#123b50]/10 bg-[#fffdf8]"><div className="flex items-center justify-between border-b border-[#123b50]/10 px-5 py-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#738078]">完整文本 · {transcript.length} 句</p><Button variant="outline" size="sm" onClick={() => setShowChinese(!showChinese)} className="rounded-full border-[#123b50]/15 bg-white/70">{showChinese ? '隐藏中文' : '显示中文'}</Button></div><div>{transcript.map((line, index) => { const lineKey = `line-${index}`; return <div key={line.fr} className="group grid w-full grid-cols-[38px_minmax(0,1fr)_40px] items-start gap-3 border-b border-[#123b50]/8 px-5 py-5 text-left last:border-0 hover:bg-[#f4eee2]"><span className="grid size-8 place-items-center rounded-full bg-[#123b50]/7 text-xs font-bold text-[#123b50] group-hover:bg-[#c74438] group-hover:text-white">{String(index + 1).padStart(2, '0')}</span><span><span className="block text-base leading-8 text-[#233e49] sm:text-lg">{highlightFocus(line.fr, line.focus)}</span>{showChinese && <span className="mt-2 block text-sm leading-6 text-[#748079]">{line.zh}</span>}</span><button type="button" onClick={() => speakFrench(line.fr, lineKey, 0.84)} className={`grid size-10 place-items-center rounded-full border transition ${speakingKey === lineKey ? 'border-[#c74438] bg-[#c74438] text-white' : 'border-[#123b50]/10 bg-white text-[#c74438] hover:border-[#c74438]/30 hover:bg-[#fff7f2]'}`} aria-label={speakingKey === lineKey ? `停止朗读第 ${index + 1} 句` : `朗读第 ${index + 1} 句`}>{speakingKey === lineKey ? <Pause className="size-4 fill-current" /> : <Volume2 className="size-4" />}</button></div>; })}</div></div>
          </LessonSection>

          <LessonSection id="notes" number="05" eyebrow="Language notes" title="把听到的内容，整理成可复用的表达" description="不堆砌规则，只解释这支 Vlog 里马上用得上的语法、短语与词汇。" done={completed.includes('notes')} onDone={() => markComplete('notes')}>
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-[22px] border border-[#123b50]/10 bg-[#fffdf8] p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><BookOpenCheck className="size-5 text-[#c74438]" /><h3 className="text-lg font-black">语法 · Structures</h3></div><Accordion defaultValue={['quantity']}><AccordionItem value="quantity"><AccordionTrigger className="py-4 text-base font-bold">plein de / tellement de：数量很多</AccordionTrigger><AccordionContent className="pb-5 leading-7 text-[#5e6c65]"><p><code>plein de</code> 更口语、更随意；<code>tellement de</code> 带强调，接近“这么多／那么多”。两者后面直接接名词。</p><p className="rounded-xl bg-[#f3eee4] p-3 text-[#123b50]">J&apos;ai <b>tellement de</b> travail aujourd&apos;hui.</p></AccordionContent></AccordionItem><AccordionItem value="comparison"><AccordionTrigger className="py-4 text-base font-bold">meilleur que：不规则比较级</AccordionTrigger><AccordionContent className="pb-5 leading-7 text-[#5e6c65]"><p><code>meilleur</code> 是 <code>bon</code> 的比较级，要和名词性数配合：meilleur / meilleure / meilleurs / meilleures。</p><p className="rounded-xl bg-[#f3eee4] p-3 text-[#123b50]">Ces fraises sont <b>meilleures que</b> les autres.</p></AccordionContent></AccordionItem><AccordionItem value="oneof"><AccordionTrigger className="py-4 text-base font-bold">un de mes…：我的……之一</AccordionTrigger><AccordionContent className="pb-5 leading-7 text-[#5e6c65]"><p>结构是 <code>un / une de + 所有格 + 复数名词</code>。这是介绍喜好时非常实用的句型。</p><p className="rounded-xl bg-[#f3eee4] p-3 text-[#123b50]">C&apos;est <b>un de mes cafés préférés</b>.</p></AccordionContent></AccordionItem></Accordion></div>
              <div className="rounded-[22px] border border-[#123b50]/10 bg-[#fffdf8] p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><Sparkles className="size-5 text-[#d29b2d]" /><h3 className="text-lg font-black">短语 · Expressions</h3></div><div className="space-y-3">{[['quand même', '[kɑ̃ mɛm]', '还是；尽管如此', 'Il pleut, mais je sors quand même.'], ['au-dessus de', '[o də.sy də]', '在……上方', "L'avion vole au-dessus des nuages."], ['là-bas', '[la ba]', '在那边', 'Regarde, le café est là-bas.']].map(([phrase, ipa, zh, example]) => <div key={phrase} className="rounded-2xl bg-[#f3eee4] p-4"><div className="flex items-center justify-between gap-3"><span className="text-lg font-black text-[#123b50]">{phrase}</span><button type="button" className="grid size-8 place-items-center rounded-full bg-white text-[#c74438]" aria-label={`播放 ${phrase}`}><Volume2 className="size-3.5" /></button></div><p className="mt-1 font-mono text-xs text-[#c74438]">{ipa}</p><p className="mt-3 text-sm font-bold">{zh}</p><p className="mt-2 text-sm italic leading-6 text-[#6c7871]">{example}</p></div>)}</div></div>
            </div>
            <div className="mt-5 rounded-[22px] border border-[#123b50]/10 bg-[#fffdf8] p-5 sm:p-6"><h3 className="text-lg font-black">词汇 · Vocabulaire</h3><div className="mt-5 grid gap-3 md:grid-cols-2">{vocab.map((item) => <div key={item.word} className="rounded-2xl border border-[#123b50]/9 bg-white/60 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-black text-[#123b50]">{item.word}</p><p className="mt-1 font-mono text-xs text-[#c74438]">{item.ipa}</p></div><button type="button" className="grid size-8 place-items-center rounded-full bg-[#123b50]/7 text-[#123b50]" aria-label={`播放 ${item.word}`}><Volume2 className="size-3.5" /></button></div><p className="mt-3 text-sm font-bold">{item.zh}</p><p className="mt-2 text-sm italic text-[#748078]">{item.example}</p></div>)}</div></div>
            <div className="mt-5 rounded-[22px] border border-[#123b50]/10 bg-[#fffdf8] p-5 sm:p-6"><div className="flex items-center gap-2"><BookOpenCheck className="size-5 text-[#4c8a6c]" /><h3 className="text-lg font-black">文本回顾 · Révision</h3></div><p className="mt-2 text-sm leading-6 text-[#718078]">先只读法语复述画面，再展开中文检查意思，摆脱逐字翻译。</p><Accordion className="mt-4">{transcript.map((line, index) => <AccordionItem key={line.fr} value={`review-${index}`}><AccordionTrigger className="py-4 text-base leading-7"><span className="mr-3 font-display italic text-[#c74438]/50">{String(index + 1).padStart(2, '0')}</span>{line.fr}</AccordionTrigger><AccordionContent className="pb-5 pl-9 text-sm leading-7 text-[#718078]">{line.zh}</AccordionContent></AccordionItem>)}</Accordion></div>
          </LessonSection>

          <LessonSection id="speak" number="06" eyebrow="Make it yours" title="最后：不用翻译，直接说你自己的话" description="从模板开始，把括号里的内容换成你的真实生活。" done={completed.includes('speak')} onDone={saveSpeaking} doneLabel="保存到复习本">
            <div className="rounded-[22px] border border-[#c74438]/20 bg-[#fff8f2] p-5 sm:p-7"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-[#c74438] text-white"><Mic2 className="size-5" /></span><div><p className="text-sm font-black text-[#c74438]">口语任务</p><p className="text-xs text-[#7b716b]">描述你喜欢的一个地方或一种食物</p></div></div><div className="mt-6 space-y-3 rounded-2xl border border-[#c74438]/12 bg-white/65 p-5 text-base leading-8"><p><b>[地点]</b> est si / tellement <b>[形容词]</b>.</p><p>Je vais quand même <b>[动词]</b>.</p><p>C&apos;est un de mes / une de mes <b>[复数名词]</b> préférés.</p></div><Textarea value={speakingDraft} onChange={(event) => setSpeakingDraft(event.target.value)} className="mt-5 min-h-36 rounded-2xl border-[#c74438]/15 bg-white p-4 text-base leading-8 focus-visible:border-[#c74438]/40 focus-visible:ring-[#c74438]/10" placeholder="例如：Ce café est tellement joli. C'est un de mes endroits préférés à Shanghai…" /><div className="mt-4 flex flex-wrap items-center gap-3"><Button variant="outline" className="rounded-full border-[#c74438]/20 bg-white text-[#c74438]"><Mic2 className="size-4" /> 录下自己</Button><Button onClick={saveSpeaking} className="rounded-full bg-[#c74438] px-5 text-white hover:bg-[#ad382f]">保存这段表达</Button>{savedMessage && <span className="text-sm font-bold text-[#4c8a6c]">{savedMessage}</span>}</div></div>
            <div className="mt-5 rounded-[22px] border border-[#123b50]/10 bg-[#123b50] p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#f3c956]">Culture minute · 法国文化一分钟</p><h3 className="mt-3 font-display text-3xl">法国乡村生活里的花园与邻里</h3><div className="mt-5 grid gap-5 text-sm leading-7 text-white/72 md:grid-cols-3"><p><b className="text-white">按季节生活。</b><br />果园和菜园让季节感非常具体：春天开花，夏天收覆盆子，秋天处理苹果。</p><p><b className="text-white">村庄的公共空间。</b><br />许多村庄围绕中心广场、咖啡馆、教堂和市政厅展开，日常生活节奏更慢。</p><p><b className="text-white">邻里互助。</b><br />邻居之间常会分享自家花园的收成、交换工具，或在外出时帮忙照看房子。</p></div></div>
          </LessonSection>

          <div className="rounded-[24px] bg-[#4c8a6c] p-7 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[.2em] text-white/60">Bravo !</p><div className="mt-3 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><h2 className="font-display text-3xl sm:text-4xl">你离“听懂”又近了一小步。</h2><p className="mt-3 text-sm text-white/75">明天回来复习 4 个表达，它们才会真正变成你的法语。</p></div><a href="../" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#315f4a]">返回课程库 <ChevronRight className="size-4" /></a></div></div>
        </div>
      </div>
    </main>
  );
}

function LessonSection({ id, number, eyebrow, title, description, done, onDone, doneLabel = '标记完成', children }: { id: string; number: string; eyebrow: string; title: string; description: string; done: boolean; onDone: () => void; doneLabel?: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-28"><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="flex gap-4"><span className="font-display text-4xl italic text-[#c74438]/30">{number}</span><div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#c74438]">{eyebrow}</p><h2 className="mt-1 text-2xl font-black tracking-tight text-[#123b50] sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078]">{description}</p></div></div><Button onClick={onDone} variant={done ? 'secondary' : 'outline'} className={`shrink-0 rounded-full ${done ? 'bg-[#4c8a6c]/12 text-[#397454]' : 'border-[#123b50]/15 bg-white/40 text-[#123b50]'}`}>{done ? <><Check className="size-4" /> 已完成</> : doneLabel}</Button></div>{children}</section>;
}

function highlightFocus(text: string, focus: string) {
  const start = text.indexOf(focus);
  if (start < 0) return text;
  return <>{text.slice(0, start)}<mark className="rounded bg-[#f3c956]/30 px-1 font-bold text-[#bd3d34] underline decoration-[#c74438]/30 underline-offset-4">{focus}</mark>{text.slice(start + focus.length)}</>;
}
