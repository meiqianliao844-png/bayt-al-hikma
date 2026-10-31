import { readFileSync, writeFileSync } from "node:fs";
import Ajv from "ajv";
import { completeNounNumbers } from "../src/noun-numbers.mjs";
const root = new URL("../", import.meta.url),
  read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const text = readFileSync(
  new URL("data/imports/foldable-tech-20261031.txt", root),
  "utf8",
);
const boundary = text.indexOf("\nمُشْكِلَاتٌ فِي هَاتِفِ");
if (boundary < 0) throw Error("Missing article boundary");
const blocks = text.slice(0, boundary).split(/^\s*(\d+)\s*$/m);
const focus = [];
for (let i = 1; i < blocks.length; i += 2) {
  const n = Number(blocks[i]),
    lines = blocks[i + 1]
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    surface = lines.shift(),
    fields = {};
  let key = "";
  for (const line of lines) {
    if (line.endsWith("：")) {
      key = line.slice(0, -1);
      fields[key] = [];
    } else if (key) fields[key].push(line);
  }
  focus.push({ number: n, surface, fields });
}
if (focus.length !== 26) throw Error("Expected 26 focus entries");
const body = text
  .slice(boundary)
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);
const start = body.findIndex((s) => s.startsWith("وَلَاءٌ "));
if (start < 0) throw Error("Missing transcript");
const transcript = [];
for (let i = start; i < body.length; i += 2) {
  if (/^\d\d:\d\d/.test(body[i])) break;
  if (!/[\u4e00-\u9fff]/.test(body[i + 1] || ""))
    throw Error("Unpaired subtitle line");
  transcript.push({
    id: `T${String(transcript.length + 1).padStart(2, "0")}`,
    arabic: body[i],
    chinese: body[i + 1],
  });
}
const norm = (s) =>
  s
    .normalize("NFC")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const prior = [
  "src/seed.json",
  "src/data/azerbaijan-school-uniform.json",
  "src/data/spongebob-01.json",
  "src/data/shared-future.json",
  "src/data/spongebob-mystery-01.json",
  "src/data/spongebob-mystery-02.json",
].map(read);
const base = new Map(prior.flatMap((p) => p.knowledge).map((k) => [k.id, k]));
const title = "科技新闻 · 折叠手机",
  prefix = "tech-foldable-20261031";
const disclaimer =
  "用户提供的“iPhone Duo”学习文本，未提供音视频或可核验报道链接；产品名称、发布日期、故障、公司回应与费用均未核实。正文例句不表示现实事实已经核验。";
