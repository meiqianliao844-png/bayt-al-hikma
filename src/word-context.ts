import type { Knowledge } from "./core";
import { normalize } from "./core";
/** Only reuse supplied material; never manufacture an article quotation. */
export function wordContext(k: Knowledge, all: Knowledge[], query = "") {
  const phrases = (k.vocabulary?.phrases || []).map((p) => ({
    arabic: p.arabic,
    chinese: p.chinese,
    label: p.note?.startsWith("台词搭配（整理形式")
      ? "台词搭配（整理形式）"
      : "原资料搭配",
  }));
  for (const p of k.collocations || [])
    if (!phrases.some((x) => normalize(x.arabic) === normalize(p)))
      phrases.push({ arabic: p, chinese: "", label: "原资料搭配" });
  const examples = [...(k.examples || [])];
  const sources = new Set(k.vocabulary?.sources?.map((s) => s.label) || []);
  const terms = k.arabic
    .split(/\s*\/\s*/)
    .map(normalize)
    .filter((t) => t.length >= 3);
  const matches = (text: string) =>
    terms.some((t) => {
      const n = normalize(text);
      const start = n.indexOf(t);
      if (start < 0) return false;
      const before = n.slice(0, start).split(/\s/).pop() || "";
      const after = n.slice(start + t.length);
      return (
        /^(?:[وفبكل]{0,2})$/.test(before) &&
        (!after || /^[\s،؛.،!?؟:]/.test(after))
      );
    });
  if (!examples.length || !phrases.length)
    for (const other of all) {
      if (
        other.id === k.id ||
        !other.vocabulary?.sources?.some((s) => sources.has(s.label))
      )
        continue;
      if (!k.examples?.length)
        for (const e of other.examples || [])
          if (
            matches(e.arabic) &&
            !examples.some((x) => normalize(x.arabic) === normalize(e.arabic))
          )
            examples.push({
              ...e,
              context: `相同词形的资料例句（需结合句义） · ${e.context || "来源未注明是否原文"}`,
            });
      if (!k.vocabulary?.phrases?.length && !k.collocations?.length)
        for (const p of other.vocabulary?.phrases || [])
          if (
            matches(p.arabic) &&
            !phrases.some((x) => normalize(x.arabic) === normalize(p.arabic))
          )
            phrases.push({
              arabic: p.arabic,
              chinese: p.chinese,
              label: "相关资料搭配",
            });
    }
  const tokens = normalize(query).split(" ").filter(Boolean);
  const preferred = (text: string) =>
    tokens.length > 0 && tokens.every((t) => normalize(text).includes(t));
  const prioritized = <T>(items: T[], text: (item: T) => string) => [
    ...items.filter((item) => preferred(text(item))),
    ...items.filter((item) => !preferred(text(item))),
  ];
  return {
    phrases: prioritized(phrases, (p) => p.arabic + " " + p.chinese).slice(
      0,
      2,
    ),
    examples: prioritized(examples, (e) =>
      [e.context, e.arabic, e.chinese].join(" "),
    ).slice(0, 2),
  };
}
