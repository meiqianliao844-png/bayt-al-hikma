import type { Knowledge, Question, State } from "./core";
import { normalize, today, intervals } from "./core";
export type WordProgress = {
  stage: number;
  due: string;
  seen: number;
  lastKnown: boolean;
};
/** Presentation adapter only: original question IDs/content/history stay intact. */
export function choiceOnly(
  questions: Question[],
  knowledge: Knowledge[],
  pool = questions,
): Question[] {
  const arabic = (v: string) => /[\u0600-\u06ff]/.test(v);
  return questions.map((q) => {
    if (q.options?.length && q.options.includes(q.answer))
      return { ...q, grading: "choice" };
    const options = [q.answer],
      seen = new Set([normalize(q.answer)]);
    const add = (v: string) => {
      if (
        v.trim() &&
        arabic(v) === arabic(q.answer) &&
        !seen.has(normalize(v))
      ) {
        seen.add(normalize(v));
        options.push(v);
      }
    };
    const candidates = pool.filter(
      (x) => x.knowledgeId !== q.knowledgeId && x.type === q.type,
    );
    // Keep reference variants of the same answer out of the distractors.
    const accepted = new Set(
      [q.answer, ...(q.acceptedAnswers || [])].map(normalize),
    );
    for (const x of candidates) {
      if (!accepted.has(normalize(x.answer))) add(x.answer);
      if (options.length === 4) break;
    }
    if (options.length < 4)
      for (const k of knowledge.filter((k) => k.id !== q.knowledgeId)) {
        add(arabic(q.answer) ? k.arabic : k.meaning);
        if (options.length === 4) break;
      }
    if (options.length < 2) options.push("以上均不符合");
    return { ...q, grading: "choice", options };
  });
}
export function recordWord(
  s: State,
  id: string,
  known: boolean,
  date = today(),
): State {
  if (!s.knowledge.some((k) => k.id === id)) throw Error("知识点不存在");
  const old = s.wordProgress?.[id],
    stage = known ? Math.min((old?.stage ?? -1) + 1, 4) : 0;
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + intervals[stage]);
  const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    ...s,
    wordProgress: {
      ...(s.wordProgress || {}),
      [id]: { stage, due, seen: (old?.seen || 0) + 1, lastKnown: known },
    },
  };
}
export function saveAnnotation(s: State, id: string, note: string): State {
  if (!s.knowledge.some((k) => k.id === id)) throw Error("知识点不存在");
  if (note.length > 20000) throw Error("批注不能超过 20000 字符");
  const annotations = { ...(s.annotations || {}) };
  if (note.trim()) annotations[id] = note;
  else delete annotations[id];
  return { ...s, annotations };
}

/** The review plan is a view of the saved flashcard progress, never question progress. */
export function wordReviewPlan(s: State, date = today()) {
  return s.knowledge
    .flatMap((k) => {
      const progress = s.wordProgress?.[k.id];
      return progress
        ? [{ knowledge: k, ...progress, overdue: progress.due <= date }]
        : [];
    })
    .sort(
      (a, b) =>
        a.due.localeCompare(b.due) ||
        a.knowledge.id.localeCompare(b.knowledge.id),
    );
}
