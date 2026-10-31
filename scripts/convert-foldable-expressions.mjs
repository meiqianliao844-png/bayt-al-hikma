import { readFileSync, writeFileSync } from "node:fs";
import Ajv from "ajv";
import { completeNounNumbers } from "../src/noun-numbers.mjs";
const read = (p) =>
  JSON.parse(readFileSync(new URL("../" + p, import.meta.url), "utf8"));
const source = read("src/data/foldable-tech.report.json").transcript;
const entries = read("data/imports/foldable-expressions.curated.json");
const id = "tech-foldable-expressions-v2",
  title = "科技新闻 · 折叠手机 · 词组与长句";
const disclaimer =
  "用户提供的折叠手机学习素材；产品名称、报道、日期及价格未核实。学习句型不表示确认新闻事实。";
const knowledge = entries.map((e) => {
  const lines = e.lines.map((n) => {
    const l = source[n - 1];
    if (!l || l.id !== `T${String(n).padStart(2, "0")}`)
      throw Error("Invalid source line");
    return l;
  });
  const joined = lines.map((l) => l.arabic).join(" "),
    chinese = lines.map((l) => l.chinese).join("");
  return {
    id: `${id}-${e.slug}`,
    arabic: e.arabic || joined,
    meaning: e.meaning || chinese,
    date: "2026-10-31",
    category: `${title}｜${e.kind}`,
    grammar: e.grammar,
    scenario: disclaimer,
    examples: [
      {
        arabic: joined,
        chinese,
        context: `原素材 ${lines.map((l) => l.id).join("、")}（${lines.length > 1 ? "连续段落合读" : "原文摘录"}；未核音及事实）`,
        variety:
          e.slug === "dialect"
            ? "地区方言评论（地区未确定）"
            : "现代标准阿拉伯语",
      },
    ],
    vocabulary: {
      partOfSpeech: e.kind === "长句精读" ? "句子／语段" : "词组／句型",
      variety:
        e.slug === "dialect" ? "地区方言（字幕原样保留）" : "现代标准阿拉伯语",
      sources: [{ label: "用户上传：科技折叠手机学习素材", note: disclaimer }],
      usage: {
        note:
          e.kind === "长句精读"
            ? "保留原素材措辞；连续段落合读仅加入空格。"
            : "词条是从原文整理的学习形式，格尾或词形可随原句句法变化；例句栏保留原文。",
      },
    },
  };
});
const questions = [];
function add(k, suffix, type, prompt, answer, pool) {
  const options = [answer, ...pool.filter((x) => x !== answer)].slice(0, 4);
  if (new Set(options).size !== 4) throw Error("Duplicate choices");
  const shift = questions.length % 4;
  options.push(...options.splice(0, shift));
  questions.push({
    id: `${k.id}-${suffix}`,
    knowledgeId: k.id,
    type,
    prompt,
    answer,
    options,
    grading: "choice",
    explanation: `${k.meaning}\n拆解：${k.grammar}\n原句：${k.examples[0].arabic}\n中文：${k.examples[0].chinese}`,
  });
}
for (const k of knowledge) {
  const peers = knowledge.filter(
    (p) => p.category === k.category && p.id !== k.id,
  );
  add(
    k,
    "meaning",
    "ar-choice",
    `选择这段表达的含义：${k.arabic}`,
    k.meaning,
    peers.map((x) => x.meaning),
  );
  add(
    k,
    "translate",
    "zh-fill",
    `选择对应的阿语表达：${k.meaning}`,
    k.arabic,
    peers.map((x) => x.arabic),
  );
  // A semantic reading question; no fabricated missing word or factual news quiz.
  add(
    k,
    "context",
    "ar-choice",
    `这段原文应如何理解？\n${k.examples[0].arabic}`,
    k.examples[0].chinese,
    peers.map((x) => x.examples[0].chinese),
  );
}
const pack = {
  schemaVersion: 1,
  id,
  title,
  knowledge: completeNounNumbers(knowledge),
  questions,
};
const v = new Ajv({ allErrors: true }).compile(
  read("src/knowledge-pack.schema.json"),
);
if (!v(pack)) throw Error(JSON.stringify(v.errors));
if (new Set(pack.knowledge.map((k) => k.id)).size !== knowledge.length)
  throw Error("Duplicate ID");
const report = {
  title,
  counts: { phrases: 20, readingPassages: 10, questions: questions.length },
  note: disclaimer,
  sourceMap: entries.map((e) => ({
    id: `${id}-${e.slug}`,
    lines: e.lines.map((n) => `T${String(n).padStart(2, "0")}`),
  })),
};
for (const [name, value] of [
  ["foldable-expressions.json", pack],
  ["foldable-expressions.report.json", report],
])
  writeFileSync(
    new URL("../src/data/" + name, import.meta.url),
    JSON.stringify(value, null, 2) + "\n",
  );
console.log(
  `Foldable expansion: ${knowledge.length} expression/reading cards / ${questions.length} choices; validated.`,
);
