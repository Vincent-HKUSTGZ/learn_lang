'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AudioPlayer } from '@/components/english-audio';
import { Recorder } from '@/components/english-recorder';
import ReviewWorkspace from '@/components/english-review-workspace';
import courses from '@/lib/english/courses.json';
import notes from '@/lib/english/teacher-notes.json';
import { catalog, type LessonId } from '@/lib/english/catalog';
import {
  emptyLesson,
  readState,
  writeState,
  matches,
  gradeAnswer,
  revealAnswer,
  retryAnswer,
  today,
  type LessonProgress,
} from '@/lib/english/storage';

function Section({
  number,
  title,
  instruction,
  children,
}: {
  number: string;
  title: string;
  instruction: string;
  children: ReactNode;
}) {
  return (
    <details className="handout-section" open>
      <summary>
        <h2>
          {number}、{title}
        </h2>
      </summary>
      <div className="section-body">
        <p className="teacher-instruction">{instruction}</p>
        {children}
      </div>
    </details>
  );
}
function Mark({
  text,
  focus,
  index,
}: {
  text: string;
  focus: string;
  index: number;
}) {
  const offset = text.indexOf(focus);
  if (offset < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, offset)}
      <mark className={`ink-${index % 8}`}>{focus}</mark>
      {text.slice(offset + focus.length)}
    </>
  );
}
function StudyVideo({
  id,
  title,
  subtitles = false,
}: {
  id: LessonId;
  title: string;
  subtitles?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const video = ref.current;
    const stop = (e: Event) => {
      if ((e as CustomEvent).detail !== video) video?.pause();
    };
    window.addEventListener('little-english-audio', stop);
    return () => {
      video?.pause();
      window.removeEventListener('little-english-audio', stop);
    };
  }, []);
  return (
    <figure className="study-video">
      <div className="study-video-stage">
        <video
          ref={ref}
          controls
          playsInline
          preload="metadata"
          onError={() => setError(true)}
          onPlay={() =>
            window.dispatchEvent(
              new CustomEvent('little-english-audio', { detail: ref.current }),
            )
          }
          aria-label={subtitles ? '有中英字幕课件' : '无字幕课件'}
          src={`../english/${id}-study.mp4`}
        >
          {subtitles && (
            <track
              default
              kind="subtitles"
              src={`../english/${id}-study.vtt`}
              srcLang="en"
              label="中英对照"
            />
          )}
        </video>
        <div className="study-video-title" aria-hidden="true">
          <small>LITTLE ENGLISH · STUDY CLIP</small>
          <strong>{title}</strong>
          <span>
            {subtitles ? '中英字幕 · 跟读练习' : '无字幕 · 先听懂大意'}
          </span>
        </div>
      </div>
      <figcaption>
        配套课件视频 · 英式 AI 朗读 · 与下方课文、听写一致；非 BBC 实拍视频。
      </figcaption>
      {error && (
        <p role="alert">视频加载失败，请刷新重试；也可以使用下方音频播放器。</p>
      )}
    </figure>
  );
}
export default function LessonPage() {
  const [id, setId] = useState<LessonId>('hello');
  const [ready, setReady] = useState(false);
  const [review, setReview] = useState(false);
  const [progress, setProgress] = useState<LessonProgress>(emptyLesson);
  const progressRef = useRef(progress);
  const [showAnswers, setShowAnswers] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState(false);
  const meta = catalog.find((c) => c.id === id)!;
  const lesson = courses.find((c) => c.id === id)!;
  const teacher = notes[id];
  const asset = (file: string) => `../english/${id}-${file}`;
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chosen =
      catalog.find((c) => c.id === params.get('id'))?.id ?? 'hello';
    const p = readState().lessons[chosen] ?? emptyLesson();
    setId(chosen);
    setProgress(p);
    progressRef.current = p;
    setReview(params.get('mode') === 'review');
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) document.title = `${meta.title} · 英语学习讲义`;
  }, [ready, meta.title]);
  function update(fn: (p: LessonProgress) => LessonProgress) {
    const next = fn(progressRef.current);
    progressRef.current = next;
    setProgress(next);
    const all = readState();
    setSaveError(
      !writeState({
        ...all,
        lastLesson: id,
        activity: [...new Set([...all.activity, today()])],
        lessons: { ...all.lessons, [id]: next },
      }),
    );
  }
  function check() {
    let next = progressRef.current,
      correct = 0,
      attempted = 0;
    lesson.lines.forEach((line, i) => {
      const key = `line-${i}`,
        value = next.answers[key] ?? '';
      if (!value.trim()) return;
      attempted++;
      const good = matches(
        value,
        line.answer,
        'alternatives' in line && Array.isArray(line.alternatives)
          ? line.alternatives
          : [],
      );
      if (good) correct++;
      next = gradeAnswer(next, key, good);
    });
    update(() => next);
    setMessage(
      !attempted
        ? '先听一遍，试着填一个空就好。'
        : correct === 8
          ? '🌷 全部答对了！遮住答案，再读一遍整段课文吧。'
          : `本次填写 ${attempted} 题，答对 ${correct} 题。${correct === attempted ? ' 🌱 已填写的都对了，继续补完吧。' : ' 🐻 有些词还需要再听一次，下面有逐题提示。'}`,
    );
  }
  function revealAll() {
    update((p) =>
      lesson.lines.reduce((next, _, i) => revealAnswer(next, `line-${i}`), p),
    );
    setShowAnswers(true);
    setMessage('答案已展开。参考答案后请重新听写，再计入独立答对。');
  }
  if (!ready) return <main className="handout-loading">正在打开讲义…</main>;
  if (review) return <ReviewWorkspace />;
  return (
    <div className="handout-app">
      <nav className="handout-nav">
        <a href="../">
          <ArrowLeft size={16} />
          全部课程
        </a>
        <span>Little English / 学习讲义 {meta.number}</span>
      </nav>
      <main className="handout">
        <header className="handout-header">
          <h1>{meta.title}</h1>
          <p>{meta.subtitle}</p>
          <div>
            <span>{meta.level}</span>
            <span>{meta.topic}</span>
            <span>建议学习 {meta.minutes}–20 分钟</span>
            <span>自动保存</span>
          </div>
        </header>
        <img
          className="handout-cover"
          src={`../english/${id}.jpg`}
          alt={`本课素材：${meta.sourceTitle}`}
        />
        <p className="lesson-objective">本课目标：{teacher.objective}</p>
        {saveError && (
          <p role="alert" className="save-warning">
            此浏览器暂时无法保存，请先复制你的笔记或在文末下载备份。
          </p>
        )}
        <Section
          number="一"
          title="用英语说出这段话"
          instruction="浏览中文，尝试用现有英语水平说出彩色部分。有能力时尝试表达整段，并记录你的初始版本。"
        >
          <p className="lesson-paragraph chinese-paragraph">
            {lesson.lines.map((line, i) => (
              <span key={line.en}>
                <Mark
                  text={line.zh}
                  focus={teacher.zhFocus[i]}
                  index={i}
                />{' '}
              </span>
            ))}
          </p>
          <details className="quiet-details">
            <summary>记录我的初始表达（可选）</summary>
            <Textarea
              aria-label="初始英语表达"
              placeholder="先用会的英语表达，不会的地方可以暂时留空。"
              value={progress.warmup}
              onChange={(e) =>
                update((p) => ({ ...p, warmup: e.target.value }))
              }
            />
          </details>
        </Section>
        <Section
          number="二"
          title="看无字幕视频"
          instruction="先不看英文。第一遍把握大意，第二遍留意关键词与句子结构，不必听懂每一个词。"
        >
          <StudyVideo id={id} title={meta.subtitle} />
          <details className="quiet-details">
            <summary>老师的小问题：{lesson.quiz.question}</summary>
            <p>{lesson.quiz.why}</p>
          </details>
          <details className="quiet-details">
            <summary>补充：听一小段 BBC 原声</summary>
            <AudioPlayer src={asset('original.m4a')} label="BBC 原声短片段" />
            <p>{lesson.sourceText}</p>
            <p>{lesson.sourceZh}</p>
            <a
              href={`https://www.youtube.com/watch?v=${meta.videoId}&t=${Math.floor(lesson.sourceStart)}`}
              target="_blank"
              rel="noreferrer"
            >
              观看 BBC 官方完整视频 ↗
            </a>
          </details>
        </Section>
        <Section
          number="三"
          title="听音频填空"
          instruction="对照第一部分的中文彩色表达，听辨重点语块。可以暂停、拖动或慢速播放，填完后再检查。"
        >
          <AudioPlayer
            src={asset('practice.m4a')}
            label={`英语 ${meta.number} · 本课完整音频`}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              check();
            }}
          >
            <p className="lesson-paragraph gap-paragraph" lang="en">
              {lesson.lines.map((line, i) => {
                const key = `line-${i}`,
                  offset = line.en.indexOf(line.answer),
                  result = progress.results[key];
                return (
                  <span key={key}>
                    {line.en.slice(0, offset)}
                    <label
                      className={`inline-gap ${result === true ? 'correct' : result === false ? 'incorrect' : ''}`}
                    >
                      <small>({i + 1})</small>
                      <input
                        aria-label={`第 ${i + 1} 空：${line.hint}`}
                        aria-invalid={result === false}
                        style={{
                          width: `${Math.max(8, Math.min(line.answer.length, 25))}ch`,
                        }}
                        value={progress.answers[key] ?? ''}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(e) =>
                          update((p) => {
                            const results = { ...p.results };
                            delete results[key];
                            return {
                              ...p,
                              answers: { ...p.answers, [key]: e.target.value },
                              results,
                            };
                          })
                        }
                      />
                      {result !== undefined && (
                        <span aria-label={result ? '答对' : '再试一次'}>
                          {result ? '✓' : '↺'}
                        </span>
                      )}
                    </label>
                    {line.en.slice(offset + line.answer.length)}{' '}
                  </span>
                );
              })}
            </p>
            <div className="handout-actions">
              <Button type="submit">
                检查答案 <Check size={16} />
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={showAnswers ? () => setShowAnswers(false) : revealAll}
              >
                {showAnswers ? '收起答案' : '查看答案'}
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  update((p) =>
                    lesson.lines.reduce(
                      (n, _, i) => retryAnswer(n, `line-${i}`),
                      p,
                    ),
                  );
                  setShowAnswers(false);
                  setMessage('新一轮听写开始，答案已收起。');
                }}
              >
                重新听写 <RotateCcw size={15} />
              </Button>
            </div>
          </form>
          {message && (
            <p className="inline-feedback" role="status">
              {message}
            </p>
          )}
          {Object.values(progress.results).some((v) => v === false) && (
            <div className="correction-notes">
              {lesson.lines.map(
                (line, i) =>
                  progress.results[`line-${i}`] === false && (
                    <p key={i}>
                      <b>第 {i + 1} 空：</b>
                      {line.hint}。{line.tip}{' '}
                      <AudioPlayer
                        compact
                        src={asset(`line-${i}.mp3`)}
                        label={`重听第 ${i + 1} 句`}
                      />
                    </p>
                  ),
              )}
            </div>
          )}
          {showAnswers && (
            <div className="answer-transcript">
              <p className="answer-label">英文答案 · 彩色部分与中文一一对应</p>
              <p className="lesson-paragraph" lang="en">
                {lesson.lines.map((line, i) => (
                  <span key={i}>
                    <Mark text={line.en} focus={line.answer} index={i} />{' '}
                  </span>
                ))}
              </p>
              <p className="lesson-paragraph chinese-paragraph">
                {lesson.lines.map((line, i) => (
                  <span key={i}>
                    <Mark
                      text={line.zh}
                      focus={teacher.zhFocus[i]}
                      index={i}
                    />{' '}
                  </span>
                ))}
              </p>
            </div>
          )}
        </Section>
        <Section
          number="四"
          title="中英对照"
          instruction="观看有字幕版本，逐句跟读。注意弱读、连读与停顿，直到每句话能够顺畅说出，再尝试遮住英文复述。"
        >
          <StudyVideo id={id} title={meta.subtitle} subtitles />
          <div className="parallel-text">
            {lesson.lines.map((line, i) => (
              <div key={i} className="parallel-line">
                <div>
                  <p lang="en">{line.en}</p>
                  <p>{line.zh}</p>
                  <details className="pronunciation-note">
                    <summary>发音提示</summary>
                    {line.tip}
                  </details>
                </div>
                <AudioPlayer
                  compact
                  src={asset(`line-${i}.mp3`)}
                  label={`第 ${i + 1} 句跟读`}
                />
              </div>
            ))}
          </div>
          <details className="quiet-details">
            <summary>录下自己的跟读（可选）</summary>
            <Recorder label="我的跟读" />
          </details>
        </Section>
        <Section
          number="五"
          title="本期精讲"
          instruction="知识点扫盲，扩充词汇量，积累例句。先理解课文里的用法，再尝试把例句换成自己的内容。"
        >
          <details className="teaching-group" open>
            <summary>
              <h3>语法</h3>
            </summary>
            {lesson.grammar.map((g) => (
              <details open className="knowledge grammar" key={g.title}>
                <summary>
                  <h4>{g.title}</h4>
                </summary>
                <div className="teaching-box">
                  <p>
                    <b>💡 讲解：</b>
                    {g.rule}
                  </p>
                  <p>
                    <b>例句：</b>
                    <span lang="en">{g.example}</span>
                    <br />
                    {g.zh}
                  </p>
                  <p className="teacher-caution">
                    <b>易错提醒：</b>
                    {g.error}
                  </p>
                </div>
              </details>
            ))}
          </details>
          <details className="teaching-group" open>
            <summary>
              <h3>短语</h3>
            </summary>
            {lesson.phrases.map((w, i) => (
              <details open className="knowledge phrase" key={w.text}>
                <summary>
                  <h4>{w.text}</h4>
                </summary>
                <div className="teaching-box">
                  <div className="pronounce-row">
                    <p>
                      <b>💡 音标：</b>
                      <code>{w.ipa}</code>
                    </p>
                    <AudioPlayer
                      compact
                      src={asset(`phrases-${i}.mp3`)}
                      label={w.text}
                    />
                  </div>
                  <p>
                    <b>讲解：</b>
                    {w.zh} {w.note}
                  </p>
                  <p>
                    <b>例句：</b>
                    <span lang="en">{w.example}</span>
                  </p>
                  <p>{teacher.phraseZh[i]}</p>
                  <button
                    className="save-expression"
                    onClick={() =>
                      update((p) => ({
                        ...p,
                        savedWords: p.savedWords.includes(`phrases-${i}`)
                          ? p.savedWords.filter((k) => k !== `phrases-${i}`)
                          : [...p.savedWords, `phrases-${i}`],
                      }))
                    }
                  >
                    {progress.savedWords.includes(`phrases-${i}`)
                      ? '✓ 已收藏'
                      : '＋ 收藏这个表达'}
                  </button>
                </div>
              </details>
            ))}
          </details>
          <details className="teaching-group" open>
            <summary>
              <h3>词汇</h3>
            </summary>
            {lesson.vocab.map((w, i) => (
              <details open className="knowledge vocabulary" key={w.text}>
                <summary>
                  <h4>
                    {i + 1}. {w.text}
                  </h4>
                </summary>
                <div className="teaching-box">
                  <p>
                    <b>💡 词性：</b>
                    {teacher.words[i].pos}
                  </p>
                  <div className="pronounce-row">
                    <p>
                      <b>音标：</b>
                      <code>{w.ipa}</code>
                    </p>
                    <AudioPlayer
                      compact
                      src={asset(`vocab-${i}.mp3`)}
                      label={w.text}
                    />
                  </div>
                  <p>
                    <b>释义：</b>
                    {w.zh.replace(/^[a-z. /]+\s/, '')}
                  </p>
                  <p>
                    <b>近义表达：</b>
                    {teacher.words[i].synonym}
                  </p>
                  <p>
                    <b>来龙去脉：</b>
                    {teacher.words[i].story}
                  </p>
                  <p>
                    <b>例句：</b>
                    <span lang="en">{w.example}</span>
                  </p>
                  <p>{teacher.wordExampleZh[i]}</p>
                  <p>
                    <b>发音提醒：</b>
                    {w.note}
                  </p>
                </div>
              </details>
            ))}
          </details>
        </Section>
        <Section
          number="六"
          title="文本回顾"
          instruction="用结构化思维理解英语表达，替换逐字翻译的习惯。想表达观点时，调用下面的句式模板，填入自己的内容。"
        >
          <div className="review-teaching-box">
            {teacher.reviews.map((r, i) => (
              <article key={r.title}>
                <h3>
                  📕 模板{['一', '二', '三'][i]}：{r.title}
                </h3>
                <p>{r.explain}</p>
                <ol>
                  <li>
                    <b>公式：</b>
                    <code>{r.formula}</code>
                  </li>
                  <li>
                    <b>例：</b>
                    <span lang="en">{r.example}</span>
                    <br />
                    {r.zh}
                  </li>
                  <li>
                    <b>应用：</b>
                    <span lang="en">{r.application}</span>
                    <br />
                    {r.applicationZh}
                  </li>
                </ol>
              </article>
            ))}
          </div>
          <div className="handout-writing">
            <label htmlFor="my-paragraph">
              <b>试着说你自己的版本</b>
            </label>
            <p>{lesson.outputPrompt}</p>
            <Textarea
              id="my-paragraph"
              value={progress.draft}
              placeholder="写两三句就好，内容会自动保存。"
              onChange={(e) => update((p) => ({ ...p, draft: e.target.value }))}
            />
            <details className="quiet-details">
              <summary>老师的参考示例</summary>
              <p lang="en">{lesson.outputSample}</p>
            </details>
            {progress.warmup && (
              <details className="quiet-details">
                <summary>对照学习前的表达</summary>
                <p className="preserve-lines">{progress.warmup}</p>
              </details>
            )}
          </div>
        </Section>
        <Section
          number="七"
          title="相关文化"
          instruction="了解表达背后的交流习惯。语言不只是翻译，也是在具体场景里自然地回应别人。"
        >
          {lesson.culture.map((c) => (
            <article className="culture-note" key={c.title}>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </article>
          ))}
        </Section>
        <footer className="handout-end">
          <p className="bravo">🌷 Well done! 今天的英语积累完成啦。</p>
          <p>不必一次全记住。把今天最喜欢的一句话用出去，就是进步。</p>
          <div className="handout-actions">
            <Button
              variant="outline"
              onClick={() => {
                update((p) => ({ ...p, completed: [0, 1, 2, 3, 4, 5] }));
                setMessage('本课已标记为学过。');
              }}
            >
              {progress.completed.length === 6
                ? '✓ 已标记学过'
                : '标记本课学过'}
            </Button>
            <a
              href={
                id === 'food'
                  ? '../'
                  : `../lesson/?id=${id === 'hello' ? 'routine' : 'food'}`
              }
            >
              {id === 'food' ? '回到课程书架' : '下一课'}{' '}
              <ArrowRight size={15} />
            </a>
          </div>
          <details className="quiet-details">
            <summary>学习记录与素材来源</summary>
            <a href={`../lesson/?id=${id}&mode=review`}>
              错题复习、收藏记录与进度备份 →
            </a>
            <p>
              课文、练习与课件由本站编写，使用英式 AI 朗读；BBC
              原声短片段为独立补充，与本课练习音频明确区分。与 BBC 无隶属关系。
            </p>
            <a
              href={`https://www.youtube.com/watch?v=${meta.videoId}`}
              target="_blank"
              rel="noreferrer"
            >
              {meta.sourceTitle} · BBC Learning English ↗
            </a>
          </details>
        </footer>
      </main>
    </div>
  );
}
