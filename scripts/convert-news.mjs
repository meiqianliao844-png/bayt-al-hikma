import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import Ajv from "ajv";
import { convertPortableNews } from "../src/portable-news.mjs";
const root = new URL("../", import.meta.url);
const args = process.argv.slice(2);
const get = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--"))
    throw Error(`${flag} 需要文件路径`);
  return args[index + 1];
};
const input = get(
  "--input",
  fileURLToPath(
    new URL("data/imports/azerbaijan-school-uniform.portable.json", root),
  ),
);
const output = get(
  "--output",
  fileURLToPath(new URL("src/data/azerbaijan-school-uniform.json", root)),
);
const reportPath = get(
  "--report",
  fileURLToPath(
    new URL("src/data/azerbaijan-school-uniform.report.json", root),
  ),
);
try {
  const { pack, report } = convertPortableNews(
    JSON.parse(readFileSync(input, "utf8").replace(/^\uFEFF/, "")),
  );
  const schema = JSON.parse(
    readFileSync(new URL("src/knowledge-pack.schema.json", root), "utf8"),
  );
  const validate = new Ajv({ allErrors: true }).compile(schema);
  if (!validate(pack)) throw Error(JSON.stringify(validate.errors));
  const ids = new Set(pack.knowledge.map((k) => k.id));
  if (
    ids.size !== pack.knowledge.length ||
    new Set(pack.questions.map((q) => q.id)).size !== pack.questions.length
  )
    throw Error("转换后出现重复 ID");
  for (const q of pack.questions)
    if (!ids.has(q.knowledgeId) || (q.options && !q.options.includes(q.answer)))
      throw Error(`${q.id}: 题目关联或选项不合法`);
  for (const [path, data] of [
    [output, pack],
    [reportPath, report],
  ]) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  }
  console.log(
    `Converted ${report.counts.verbs} verbs + ${report.counts.terms} terms → ${report.counts.knowledge} cards / ${report.counts.questions} questions; schema validated.`,
  );
} catch (e) {
  console.error(`转换失败：${e.message}`);
  process.exitCode = 1;
}
