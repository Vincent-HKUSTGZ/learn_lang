'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Headphones,
  Check,
  BookOpen,
  Lightbulb,
  Bookmark,
  Volume2,
  VolumeX,
  RotateCcw,
  Eye,
  Mic,
  Download,
  Upload,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { AudioPlayer, stopAllAudio, time } from '@/components/english-audio';
import { Recorder } from '@/components/english-recorder';
import { catalog, type LessonId } from '@/lib/english/catalog';
import courses from '@/lib/english/courses.json';
import audioManifest from '@/lib/english/audio-manifest.json';
import {
  readState,
  writeState,
  emptyState,
  emptyLesson,
  today,
  matches,
  parseState,
  gradeAnswer,
  revealAnswer,
  retryAnswer,
  type LessonProgress,
} from '@/lib/english/storage';

const steps = [
  {
    title: '先试着说',
    english: 'Warm up',
    description: '先写出你会的英语。学完再回来，会看到自己的进步。',
  },
  {
    title: '听懂大意',
    english: 'Listen first',
    description: '从 BBC 原声开始。抓住一个关键词，就已经有收获。',
  },
  {
    title: '听写挑战',
    english: 'Catch the words',
    description: '听配套场景对话，把缺少的表达补回来。按 Enter 检查当前题。',
  },
  {
    title: '逐句跟读',
    english: 'Make it sound natural',
    description: '先听，再跟读。注意重音和停顿，不必模仿得一模一样。',
  },
  {
    title: '表达工具箱',
    english: 'Keep the useful bits',
    description: '把语法、短语和词汇连回语境，收藏你真正想用的表达。',
  },
  {
    title: '换成你的故事',
    english: 'Make it yours',
    description: '离开原句，用自己的生活再说一遍。会用，比只记住更进一步。',
  },
];
type Feedback = {
  good: boolean;
  title: string;
  message: string;
  celebration?: boolean;
};
type Question = {
  question: string;
  options: string[];
  correct: number;
  why: string;
};

