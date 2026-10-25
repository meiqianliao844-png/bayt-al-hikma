import { readFileSync, writeFileSync } from "node:fs";
import Ajv from "ajv";
const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const source = JSON.parse(read("data/imports/shared-future.corpus.json"));
const lines = read("data/imports/shared-future.vocalized.txt")
  .trim()
  .split("\n");
if (
  source.format !== "hikma-bilingual-corpus-v1" ||
  source.records.length !== 85 ||
  lines.length !== 85
)
  throw Error("Unexpected corpus format or row count");
const bare = (s) =>
  s
    .normalize("NFC")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const title = source.title,
  prefix = "shared-future-lesson02";
const categories = [
  [25, "理念与价值"],
  [37, "五个世界与发展"],
  [56, "国际关系与外交"],
  [60, "周边与发展中国家外交"],
  [77, "安全与国际秩序"],
  [85, "中国方案与合作"],
];
const correctionUrl = "https://www.wafa.ps/pages/details/58263";
const correction =
  "原表第73条把“恃强凌弱”写作 استناد الأقوياء على الضعفاء；استناد 表示依靠，不表达恃强凌弱。学习卡改用 اسْتِئْسَادُ الْأَقْوِيَاءِ عَلَى الضُّعَفَاءِ，原文完整保留在来源备注和转换记录。参考：巴勒斯坦通讯社刊载的中国驻巴大使讲话。";
const knowledge = source.records.map((r, i) => {
  if (r.number !== i + 1 || !r.chinese || !r.arabic) throw Error("Invalid row");
  if (r.number !== 73 && bare(r.arabic) !== bare(lines[i]))
    throw Error(`Unexpected lexical change in row ${r.number}`);
  const category = categories.find(([last]) => r.number <= last)[1];
  const note = `用户提供的第02讲中阿对照语料表，第${r.number}条。标符为学习辅助补充，词组词尾按独立条目处理，放入整句时须随句法调整。文档未提供完整文章，不将词组扩写为文章引文。${r.number === 73 ? correction : ""}`;
  return {
    id: `${prefix}-${String(r.number).padStart(3, "0")}`,
    arabic: lines[i],
    meaning: r.chinese,
    date: source.date,
    category: `人类命运共同体 · ${category}`,
    vocabulary: {
      partOfSpeech:
        r.number === 7 || r.number === 16 || r.number === 81
          ? "句子／表达"
          : "词汇／固定表达",
      variety: "现代标准阿拉伯语",
      phrases: [
        {
          arabic: lines[i],
          chinese: r.chinese,
          kind: "phrase",
          note: "用户语料表原搭配（补充标符）",
        },
      ],
      sources: [
        {
          label: title,
          note: `第${r.number}条；原表阿语：${r.arabic}。${r.number === 73 ? correction : ""}`,
          ...(r.number === 73 ? { url: correctionUrl } : {}),
        },
      ],
      usage: {
        register: "时政／外交书面语",
        interpretation: "适用于时政主题口译词汇积累。",
        note,
      },
    },
    ...(r.number === 73 ? { confusion: correction } : {}),
  };
});
// Use only other supplied entries as distractors, and avoid nested translations.
const questions = knowledge.flatMap((k, i) => {
  const pool = [...knowledge.slice(i + 1), ...knowledge.slice(0, i)].filter(
    (x) =>
      !bare(x.arabic).includes(bare(k.arabic)) &&
      !bare(k.arabic).includes(bare(x.arabic)) &&
      !x.meaning.includes(k.meaning) &&
      !k.meaning.includes(x.meaning),
  );
  return ["ar-choice", "zh-ar"].map((type) => {
    const ar = type === "zh-ar",
      answer = ar ? k.arabic : k.meaning;
    const distractors = pool
      .slice(0, 3)
      .map((x) => (ar ? x.arabic : x.meaning));
    const options = [...distractors];
    options.splice(i % 4, 0, answer);
    return {
      id: `${k.id}-${type}`,
      knowledgeId: k.id,
      type,
      grading: "choice",
      prompt: ar
        ? `选择“${k.meaning}”对应的阿语表达。`
        : `选择下列表达的中文含义：\n${k.arabic}`,
      answer,
      options,
      explanation: `语料表第${i + 1}条：${k.arabic}，对应“${k.meaning}”。本题考查该条表达的整体对应关系；其他选项来自本专题的其他语料，不是本条的对应译文。${i === 72 ? correction : ""}`,
    };
  });
});
const pack = { schemaVersion: 1, id: prefix, title, knowledge, questions };
const schema = JSON.parse(read("src/knowledge-pack.schema.json"));
const validate = new Ajv({ allErrors: true }).compile(schema);
if (!validate(pack)) throw Error(JSON.stringify(validate.errors));
if (
  new Set(knowledge.map((k) => k.id)).size !== 85 ||
  new Set(questions.map((q) => q.id)).size !== 170 ||
  questions.some(
    (q) => new Set(q.options).size !== 4 || !q.options.includes(q.answer),
  )
)
  throw Error("Invalid IDs or options");
const report = {
  source: source.title,
  sourceSha256: source.sourceSha256,
  counts: { knowledge: 85, questions: 170 },
  notes: [
    "85条独立知识卡，按6个主题分类；双向选择题170道。",
    "原始三栏表与学习标符分开保存；没有完整文章，不生成伪引文。",
    "动词词形未在原表提供，不机械推导。",
  ],
  corrections: [
    {
      number: 73,
      original: source.records[72].arabic,
      corrected: lines[72],
      reason: correction,
      url: correctionUrl,
    },
  ],
};
for (const [path, data] of [
  ["src/data/shared-future.json", pack],
  ["src/data/shared-future.report.json", report],
])
  writeFileSync(new URL(path, root), JSON.stringify(data, null, 2) + "\n");
console.log(
  "Converted 85 corpus entries → 85 cards / 170 choice questions; schema validated.",
);
