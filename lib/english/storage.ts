export const STORAGE_KEY = 'little-english-v1';
export type LessonProgress = {
  step: number;
  completed: number[];
  answers: Record<string, string>;
  results: Record<string, boolean>;
  revealed: string[];
  mistakes: string[];
  mastered: string[];
  warmup: string;
  draft: string;
  savedWords: string[];
  reviews: Record<string, number>;
  outputChecks: number[];
};
export type LearningState = {
  lessons: Record<string, LessonProgress>;
  activity: string[];
  lastLesson: string;
  sound: boolean;
};
export const emptyLesson = (): LessonProgress => ({
  step: 0,
  completed: [],
  answers: {},
  results: {},
  revealed: [],
  mistakes: [],
  mastered: [],
  warmup: '',
  draft: '',
  savedWords: [],
  reviews: {},
  outputChecks: [],
});
export const emptyState = (): LearningState => ({
  lessons: {},
  activity: [],
  lastLesson: 'hello',
  sound: true,
});
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const uniqueStrings = (value: unknown) =>
  Array.isArray(value)
    ? [...new Set(value.filter((s): s is string => typeof s === 'string'))]
    : [];
const indices = (value: unknown, max: number) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (n): n is number => Number.isInteger(n) && n >= 0 && n < max,
          ),
        ),
      ]
    : [];
export function parseState(raw: unknown): LearningState {
  const input = record(raw),
    state = emptyState();
  for (const id of ['hello', 'routine', 'food']) {
    const item = record(record(input.lessons)[id]);
    if (!Object.keys(item).length) continue;
    const p = emptyLesson();
    p.step =
      typeof item.step === 'number' && Number.isInteger(item.step)
        ? Math.max(0, Math.min(5, item.step))
        : 0;
    p.completed = indices(item.completed, 6);
    p.outputChecks = indices(item.outputChecks, 3);
    p.warmup = typeof item.warmup === 'string' ? item.warmup : '';
    p.draft = typeof item.draft === 'string' ? item.draft : '';
    for (const key of ['revealed', 'mistakes', 'mastered'] as const)
      p[key] = uniqueStrings(item[key]).filter((s) => /^line-[0-7]$/.test(s));
    p.savedWords = uniqueStrings(item.savedWords).filter((s) =>
      /^(phrases|vocab)-[0-3]$/.test(s),
    );
    p.answers = Object.fromEntries(
      Object.entries(record(item.answers)).filter(
        ([k, v]) =>
          /^(line-[0-7]|source-quiz|practice-quiz)$/.test(k) &&
          typeof v === 'string',
      ),
    ) as Record<string, string>;
    p.results = Object.fromEntries(
      Object.entries(record(item.results)).filter(
        ([k, v]) => /^line-[0-7]$/.test(k) && typeof v === 'boolean',
      ),
    ) as Record<string, boolean>;
    p.reviews = Object.fromEntries(
      Object.entries(record(item.reviews)).filter(
        ([k, v]) =>
          /^line-[0-7]$/.test(k) &&
          typeof v === 'number' &&
          Number.isFinite(v) &&
          v >= 0,
      ),
    ) as Record<string, number>;
    state.lessons[id] = p;
  }
  state.activity = uniqueStrings(input.activity).filter((s) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s),
  );
  state.lastLesson = ['hello', 'routine', 'food'].includes(
    String(input.lastLesson),
  )
    ? String(input.lastLesson)
    : 'hello';
  state.sound = input.sound !== false;
  return state;
}
export function readState(): LearningState {
  try {
    return parseState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return emptyState();
  }
}
export function writeState(state: LearningState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\bit's\b/g, 'it is')
    .replace(/\bwhat's\b/g, 'what is')
    .replace(/\bdon't\b/g, 'do not')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function matches(
  value: string,
  answer: string,
  alternatives: string[] = [],
) {
  return [answer, ...alternatives].some(
    (a) => normalise(a) === normalise(value),
  );
}
export function gradeAnswer(
  p: LessonProgress,
  key: string,
  correct: boolean,
): LessonProgress {
  const independent = correct && !p.revealed.includes(key);
  return {
    ...p,
    results: { ...p.results, [key]: correct },
    mastered: independent ? [...new Set([...p.mastered, key])] : p.mastered,
    mistakes: independent
      ? p.mistakes.filter((k) => k !== key)
      : [...new Set([...p.mistakes, ...(!correct ? [key] : [])])],
  };
}
export function revealAnswer(p: LessonProgress, key: string): LessonProgress {
  return {
    ...p,
    revealed: [...new Set([...p.revealed, key])],
    mistakes: [...new Set([...p.mistakes, key])],
  };
}
export function retryAnswer(p: LessonProgress, key: string): LessonProgress {
  const results = { ...p.results };
  delete results[key];
  return {
    ...p,
    answers: { ...p.answers, [key]: '' },
    results,
    revealed: p.revealed.filter((k) => k !== key),
  };
}
