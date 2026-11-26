export interface Question { q: string; options: string[]; answer: number; ref: string; }
export interface Article { id: string; book: BookId; idx: number; title: string; paragraphs: string[]; questions: Question[]; }

export const BOOKS = {
  lee: '李常受文集', nee: '倪柝聲文集', nt: '新約總論', lsnt: '新約生命讀經', lsot: '舊約生命讀經',
} as const;
export type BookId = keyof typeof BOOKS;
export const BOOK_IDS = Object.keys(BOOKS) as BookId[];

const base = import.meta.env.BASE_URL;
const getJson = async <T>(path: string): Promise<T> => {
  const r = await fetch(base + path);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
};

let titles: Promise<Record<BookId, string[]>> | null = null;
let quizIndex: Promise<Record<BookId, number[]>> | null = null;
export const loadTitles = () => (titles ??= getJson('data/titles.json'));
/** Which articles already have questions (only those can be read for an egg). */
export const loadQuizIndex = () => (quizIndex ??= getJson('quiz/index.json'));

export const articleId = (book: BookId, idx: number) => `${book}/${idx}`;

export async function loadArticle(book: BookId, idx: number): Promise<Article> {
  const [raw, quiz] = await Promise.all([
    getJson<{ t: string; b: string }>(`data/${book}/${idx}.json`),
    getJson<{ questions: Question[] }>(`quiz/${book}/${idx}.json`),
  ]);
  const paragraphs = raw.b.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return { id: articleId(book, idx), book, idx, title: raw.t, paragraphs, questions: quiz.questions };
}