export default function LessonPage() {
  const [id, setId] = useState<LessonId>('hello');
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState(emptyState);
  const stateRef = useRef(state);
  const [review, setReview] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [showChinese, setShowChinese] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [activeLine, setActiveLine] = useState(-1);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [onlyMistakes, setOnlyMistakes] = useState(false);
  const [saveError, setSaveError] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lesson = courses.find((l) => l.id === id)!;
  const meta = catalog.find((l) => l.id === id)!;
  const progress = state.lessons[id] ?? emptyLesson();
  const step = Math.max(0, Math.min(5, progress.step));
  const manifest = audioManifest[id];
  const audio = (file: string) => `../english/${id}-${file}`;
  const update = (
    transform: (previous: LessonProgress) => LessonProgress,
    lessonId: LessonId = id,
    activity = true,
  ) => {
    const prev = stateRef.current;
    const next = {
      ...prev,
      lastLesson: lessonId,
      activity: activity
        ? [...new Set([...prev.activity, today()])]
        : prev.activity,
      lessons: {
        ...prev.lessons,
        [lessonId]: transform(prev.lessons[lessonId] ?? emptyLesson()),
      },
    };
    stateRef.current = next;
    setState(next);
    if (!writeState(next))
      setSaveError('浏览器存储不可用，进度暂时无法保存。请先下载进度备份。');
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('id');
    const selected = catalog.find((c) => c.id === requested)?.id ?? 'hello';
    const stored = readState();
    stateRef.current = stored;
    setState(stored);
    setId(selected);
    setReview(params.get('mode') === 'review');
    setSourceMode((stored.lessons[selected]?.step ?? 0) === 1);
    setLoaded(true);
  }, []);
  useEffect(
    () => () => {
      void audioContextRef.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (loaded) document.title = `${meta.title} · Little English`;
  }, [loaded, meta.title]);
  function notify(next: Feedback) {
    setFeedback(next);
    if (!stateRef.current.sound) return;
    try {
      const ctx = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = ctx;
      void ctx.resume();
      const notes = next.good ? [523.25, 659.25, 783.99] : [392, 349.23];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.11);
        gain.gain.linearRampToValueAtTime(
          0.055,
          ctx.currentTime + i * 0.11 + 0.01,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + i * 0.11 + 0.18,
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.11);
        osc.stop(ctx.currentTime + i * 0.11 + 0.2);
      });
    } catch {
      /* Feedback remains fully usable without sound. */
    }
  }
  function changeStep(next: number) {
    stopAllAudio();
    setActiveLine(-1);
    setReview(false);
    setOnlyMistakes(false);
    setSourceMode(next === 1);
    update((p) => ({ ...p, step: next }), id, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function complete() {
    if (
      step === 2 &&
      lesson.lines.some(
        (_, i) =>
          progress.results[`line-${i}`] === undefined &&
          !progress.revealed.includes(`line-${i}`),
      )
    ) {
      notify({
        good: false,
        title: '还有几句话等着你',
        message: '每道题试一次或查看答案后，就能完成听写步骤。',
      });
      return;
    }
    if (
      step === 5 &&
      ((progress.draft.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length ?? 0) <
        8 ||
        progress.outputChecks.length < 3)
    ) {
      notify({
        good: false,
        title: '再加一点你自己的故事',
        message:
          '写至少 8 个英文单词，并对照下面三个目标自查。这里不会把自由表达误判为标准答案。',
      });
      return;
    }
    update((p) => ({
      ...p,
      completed: [...new Set([...p.completed, step])],
      step: step < 5 ? step + 1 : 5,
    }));
    stopAllAudio();
    setSourceMode(step + 1 === 1);
    setActiveLine(-1);
    if (step === 5) {
      notify({
        good: true,
        celebration: true,
        title: 'Look at you go! 🎉',
        message:
          '你的表达已保存。明天回来，用复习卡再说一遍，让这些句子留得更久。',
      });
    } else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function checkAnswer(index: number) {
    const key = `line-${index}`,
      line = lesson.lines[index],
      value = progress.answers[key] ?? '';
    if (!value.trim()) {
      notify({
        good: false,
        title: '先试一小步 🐣',
        message: '先输入听到的词；不确定时可以点喇叭重听，再看中文提示。',
      });
      return;
    }
    const good = matches(
      value,
      line.answer,
      'alternatives' in line ? line.alternatives : [],
    );
    const helped = progress.revealed.includes(key);
    update((p) => gradeAnswer(p, key, good));
    notify({
      good,
      title: good
        ? helped
          ? '看懂了，再试着记住 🌱'
          : ['Nice catch! 🦊', '你听出来啦！🌟', '这句话接住了！🐣'][index % 3]
        : '差一点点，再听一次 🐻',
      message: good
        ? helped
          ? '这次参考过答案，不计入独立答对。点“重新听写”后，遮住答案再挑战一次。'
          : `「${line.answer}」＝${line.hint}。${line.tip}`
        : `${line.tip} 提示：${line.hint}。可以修改后再提交，也可以查看答案。`,
    });
  }
  function reveal(index: number) {
    update((p) => revealAnswer(p, `line-${index}`));
  }
  function retry(index: number) {
    update((p) => retryAnswer(p, `line-${index}`));
  }
  function toggleWord(key: string) {
    update((p) => ({
      ...p,
      savedWords: p.savedWords.includes(key)
        ? p.savedWords.filter((w) => w !== key)
        : [...p.savedWords, key],
    }));
  }
  function toggleSound() {
    const next = { ...stateRef.current, sound: !stateRef.current.sound };
    stateRef.current = next;
    setState(next);
    writeState(next);
  }
  function exportProgress() {
    const blob = new Blob([JSON.stringify(stateRef.current, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `little-english-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importProgress(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('too large');
      const raw = JSON.parse(await file.text());
      if (!raw?.lessons || !Array.isArray(raw.activity))
        throw new Error('invalid backup');
      const imported = parseState(raw),
        current = stateRef.current;
      if (!Object.keys(imported.lessons).length)
        throw new Error('empty backup');
      const next = {
        ...current,
        lessons: { ...imported.lessons, ...current.lessons },
        activity: [...new Set([...current.activity, ...imported.activity])],
      };
      stateRef.current = next;
      setState(next);
      if (!writeState(next)) throw new Error('storage unavailable');
      notify({
        good: true,
        title: '进度接回来啦 🌱',
        message: '已恢复本机尚未开始的课程；已有课程进度未被覆盖。',
      });
    } catch {
      notify({
        good: false,
        title: '这份备份暂时读不了',
        message:
          '请选择本站下载的英语进度 JSON 文件，并确认浏览器允许本地存储。原有进度不会被清空。',
      });
    }
    if (importRef.current) importRef.current.value = '';
  }
  const quiz = (q: Question, key: string) => (
    <div className="quiz-card">
      <p className="eyebrow">LISTEN FOR MEANING</p>
      <h3>{q.question}</h3>
      <div className="quiz-options">
        {q.options.map((option, i) => (
          <button
            key={option}
            className={
              progress.answers[key] === String(i)
                ? `quiz-option ${i === q.correct ? 'right' : 'wrong'}`
                : 'quiz-option'
            }
            onClick={() => {
              update((p) => ({
                ...p,
                answers: { ...p.answers, [key]: String(i) },
              }));
              notify({
                good: i === q.correct,
                title: i === q.correct ? '听懂意思了！🌟' : '再抓一个关键词 🐻',
                message: q.why,
              });
            }}
          >
            <span>{String.fromCharCode(65 + i)}</span>
            {option}
            {progress.answers[key] === String(i) && i === q.correct && (
              <Check size={18} />
            )}
          </button>
        ))}
      </div>
      {progress.answers[key] !== undefined && (
        <p className="quiz-explanation">{q.why}</p>
      )}
    </div>
  );
  const reviewCards = courses
    .flatMap((c) => {
      const p = state.lessons[c.id] ?? emptyLesson();
      return c.lines
        .map((line, i) => ({
          id: c.id as LessonId,
          key: `line-${i}`,
          en: line.en,
          zh: line.zh,
          src: `../english/${c.id}-line-${i}.mp3`,
          due: p.reviews[`line-${i}`] ?? 0,
          mistake: p.mistakes.includes(`line-${i}`),
        }))
        .filter((card) => card.mistake || p.mastered.includes(card.key));
    })
    .sort((a, b) => Number(b.mistake) - Number(a.mistake) || a.due - b.due);
  const dueCards = reviewCards.filter((c) => c.due <= Date.now());
  const deck = dueCards.length ? dueCards : reviewCards;
  const reviewCard = deck.length ? deck[reviewIndex % deck.length] : null;
  if (!loaded)
    return (
      <div className="english-app">
        <div className="empty-state">
          <Headphones />
          <p>正在打开你的课程…</p>
        </div>
      </div>
    );
  return (
    <div className="english-app lesson-app">
      <header className="site-header lesson-header">
        <a className="brand" href="../">
          <span className="brand-icon">
            <Headphones size={23} />
          </span>
          Little English<span className="brand-dot">.</span>
        </a>
        <a href="../" className="back-link">
          <ArrowLeft size={16} />
          课程书架
        </a>
        <div className="header-actions">
          <button
            onClick={toggleSound}
            aria-label={state.sound ? '关闭反馈音效' : '开启反馈音效'}
            title={state.sound ? '关闭反馈音效' : '开启反馈音效'}
          >
            {state.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            onClick={() => {
              stopAllAudio();
              setReview(!review);
              setFlipped(false);
            }}
            className={review ? 'selected' : ''}
          >
            <RotateCcw size={17} />
            我的复习
          </button>
        </div>
      </header>
      <div className="lesson-layout">
        <aside className="lesson-sidebar">
          <a href="../" className="sidebar-back">
            <ArrowLeft size={15} /> 全部课程
          </a>
          <p className="eyebrow">LESSON {meta.number}</p>
          <h2>{meta.title}</h2>
          <p className="sidebar-subtitle">{meta.subtitle}</p>
          <div className="sidebar-progress">
            <span>
              学习进度 <b>{progress.completed.length}/6</b>
            </span>
            <div className="tiny-progress">
              <span
                style={{ width: `${(progress.completed.length / 6) * 100}%` }}
              />
            </div>
          </div>
          <nav aria-label="学习步骤">
            {steps.map((s, i) => (
              <button
                key={s.title}
                onClick={() => changeStep(i)}
                className={
                  step === i && !review ? 'step-link active' : 'step-link'
                }
              >
                <span
                  className={
                    progress.completed.includes(i)
                      ? 'step-number done'
                      : 'step-number'
                  }
                >
                  {progress.completed.includes(i) ? (
                    <Check size={14} />
                  ) : (
                    String(i + 1).padStart(2, '0')
                  )}
                </span>
                <span>{s.title}</span>
                {step === i && !review && <ChevronRight size={15} />}
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <span>🌱</span>
            <p>
              不用一次全会。
              <br />
              每天听懂一点就很好。
            </p>
          </div>
          <button className="backup-link" onClick={exportProgress}>
            <Download size={15} />
            下载进度备份
          </button>
          <button
            className="backup-link restore-link"
            onClick={() => importRef.current?.click()}
          >
            <Upload size={15} />
            恢复进度备份
          </button>
          <input
            ref={importRef}
            hidden
            type="file"
            accept="application/json,.json"
            aria-label="选择进度备份"
            onChange={(e) => void importProgress(e.target.files?.[0])}
          />
          <p className="micro-note">
            输入、错题、收藏自动保存在此浏览器。旧法语进度独立保留。
          </p>
        </aside>
        <main className="lesson-main">
          {saveError && (
            <div className="notice error" role="alert">
              {saveError}
            </div>
          )}
          {review ? (
            <>
              <div className="lesson-heading">
                <p className="eyebrow">A SECOND LITTLE LOOK</p>
                <h1>把学过的，再变熟一点。</h1>
                <p className="muted">
                  {dueCards.length} 张待复习 · {reviewCards.length} 张卡片 ·
                  覆盖三门课程
                </p>
              </div>
              {reviewCard ? (
                <div className="review-surface">
                  <div className="review-card-top">
                    <span className="pill blue">
                      {catalog.find((c) => c.id === reviewCard.id)?.topic}
                    </span>
                    <span>{reviewCard.mistake ? '错题优先' : '句子复习'}</span>
                  </div>
                  <p className="micro-note">先看中文试着说英文，再翻面核对。</p>
                  <button
                    className={`flashcard ${flipped ? 'flipped' : ''}`}
                    onClick={() => setFlipped(!flipped)}
                    aria-label="翻转复习卡"
                  >
                    <span>{flipped ? 'ENGLISH' : '用英语怎么说？'}</span>
                    <strong>{flipped ? reviewCard.en : reviewCard.zh}</strong>
                    <small>
                      <RotateCcw size={14} />
                      {flipped ? '点击看中文' : '点击翻面'}
                    </small>
                  </button>
                  <AudioPlayer
                    src={reviewCard.src}
                    label="复习句子 · 英式 AI"
                  />
                  <div className="review-rating">
                    <Button
                      variant="outline"
                      onClick={() => {
                        update(
                          (p) => ({
                            ...p,
                            reviews: {
                              ...p.reviews,
                              [reviewCard.key]: Date.now() + 600000,
                            },
                          }),
                          reviewCard.id,
                        );
                        setFlipped(false);
                        setReviewIndex(0);
                      }}
                    >
                      还不熟 · 10 分钟后
                    </Button>
                    <Button
                      disabled={!flipped}
                      onClick={() => {
                        update(
                          (p) => ({
                            ...p,
                            reviews: {
                              ...p.reviews,
                              [reviewCard.key]: Date.now() + 86400000,
                            },
                          }),
                          reviewCard.id,
                        );
                        setFlipped(false);
                        setReviewIndex(0);
                      }}
                    >
                      记住了 · 明天复习 <Check size={16} />
                    </Button>
                  </div>
                  <p className="micro-note">
                    这是自评记忆卡，不改变听写得分。错题需要回到听写中独立答对才会移出错题本。
                  </p>
                  <a className="text-link" href={`../lesson/?id=${reviewCard.id}`}>
                    回到这门课 <ArrowRight size={16} />
                  </a>
                </div>
              ) : (
                <div className="empty-state">
                  <span className="big-emoji">🌱</span>
                  <h2>你的复习本还在等第一句话</h2>
                  <p>完成听写后，答对的句子和错题会自动出现在这里。</p>
                  <Button onClick={() => changeStep(2)}>
                    去做听写 <ArrowRight size={16} />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="lesson-heading">
                <div className="heading-top">
                  <p className="eyebrow">
                    {String(step + 1).padStart(2, '0')} / 06 ·{' '}
                    {steps[step].english.toUpperCase()}
                  </p>
                  <span className={`level ${meta.color}`}>
                    {meta.level} · {meta.topic}
                  </span>
                </div>
                <h1>{steps[step].title}</h1>
                <p className="muted">{steps[step].description}</p>
              </div>
              {step > 0 && step < 4 && (
                <div className="sticky-player">
                  <div className="player-tabs">
                    <button
                      onClick={() => {
                        stopAllAudio();
                        setSourceMode(true);
                      }}
                      className={sourceMode ? 'active' : ''}
                    >
                      BBC 原声短片段
                    </button>
                    <button
                      onClick={() => {
                        stopAllAudio();
                        setSourceMode(false);
                      }}
                      className={!sourceMode ? 'active' : ''}
                    >
                      配套对话 · 英式 AI
                    </button>
                    <span>
                      {sourceMode
                        ? `${time(lesson.sourceStart)}–${time(lesson.sourceEnd)} · 原视频`
                        : '本站原创练习 · 8 句'}
                    </span>
                  </div>
                  <AudioPlayer
                    key={`${id}-${sourceMode}`}
                    src={audio(sourceMode ? 'original.m4a' : 'practice.m4a')}
                    label={sourceMode ? 'BBC 主持人原声' : '配套场景对话'}
                    onTime={(t) => {
                      if (!sourceMode)
                        setActiveLine(
                          manifest.timeline.findIndex(
                            (s) => t >= s.start && t < s.end,
                          ),
                        );
                    }}
                    onEnded={() => setActiveLine(-1)}
                  />
                </div>
              )}
              {step === 0 && (
                <>
                  <div className={`warm-card ${meta.color}`}>
                    <span className="big-emoji">{meta.emoji}</span>
                    <p className="eyebrow">PICTURE YOURSELF HERE</p>
                    <h2>如果是你，你会怎么说？</h2>
                    <p>{lesson.warmup}</p>
                    <label htmlFor="warmup">学习前的第一版</label>
                    <Textarea
                      id="warmup"
                      value={progress.warmup}
                      onChange={(e) =>
                        update((p) => ({ ...p, warmup: e.target.value }))
                      }
                      placeholder="先写两三句，不会的词可以先用中文…"
                    />
                    <div className="hint-line">
                      <Lightbulb size={17} />{' '}
                      不要求全对，这段文字会留到最后，和你的新表达作对照。
                    </div>
                  </div>
                  <div className="learning-plan">
                    <h3>这一课，你会带走</h3>
                    <div>
                      <span>
                        <Headphones />
                        真实英语的语音节奏
                      </span>
                      <span>
                        <BookOpen />8 个可直接使用的语块
                      </span>
                      <span>
                        <Mic />
                        一段属于自己的表达
                      </span>
                    </div>
                  </div>
                  <div className="source-credit">
                    <img src={`../english/${id}.jpg`} alt={meta.sourceTitle} />
                    <div>
                      <p className="eyebrow">本课视频素材</p>
                      <h3>{meta.sourceTitle}</h3>
                      <p>BBC Learning English · YouTube</p>
                      <a
                        href={`https://www.youtube.com/watch?v=${meta.videoId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看官方视频 ↗
                      </a>
                    </div>
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <div className="listen-intro">
                    <span>🎧</span>
                    <div>
                      <h3>先听两遍，暂时不看文字</h3>
                      <p>
                        第一遍抓场景，第二遍抓关键词。听不清时用
                        0.8×，或开启循环。
                      </p>
                    </div>
                  </div>
                  {quiz(lesson.sourceQuestion, 'source-quiz')}
                  <div className="source-transcript">
                    <Button
                      variant="outline"
                      onClick={() => setShowSource(!showSource)}
                    >
                      <Eye size={16} />
                      {showSource ? '收起原声文字' : '听完了，看看原声文字'}
                    </Button>
                    {showSource && (
                      <div>
                        <p lang="en">{lesson.sourceText}</p>
                        <p className="muted">{lesson.sourceZh}</p>
                      </div>
                    )}
                  </div>
                  <div className="practice-intro">
                    <p className="eyebrow">NOW, A LITTLE MORE</p>
                    <h3>换一个场景，听听能不能懂</h3>
                    <p>
                      切换到“配套对话 · 英式
                      AI”，听一遍后回答下面的问题。接下来的听写和逐句跟读都对应这段对话。
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        stopAllAudio();
                        setSourceMode(false);
                      }}
                    >
                      选择配套对话 <ArrowRight size={16} />
                    </Button>
                  </div>
                  {quiz(lesson.quiz, 'practice-quiz')}
                </>
              )}
              {step === 2 && (
                <>
                  <div className="exercise-toolbar">
                    <span>
                      <b>{progress.mastered.length}</b> / 8 独立答对
                    </span>
                    <button
                      onClick={() => setOnlyMistakes(!onlyMistakes)}
                      className={onlyMistakes ? 'selected' : ''}
                    >
                      <RotateCcw size={15} />
                      {onlyMistakes
                        ? '显示全部题目'
                        : `只看错题 (${progress.mistakes.length})`}
                    </button>
                  </div>
                  <p className="micro-note exercise-note">
                    忽略大小写与标点，兼容常见缩写。中文提示随时可用；查看答案后需重新听写，才计作独立答对。
                  </p>
                  <div className="dictation-list">
                    {lesson.lines.map((line, i) => {
                      const key = `line-${i}`,
                        hasAnswer = progress.revealed.includes(key),
                        result = progress.results[key],
                        value = progress.answers[key] ?? '',
                        offset = line.en.indexOf(line.answer);
                      if (onlyMistakes && !progress.mistakes.includes(key))
                        return null;
                      return (
                        <form
                          key={key}
                          className={`dictation-card ${result === true ? 'right' : result === false ? 'wrong' : ''}`}
                          onSubmit={(e) => {
                            e.preventDefault();
                            checkAnswer(i);
                          }}
                        >
                          <div className="question-header">
                            <span className="question-number">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span>
                              {result === true
                                ? hasAnswer
                                  ? '参考答案后完成'
                                  : '答对了 ✓'
                                : result === false
                                  ? '再听一次，你可以的'
                                  : '听一句，补一个表达'}
                            </span>
                            <AudioPlayer
                              src={audio(`line-${i}.mp3`)}
                              label={`第 ${i + 1} 句练习`}
                              compact
                            />
                          </div>
                          <p className="gap-sentence" lang="en">
                            {line.en.slice(0, offset)}
                            <span className="gap-space">
                              {hasAnswer ? line.answer : '······'}
                            </span>
                            {line.en.slice(offset + line.answer.length)}
                          </p>
                          <div className="answer-row">
                            <Input
                              value={value}
                              aria-label={`第 ${i + 1} 题答案`}
                              placeholder="输入听到的表达…"
                              autoComplete="off"
                              spellCheck={false}
                              onChange={(e) =>
                                update((p) => {
                                  const results = { ...p.results };
                                  delete results[key];
                                  return {
                                    ...p,
                                    answers: {
                                      ...p.answers,
                                      [key]: e.target.value,
                                    },
                                    results,
                                  };
                                })
                              }
                            />
                            <Button type="submit">
                              检查 <Check size={15} />
                            </Button>
                          </div>
                          <details className="question-hint">
                            <summary>
                              <Lightbulb size={14} />
                              中文提示
                            </summary>
                            <p>
                              {line.hint} · {line.zh}
                            </p>
                          </details>
                          {(hasAnswer || result !== undefined) && (
                            <div
                              className={`answer-explanation ${result ? 'good' : ''}`}
                            >
                              <b>
                                {hasAnswer || result
                                  ? '答案：' + line.answer
                                  : '可以从这个地方再听：'}
                              </b>
                              <p>{line.tip}</p>
                            </div>
                          )}
                          <div className="question-actions">
                            <button type="button" onClick={() => reveal(i)}>
                              <Eye size={14} />
                              查看答案
                            </button>
                            <button type="button" onClick={() => retry(i)}>
                              <RotateCcw size={14} />
                              重新听写
                            </button>
                            {progress.mastered.includes(key) && (
                              <span>已独立答对过 🌟</span>
                            )}
                          </div>
                        </form>
                      );
                    })}
                    {onlyMistakes && !progress.mistakes.length && (
                      <div className="empty-state">
                        <span className="big-emoji">🥳</span>
                        <h3>这一课没有待订正的错题</h3>
                        <Button onClick={() => setOnlyMistakes(false)}>
                          继续全部练习
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="exercise-toolbar">
                    <span>听一遍 → 模仿一遍 → 自己说一遍</span>
                    <Button
                      variant="outline"
                      onClick={() => setShowChinese(!showChinese)}
                    >
                      {showChinese ? '隐藏中文' : '显示中文'}
                    </Button>
                  </div>
                  <div className="transcript-list">
                    {lesson.lines.map((line, i) => (
                      <div
                        className={
                          activeLine === i && !sourceMode
                            ? 'transcript-row highlighted'
                            : 'transcript-row'
                        }
                        key={line.en}
                      >
                        <span className="line-number">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <p className="english-line" lang="en">
                            {highlight(line.en, line.focus)}
                          </p>
                          {showChinese && (
                            <p className="translation">{line.zh}</p>
                          )}
                          <details className="pronunciation-tip">
                            <summary>发音小提示</summary>
                            <p>{line.tip}</p>
                          </details>
                        </div>
                        <AudioPlayer
                          compact
                          src={audio(`line-${i}.mp3`)}
                          label={`第 ${i + 1} 句跟读`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="surface">
                    <h3>录下你最喜欢的两句</h3>
                    <p className="muted">
                      播放原句，跟着读，再录一遍自己的声音。
                    </p>
                    <Recorder label="我的跟读录音" />
                  </div>
                </>
              )}
              {step === 4 && (
                <>
                  <div className="surface">
                    <div className="toolbox-title">
                      <BookOpen />
                      <h2>语法，够用就好</h2>
                    </div>
                    <Accordion defaultValue={['grammar-0']}>
                      {lesson.grammar.map((g, i) => (
                        <AccordionItem value={`grammar-${i}`} key={g.title}>
                          <AccordionTrigger className="grammar-trigger">
                            {g.title}
                          </AccordionTrigger>
                          <AccordionContent className="grammar-content">
                            <p>{g.rule}</p>
                            <blockquote lang="en">
                              {g.example}
                              <small>{g.zh}</small>
                            </blockquote>
                            <p className="hint-line">
                              <Lightbulb size={17} />
                              {g.error}
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                  {(['phrases', 'vocab'] as const).map((kind) => (
                    <section className="word-section" key={kind}>
                      <div className="section-title">
                        <h2>
                          {kind === 'phrases'
                            ? '随手就能用的短语'
                            : '放进语境的单词'}
                        </h2>
                        <span className="muted">
                          英式 AI 发音 · 点击书签收藏
                        </span>
                      </div>
                      <div className="word-grid">
                        {lesson[kind].map((word, i) => {
                          const key = `${kind}-${i}`;
                          return (
                            <div className="word-card" key={key}>
                              <div className="word-header">
                                <h3 lang="en">{word.text}</h3>
                                <button
                                  className={
                                    progress.savedWords.includes(key)
                                      ? 'saved'
                                      : ''
                                  }
                                  aria-label={`${progress.savedWords.includes(key) ? '取消收藏' : '收藏'}${word.text}`}
                                  onClick={() => toggleWord(key)}
                                >
                                  <Bookmark
                                    size={18}
                                    fill={
                                      progress.savedWords.includes(key)
                                        ? 'currentColor'
                                        : 'none'
                                    }
                                  />
                                </button>
                                <AudioPlayer
                                  compact
                                  src={audio(`${kind}-${i}.mp3`)}
                                  label={word.text}
                                />
                              </div>
                              <p className="ipa">{word.ipa}</p>
                              <p className="word-meaning">{word.zh}</p>
                              <p className="word-note">{word.note}</p>
                              <p className="word-example" lang="en">
                                {word.example}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                  <div className="culture-panel">
                    <p className="eyebrow">A LITTLE CULTURE</p>
                    <h2>语言之外，懂一点语境</h2>
                    <div>
                      {lesson.culture.map((c) => (
                        <article key={c.title}>
                          <h3>{c.title}</h3>
                          <p>{c.body}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                  {progress.savedWords.length > 0 && (
                    <div className="notice">
                      🔖 已收藏 {progress.savedWords.length}{' '}
                      个表达。书签会保留在这门课，回来时可以直接复习。
                    </div>
                  )}
                </>
              )}
              {step === 5 && (
                <>
                  <div className="output-card">
                    <span className="big-emoji">✍️</span>
                    <h2>现在，把主角换成你。</h2>
                    <p>{lesson.outputPrompt}</p>
                    <div className="template-list">
                      {lesson.templates.map((t) => (
                        <p lang="en" key={t}>
                          {t}
                        </p>
                      ))}
                    </div>
                    <label htmlFor="output-draft">
                      我的英语小段落 <span>自动保存</span>
                    </label>
                    <Textarea
                      id="output-draft"
                      value={progress.draft}
                      onChange={(e) =>
                        update((p) => ({ ...p, draft: e.target.value }))
                      }
                      placeholder="Write your own little story…"
                    />
                    <p className="micro-note">
                      {progress.draft.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)
                        ?.length ?? 0}{' '}
                      个单词 · 自由表达没有唯一答案；此处保存与自查，不进行 AI
                      语法评分。
                    </p>
                    <div className="output-checklist">
                      {lesson.outputChecklist.map((item, i) => (
                        <label key={item}>
                          <input
                            type="checkbox"
                            checked={progress.outputChecks.includes(i)}
                            onChange={(e) =>
                              update((p) => ({
                                ...p,
                                outputChecks: e.target.checked
                                  ? [...new Set([...p.outputChecks, i])]
                                  : p.outputChecks.filter((x) => x !== i),
                              }))
                            }
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                    <details className="sample-answer">
                      <summary>需要灵感？看一段示例</summary>
                      <p lang="en">{lesson.outputSample}</p>
                    </details>
                    <Recorder label="我的自由表达录音" />
                  </div>
                  {progress.warmup && (
                    <div className="surface">
                      <p className="eyebrow">BEFORE & AFTER</p>
                      <h3>看看你学习前写的这一段</h3>
                      <p className="warmup-review">{progress.warmup}</p>
                      <p className="muted">
                        现在能不能多补一个原因，或把一个句子说得更顺？
                      </p>
                    </div>
                  )}
                  <div className="surface">
                    <h3>文本回顾：遮住英文再说一次</h3>
                    <Accordion>
                      {lesson.lines.map((line, i) => (
                        <AccordionItem key={line.en} value={`recall-${i}`}>
                          <AccordionTrigger className="grammar-trigger">
                            {i + 1}. {line.zh}
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="english-line" lang="en">
                              {line.en}
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </>
              )}
              <div className="lesson-bottom">
                <Button
                  variant="outline"
                  disabled={step === 0}
                  onClick={() => changeStep(step - 1)}
                >
                  <ArrowLeft size={16} />
                  上一步
                </Button>
                <span>
                  {progress.completed.includes(step)
                    ? '这一步已完成 ✓'
                    : '按自己的节奏来'}
                </span>
                <Button onClick={complete}>
                  {step === 5 ? '保存表达，完成这一步' : '完成这一步，继续'}
                  {step === 5 ? <Trophy size={17} /> : <ArrowRight size={17} />}
                </Button>
              </div>
              {progress.completed.length === 6 && (
                <div className="completion-banner">
                  <span>🎉</span>
                  <div>
                    <h3>这一课，完成啦！</h3>
                    <p>让句子成为你的习惯，明天来复习。</p>
                  </div>
                  <a
                    href={
                      id === 'food'
                        ? '../'
                        : `../lesson/?id=${id === 'hello' ? 'routine' : 'food'}`
                    }
                  >
                    {id === 'food' ? '回到课程书架' : '下一课'}{' '}
                    <ArrowRight size={17} />
                  </a>
                </div>
              )}
              <footer className="lesson-source">
                <a
                  href={`https://www.youtube.com/watch?v=${meta.videoId}&t=${Math.floor(lesson.sourceStart)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  素材来源：BBC Learning English ↗
                </a>
                <p>
                  BBC
                  原声为短片段；听写、逐句跟读、短语与词汇是本站编写的配套练习，使用英式
                  AI 音频。本项目与 BBC 无隶属关系。
                </p>
              </footer>
            </>
          )}
        </main>
      </div>
      <Dialog
        open={!!feedback}
        onOpenChange={(open) => {
          if (!open) setFeedback(null);
        }}
      >
        <DialogContent
          className={`learning-feedback ${feedback?.good ? 'good' : 'gentle'}`}
        >
          <span className="feedback-emoji" aria-hidden="true">
            {feedback?.celebration ? '🎉' : feedback?.good ? '🦊' : '🐻'}
          </span>
          {feedback?.good && (
            <div className="sparkle-row" aria-hidden="true">
              ✦ · ✨ · ✦
            </div>
          )}
          <DialogTitle className="feedback-title">
            {feedback?.title}
          </DialogTitle>
          <DialogDescription className="feedback-message">
            {feedback?.message}
          </DialogDescription>
          <Button onClick={() => setFeedback(null)} className="feedback-button">
            {feedback?.good ? '继续，我可以！' : '好，再试试'}{' '}
            <ArrowRight size={17} />
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function highlight(text: string, focus: string) {
  const index = text.indexOf(focus);
  return index < 0 ? (
    text
  ) : (
    <>
      {text.slice(0, index)}
      <mark>{focus}</mark>
      {text.slice(index + focus.length)}
    </>
  );
}

