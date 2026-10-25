import { describe, it, expect } from "vitest";
import { matchesKnowledge, searchText } from "./search";
import { initialState } from "./core";
describe("Chinese and Arabic vocabulary search", () => {
  const k = {
    id: "test",
    arabic: "أَقَرَّ",
    meaning: "批准、通过",
    root: "ق ر ر",
    date: "2026-10-25",
    category: "新闻",
    verb: { present: "يُقِرُّ" },
    examples: [
      {
        arabic: "أَقَرَّ الْمَجْلِسُ الْقَانُونَ.",
        chinese: "议会通过了法律。",
      },
    ],
  };
  it("ignores vowel marks, elongation, Alif variants and directional marks without mutating records", () => {
    const before = structuredClone(k);
    for (const q of [
      "أَقَرَّ",
      "اقر",
      "أقــر",
      "\u200fاقر",
      "批准",
      "يقر",
      "议会",
      "قرر",
      "ق ر ر",
      "批准 يقر",
    ])
      expect(matchesKnowledge(k, q)).toBe(true);
    expect(matchesKnowledge(k, "不存在的词")).toBe(false);
    expect(k).toEqual(before);
    expect(searchText("إِ آ أ ٱ")).toBe("ا ا ا ا");
  });
  it("searches annotations and accepts whitespace queries without indexing JSON property names", () => {
    expect(matchesKnowledge(k, "我的笔记", "我的笔记")).toBe(true);
    expect(matchesKnowledge(k, "  ")).toBe(true);
    expect(matchesKnowledge(k, "present")).toBe(false);
  });
  it("finds bundled corpus terms with Chinese and unvocalized Arabic", () => {
    const all = initialState().knowledge;
    for (const q of ["人类命运共同体", "مجتمع المستقبل المشترك للبشرية"])
      expect(
        all
          .filter((k) => matchesKnowledge(k, q))
          .some((k) => k.id === "shared-future-lesson02-001"),
      ).toBe(true);
  });
});
