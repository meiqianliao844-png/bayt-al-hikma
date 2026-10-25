import { describe, it, expect } from "vitest";
import { wordContext } from "./word-context";
import { initialState, type Knowledge } from "./core";
describe("flashcard context from existing material", () => {
  it("shows supplied collocations and bilingual examples without rewriting or claiming they are article quotations", () => {
    const s = initialState(),
      k = s.knowledge.find(
        (x) => x.vocabulary?.phrases?.length && x.examples?.length,
      )!;
    const c = wordContext(k, s.knowledge);
    expect(c.phrases[0].arabic).toBe(k.vocabulary!.phrases![0].arabic);
    expect(c.examples[0]).toEqual(k.examples![0]);
    expect(c.examples[0].context).toContain("教学例句");
  });
  it("can find a term in same-source material while keeping its context label and skipping unrelated sources", () => {
    const k: Knowledge = {
      id: "term",
      arabic: "الْكِتَابُ",
      meaning: "书",
      date: "2026-10-25",
      category: "词汇",
      vocabulary: { sources: [{ label: "A" }] },
    };
    const example = {
      ...k,
      id: "example",
      arabic: "قَرَأَ",
      examples: [
        {
          arabic: "قَرَأْتُ الْكِتَابَ.",
          chinese: "我读了这本书。",
          context: "教学例句",
        },
      ],
    };
    expect(wordContext(k, [k, example]).examples[0].context).toContain(
      "相同词形",
    );
    expect(
      wordContext(k, [
        { ...example, vocabulary: { sources: [{ label: "B" }] } },
      ]).examples,
    ).toEqual([]);
  });
  it("leaves missing context empty instead of inventing a sentence", () => {
    const k: Knowledge = {
      id: "k",
      arabic: "كِتَابٌ",
      meaning: "书",
      date: "2026-10-25",
      category: "词汇",
    };
    expect(wordContext(k, [k])).toEqual({ phrases: [], examples: [] });
  });
});
