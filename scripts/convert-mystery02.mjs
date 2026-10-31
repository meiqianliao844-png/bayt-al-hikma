import { readFileSync, writeFileSync } from "node:fs";
import Ajv from "ajv";
import { completeNounNumbers } from "../src/noun-numbers.mjs";
const root = new URL("../", import.meta.url),
  read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const input = read("data/imports/spongebob-mystery-02.curated.json");
if (input.format !== "hikma-subtitle-supplement-v1")
  throw Error("Unsupported subtitle supplement");
const prior = [
  "src/seed.json",
  "src/data/azerbaijan-school-uniform.json",
  "src/data/spongebob-01.json",
  "src/data/shared-future.json",
  "src/data/spongebob-mystery-01.json",
].map(read);
const base = new Map(prior.flatMap((p) => p.knowledge).map((k) => [k.id, k]));
const norm = (s) =>
  s
    .normalize("NFC")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .trim()
    .replace(/\s+/g, " ");
const alias = (s) =>
  s
    .split(/\s*\/\s*/)
    .map(norm)
    .map((t) => t.replace(/^ال/, ""));
const priorAliases = new Set(
  [...base.values()].flatMap((k) => alias(k.arabic)),
);
const lines = new Map(input.transcript.map((l) => [l.id, l]));
const id = (c) => c.existingId || `${input.id}-${c.key}`;
const nounCloze = {
  home: ["M01", "الدِّيَارِ"],
  stranger: ["M05", "الْغَرِيبِ"],
  experience: ["M06", "خِبْرَتِي"],
  jellyfish: ["M06", "الْقَنَادِيلِ"],
  fishing: ["M06", "صَيْدِ"],
  trick: ["M09", "الْخُدْعَةَ"],
  magazine: ["M09", "مَجَلَّةِ"],
  annoying: ["M10", "الْمُزْعِجَ"],
  comfort: ["M12", "بِالرَّاحَةِ"],
  town: ["M13", "الْبَلْدَةِ"],
  dialect: ["M15", "لَهَجَاتِكَ"],
  fluency: ["M16", "بِطَلَاقَةٍ"],
  self: ["M17", "نَفْسِي"],
  delicious: ["M20", "لَذِيذًا"],
};
const reuseCloze = {
  return: ["M01", "عُدْنَا"],
  say: ["M02", "قَالَ"],
  can: ["M02", "يُمْكِنُنَا"],
  want: ["M19", "نُرِيدُ"],
  catch: ["M07", "أَمْسَكْتُ"],
  learn: ["M09", "تَعَلَّمْتُ"],
  try: ["M12", "سَأُحَاوِلُ"],
  escape: ["M14", "تَهْرُبُ"],
  speak: ["M16", "أَتَحَدَّثُ"],
  seem: ["M20", "يَبْدُو"],
  money: ["M04", "نُقُودَ"],
  foolish: ["M03", "أَحْمَقَ"],
  mysterious: ["M05", "الْغَامِضِ"],
  "bikini-bottom": ["M16", "قَاعِ الْمُحِيطِ"],
  request: ["M01", "هَلَّا"],
  "no-problem": ["M06", "لَا مُشْكِلَةَ"],
  squidward: ["M16", "شَفِيقُ"],
};
for (const c of input.cards) {
  const cloze = nounCloze[c.key] || reuseCloze[c.key];
  if (!c.cloze && cloze) c.cloze = { lineId: cloze[0], answer: cloze[1] };
  if (c.key === "buy") {
    c.cloze = { lineId: "M03", answer: "سَأَشْتَرِي" };
    c.excerpt = "حَسَنًا، سَأَشْتَرِي بُرْجَرًا أَحْمَقَ بِنَفْسِي.";
  }
  if (c.key === "foolish")
    c.excerpt = "حَسَنًا، سَأَشْتَرِي بُرْجَرًا أَحْمَقَ بِنَفْسِي.";
  if (c.key === "say") c.excerpt = "مِسْتَر سَلْطَع قَالَ";
  if (c.key === "can") c.excerpt = "لَا يُمْكِنُنَا الْعَوْدَةُ";
  if (c.existingId && !base.has(c.existingId))
    throw Error(`Unresolved canonical ID ${c.existingId}`);
  if (!c.existingId && alias(c.arabic).some((a) => priorAliases.has(a)))
    throw Error(`Duplicate lemma needs an explicit existingId: ${c.arabic}`);
}
let knowledge = input.cards.map((c) => {
  const old = base.get(c.existingId);
  return {
    id: id(c),
    arabic: old?.arabic || c.arabic,
    meaning: old?.meaning || c.meaning,
    date: old?.date || input.date,
    category:
      old?.category || `神秘顾客02 · ${c.verb ? "动词与词形" : "生活词汇"}`,
    ...(c.verb ? { verb: c.verb } : {}),
    ...(c.root ? { root: c.root } : {}),
    grammar: c.grammar,
    vocabulary: {
      partOfSpeech:
        old?.vocabulary?.partOfSpeech ||
        (c.verb ? "动词／派生形式" : "名词／表达"),
      variety: "现代标准阿拉伯语（用户字幕，未核音）",
      ...(c.noun ? { noun: c.noun } : {}),
      phrases: [
        {
          ...c.phrase,
          kind: "phrase",
          note: `台词搭配（整理形式，非逐字引文） · ${input.title}`,
        },
      ],
      sources: [{ label: input.title, note: input.note }],
      contrasts: [
        {
          arabic: c.phrase.arabic,
          chinese: c.grammar + (c.note ? ` ${c.note}` : ""),
          notInterchangeable:
            c.key === "lend"
              ? "借出 أَعَارَ 与借入 اِسْتَعَارَ 的方向不同。"
              : "本条为续篇用法补充，原有词义和个人记录保留。",
        },
      ],
      usage: { register: "动画对话／日常表达", note: c.note || c.grammar },
    },
    examples: c.lineIds.map((lineId) => {
      const l = lines.get(lineId);
      if (!l) throw Error(lineId);
      return {
        arabic: l.arabic,
        chinese: l.chinese,
        context: `${input.title} · 原字幕 ${lineId}（未核音${l.translationOrigin === "assistant" ? "；中文为补译" : ""}${lineId === "M03" ? "；原文含疑似语法问题，见辨析" : ""}${lineId === "M02" ? "；数量表达需规范整理" : ""}）`,
      };
    }),
  };
});
const loan = knowledge.find((k) => k.id === `${input.id}-lend`),
  correction = input.corrections[0];
