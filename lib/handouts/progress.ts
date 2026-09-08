export const PROGRESS_KEY = 'language-handouts-v2';
export type Progress = {
  answers: string[];
  checked: boolean[];
  revealed: boolean[];
  warmup: string;
  draft: string;
  readPages: number[];
  done: boolean;
};
export function emptyProgress(count: number): Progress {
  return {
    answers: Array(count).fill(''),
    checked: Array(count).fill(false),
    revealed: Array(count).fill(false),
    warmup: '',
    draft: '',
    readPages: [],
    done: false,
  };
}
export function parseProgress(
  value: unknown,
  count: number,
  pageCount: number,
): Progress {
  const p =
    value && typeof value === 'object' ? (value as Partial<Progress>) : {};
  const text = (s: unknown) => (typeof s === 'string' ? s.slice(0, 20000) : '');
  return {
    answers: Array.from({ length: count }, (_, i) =>
      text(p.answers?.[i]).slice(0, 500),
    ),
    checked: Array.from({ length: count }, (_, i) => p.checked?.[i] === true),
    revealed: Array.from({ length: count }, (_, i) => p.revealed?.[i] === true),
    warmup: text(p.warmup),
    draft: text(p.draft),
    done: p.done === true,
    readPages: Array.isArray(p.readPages)
      ? [
          ...new Set(
            p.readPages.filter(
              (n) => Number.isInteger(n) && n > 0 && n <= pageCount,
            ),
          ),
        ]
      : [],
  };
}
export function normalizeAnswer(value: string) {
  return value
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\byou're\b/g, 'you are')
    .replace(/\bwe're\b/g, 'we are')
    .replace(/\bdon't\b/g, 'do not')
    .replace(/\bdoesn't\b/g, 'does not')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
export function isCorrect(input: string, answer: string) {
  return !!input.trim() && normalizeAnswer(input) === normalizeAnswer(answer);
}