const lemmas = [
  "وَلَاءٌ",
  "اِسْتِثْنَائِيٌّ",
  "اِقْتِنَاءٌ / اِقْتَنَى",
  "خَيَّبَ",
  "تَوَقُّعٌ / تَوَقُّعَاتٌ",
  "خَاضَ",
  "شَكْوَى / شَكَاوَى",
  "مُتَضَرِّرٌ / مُتَضَرِّرَةٌ",
  "تَشَقُّقٌ / تَشَقُّقَاتٌ",
  "طَقْطَقَةٌ",
  "اِنْتِشَارٌ / اِنْتَشَرَ",
  "مُتَخَصِّصٌ",
  "مِفْصَلٌ",
  "تَحَمُّلٌ / تَحَمَّلَ",
  "مُرَاقَبَةٌ",
  "عُطْلٌ",
  "فَلْسَفَةٌ",
  "بَدِيهِيَّةٌ / بَدِيهِيَّاتٌ",
  "اِسْتَسْهَلَ",
  "سِعْرٌ",
  "مُعَالَجَةٌ / عَالَجَ",
  "إِقْرَارٌ",
  "تَوَاصُلٌ / تَوَاصَلَ",
  "عِبْءٌ / أَعْبَاءٌ",
  "خَفَّضَ",
  "عَرَضِيٌّ / عَرَضِيَّةٌ",
];
const hints = [
  "ولاء",
  "استثنائي",
  "اقتناء",
  "خيب",
  "توقعاتهم",
  "تخوض",
  "شكاوى",
  "متضررة",
  "تشققات",
  "طقطقة",
  "انتشار",
  "المتخصص",
  "المفصل",
  "تحمل",
  "مراقبة",
  "عطل",
  "فلسفتها",
  "بديهيات",
  "استسهلت",
  "بسعر",
  "معالجة",
  "إقرار",
  "تواصل",
  "الأعباء",
  "تخفض",
  "العرضية",
];
const reused = {
  15: "news-20261025-4c99c03c-verb-v051",
  22: "news-20261025-4c99c03c-verb-v001",
};
const morphology = {
  3: ["اِقْتَنَى", "يَقْتَنِي", "اِقْتِنَاءٌ", "ق ن ي", "第八式 اِفْتَعَلَ"],
  4: ["خَيَّبَ", "يُخَيِّبُ", "تَخْيِيبٌ", "خ ي ب", "第二式 فَعَّلَ"],
  5: ["تَوَقَّعَ", "يَتَوَقَّعُ", "تَوَقُّعٌ", "و ق ع", "第五式 تَفَعَّلَ"],
  6: ["خَاضَ", "يَخُوضُ", "خَوْضٌ", "خ و ض", "第一式中空动词"],
  8: [
    "تَضَرَّرَ",
    "يَتَضَرَّرُ",
    "تَضَرُّرٌ",
    "ض ر ر",
    "第五式主动分词作形容词",
  ],
  9: ["تَشَقَّقَ", "يَتَشَقَّقُ", "تَشَقُّقٌ", "ش ق ق", "第五式动名词的复数"],
  10: [
    "طَقْطَقَ",
    "يُطَقْطِقُ",
    "طَقْطَقَةٌ",
    "ط ق ط ق",
    "四根动词，动名词 فَعْلَلَةٌ",
  ],
  11: [
    "اِنْتَشَرَ",
    "يَنْتَشِرُ",
    "اِنْتِشَارٌ",
    "ن ش ر",
    "第八式 اِفْتَعَلَ／اِفْتِعَالٌ",
  ],
  12: ["تَخَصَّصَ", "يَتَخَصَّصُ", "تَخَصُّصٌ", "خ ص ص", "第五式主动分词"],
  14: ["تَحَمَّلَ", "يَتَحَمَّلُ", "تَحَمُّلٌ", "ح م ل", "第五式 تَفَعَّلَ"],
  15: ["رَاقَبَ", "يُرَاقِبُ", "مُرَاقَبَةٌ", "ر ق ب", "第三式 فَاعَلَ"],
  19: [
    "اِسْتَسْهَلَ",
    "يَسْتَسْهِـلُ".replace("ـ", ""),
    "اِسْتِسْهَالٌ",
    "س ه ل",
    "第十式 اِسْتَفْعَلَ",
  ],
  21: ["عَالَجَ", "يُعَالِجُ", "مُعَالَجَةٌ", "ع ل ج", "第三式 فَاعَلَ"],
  22: ["أَقَرَّ", "يُقِرُّ", "إِقْرَارٌ", "ق ر ر", "第四式 أَفْعَلَ"],
  23: ["تَوَاصَلَ", "يَتَوَاصَلُ", "تَوَاصُلٌ", "و ص ل", "第六式 تَفَاعَلَ"],
  25: ["خَفَّضَ", "يُخَفِّضُ", "تَخْفِيضٌ", "خ ف ض", "第二式 فَعَّلَ"],
};
const nounPairs = {
  5: [["تَوَقُّعٌ", "تَوَقُّعَاتٌ"]],
  7: [["شَكْوَى", "شَكَاوَى"]],
  9: [
    ["تَشَقُّقٌ", "تَشَقُّقَاتٌ"],
    ["شَرْخٌ", "شُرُوخٌ"],
  ],
  13: [["مِفْصَلٌ", "مَفَاصِلُ"]],
  16: [["عُطْلٌ", "أَعْطَالٌ"]],
  18: [["بَدِيهِيَّةٌ", "بَدِيهِيَّاتٌ"]],
  20: [["سِعْرٌ", "أَسْعَارٌ"]],
  24: [["عِبْءٌ", "أَعْبَاءٌ"]],
};
const parseLex = (s) => {
  const m = s.match(/^(.+?)（(.+?)）$/);
  return m ? { arabic: m[1].trim(), chinese: m[2].trim() } : null;
};
const dialect = (s) =>
  /(?:^|\s)(?:مو|مش|بس|هالمرة|تلاقي|تستحمل|تطلع|يستاهل|زي)(?:\s|[،؛.!])/.test(
    norm(s),
  );