loan.examples.push({
  arabic: correction.arabic,
  chinese: correction.chinese,
  context: `${input.title} · 学习规范改写（非原字幕）：${correction.note}`,
});
loan.vocabulary.sources.push({
  label: "开罗阿拉伯语科学院 · أعار",
  url: "https://www.arabicacademy.gov.eg/ar/search_engine/roots/%D8%B9%D9%88%D8%B1",
  note: "核对借给的词根和出借方向，非字幕来源。",
});
knowledge
  .find((k) => k.id === `${input.id}-sell`)
  .examples.splice(1, 0, {
    arabic:
      "لَا يُمْكِنُنَا الْعَوْدَةُ قَبْلَ أَنْ نَبِيعَ شَطِيرَةً وَاحِدَةً.",
    chinese: "卖出一个汉堡之前，我们不能回去。",
    context: `${input.title} · 数量表达的学习规范改写（非原字幕）`,
  });
knowledge = completeNounNumbers(knowledge);
const questions = [],
  seen = new Set();
const fingerprint = (q) =>
  [q.knowledgeId, q.type, norm(q.prompt), norm(q.answer)].join("|");
for (const p of prior) for (const q of p.questions) seen.add(fingerprint(q));
function question(c, type, suffix, prompt, answer, explanation, pool) {
  const q = {
    id: `${input.id}-${c.key}-${suffix}`,
    knowledgeId: id(c),
    type,
    grading: "choice",
    prompt,
    answer,
    explanation,
    options: [answer],
  };
  for (const o of pool)
    if (o && !q.options.includes(o)) {
      q.options.push(o);
      if (q.options.length === 4) break;
    }
  if (q.options.length < 4) throw Error(`Not enough distractors: ${q.id}`);
  const pos = questions.length % 4;
  q.options.splice(pos, 0, q.options.shift());
  const f = fingerprint(q);
  if (!seen.has(f)) {
    seen.add(f);
    questions.push(q);
  }
}
const forms = input.cards
    .flatMap((c) => [c.verb?.past, c.verb?.present])
    .filter(Boolean),
  roots = input.cards.map((c) => c.root).filter(Boolean);
