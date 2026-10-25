import type { Knowledge } from "./core";
/** Search normalization is deliberately separate from exercise answer grading. */
export function searchText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(
      /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640\u200e\u200f\u061c]/g,
      "",
    )
    .replace(/[أإآٱ]/g, "ا")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(strings);
  return [];
}
export function matchesKnowledge(
  k: Knowledge,
  query: string,
  annotation = "",
): boolean {
  const tokens = searchText(query).split(" ").filter(Boolean);
  if (!tokens.length) return true;
  const text = searchText(
    strings([
      k.arabic,
      k.meaning,
      k.root,
      k.root?.replace(/\s+/g, ""),
      k.form,
      k.category,
      k.verb,
      k.vocabulary,
      k.collocations,
      k.examples,
      k.grammar,
      k.confusion,
      k.scenario,
      annotation,
    ]).join(" "),
  );
  return tokens.every((token) => text.includes(token));
}
