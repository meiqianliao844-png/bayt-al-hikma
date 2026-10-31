import { readFileSync, writeFileSync } from "node:fs";
import Ajv from "ajv";
const read = (p) =>
  JSON.parse(readFileSync(new URL("../" + p, import.meta.url), "utf8"));
const pack = read("data/imports/arabic-literature-lesson-01.json");
const validate = new Ajv({ allErrors: true }).compile(
  read("src/knowledge-pack.schema.json"),
);
if (!validate(pack)) throw Error(JSON.stringify(validate.errors));
for (const field of ["knowledge", "questions"])
  if (new Set(pack[field].map((x) => x.id)).size !== pack[field].length)
    throw Error("Duplicate IDs: " + field);
const ids = new Set(pack.knowledge.map((k) => k.id));
for (const q of pack.questions)
  if (
    !ids.has(q.knowledgeId) ||
    q.grading !== "choice" ||
    !q.options?.includes(q.answer) ||
    new Set(q.options).size !== q.options.length ||
    q.options.length < 2
  )
    throw Error("Invalid choice: " + q.id);
const report = {
  title: pack.title,
  source: "用户上传：智慧宫_阿拉伯文学史第一讲_知识包(2).json",
  counts: {
    knowledge: pack.knowledge.length,
    questions: pack.questions.length,
    verbs: pack.knowledge.filter((k) => k.verb).length,
    withExamples: pack.knowledge.filter((k) => k.examples?.length).length,
  },
  categories: Object.fromEntries(
    [...new Set(pack.knowledge.map((k) => k.category))].map((c) => [
      c,
      pack.knowledge.filter((k) => k.category === c).length,
    ]),
  ),
  notes: [
    "原文件符合当前 Schema v1；保留全部知识点 ID 和题目 ID。",
    "全部练习为选择题，答案及知识点引用校验通过。",
    "仅5张卡含例句；原文件未提供的教材句子不补造，课堂图片与史实尚未另行核验。",
  ],
};
for (const [name, value] of [
  ["arabic-literature-lesson-01.json", pack],
  ["arabic-literature-lesson-01.report.json", report],
])
  writeFileSync(
    new URL("../src/data/" + name, import.meta.url),
    JSON.stringify(value, null, 2) + "\n",
  );
console.log(
  `Literature: ${pack.knowledge.length} cards / ${pack.questions.length} choice questions; validated.`,
);
