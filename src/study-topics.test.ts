import { it, expect } from "vitest";
import {
  initialState,
  bundledLiterature,
  bundledFoldable,
  bundledExpressions,
} from "./core";
import { studyTopics } from "./study-topics";
it("limits topics by explicit membership and keeps reused cards in all relevant topics", () => {
  const s = initialState(),
    topics = studyTopics(s.knowledge),
    lit = topics.find((t) => t.id === bundledLiterature.id)!;
  expect(lit.ids.size).toBe(183);
  expect(
    [...lit.ids].every((id) =>
      s.knowledge
        .find((k) => k.id === id)
        ?.category.startsWith("阿拉伯文学史第一讲"),
    ),
  ).toBe(true);
  const tech = topics.find((t) => t.id === bundledFoldable.id)!;
  expect(tech.ids.size).toBe(56);
  expect(
    [...bundledExpressions.knowledge].every((k) => tech.ids.has(k.id)),
  ).toBe(true);
  const old = "news-20261025-4c99c03c-verb-v001";
  expect(tech.ids.has(old)).toBe(true);
  expect(topics.filter((t) => t.ids.has(old)).length).toBeGreaterThan(1);
  const removed = studyTopics(s.knowledge.filter((k) => k.id !== old));
  expect(removed.flatMap((t) => [...t.ids])).not.toContain(old);
});
it("includes personal/imported categories even without a bundled topic registration", () => {
  const topics = studyTopics([
    {
      id: "my-sentence",
      arabic: "مَرْحَبًا",
      meaning: "你好",
      date: "2026-10-31",
      category: "我的专题",
    },
  ]);
  expect(topics).toHaveLength(1);
  expect(topics[0].title).toBe("我的专题");
  expect(topics[0].ids.has("my-sentence")).toBe(true);
});