const knowledge = focus.map((f) => {
  const n = f.number,
    old = base.get(reused[n]),
    forms = morphology[n],
    meaning = f.fields["词义"].join(" "),
    line = transcript.find((l) => norm(l.arabic).includes(hints[n - 1]));
  if (!line) throw Error(`Missing source context ${n}`);
  f.lineId = line.id;
  f.line = line;
  f.meaning = meaning;
  f.lemma = lemmas[n - 1];
  f.id = old?.id || `${prefix}-focus-${String(n).padStart(2, "0")}`;
  f.answer = line.arabic
    .split(/\s+/)
    .find((t) => norm(t).includes(hints[n - 1]))
    .replace(/[،؛؟.!:]+$/g, "");
  const phrases = (f.fields["搭配"] || [])
    .map(parseLex)
    .filter(Boolean)
    .map((p) => ({
      ...p,
      kind: "phrase",
      note: `台词搭配（整理形式，非逐字引文） · ${title}`,
    }));
  const relations = [];
  for (const s of f.fields["近义"] || []) {
    const p = parseLex(s);
    if (p)
      relations.push({
        ...p,
        relation: [5, 11, 12, 14, 17, 21, 26].includes(n)
          ? "related"
          : "near-synonym",
        distinction:
          n === 5
            ? "预期是对未来的判断，等待是等待动作或期待状态，不是严格近义词。"
            : "资料中的近义或相关表达，侧重点和搭配可能不同，不视为所有场景可互换。",
      });
  }
  for (const s of f.fields["反义"] || []) {
    const p = parseLex(s);
    if (p)
      relations.push({
        ...p,
        relation: "semantic-opposite",
        distinction:
          "按原资料保留为特定语境的语义对立表达，不当作不受语境限制的严格反义词。",
      });
  }
  const note =
    n === 22
      ? "本篇为 أَقَرَّ بِـ“承认”，已有词条中的 أَقَرَّ + 直接宾语可表示批准。不同搭配与义项不能混同。"
      : n === 5
        ? "تَوَقُّعَاتِهِمْ = 复数 تَوَقُّعَاتٌ + 他们的 هم。单数为 تَوَقُّعٌ。"
        : n === 10
          ? "طَقْطَقَةٌ 为四根动词 طَقْطَقَ 的动名词，词型为 فَعْلَلَةٌ。"
          : n === 14
            ? "评论中的 تِسْتَحْمِلْ 是方言词形；标准语可用 تَتَحَمَّلُ，不把方言直接列作标准语变位。"
            : n === 19
              ? "评论区含方言，不据文字确定具体方言地区。该动词本身也可用于标准语。"
              : n === 26
                ? "عَرَضِيٌّ 指意外或偶发，طَارِئٌ 偏突发或临时，只是相关表达。"
                : f.fields["词型"]?.join(" ") ||
                  "本条是用户指定的26个重点之一，保留原文并补充学习说明。";
  const ex = f.fields["例句"] || [];
  const examples = [
    {
      arabic: line.arabic,
      chinese: line.chinese,
      context: `${title} · 原素材 ${line.id}（用户提供；事实未核实）`,
      variety: dialect(line.arabic)
        ? "方言／混合语体评论（地区未核定）"
        : "现代标准阿拉伯语",
    },
  ];
  if (ex.length >= 2)
    examples.push({
      arabic: ex[0],
      chinese: ex.slice(1).join(" "),
      context: `${title} · 原资料教学例句（不是新闻原文）`,
    });
  return {
    id: f.id,
    arabic: old?.arabic || f.lemma,
    meaning: old?.meaning || meaning,
    date: old?.date || "2026-10-31",
    category: old?.category || "折叠手机 · 26个重点词",
    ...(forms
      ? {
          root: forms[3],
          form: forms[4],
          verb: {
            past: forms[0],
            present: forms[1],
            masdar: forms[2],
            note: "相关动词形式为词源学习信息；名词或分词在原句中不按变位动词解释。",
          },
        }
      : {}),
    grammar: note,
    confusion: note,
    vocabulary: {
      partOfSpeech: [4, 6, 19, 25].includes(n)
        ? "动词"
        : "名词／分词／词汇表达",
      variety: "标准阿语为主；引述评论含方言",
      ...(nounPairs[n]
        ? {
            noun: {
              numberPairs: nounPairs[n].map(([singular, plural]) => ({
                singular,
                plural,
              })),
            },
          }
        : {}),
      phrases,
      relations,
      contrasts: [
        {
          arabic: f.lemma,
          chinese: `本篇义：${meaning}。${note}`,
          notInterchangeable:
            n === 22
              ? "承认存在问题与批准某项决定的支配关系不同。"
              : "相关表达需结合语境，不自动等同。",
        },
      ],
      sources: [{ label: title, note: disclaimer }],
      usage: { register: "科技报道／消费者评论", note: disclaimer },
    },
    examples,
  };
});
const questions = [],
  idSet = new Set();
