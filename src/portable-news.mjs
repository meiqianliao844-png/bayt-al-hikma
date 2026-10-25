/** Explicit adapter for the uploaded portable contract, NOT a native Pack cast.
 * No morphology or Arabic examples are inferred. All templates use supplied text. */
const CONTRACT = "wisdom-house-learning-pack-portable-v1";
const absent = (value) => ["—", "-", "不适用", ""].includes(value.trim());
const cleanForm = (value) => (absent(value) ? undefined : value);
const reserved = new Set(["__proto__", "prototype", "constructor"]);
export const isPortableNews = (data) =>
  Boolean(data && typeof data === "object" && data.schema === CONTRACT);
const text = (o, k, path) => {
  if (typeof o[k] !== "string" || !o[k].trim() || o[k].length > 10000)
    throw Error(`${path}.${k}: 应为非空字符串（最多 10000 字符）`);
  return o[k];
};
const hash = (s) => {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
};
function choices(answer, records, meaningKey, start, category, strict = false) {
  const parts = answer.split(/[、，；,;\/]/).filter((x) => x.length > 1);
  if (strict) {
    const chars = answer.replace(/[^\u4e00-\u9fff]/g, "");
    for (let i = 0; i < chars.length - 1; i++)
      parts.push(chars.slice(i, i + 2));
  }
  const candidates = [
    ...records.slice(start + 1),
    ...records.slice(0, start + 1),
  ];
  const values = [answer];
  for (const r of candidates) {
    const value = r[meaningKey];
    if (
      (category && r.category === category) ||
      values.includes(value) ||
      parts.some((p) => value.includes(p))
    )
      continue;
    values.push(value);
    if (values.length === 4) break;
  }
  if (values.length < 2) throw Error("不能从资料中构造无重复的选择题选项");
  return values;
}
export function convertPortableNews(data) {
  if (!isPortableNews(data) || data.version !== "1.0")
    throw Error("不支持的可移植知识包格式或版本");
  // Two explicitly supported variants share the portable identifier but differ
  // in term fields and source/usage metadata. Normalize only the animation variant.
  const animation = data.source === "用户提供的阿语动画字幕";
  if (animation) {
    if (!Array.isArray(data.verbs) || !Array.isArray(data.terms))
      throw Error("动画知识包缺少 verbs / terms 数组");
    for (const [i, t] of data.terms.entries()) {
      if (!t || t.type !== "term")
        throw Error(`terms[${i}]: 动画词汇 type 应为 term`);
      text(t, "meaning_zh", `terms[${i}]`);
    }
    if (
      data.review_notes !== undefined &&
      (!Array.isArray(data.review_notes) || data.review_notes.length > 100)
    )
      throw Error("review_notes 应为最多 100 条的数组");
    for (const [i, n] of (data.review_notes || []).entries()) {
      if (!n || typeof n !== "object") throw Error(`review_notes[${i}] 无效`);
      text(n, "source", `review_notes[${i}]`);
      text(n, "note", `review_notes[${i}]`);
    }
    data = {
      ...data,
      verbs: data.verbs.map((v) => ({
        ...v,
        usage_note: v.usage_note ?? "原包未提供额外搭配备注",
        source: v.source ?? data.source,
      })),
      terms: data.terms.map((t) => ({
        ...t,
        type: "news_term",
        chinese: t.meaning_zh,
        source: t.source ?? data.source,
      })),
    };
  }
  const title = text(data, "title", "$"),
    date = text(data, "date", "$");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw Error("学习日期无效");
  for (const key of ["verbs", "terms"]) {
    if (!Array.isArray(data[key]) || data[key].length > 1000)
      throw Error(`${key}: 应为最多 1000 项的数组`);
    const seen = new Set();
    data[key].forEach((r, i) => {
      const path = `${key}[${i}]`;
      if (!r || typeof r !== "object" || Array.isArray(r))
        throw Error(`${path}: 应为对象`);
      const id = text(r, "id", path);
      if (!/^[A-Za-z0-9._-]+$/.test(id) || reserved.has(id) || seen.has(id))
        throw Error(`${path}: ID 无效或重复`);
      seen.add(id);
      for (const k of key === "verbs"
        ? [
            "lemma",
            "imperfect",
            "masdar",
            "meaning_zh",
            "collocation",
            "example_ar",
            "example_zh",
            "usage_note",
            "source",
          ]
        : ["arabic", "chinese", "category", "source"])
        text(r, k, path);
      if (r.type !== (key === "verbs" ? "verb_collocation" : "news_term"))
        throw Error(`${path}: type 不匹配`);
    });
  }
  const namespace = `${animation ? "animation" : "news"}-${date.replaceAll("-", "")}-${hash(title)}`;
  const idFor = (kind, id) => `${namespace}-${kind}-${id}`;
  const pack = {
    schemaVersion: 1,
    id: namespace,
    title,
    knowledge: [],
    questions: [],
  };
  const report = {
    sourceSchema: CONTRACT,
    targetSchemaVersion: 1,
    namespace,
    sourceTitle: title,
    counts: {
      verbs: data.verbs.length,
      terms: data.terms.length,
      knowledge: 0,
      questions: 0,
    },
    notes: [],
    sourceNote: data.note || "",
    generation:
      "所有词形和例句来自输入；选择题干扰项取自本包已有释义，不推导新阿语形式。",
  };
  if (animation) {
    report.sourceProfile = "animation-subtitles";
    report.sourceReviewNotes = data.review_notes || [];
  }
  const prefix = animation ? "海绵宝宝01" : "校服新闻";
  const variety = animation
    ? "动画配音学习资料；原包未标定地区方言，教学例句按资料保留"
    : "现代标准阿拉伯语";
  const sourceNote = animation
    ? `用户提供的动画字幕学习资料。例句为教学编写，非逐字字幕；未依据音频核实听写或方言。${data.note || ""}`
    : "用户上传资料。例句为原包编写的教学例句，不当作新闻原文或已经核实的现实事实。";
  data.verbs.forEach((v, i) => {
    const id = idFor("verb", v.id),
      modal = v.lemma === "يَنْبَغِي";
    const notes = [`原资料搭配说明：${v.usage_note}`];
    let past = modal ? undefined : cleanForm(v.lemma),
      present = modal ? v.lemma : cleanForm(v.imperfect),
      masdar = cleanForm(v.masdar);
    if (animation && /[\u4e00-\u9fff]/.test(v.masdar)) {
      notes.push(
        `原动名词说明：${v.masdar}。说明区分了词义，不将整段注释当作“找到”义的标准动名词。`,
      );
      report.notes.push({
        sourceId: v.id,
        field: "masdar",
        note: "原字段混有中文词义说明，移入备注；不强配“找到”义的动名词。",
      });
      masdar = undefined;
    }
    if (animation && ["sponge-v017", "sponge-v032"].includes(v.id))
      notes.push(
        "本条重点是给定固定表达；短语整体含义不等于词头动词的一般词义，所列动词形式仅保留原包关联信息。",
      );
    if (animation && v.id === "sponge-v038") {
      notes.push(
        "词头 مَلَكَ 与搭配、例句中的 اِمْتَلَكَ 是不同动词，意思相关但变位不可混用；另有 اِمْتَلَكَ 独立卡片。",
      );
      report.notes.push({
        sourceId: v.id,
        field: "lemma/collocation",
        note: "保留原包 مَلَكَ 词头，注明搭配使用 اِمْتَلَكَ，并链接独立档案。",
      });
    }
    if (!masdar && !/[\u4e00-\u9fff]/.test(v.masdar)) {
      notes.push("原资料未提供动名词，不自动补造。");
      report.notes.push({
        sourceId: v.id,
        field: "masdar",
        note: "原占位符已省略；显示待补充，不生成对应词形题。",
      });
    }
    if (modal) {
      notes.push(
        "原词头为情态现在式 يَنْبَغِي；不将其错列为过去式。原资料未提供过去式。",
      );
      report.notes.push({
        sourceId: v.id,
        field: "past/present",
        note: "将情态词头放入 present，past 留空，不推导过去式。",
      });
    }
    if (v.lemma === "وُجِدَ") {
      notes.push(
        "原词头为被动形式，保留原有词形；此处现在式用于“有、存在”的存在句。",
      );
      report.notes.push({
        sourceId: v.id,
        field: "voice",
        note: "保留原资料的被动词头与存在句，不转换为主动 وَجَدَ。",
      });
    }
    if (v.id === "v036") {
      notes.push(
        "本搭配是宾语＋مِنْ 介词补语，不是两个直接宾语；原备注保留在来源说明中。",
      );
      report.notes.push({
        sourceId: v.id,
        field: "usage_note",
        note: "原“双宾语框架”需区分直接宾语与介词补语；原文保留，卡片追加说明。",
      });
    }
    if (v.id === "v041")
      notes.push(
        "所给搭配为“落在……身上”；本例句展示“发生”义，勿把两者机械互换。",
      );
    pack.knowledge.push({
      id,
      arabic: v.lemma,
      meaning: v.meaning_zh,
      date,
      category: `${prefix} · 动词搭配`,
      verb: {
        ...(past ? { past } : {}),
        ...(present ? { present } : {}),
        ...(masdar ? { masdar } : {}),
        note: notes.join(" "),
      },
      grammar: notes.join(" "),
      examples: [
        {
          arabic: v.example_ar,
          chinese: v.example_zh,
          context: animation
            ? "动画口语 · 原包教学例句（非逐字字幕）"
            : "新闻主题 · 原包教学例句",
          variety,
        },
      ],
      vocabulary: {
        partOfSpeech: modal ? "固定情态表达" : "动词 / 动词搭配",
        variety,
        phrases: [
          {
            arabic: v.collocation,
            chinese: v.meaning_zh,
            kind: /\s(?:مَعَ|عَنْ|إِلَى|عَلَى|فِي|مِنْ|نَحْوَ|بِ|لِ)/u.test(
              v.collocation,
            )
              ? "verb-preposition"
              : "phrase",
            note: v.usage_note,
          },
        ],
        usage: {
          register: animation ? "日常对话与动画配音" : "新闻与正式表达",
          interpretation: `${animation ? "日常搭配" : "新闻搭配"}练习：${v.meaning_zh}。`,
          note: sourceNote,
        },
        ...(animation && v.id === "sponge-v038"
          ? {
              family: [
                {
                  arabic: "اِمْتَلَكَ",
                  chinese: "拥有",
                  knowledgeId: idFor("verb", "sponge-v041"),
                  note: "与源词头为不同动词；查看该词独立变位。",
                },
              ],
            }
          : {}),
        sources: [
          {
            label: title,
            note: `${v.source}；原备注：${v.usage_note}；源 ID：${v.id}`,
          },
        ],
      },
    });
    const first = v.collocation.match(/^\S+/)?.[0];
    if (!first) throw Error(`${v.id}: 搭配为空，不能生成填空`);
    const rest = v.collocation.slice(first.length);
    const q = (suffix, type, prompt, answer, explanation, extra = {}) =>
      pack.questions.push({
        id: `${id}-${suffix}`,
        knowledgeId: id,
        type,
        prompt,
        answer,
        explanation,
        ...extra,
      });
    q(
      "fill-v1",
      "context-fill",
      `补全搭配的第一处词形（保留原有形式）：\n____${rest}\n中文提示：${v.meaning_zh}`,
      first,
      `完整搭配：${v.collocation}。本题只填第一处词形，参考：${first}。${notes.join(" ")} 标符可省略；本题不是开放翻译。`,
      { grading: "exact" },
    );
    // Only literal standalone prepositions in an unambiguous, single framework.
    // Do not split attached clitics or force one answer for alternative frameworks.
    const prep =
      !v.collocation.includes("/") &&
      v.collocation.match(/ (عَلَى|فِي|إِلَى|مَعَ|عَنْ|مِنْ|بِـ|لِـ)(?= |$)/u);
    if (prep) {
      const at = prep.index + 1,
        word = prep[1];
      q(
        "preposition-v1",
        "preposition",
        `按原资料补全介词：${v.collocation.slice(0, at)}____${v.collocation.slice(at + word.length)}\n中文提示：${v.meaning_zh}`,
        word,
        `原搭配：${v.collocation}。本框架使用 ${word}。${notes.join(" ")} 本题仅补原搭配的限定空格，不据此断言该动词在所有语境中只能用这一介词。`,
        { grading: "exact" },
      );
    }
    q(
      "choice-v1",
      "ar-choice",
      `选择该搭配在本资料中的中文含义：${v.collocation}`,
      v.meaning_zh,
      `本卡释义：${v.meaning_zh}；搭配：${v.collocation}。${notes.join(" ")}`,
      {
        options: choices(
          v.meaning_zh,
          data.verbs,
          "meaning_zh",
          i,
          undefined,
          animation,
        ),
      },
    );
    q(
      "zh-ar-v1",
      "zh-fill",
      `中译阿（原包教学例句）：${v.example_zh}`,
      v.example_ar,
      `参考例句：${v.example_ar}。目标搭配：${v.collocation}。${notes.join(" ")} 其他语义完整、语法自然的译法也可接受，不按字符串一致判错。`,
      {
        grading: "self",
        rubric: [
          "准确表达中文句意及主要参与者、动作和对象。",
          "结合语境检查介词、语态、人称和格位；不要求与参考逐字相同。",
          animation
            ? "例句为教学编写，不冒充已经听音确认的原字幕。"
            : "参考例句来自上传资料，不代表新闻事实已经核验。",
        ],
      },
    );
    q(
      "ar-zh-v1",
      "ar-zh",
      `阿译中（原包教学例句）：${v.example_ar}`,
      v.example_zh,
      `参考译文：${v.example_zh}。目标知识：${v.meaning_zh}（${v.collocation}）。中文可自然改写，但不要遗漏句意。`,
      {
        grading: "self",
        rubric: [
          "准确传达主要句意和句中逻辑。",
          "允许自然的同义改写，不要求逐字一致。",
        ],
      },
    );
  });
  data.terms.forEach((v, i) => {
    const id = idFor("term", v.id);
    pack.knowledge.push({
      id,
      arabic: v.arabic,
      meaning: v.chinese,
      date,
      category: `${prefix} · ${v.category}`,
      vocabulary: {
        partOfSpeech: animation ? "动画词汇 / 固定表达" : "新闻术语 / 固定表达",
        variety,
        usage: {
          register: animation ? "动画与日常表达（注意具体场合）" : "新闻语体",
          interpretation: `主题：${v.category}。请结合原${animation ? "动画" : "新闻"}上下文理解。`,
          note: sourceNote,
        },
        sources: [{ label: title, note: `${v.source}；源 ID：${v.id}` }],
      },
    });
    pack.questions.push({
      id: `${id}-meaning-v1`,
      knowledgeId: id,
      type: "ar-choice",
      prompt: `选择此术语在本资料中的中文含义：${v.arabic}`,
      answer: v.chinese,
      explanation: animation
        ? `${v.arabic}：${v.chinese}。动画主题：${v.category}。本题学习资料中的表达含义，不作为已核音的字幕定稿。`
        : `${v.arabic}：${v.chinese}。新闻主题：${v.category}。本题学习表达含义，不验证相关新闻事实。`,
      options: choices(
        v.chinese,
        data.terms,
        "chinese",
        i,
        v.category,
        animation,
      ),
    });
  });
  report.counts.knowledge = pack.knowledge.length;
  report.counts.questions = pack.questions.length;
  return { pack, report };
}
