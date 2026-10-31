import Ajv from "ajv";
import { completeNounNumbers } from "./noun-numbers.mjs";
import { installSupplement } from "./supplement";
import type { WordProgress } from "./study";
import type { Vocabulary, VerbForms } from "./vocabulary";
import schema from "./knowledge-pack.schema.json";
import seed from "./seed.json";
import newsPack from "./data/azerbaijan-school-uniform.json";
import sharedFuturePack from "./data/shared-future.json";
import expressionsPack from "./data/foldable-expressions.json";
import literaturePack from "./data/arabic-literature-lesson-01.json";
import foldablePack from "./data/foldable-tech.json";
import mystery02Pack from "./data/spongebob-mystery-02.json";
import mysteryPack from "./data/spongebob-mystery-01.json";
import spongePack from "./data/spongebob-01.json";
import spongeReport from "./data/spongebob-01.report.json";
import { isPortableNews, convertPortableNews } from "./portable-news.mjs";
export type Knowledge = {
  id: string;
  arabic: string;
  meaning: string;
  date: string;
  category: string;
  root?: string;
  form?: string;
  verb?: VerbForms;
  vocabulary?: Vocabulary;
  collocations?: string[];
  examples?: {
    arabic: string;
    chinese: string;
    context?: string;
    variety?: string;
    audioUrl?: string;
  }[];
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
  grading?: "choice" | "exact" | "self";
  acceptedAnswers?: string[];
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
export type JournalEntry = { text: string; mood: string; weather: string };
export type State = {
  journal?: Record<string, JournalEntry>;
  version: 1;
  installedPacks?: string[];
  wordProgress?: Record<string, WordProgress>;
  annotations?: Record<string, string>;
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
  if (isPortableNews(data)) data = convertPortableNews(data).pack;
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
    if (
      [k.audioUrl, ...(k.examples || []).map((e) => e.audioUrl)].some(
        (url) => url && !/^https:\/\//.test(url),
      )
    )
      throw new Error("真人音频必须使用 HTTPS 地址");
  }
  for (const q of pack.questions) {
    if (!ids.has(q.knowledgeId))
      throw new Error(`题目 ${q.id} 引用了不存在的知识点`);
    if (
      gradingMode(q) === "choice" &&
      (!q.options || !q.options.includes(q.answer))
    )
      throw new Error(`题目 ${q.id} 必须包含选项及正确答案`);
  }
  for (const q of pack.questions) {
    if (
      ["ar-zh", "interpretation", "grammar"].includes(q.type) &&
      q.grading &&
      q.grading !== "self"
    )
      throw new Error(`题目 ${q.id} 为开放式题目，必须自评`);
    if (
      q.grading === "exact" &&
      ![
        "conjugation",
        "noun-number",
        "root",
        "preposition",
        "context-fill",
        "zh-fill",
      ].includes(q.type)
    )
      throw new Error(`题目 ${q.id} 不支持精确匹配评分`);
  }
  return pack;
}
export const initialState = (): State =>
  installBundledPacks({
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
// Only fields supplied by the new pack change. Empty arrays mean “no new
// material”, not deletion. The editor remains the explicit replacement path.
function enrich(old: unknown, incoming: unknown): unknown {
  if (Array.isArray(old) && Array.isArray(incoming)) {
    const key = (x: unknown): string => {
      if (typeof x === "string") return x;
      const o = x as Record<string, unknown>;
      if (typeof o.arabic === "string")
        return `${o.arabic}|${o.relation || o.kind || ""}`;
      if (typeof o.pronoun === "string") return o.pronoun;
      if (typeof o.label === "string") return o.label;
      return JSON.stringify(x);
    };
    const map = new Map(old.map((x) => [key(x), x]));
    incoming.forEach((x) => {
      const k = key(x);
      map.set(k, map.has(k) ? enrich(map.get(k), x) : x);
    });
    return [...map.values()];
  }
  if (
    old &&
    incoming &&
    typeof old === "object" &&
    typeof incoming === "object" &&
    !Array.isArray(old) &&
    !Array.isArray(incoming)
  ) {
    const out = { ...old } as Record<string, unknown>;
    for (const [key, value] of Object.entries(incoming)) {
      if (["__proto__", "prototype", "constructor"].includes(key)) continue;
      out[key] = key in out ? enrich(out[key], value) : value;
    }
    return out;
  }
  return incoming;
}
export function mergePack(state: State, pack: Pack, update: boolean): State {
  const knowledge = new Map(state.knowledge.map((k) => [k.id, k]));
  for (const k of pack.knowledge) {
    const old = knowledge.get(k.id);
    if (!old || update)
      knowledge.set(k.id, old ? (enrich(old, k) as Knowledge) : k);
  }
  const questions = new Map(state.questions.map((q) => [q.id, q]));
  // Questions are atomic: merging choices would silently change grading.
  for (const q of pack.questions)
    if (update || !questions.has(q.id)) questions.set(q.id, q);
  return {
    ...state,
    knowledge: completeNounNumbers([...knowledge.values()]),
    questions: [...questions.values()],
  };
}
export function gradingMode(q: Question): "choice" | "exact" | "self" {
  if (q.grading) return q.grading;
  if (["zh-ar", "ar-choice", "preposition", "synonym"].includes(q.type))
    return "choice";
  if (
    [
      "conjugation",
      "noun-number",
      "root",
      "derivation",
      "antonym",
      "context-fill",
    ].includes(q.type) &&
    q.options
  )
    return "choice";
  return "self";
}
export function checkAnswer(q: Question, answer: string): boolean {
  const mode = gradingMode(q);
  if (mode === "choice") return answer === q.answer;
  if (mode === "exact")
    return [q.answer, ...(q.acceptedAnswers || [])].some(
      (a) => normalize(a) === normalize(answer),
    );
  throw new Error("开放式题目应对照参考答案自评");
}
export const bundledNews = parsePack(newsPack);
export const bundledSponge = parsePack(spongePack);
export const bundledSharedFuture = parsePack(sharedFuturePack);
export const bundledMystery = parsePack(mysteryPack);
export const bundledMystery02 = parsePack(mystery02Pack);
export const bundledFoldable = parsePack(foldablePack);
export const bundledLiterature = parsePack(literaturePack);
export const bundledExpressions = parsePack(expressionsPack);
export const bundledCollections = [
  {
    pack: bundledExpressions,
    title: "科技手机 · 词组与长句精读",
    verbs: 0,
    terms: 30,
    viewLabel: "查看科技词组与长句",
    download: "foldable-expressions",
    note: "20组词组句型、10组原文长句精读，附逐项拆解和90道选择题。保留原有26项重点及学习记录；报道事实未核实。",
    reviewNotes: [] as { source: string; note: string }[],
  },
  {
    pack: bundledLiterature,
    title: "阿拉伯文学史第一讲",
    searchQuery: "阿拉伯文学史第一讲",
    verbs: 63,
    terms: 120,
    viewLabel: "查看文学史第一讲",
    download: "arabic-literature-lesson-01",
    note: "183张知识卡、338道选择题：文学概念、蒙昧诗歌、悬诗、诗人、动词与固定搭配。原包仅5张卡附例句；未补造教材原句。",
    reviewNotes: [] as { source: string; note: string }[],
  },
  {
    pack: bundledNews,
    title: "阿塞拜疆校服新闻",
    verbs: 51,
    terms: 55,
    viewLabel: "查看新闻专题",
    download: "azerbaijan-school-uniform",
    note: "例句为教学资料，新闻事实未独立核验。",
    reviewNotes: [] as { source: string; note: string }[],
  },
  {
    pack: bundledSponge,
    title: "海绵宝宝01 · 章鱼哥的单簧管",
    verbs: 54,
    terms: 54,
    viewLabel: "查看海绵宝宝01",
    download: "spongebob-01",
    note: "动画配音学习资料；例句为教学编写，个别字幕待核音。",
    reviewNotes: spongeReport.sourceReviewNotes || [],
  },
  {
    pack: bundledSharedFuture,
    title: "时政阿拉伯语 · 人类命运共同体",
    verbs: 0,
    terms: 85,
    viewLabel: "查看人类命运共同体",
    download: "shared-future",
    note: "中阿语料表共85条，已补充学习标符。文档未附文章全文；第73条笔误已校订并保留原文说明。",
    reviewNotes: [] as { source: string; note: string }[],
  },
  {
    pack: bundledMystery,
    title: "海绵宝宝 · 神秘顾客01",
    verbs: 11,
    terms: 13,
    viewLabel: "查看神秘顾客01",
    download: "spongebob-mystery-01",
    note: "12项重点与12项补充词汇；字幕资料日期为2026-10-03。例句保留用户提供字幕，尚未据音频核对。",
    reviewNotes: [] as { source: string; note: string }[],
  },
  {
    pack: bundledMystery02,
    title: "海绵宝宝 · 神秘顾客02",
    verbs: 25,
    terms: 23,
    viewLabel: "查看神秘顾客02",
    download: "spongebob-mystery-02",
    supplementExisting: true,
    note: "30项新增，18项复用已有卡片并补充台词；未提供音频，疑似语法问题保留原文并另列规范表达。复数均列单数或词组内的单复数关系。",
    reviewNotes: [] as { source: string; note: string }[],
  },
  {
    pack: bundledFoldable,
    title: "科技新闻 · 折叠手机",
    verbs: 16,
    terms: 10,
    viewLabel: "查看折叠手机专题",
    download: "foldable-tech",
    supplementExisting: true,
    note: "附件26个重点：24项新增、2项复用。产品名称、报道与价格未核实；原文、教学例句和方言评论分别标注。",
    reviewNotes: [] as { source: string; note: string }[],
  },
];
/** Install each collection once without replacing user edits or losing old schedules. */
export function installBundledPacks(state: State): State {
  const installed = bundledCollections.reduce((current, collection) => {
    const { pack } = collection;
    if (current.installedPacks?.includes(pack.id)) return current;
    return {
      ...("supplementExisting" in collection && collection.supplementExisting
        ? installSupplement(current, pack)
        : mergePack(current, pack, false)),
      installedPacks: [...(current.installedPacks || []), pack.id],
    };
  }, state);
  const knowledge = completeNounNumbers(installed.knowledge);
  return knowledge === installed.knowledge
    ? installed
    : { ...installed, knowledge };
}
/** Mark installation once, retaining both users' records and intentional deletions.
 * No save during load: a quota error must never replace the user's stored state. */
export function installBundledNews(state: State): State {
  if (state.installedPacks?.includes(bundledNews.id)) return state;
  const next = mergePack(state, bundledNews, false);
  return {
    ...next,
    installedPacks: [...(state.installedPacks || []), bundledNews.id],
  };
}
export function removeKnowledge(s: State, id: string): State {
  const removed = new Set(
    s.questions.filter((q) => q.knowledgeId === id).map((q) => q.id),
  );
  return {
    ...s,
    knowledge: s.knowledge.filter((k) => k.id !== id),
    ...(s.wordProgress
      ? {
          wordProgress: Object.fromEntries(
            Object.entries(s.wordProgress).filter(([key]) => key !== id),
          ),
        }
      : {}),
    ...(s.annotations
      ? {
          annotations: Object.fromEntries(
            Object.entries(s.annotations).filter(([key]) => key !== id),
          ),
        }
      : {}),
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
  if (
    s.installedPacks !== undefined &&
    (!Array.isArray(s.installedPacks) ||
      !s.installedPacks.every((id) => typeof id === "string"))
  )
    throw new Error("备份知识包安装记录无效");
  for (const [field, values] of [
    ["wordProgress", s.wordProgress],
    ["annotations", s.annotations],
    ["journal", s.journal],
  ] as const) {
    if (
      values !== undefined &&
      (!values || typeof values !== "object" || Array.isArray(values))
    )
      throw Error(`备份 ${field} 无效`);
  }
  for (const [id, p] of Object.entries(s.wordProgress || {}))
    if (
      !s.knowledge.some((k) => k.id === id) ||
      !p ||
      !Number.isInteger(p.stage) ||
      p.stage < 0 ||
      p.stage > 4 ||
      !validDate(p.due) ||
      !Number.isInteger(p.seen) ||
      p.seen < 1 ||
      typeof p.lastKnown !== "boolean"
    )
      throw Error("背词进度无效");
  for (const [id, note] of Object.entries(s.annotations || {}))
    if (
      !s.knowledge.some((k) => k.id === id) ||
      typeof note !== "string" ||
      note.length > 20000
    )
      throw Error("批注数据无效");
  for (const [date, entry] of Object.entries(s.journal || {}))
    if (!validDate(date) || !validJournalEntry(entry))
      throw Error("每日小记数据无效");
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
    return raw
      ? installBundledPacks(parseBackup(JSON.parse(raw)))
      : initialState();
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

export function validJournalEntry(value: unknown): value is JournalEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const e = value as JournalEntry;
  return (
    typeof e.text === "string" &&
    e.text.length <= 20000 &&
    typeof e.mood === "string" &&
    e.mood.length <= 40 &&
    typeof e.weather === "string" &&
    e.weather.length <= 40 &&
    Boolean(e.text.trim() || e.mood || e.weather)
  );
}
export function saveJournal(
  s: State,
  date: string,
  entry: JournalEntry,
): State {
  if (!validDate(date) || !validJournalEntry(entry))
    throw Error("请填写有效日期及小记内容、心情或天气");
  return { ...s, journal: { ...s.journal, [date]: { ...entry } } };
}