function q(f, suffix, type, prompt, answer, explanation, others) {
  const options = [answer];
  for (const s of others)
    if (s && !options.includes(s)) {
      options.push(s);
      if (options.length === 4) break;
    }
  if (options.length < 4) throw Error("Not enough options");
  options.splice(questions.length % 4, 0, options.shift());
  const id = `${prefix}-${f.number}-${suffix}`;
  if (idSet.has(id)) throw Error("Duplicate question");
  idSet.add(id);
  questions.push({
    id,
    knowledgeId: f.id,
    type,
    grading: "choice",
    prompt,
    answer,
    options,
    explanation,
  });
}
for (const f of focus) {
  const pool = focus.filter((x) => x.id !== f.id);
  if (!reused[f.number]) {
    q(
      f,
      "meaning",
      "ar-choice",
      `选择 ${f.lemma} 在本篇中的意思。`,
      f.meaning,
      `${f.lemma}：${f.meaning}。`,
      pool.map((x) => x.meaning),
    );
    q(
      f,
      "translation",
      "zh-fill",
      `选择“${f.meaning}”对应的本篇阿语词汇。`,
      f.lemma,
      "按本篇语言学习用法作答，不考查未核实新闻事实。",
      pool.map((x) => x.lemma),
    );
  }
  q(
    f,
    "context",
    "context-fill",
    `补全用户提供的原素材：${f.line.arabic.replace(f.answer, "____")}`,
    f.answer,
    `原素材：${f.line.arabic}\n中文：${f.line.chinese}\n${dialect(f.line.arabic) ? "本句含方言评论，不作为标准语语法范句。" : ""}`,
    pool.map((x) => x.answer),
  );
  if (!reused[f.number] && morphology[f.number]) {
    const forms = morphology[f.number];
    q(
      f,
      "present",
      "conjugation",
      `选择 ${forms[0]} 的标准语第三人称阳性单数现在式。`,
      forms[1],
      "该题为标准语基础词形练习，与原评论的方言变体分开。",
      Object.values(morphology).map((x) => x[1]),
    );
  }
  if (nounPairs[f.number]) {
    const [single, plural] = nounPairs[f.number][0];
    q(
      f,
      "number",
      "noun-number",
      `选择 ${plural} 的单数。`,
      single,
      `${plural} 的单数是 ${single}。`,
      Object.values(nounPairs).flatMap((x) => x.map((y) => y[0])),
    );
  }
}
const pack = {
  schemaVersion: 1,
  id: prefix,
  title,
  knowledge: completeNounNumbers(knowledge),
  questions,
};
const validate = new Ajv({ allErrors: true }).compile(
  read("src/knowledge-pack.schema.json"),
);
if (!validate(pack)) throw Error(JSON.stringify(validate.errors));
const report = {
  title,
  note: disclaimer,
  counts: {
    focus: 26,
    newKnowledge: 24,
    reusedKnowledge: 2,
    sourceLines: transcript.length,
    questions: questions.length,
  },
  reuse: Object.entries(reused).map(([number, id]) => ({
    number: Number(number),
    id,
  })),
  sourceFocus: focus.map(({ line, answer, ...f }) => f),
  transcript,
  notes: [
    "附件26个重点完整收录。原文与教学例句分开，未声称已核音或核实新闻事实。",
    "近义与反义按语境审慎标记，原资料所谓反义统一注明语义对立。",
    "重点按词源合并动词、动名词和分词，不新增同一词的多张变体卡。",
  ],
};
for (const [p, data] of [
  ["src/data/foldable-tech.json", pack],
  ["src/data/foldable-tech.report.json", report],
])
  writeFileSync(new URL(p, root), JSON.stringify(data, null, 2) + "\n");
console.log(
  `Foldable learning text: 24 new + 2 reused cards / ${questions.length} choice questions; schema validated.`,
);
