'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AudioPlayer } from '@/components/english-audio';
import { Recorder } from '@/components/english-recorder';
import { handoutCatalog } from '@/lib/handouts/catalog';
import practice from '@/lib/handouts/practice.json';
import books from '@/lib/handouts/books.json';
import {
  PROGRESS_KEY,
  emptyProgress,
  parseProgress,
  isCorrect,
  type Progress,
} from '@/lib/handouts/progress';

function Section({
  n,
  title,
  tip,
  children,
}: {
  n: string;
  title: string;
  tip: string;
  children: ReactNode;
}) {
  return (
    <details className="handout-section" open>
      <summary>
        <h2>
          {n}、{title}
        </h2>
      </summary>
      <div className="section-body">
        <p className="teacher-instruction">{tip}</p>
        {children}
      </div>
    </details>
  );
}
function Highlight({
  text,
  focus,
  index,
}: {
  text: string;
  focus: string;
  index: number;
}) {
  const p = text.indexOf(focus);
  return p < 0 ? (
    <>{text}</>
  ) : (
    <>
      {text.slice(0, p)}
      <mark className={`ink-${index % 8}`}>{focus}</mark>
      {text.slice(p + focus.length)}
    </>
  );
}
function Video({
  id,
  language,
  subtitles = false,
}: {
  id: string;
  language: string;
  subtitles?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    const stop = (e: Event) => {
      if ((e as CustomEvent).detail !== el) el?.pause();
    };
    window.addEventListener('little-english-audio', stop);
    return () => {
      el?.pause();
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
          src={`../handouts/${id}-study.mp4`}
          aria-label={subtitles ? '双语字幕朗读课件' : '无字幕朗读课件'}
          onPlay={() =>
            window.dispatchEvent(
              new CustomEvent('little-english-audio', { detail: ref.current }),
            )
          }
        >
          {subtitles && (
            <track
              default
              kind="subtitles"
              src={`../handouts/${id}-study.vtt`}
              srcLang={language}
              label={language === 'fr' ? '中法对照' : '中英对照'}
            />
          )}
        </video>
        <div className="study-video-title" aria-hidden="true">
          <small>LANGUAGE NOTEBOOK</small>
          <strong>
            {subtitles ? '听一句，跟读一句。' : '先听，不急着看答案。'}
          </strong>
          <span>
            {language === 'fr' ? 'Français · 法国法语' : 'English · 英式英语'} ·{' '}
            {subtitles ? '双语字幕' : '无字幕'}
          </span>
        </div>
      </div>
      <figcaption>
        PDF
        配套合成朗读课件（本机离线制作），不是原视频或真人录音。与本页听写、逐句课文一致。
      </figcaption>
    </figure>
  );
}

export default function HandoutLesson() {
  const [id, setId] = useState<string>('en-classmates');
  const [ready, setReady] = useState(false);
  const meta = handoutCatalog.find((c) => c.id === id) ?? handoutCatalog[0];
  const c = practice.find((c) => c.id === meta.id)!;
  const book = books[meta.id];
  const [p, setP] = useState<Progress>(() => emptyProgress(c.lines.length));
  const [feedback, setFeedback] = useState('');
  const [storageError, setStorageError] = useState('');
  const [search, setSearch] = useState('');
  const [allOpen, setAllOpen] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const lang = meta.language === 'fr' ? '法语' : '英语';
  const audio = (kind: string, i?: number) =>
    `../handouts/${meta.id}-${kind}${i === undefined ? '' : `-${i}`}.${kind === 'practice' ? 'm4a' : 'mp3'}`;
  useEffect(() => {
    const query = new URLSearchParams(location.search).get('id');
    const selected =
      handoutCatalog.find((c) => c.id === query) ?? handoutCatalog[0];
    setId(selected.id);
    const count = practice.find((c) => c.id === selected.id)!.lines.length;
    try {
      setP(
        parseProgress(
          JSON.parse(
            localStorage.getItem(`${PROGRESS_KEY}:${selected.id}`) ?? '{}',
          ),
          count,
          selected.pages,
        ),
      );
      localStorage.setItem('handout-language', selected.language);
    } catch {
      setP(emptyProgress(count));
      setStorageError(
        '浏览器存储不可用或记录损坏；可以继续学习，并导出笔记备份。',
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) document.title = `${meta.title}｜Language Notebook`;
  }, [ready, meta.title]);
  function update(next: Progress) {
    setP(next);
    try {
      localStorage.setItem(`${PROGRESS_KEY}:${meta.id}`, JSON.stringify(next));
      setStorageError('');
    } catch {
      setStorageError('本次记录未能保存到浏览器，请导出备份。');
    }
  }
  function answer(i: number, value: string) {
    const answers = [...p.answers],
      checked = [...p.checked];
    answers[i] = value;
    checked[i] = false;
    update({ ...p, answers, checked });
    setFeedback('');
  }
  function check() {
    const checked = p.answers.map((a) => !!a.trim());
    update({ ...p, checked });
    const attempted = checked.filter(Boolean).length;
    const right = c.lines.filter(
      (l, i) => checked[i] && !p.revealed[i] && isCorrect(p.answers[i], l[3]),
    ).length;
    setFeedback(
      !attempted
        ? '先填一个空就可以开始 🌱'
        : right === c.lines.length
          ? '全部独立答对啦！给认真练习的你一颗星 ⭐'
          : `已检查 ${attempted} 题，独立答对 ${right} 题。没听清的句子再听一次，你正在进步 🌱`,
    );
  }
  function reveal() {
    update({ ...p, revealed: c.lines.map(() => true) });
    setFeedback(
      '参考答案已展开；看过答案的题不会算作独立答对。重新练习可再测一次。',
    );
  }
  function retry() {
    update({
      ...p,
      answers: c.lines.map(() => ''),
      checked: c.lines.map(() => false),
      revealed: c.lines.map(() => false),
    });
    setFeedback('新的一轮开始了，慢一点也没关系。');
  }
  function exportNotes() {
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ version: 2, id: meta.id, progress: p }, null, 2)],
        { type: 'application/json' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.id}-notes.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importNotes(file?: File) {
    if (!file) return;
    try {
      if (file.size > 200000) throw Error();
      const data = JSON.parse(await file.text());
      if (data.version !== 2 || data.id !== meta.id || !data.progress)
        throw Error();
      const restored = parseProgress(
        data.progress,
        c.lines.length,
        book.pages.length,
      );
      if (
        !window.confirm(
          '用这份备份恢复当前课程的笔记与练习？当前课程记录会被替换。',
        )
      )
        return;
      update(restored);
      setFeedback('这门课的备份已恢复。');
    } catch {
      setFeedback('无法导入：请选择当前课程导出的有效备份文件。');
    } finally {
      if (upload.current) upload.current.value = '';
    }
  }
  const filtered = book.pages.filter((page) =>
    page.text.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()),
  );
  const next = handoutCatalog.filter((x) => x.language === meta.language);
  const nextMeta =
    next[(next.findIndex((x) => x.id === meta.id) + 1) % next.length];
  if (!ready)
    return (
      <div className="handout-app">
        <main className="handout">
          <p>正在打开课件…</p>
        </main>
      </div>
    );
  return (
    <div className="handout-app">
      <nav className="handout-nav">
        <a href="../">
          <ArrowLeft size={16} /> 全部{lang}课程
        </a>
        <span>{p.done ? '✓ 已完成精练' : '笔记自动保存在本机'}</span>
      </nav>
      <main className="handout pdf-handout">
        <header className="pdf-course-heading">
          <p className="library-brand">
            {meta.language === 'fr' ? 'FRANÇAIS' : 'ENGLISH'} · {meta.level}
          </p>
          <h1>{meta.title}</h1>
          <p className="course-subtitle">{meta.subtitle}</p>
          <p>{c.objective}</p>
          <p className="source-caption">
            来源：{book.source} · 完整 {book.pages.length} 页<br />
            重点听说练习：{c.sourcePages} · 教师补充：译文、精讲与迁移练习
          </p>
          <a href="#complete-handout">直接阅读完整课件 ↓</a>
        </header>
        {storageError && (
          <p className="teacher-instruction" role="alert">
            {storageError}
          </p>
        )}
        <Section
          n="一"
          title={`用${lang}说出这段话`}
          tip="先读中文，尝试表达彩色部分；不要急着看外语答案。"
        >
          <p className="handout-prose">
            {c.lines.map((l, i) => (
              <span key={i}>
                <Highlight text={l[2]} focus={l[4]} index={i} />{' '}
              </span>
            ))}
          </p>
          <details className="optional-practice">
            <summary>记录我的第一次表达（可选）</summary>
            <Textarea
              aria-label="第一次表达"
              value={p.warmup}
              onChange={(e) => update({ ...p, warmup: e.target.value })}
              placeholder="不会的地方先留空，最后再回来看自己的进步。"
            />
          </details>
        </Section>
        <Section
          n="二"
          title="无字幕盲听"
          tip="先完整听一遍，理解人物在做什么；第二遍再留意陌生表达。"
        >
          <AudioPlayer
            src={audio('practice')}
            label={`${meta.title} · 无字幕盲听`}
          />
        </Section>
        <Section
          n="三"
          title="听音频填空"
          tip="对照中文彩色部分，听辨对应表达。进度条来自真实音频；可减速、拖动或循环播放。"
        >
          <AudioPlayer
            src={audio('practice')}
            label={`${meta.title} · 重点片段`}
          />
          <p className="source-caption">
            忽略大小写和标点；法语重音仍需正确填写。每空对应一种课件表达，不是开放式翻译评分。
          </p>
          <div className="inline-dictation" lang={meta.language}>
            {c.lines.map((l, i) => {
              const at = l[1].indexOf(l[3]);
              const checked = p.checked[i];
              const correct = checked && isCorrect(p.answers[i], l[3]);
              return (
                <span key={i} className="dictation-sentence">
                  {l[1].slice(0, at)}{' '}
                  <span className="blank-group">
                    <label htmlFor={`blank-${i}`} className="blank-number">
                      ({i + 1})
                    </label>
                    <input
                      id={`blank-${i}`}
                      lang={meta.language}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      enterKeyHint="done"
                      spellCheck={false}
                      aria-label={`第 ${i + 1} 空：${l[4]}`}
                      aria-invalid={checked && !correct}
                      className={
                        checked
                          ? correct
                            ? 'answer-right'
                            : 'answer-wrong'
                          : ''
                      }
                      style={{
                        width: `${Math.min(25, Math.max(8, l[3].length * 0.6))}ch`,
                      }}
                      value={p.answers[i] ?? ''}
                      onChange={(e) => answer(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') check();
                      }}
                    />
                    {checked && (
                      <small>
                        {correct ? (p.revealed[i] ? '已参考' : '✓') : '再听听'}
                      </small>
                    )}
                  </span>{' '}
                  {l[1].slice(at + l[3].length)}{' '}
                </span>
              );
            })}
          </div>
          <div className="handout-actions">
            <Button onClick={check}>检查答案</Button>
            <Button variant="outline" onClick={reveal}>
              查看答案
            </Button>
            <Button variant="ghost" onClick={retry}>
              重新练习
            </Button>
          </div>
          <p className="practice-feedback" role="status" aria-live="polite">
            {feedback}
          </p>
          {c.lines.map((l, i) =>
            p.checked[i] && !isCorrect(p.answers[i], l[3]) ? (
              <div key={i} className="retry-line">
                <AudioPlayer
                  src={audio('line', i)}
                  compact
                  label={`第 ${i + 1} 句`}
                />
                <span>
                  第 {i + 1} 空 · {l[4]}
                </span>
              </div>
            ) : null,
          )}
          {p.revealed.some(Boolean) && (
            <div className="answer-reference">
              <h3>参考答案 · 彩色对应</h3>
              <p className="handout-prose" lang={meta.language}>
                {c.lines.map((l, i) => (
                  <span key={i}>
                    <Highlight text={l[1]} focus={l[3]} index={i} />{' '}
                  </span>
                ))}
              </p>
              <p>{c.lines.map((l) => l[2]).join(' ')}</p>
            </div>
          )}
        </Section>
        <Section
          n="四"
          title={meta.language === 'fr' ? '中法对照' : '中英对照'}
          tip="打开字幕，逐句跟读。点击喇叭可单独重听；先模仿语块，再试着整句表达。"
        >
          <Video id={meta.id} language={meta.language} subtitles />
          {c.lines.map((l, i) => (
            <div className="parallel-line" key={i}>
              <div className="parallel-heading">
                <span className="source-caption">
                  {String(i + 1).padStart(2, '0')} · {l[0]}
                </span>
                <AudioPlayer
                  src={audio('line', i)}
                  compact
                  label={`第 ${i + 1} 句`}
                />
              </div>
              <p lang={meta.language}>{l[1]}</p>
              <p className="translation">{l[2]}</p>
            </div>
          ))}
          <details className="optional-practice">
            <summary>录下自己的跟读（可选）</summary>
            <p className="source-caption">
              录音留在本机；请下载保存。这里不做自动发音评分。
            </p>
            <Recorder label={`${meta.title} · 我的跟读`} />
          </details>
        </Section>
        <Section
          n="五"
          title="本期精讲"
          tip="先弄懂重点片段，再展开完整课件，按自己的需要学习其他场景。"
        >
          <h3>语法</h3>
          {c.grammar.map((g, i) => (
            <details className="knowledge-item grammar-note" open key={i}>
              <summary>{g[0]}</summary>
              <div className="knowledge-body">
                <p>
                  <strong>讲解：</strong>
                  {g[1]}
                </p>
                <p lang={meta.language}>
                  <strong>例句：</strong>
                  {g[2]}
                </p>
                <p>{g[3]}</p>
                <p className="teacher-tip">老师提醒：{g[4]}</p>
              </div>
            </details>
          ))}
          <h3>短语</h3>
          {c.phrases.map((item, i) => (
            <details className="knowledge-item phrase-note" open key={i}>
              <summary>{item[0]}</summary>
              <div className="knowledge-body">
                <div className="parallel-heading">
                  <code>{item[1]}</code>
                  <AudioPlayer
                    src={audio('phrases', i)}
                    compact
                    label={item[0]}
                  />
                </div>
                <p>
                  <strong>释义：</strong>
                  {item[2]}
                </p>
                <p>
                  <strong>用法：</strong>
                  {item[3]}
                </p>
              </div>
            </details>
          ))}
          <h3>词汇</h3>
          {c.vocab.map((v, i) => (
            <details className="knowledge-item word-note" open key={i}>
              <summary>
                {i + 1}. {v[0]}
              </summary>
              <div className="knowledge-body">
                <div className="parallel-heading">
                  <code>{v[1]}</code>
                  <AudioPlayer src={audio('vocab', i)} compact label={v[0]} />
                </div>
                <p>
                  <strong>词性：</strong>
                  {v[2]}
                </p>
                <p>
                  <strong>释义：</strong>
                  {v[3]}
                </p>
                <p>
                  <strong>近义 / 相关词：</strong>
                  {v[4]}
                </p>
                <p>
                  <strong>记忆与用法：</strong>
                  {v[5]}
                </p>
              </div>
            </details>
          ))}
          <section id="complete-handout" className="complete-handout">
            <h3>完整课件 · {book.pages.length} 页</h3>
            <p>
              以下保留所提供 PDF
              的全部页面文字，不只是上面的精练片段。按原页码展开阅读；公式已校正排版，精确住址已脱敏。
            </p>
            <div className="source-tools">
              <input
                type="search"
                aria-label="在完整课件中查找"
                placeholder="查找场景、词语或句子…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="outline" onClick={() => setAllOpen(!allOpen)}>
                {allOpen ? '收起全部' : '展开全部'}
              </Button>
            </div>
            <p className="source-caption">
              已读 {p.readPages.length} / {book.pages.length} 页
              {search ? ` · 找到 ${filtered.length} 页` : ''}
            </p>
            {filtered.length === 0 && <p>没有找到，换一个关键词试试。</p>}
            {filtered.map((page) => (
              <details
                className="source-page"
                key={`${page.page}-${allOpen}-${!!search}`}
                open={allOpen || !!search}
              >
                <summary>
                  第 {page.page} 页 ·{' '}
                  {page.text
                    .split('\n')
                    .find((t) => /^(Part \d|Scene|第.+部分|场景)/.test(t)) ??
                    '课件正文'}
                  {p.readPages.includes(page.page) && ' ✓'}
                </summary>
                <div className="source-page-text">{page.text}</div>
                <label className="read-page">
                  <input
                    type="checkbox"
                    checked={p.readPages.includes(page.page)}
                    onChange={(e) =>
                      update({
                        ...p,
                        readPages: e.target.checked
                          ? [...p.readPages, page.page]
                          : p.readPages.filter((n) => n !== page.page),
                      })
                    }
                  />{' '}
                  这一页已读
                </label>
              </details>
            ))}
          </section>
        </Section>
        <Section
          n="六"
          title="文本回顾"
          tip="记住句式，替换成自己的内容。目标不是逐字背诵，而是能在真实情境中调出来。"
        >
          <div className="review-templates">
            {c.reviews.map((r, i) => (
              <article key={i}>
                <h3>
                  模板 {i + 1} · {r[0]}
                </h3>
                <p>
                  <strong>公式：</strong>
                  <code>{r[1]}</code>
                </p>
                <div className="parallel-heading">
                  <p lang={meta.language}>{r[2]}</p>
                  <AudioPlayer
                    src={audio('reviews', i)}
                    compact
                    label={`模板 ${i + 1} 例句`}
                  />
                </div>
                <p>{r[3]}</p>
              </article>
            ))}
          </div>
          <label className="draft-label" htmlFor="final-draft">
            现在换成你自己的情况，说或写 3–5 句
          </label>
          <Textarea
            id="final-draft"
            value={p.draft}
            onChange={(e) => update({ ...p, draft: e.target.value })}
            placeholder="用到两个今天学过的表达，就很好。"
          />
          <p className="source-caption">
            这是自由表达笔记，不做机械的对错判定。自查：意思清楚吗？表达符合自己的真实情况吗？
          </p>
          {p.warmup && (
            <details className="optional-practice">
              <summary>对照学习前的表达</summary>
              <p className="saved-draft">{p.warmup}</p>
            </details>
          )}
        </Section>
        <Section
          n="七"
          title={
            meta.language === 'fr'
              ? '相关法国文化与交流提醒'
              : '相关文化与交流提醒'
          }
          tip="理解使用场景，让表达不仅正确，也更得体。"
        >
          <p className="handout-prose">{c.culture}</p>
        </Section>
        <footer className="handout-finish">
          <h2>{p.done ? '这份精练，已经完成啦 ⭐' : '今天又多会了一点。'}</h2>
          <p>不必一次学完全部课件。下次可以从标记的页面继续。</p>
          <div className="handout-actions">
            <Button onClick={() => update({ ...p, done: !p.done })}>
              {p.done ? '取消精练完成标记' : '标记精练已完成'}
            </Button>
            <a href={`./?id=${nextMeta.id}`}>
              下一门{lang}课 <ArrowRight size={16} />
            </a>
          </div>
          <details className="optional-practice">
            <summary>笔记备份</summary>
            <p>
              仅备份当前课程；更换设备时可导入。浏览器数据不自动跨设备同步。
            </p>
            <div className="handout-actions">
              <Button variant="outline" onClick={exportNotes}>
                导出笔记
              </Button>
              <Button variant="outline" onClick={() => upload.current?.click()}>
                导入备份
              </Button>
              <input
                hidden
                ref={upload}
                type="file"
                accept=".json,application/json"
                onChange={(e) => void importNotes(e.target.files?.[0])}
              />
            </div>
          </details>
        </footer>
      </main>
    </div>
  );
}
