import Ajv from "ajv";
import schema from "./knowledge-pack.schema.json";
import seed from "./seed.json";
export type Knowledge = {
  id: string;
  arabic: string;
  meaning: string;
  date: string;
  category: string;
  root?: string;
  form?: string;
  verb?: { past: string; present: string; masdar: string };
  collocations?: string[];
  examples?: { arabic: string; chinese: string }[];
  grammar?: string;
  confusion?: string;
  scenario?: string;
  pauseNote?: string;
  audioUrl?: string;
};
export type Question = {
  id: string;
  knowledgeId: string;
  type: string;
  prompt: string;
  answer: string;
  explanation: string;
  options?: string[];
  rubric?: string[];
};
export type Pack = {
  schemaVersion: 1;
  id: string;
  title: string;
  knowledge: Knowledge[];
  questions: Question[];
};
export type Progress = {
  stage: number;
  due: string;
  errors: number;
  attempts: number;
  lastAnswer: string;
  lastCorrect: boolean;
};
export type State = {
  version: 1;
  knowledge: Knowledge[];
  questions: Question[];
  favorites: string[];
  progress: Record<string, Progress>;
  history: {
    questionId: string;
    answer: string;
    correct: boolean;
    at: string;
  }[];
};
export const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const validate = new Ajv({ allErrors: true }).compile(schema);
export function parsePack(data: unknown, existingIds: string[] = []): Pack {
  if (!validate(data))
    throw new Error(
      (validate.errors || [])
        .map((e) => `${e.instancePath || "/"} ${e.message}`)
        .join("；"),
    );
  const pack = data as Pack;
  for (const list of [pack.knowledge, pack.questions])
    if (new Set(list.map((x) => x.id)).size !== list.length)
      throw new Error("同一知识包中存在重复 ID");
  for (const item of [...pack.knowledge, ...pack.questions])
    if (["__proto__", "constructor", "prototype"].includes(item.id))
      throw new Error("ID 为系统保留名称");
  const ids = new Set([...existingIds, ...pack.knowledge.map((k) => k.id)]);
  for (const k of pack.knowledge) {
    if (!validDate(k.date)) throw new Error("学习日期无效");
    if (k.audioUrl && !/^https:\/\//.test(k.audioUrl))
      throw new Error("真人音频必须使用 HTTPS 地址");
  }
  for (const q of pack.questions) {
    if (!ids.has(q.knowledgeId))
      throw new Error(`题目 ${q.id} 引用了不存在的知识点`);
    if (
      ["zh-ar", "ar-choice", "preposition", "synonym"].includes(q.type) &&
      (!q.options || !q.options.includes(q.answer))
    )
      throw new Error(`题目 ${q.id} 必须包含选项及正确答案`);
  }
  return pack;
}
export const initialState = (): State => ({
  version: 1,
  knowledge: seed.knowledge,
  questions: seed.questions,
  favorites: [],
  progress: {},
  history: [],
});
export const intervals = [1, 3, 7, 14, 30];
export function recordAnswer(
  state: State,
  q: Question,
  answer: string,
  correct: boolean,
  date = today(),
): State {
  const old = state.progress[q.id];
  const stage = correct ? Math.min((old?.stage ?? -1) + 1, 4) : 0;
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + intervals[stage]);
  const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    ...state,
    progress: {
      ...state.progress,
      [q.id]: {
        stage,
        due,
        errors: (old?.errors || 0) + (correct ? 0 : 1),
        attempts: (old?.attempts || 0) + 1,
        lastAnswer: answer,
        lastCorrect: correct,
      },
    },
    history: [
      ...state.history,
      { questionId: q.id, answer, correct, at: new Date().toISOString() },
    ],
  };
}
export function mergePack(state: State, pack: Pack, update: boolean): State {
  const merge = <T extends { id: string }>(a: T[], b: T[]) => {
    const map = new Map(a.map((x) => [x.id, x]));
    b.forEach((x) => {
      if (update || !map.has(x.id)) map.set(x.id, x);
    });
    return [...map.values()];
  };
  return {
    ...state,
    knowledge: merge(state.knowledge, pack.knowledge),
    questions: merge(state.questions, pack.questions),
  };
}
export function removeKnowledge(s: State, id: string): State {
  const removed = new Set(
    s.questions.filter((q) => q.knowledgeId === id).map((q) => q.id),
  );
  return {
    ...s,
    knowledge: s.knowledge.filter((k) => k.id !== id),
    questions: s.questions.filter((q) => !removed.has(q.id)),
    favorites: s.favorites.filter((x) => x !== id),
    progress: Object.fromEntries(
      Object.entries(s.progress).filter(([key]) => !removed.has(key)),
    ),
    history: s.history.filter((h) => !removed.has(h.questionId)),
  };
}
export function parseBackup(data: unknown): State {
  const s = data as State;
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.favorites) ||
    !s.favorites.every((x) => typeof x === "string") ||
    !Array.isArray(s.history) ||
    !s.progress ||
    typeof s.progress !== "object" ||
    Array.isArray(s.progress)
  )
    throw new Error("备份结构不正确");
  parsePack({
    schemaVersion: 1,
    id: "backup",
    title: "backup",
    knowledge: s.knowledge,
    questions: s.questions,
  });
  const ids = new Set(s.questions.map((q) => q.id));
  for (const [key, p] of Object.entries(s.progress)) {
    if (
      !ids.has(key) ||
      !p ||
      !Number.isInteger(p.stage) ||
      p.stage < 0 ||
      p.stage > 4 ||
      !validDate(p.due) ||
      !Number.isInteger(p.errors) ||
      p.errors < 0 ||
      !Number.isInteger(p.attempts) ||
      p.attempts < 1 ||
      typeof p.lastAnswer !== "string" ||
      typeof p.lastCorrect !== "boolean"
    )
      throw new Error("备份复习记录无效");
  }
  if (
    s.history.some(
      (h) =>
        !ids.has(h.questionId) ||
        typeof h.answer !== "string" ||
        typeof h.correct !== "boolean" ||
        typeof h.at !== "string" ||
        !Number.isFinite(Date.parse(h.at)),
    )
  )
    throw new Error("备份答题历史无效");
  if (s.favorites.some((id) => !s.knowledge.some((k) => k.id === id)))
    throw new Error("备份收藏引用不存在的知识点");
  return s;
}
// Future Supabase adapter implements this interface; never put service-role keys in the client.
export interface StudyRepository {
  load(): State;
  save(state: State): void;
}
export const localRepository: StudyRepository = {
  load() {
    const raw = localStorage.getItem("hikma-v1");
    return raw ? parseBackup(JSON.parse(raw)) : initialState();
  },
  save(s) {
    localStorage.setItem("hikma-v1", JSON.stringify(s));
  },
};
export const normalize = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .trim()
    .replace(/\s+/g, " ");

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
