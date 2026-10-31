import { readFileSync, writeFileSync } from "node:fs";
import Ajv from "ajv";
const root = new URL("../", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const source = read("data/imports/spongebob-mystery-01.curated.json");
if (
  source.format !== "hikma-subtitle-curated-v1" ||
  source.cards.length !== 24 ||
  source.transcript.length !== 23
)
  throw Error("字幕资料结构不符合预期");
const lines = new Map(source.transcript.map((l) => [l.id, l]));
lines.set("TITLE", {
  arabic: source.arabicTitle,
  chinese: "海绵宝宝：神秘顾客01",
});
if (lines.size !== 24) throw Error("字幕行ID重复");
const key = (c) => `${source.id}-${c.key}`;
const knowledge = source.cards.map((c) => {
  const examples = c.titleExample ? ["TITLE"] : c.lineIds;
  if (!examples.length) throw Error(`${c.key} 缺少原文例句`);
  return {
    id: key(c),
    date: source.sourceDate,
    category: `神秘顾客01 · ${c.highlight ? "重点词与动词" : "场景词汇"}`,
    arabic: c.arabic,
    meaning: c.meaning,
    ...(c.root ? { root: c.root } : {}),
    ...(c.form ? { form: c.form.trim() } : {}),
    ...(c.verb ? { verb: c.verb } : {}),
    grammar: c.grammar,
    vocabulary: {
      partOfSpeech: c.partOfSpeech,
      variety: "现代标准阿拉伯语（动画译制字幕，未核音）",
      ...(c.noun ? { noun: c.noun } : {}),
      phrases: [
        {
          ...c.phrase,
          note: "台词搭配（整理形式，非逐字引文）",
          kind: c.preposition ? "verb-preposition" : "phrase",
        },
      ],
      sources: [
        {
          label: source.title,
          note: `用户对话提供字幕；资料标注日期${source.sourceDate}，入库日期${source.importedDate}。原台词按提供内容保留，未据音频核对。`,
        },
      ],
      usage: {
        register: "动画对话／日常表达",
        interpretation: "可用于寻找地点、邀请、描述持续状态等口语情景。",
        note: c.note || "词形为学习整理；字幕例句和中文译文保留所提供内容。",
      },
    },
    examples: examples.map((id) => {
      const l = lines.get(id);
      if (!l) throw Error(`未知字幕行 ${id}`);
      return {
        arabic: l.arabic,
        chinese: l.chinese,
        context:
          id === "TITLE"
            ? "用户提供标题（未核音）"
            : `原字幕 ${id}（用户提供，未核音）`,
      };
    }),
    ...(c.note ? { confusion: c.note } : {}),
  };
});
const byKey = new Map(knowledge.map((k, i) => [source.cards[i].key, k]));
for (const [a, b] of [
  ["mahjur", "empty"],
  ["empty", "mahjur"],
]) {
  const k = byKey.get(a),
    other = byKey.get(b);
  k.vocabulary.relations = [
    {
      arabic: other.arabic,
      chinese: other.meaning,
      knowledgeId: other.id,
      relation: "related",
      distinction: "空的与被遗弃的侧重点不同；非严格近义词，须结合场所状态。",
    },
  ];
}
// Attach reference information only to the relevant linguistic distinctions.
byKey.get("catch").vocabulary.sources.push({
  label: "开罗阿拉伯语科学院 · مسك 词条",
  url: "https://www.arabicacademy.gov.eg/ar/search_engine/roots/%D9%85%D8%B3%D9%83",
  note: "词典区分 أمسك بـ（抓住）与 أمسك عن（停止、克制）；不是本片台词来源。",
});
byKey.get("still").vocabulary.sources.push({
  label: "半岛阿语教学 · كان وأخواتها",
  url: "https://learning.aljazeera.net/tr/node/19582",
  note: "核对不完全动词的主格主语和宾格谓语；不是本片字幕来源。",
});
const questions = [];
function question(c, suffix, type, prompt, answer, explanation, distractors) {
  const options = [answer];
  for (const d of distractors)
    if (d && !options.includes(d)) {
      options.push(d);
      if (options.length === 4) break;
    }
  if (options.length < 4) throw Error(`${c.key}/${suffix}: 不足4个独立选项`);
  const position = questions.length % 4;
  options.splice(position, 0, options.shift());
  questions.push({
    id: `${key(c)}-${suffix}`,
    knowledgeId: key(c),
    type,
    grading: "choice",
    prompt,
    answer,
    options,
    explanation,
  });
}
const forms = source.cards
  .flatMap((c) => [
    c.verb?.present,
    c.verb?.past,
    c.verb?.imperative,
    c.conjugation?.answer,
  ])
  .filter(Boolean);
const roots = [...new Set(source.cards.map((c) => c.root).filter(Boolean))];
for (const [i, c] of source.cards.entries()) {
  const pool = [
    ...source.cards.slice(i + 1),
    ...source.cards.slice(0, i),
  ].filter(
    (other) =>
      !(
        ["mahjur", "empty"].includes(c.key) &&
        ["mahjur", "empty"].includes(other.key)
      ),
  );
  question(
    c,
    "ar-choice",
    "ar-choice",
    `选择这个词或表达在本片中的意思：${c.arabic}`,
    c.meaning,
    `本片中 ${c.arabic} 对应“${c.meaning}”。${c.note || c.grammar}`,
    pool.map((x) => x.meaning),
  );
  question(
    c,
    "zh-choice",
    "zh-fill",
    `选择“${c.meaning}”对应的本片阿语词或表达。`,
    c.arabic,
    `本片对应表达是 ${c.arabic}。${c.grammar}`,
    pool.map((x) => x.arabic),
  );
  const line = lines.get(c.cloze.lineId);
  if (!line || !line.arabic.includes(c.cloze.answer))
    throw Error(`${c.key}: 填空答案不在原台词内`);
  question(
    c,
    "context",
    "context-fill",
    `补全${c.cloze.lineId === "TITLE" ? "标题" : "原台词"}：${line.arabic.replace(c.cloze.answer, "____")}\n${line.chinese}`,
    c.cloze.answer,
    `原文：${line.arabic}\n中文：${line.chinese}\n${c.grammar}`,
    pool.map((x) => x.cloze.answer),
  );
  if (c.conjugation)
    question(
      c,
      "form",
      "conjugation",
      c.conjugation.prompt,
      c.conjugation.answer,
      c.grammar,
      forms,
    );
  if (c.preposition)
    question(
      c,
      "preposition",
      "preposition",
      c.preposition.prompt,
      c.preposition.answer,
      c.preposition.explanation,
      ["بِـ", "إِلَى", "إِلَيْنَا", "مِنَّا", "بِهِ", "عَنْ", "عَلَى"],
    );
  if (c.root)
    question(
      c,
      "root",
      "root",
      `选择 ${c.arabic} 的词根。`,
      c.root,
      `${c.arabic} 的词根为 ${c.root}。本题只考查已整理的词条，不为借词或固定命令表达机械推断词根。`,
      roots,
    );
}
const pack = {
  schemaVersion: 1,
  id: source.id,
  title: source.title,
  knowledge,
  questions,
};
const validate = new Ajv({ allErrors: true }).compile(
  read("src/knowledge-pack.schema.json"),
);
if (!validate(pack)) throw Error(JSON.stringify(validate.errors));
const ids = new Set(knowledge.map((k) => k.id));
if (
  ids.size !== knowledge.length ||
  new Set(questions.map((q) => q.id)).size !== questions.length ||
  questions.some((q) => !ids.has(q.knowledgeId))
)
  throw Error("转换后ID或关联无效");
const report = {
  sourceTitle: source.title,
  sourceDate: source.sourceDate,
  importedDate: source.importedDate,
  counts: {
    sourceLines: source.transcript.length,
    focus: source.cards.filter((c) => c.highlight).length,
    supplementary: source.cards.filter((c) => !c.highlight).length,
    verbs: source.cards.filter((c) => c.verb).length,
    knowledge: knowledge.length,
    questions: questions.length,
  },
  notes: [
    source.sourceNote,
    "字幕与学习词形分开保存；不适用或存疑的动词形式留空并注明。",
    "原12个重点的具体清单未提供，本包选择12项作为重点，并补充12项场景词汇。",
  ],
  verbCoverage: source.cards
    .filter((c) => c.verb)
    .map((c) => ({ id: key(c), arabic: c.arabic, lineIds: c.lineIds })),
  transcript: source.transcript,
};
for (const [path, data] of [
  ["src/data/spongebob-mystery-01.json", pack],
  ["src/data/spongebob-mystery-01.report.json", report],
])
  writeFileSync(new URL(path, root), JSON.stringify(data, null, 2) + "\n");
console.log(
  `Converted ${report.counts.sourceLines} subtitle lines → ${knowledge.length} cards / ${questions.length} choice questions; schema validated.`,
);
