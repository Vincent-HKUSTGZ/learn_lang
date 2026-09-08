import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const read = (p) =>
  fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
async function load(p) {
  return import(
    'data:text/javascript;base64,' +
      Buffer.from(
        ts.transpileModule(read(p), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      ).toString('base64')
  );
}
const { emptyProgress, parseProgress, isCorrect, PROGRESS_KEY } = await load(
  'lib/handouts/progress.ts',
);
const { handoutCatalog } = await load('lib/handouts/catalog.ts');
const courses = json('lib/handouts/practice.json'),
  books = json('lib/handouts/books.json'),
  manifest = json('lib/handouts/audio-manifest.json');
assert.equal(handoutCatalog.length, 6);
for (const lang of ['en', 'fr'])
  assert.equal(handoutCatalog.filter((c) => c.language === lang).length, 3);
assert.equal(
  Object.values(books).reduce((n, b) => n + b.pages.length, 0),
  95,
);
assert(isCorrect('  BY THE WAY! ', 'by the way'));
assert(isCorrect("c'est bien ça", 'c’est bien ça'));
assert(isCorrect('D’ACCORD', 'D’accord'));
assert(isCorrect('re\u0301pe\u0301ter', 'répéter'));
assert(!isCorrect('repeter', 'répéter'));
assert(!isCorrect('', 'go ahead'));
assert(!isCorrect('go away', 'go ahead'));
assert.deepEqual(parseProgress(null, 5, 23), emptyProgress(5));
const corrupt = parseProgress(
  {
    answers: [4, 'hello'],
    checked: ['true', true],
    revealed: null,
    readPages: [0, 1, 1, 100, '2'],
    draft: 7,
  },
  5,
  23,
);
assert.deepEqual(corrupt.readPages, [1]);
assert.deepEqual(corrupt.answers, ['', 'hello', '', '', '']);
assert.equal(corrupt.draft, '');
const keys = handoutCatalog.map((c) => `${PROGRESS_KEY}:${c.id}`);
assert.equal(new Set(keys).size, 6);
assert(!keys.includes('little-english-v1'));
const normalize = (s) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
let clips = 0,
  lines = 0;
for (const meta of handoutCatalog) {
  const c = courses.find((c) => c.id === meta.id),
    b = books[meta.id],
    m = manifest[meta.id];
  assert(c && b && m);
  assert.equal(b.pages.length, meta.pages);
  assert.deepEqual(
    b.pages.map((p) => p.page),
    Array.from({ length: meta.pages }, (_, i) => i + 1),
  );
  assert(b.pages.every((p) => p.text.length > 100));
  assert.equal(m.timeline.length, c.lines.length);
  assert.equal(m.language, meta.language);
  assert(m.voice.includes(meta.language === 'fr' ? 'fr_FR' : 'en_GB'));
  assert(Math.abs(m.duration - m.timeline.at(-1).end) < 0.15);
  const source = normalize(b.pages.map((p) => p.text).join(' '));
  const files = ['practice.m4a', 'study.mp4', 'study.vtt'];
  c.lines.forEach((l, i) => {
    assert.equal(l.length, 5);
    assert(l[1].includes(l[3]));
    assert(l[2].includes(l[4]));
    assert(
      source.includes(normalize(l[1])),
      `${c.id} line ${i} must come from supplied PDF`,
    );
    assert(isCorrect(l[3], l[3]));
    assert(m.timeline[i].end > m.timeline[i].start);
    if (i) assert(Math.abs(m.timeline[i].start - m.timeline[i - 1].end) < 0.01);
    files.push(`line-${i}.mp3`);
    lines++;
  });
  for (const kind of ['phrases', 'vocab', 'reviews'])
    c[kind].forEach((item, i) => {
      assert(item.every(Boolean));
      files.push(`${kind}-${i}.mp3`);
    });
  for (const file of files) {
    const buf = fs.readFileSync(
      new URL(`../public/handouts/${c.id}-${file}`, import.meta.url),
    );
    assert(
      buf.length > (file.endsWith('vtt') ? 100 : 1000),
      `${file} must contain real media`,
    );
    if (file.endsWith('mp3')) clips++;
  }
  assert.equal(
    (read(`public/handouts/${c.id}-study.vtt`).match(/-->/g) || []).length,
    c.lines.length,
  );
}
const source = read('lib/handouts/books.json');
assert(!/rue de la Marne|马恩街|18号/.test(source));
assert(
  source.includes('18 h 45'),
  'Privacy redaction must preserve unrelated time examples',
);
assert(source.includes('E₀ = 42.'));
assert(source.includes('E₀ = (1 + p)/p².'));
assert(source.includes('½ Var(Y(Z))'));
const component = read('components/handout-lesson.tsx');
assert.equal((component.match(/<Section\s+n=/g) || []).length, 7);
assert(
  /!p\.revealed\[i\]\s*&&\s*isCorrect/.test(component),
  'No independent credit after revealing',
);
assert(component.includes('readPages'));
assert(component.includes('aria-live="polite"'));
assert.equal(clips, 88);
assert.equal(lines, 40);
console.log(
  `PASS: 6 courses / 95 pages / ${lines} source-aligned blanks / ${clips} voice clips / 6 timing-aligned videos; language isolation, answers, accents, privacy, formula and seven-section checks.`,
);