for (const c of input.cards) {
  const others = input.cards.filter((x) => id(x) !== id(c));
  if (!c.existingId) {
    question(
      c,
      "ar-choice",
      "meaning",
      `选择 ${c.arabic} 在续篇中的意思。`,
      c.meaning,
      `${c.arabic}：${c.meaning}。${c.grammar}`,
      others.map((x) => x.meaning),
    );
    question(
      c,
      "zh-fill",
      "translation",
      `选择“${c.meaning}”对应的阿语表达。`,
      c.arabic,
      c.grammar,
      others.map((x) => x.arabic),
    );
    if (c.verb?.present)
      question(
        c,
        "conjugation",
        "present",
        `选择 ${c.verb.past} 的第三人称阳性单数现在式。`,
        c.verb.present,
        c.grammar,
        forms,
      );
    if (c.root)
      question(
        c,
        "root",
        "root",
        `选择 ${c.arabic} 的词根。`,
        c.root,
        `${c.arabic} 的词根为 ${c.root}。`,
        roots,
      );
  }
  if (c.cloze) {
    const raw = lines.get(c.cloze.lineId),
      text = c.excerpt || raw.arabic;
    if (!raw.arabic.includes(text) || !text.includes(c.cloze.answer))
      throw Error(`Cloze not sourced: ${c.key}`);
    if (["M02", "M03"].includes(raw.id) && !c.excerpt)
      throw Error(`Do not practice the questionable raw syntax: ${c.key}`);
    question(
      c,
      "context-fill",
      "context",
      `补全原字幕${c.excerpt ? "节选" : ""}：${text.replace(c.cloze.answer, "____")}`,
      c.cloze.answer,
      `原字幕：${text}\n${c.grammar}`,
      input.cards.map((x) => x.cloze?.answer),
    );
  }
}
question(
  input.cards.find((c) => c.key === "lend"),
  "zh-fill",
  "polite-loan",
  "选择规范、礼貌的阿语表达：“能借我点钱，让我买这个汉堡吗？”",
  correction.arabic,
  correction.note,
  [
    "هَلْ أَعِرْنِي النُّقُودَ؟",
    "هَلْ تُعِيرُكَ النُّقُودَ؟",
    "هَلْ تَسْتَعِيرُ مِنِّي النُّقُودَ؟",
  ],
);
const pack = {
  schemaVersion: 1,
  id: input.id,
  title: input.title,
  knowledge,
  questions,
};
const validate = new Ajv({ allErrors: true }).compile(
  read("src/knowledge-pack.schema.json"),
);
if (!validate(pack)) throw Error(JSON.stringify(validate.errors));
if (
  new Set(knowledge.map((k) => k.id)).size !== knowledge.length ||
  new Set(questions.map((q) => q.id)).size !== questions.length
)
  throw Error("Duplicate IDs");
const report = {
  title: input.title,
  note: input.note,
  counts: {
    sourceLines: input.transcript.length,
    newKnowledge: input.cards.filter((c) => !c.existingId).length,
    reusedKnowledge: input.cards.filter((c) => c.existingId).length,
    questions: questions.length,
  },
  reuse: input.cards
    .filter((c) => c.existingId)
    .map((c) => ({ key: c.key, existingId: c.existingId, arabic: c.arabic })),
  corrections: input.corrections,
  transcript: input.transcript,
};
for (const [p, d] of [
  ["src/data/spongebob-mystery-02.json", pack],
  ["src/data/spongebob-mystery-02.report.json", report],
])
  writeFileSync(new URL(p, root), JSON.stringify(d, null, 2) + "\n");
console.log(
  `Continuation: ${report.counts.newKnowledge} new + ${report.counts.reusedKnowledge} reused cards, ${questions.length} choice questions; schema validated.`,
);
