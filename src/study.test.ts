import { describe, it, expect } from "vitest";
import { initialState, parseBackup, removeKnowledge } from "./core";
import {
  choiceOnly,
  recordWord,
  saveAnnotation,
  wordReviewPlan,
} from "./study";
describe("choice-only practice and word study", () => {
  it("adapts every current exercise without changing source IDs, records or input data", () => {
    const s = initialState(),
      before = structuredClone(s);
    const qs = choiceOnly(s.questions, s.knowledge);
    expect(qs).toHaveLength(580);
    for (const q of qs) {
      expect(q.grading).toBe("choice");
      expect(q.options!.length).toBeGreaterThanOrEqual(2);
      expect(new Set(q.options).size).toBe(q.options!.length);
      expect(q.options).toContain(q.answer);
    }
    expect(qs.map((q) => q.id)).toEqual(s.questions.map((q) => q.id));
    expect(s).toEqual(before);
  });
  it("supports even a single imported card with no distractor bank", () => {
    const q = {
      id: "q",
      knowledgeId: "k",
      type: "ar-zh",
      prompt: "x",
      answer: "书",
      explanation: "x",
    };
    expect(choiceOnly([q], [])[0].options).toEqual(["书", "以上均不符合"]);
  });
  it("records word review independently of question histories and round trips backups", () => {
    const old = initialState(),
      id = old.knowledge[0].id;
    let s = recordWord(old, id, false, "2026-10-25");
    expect(s.wordProgress![id]).toMatchObject({
      due: "2026-10-26",
      lastKnown: false,
      seen: 1,
    });
    s = recordWord(s, id, true, "2026-10-25");
    expect(s.wordProgress![id]).toMatchObject({
      due: "2026-10-28",
      lastKnown: true,
      seen: 2,
    });
    expect(s.progress).toEqual(old.progress);
    expect(s.history).toEqual(old.history);
    expect(parseBackup(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("saves Chinese/Arabic annotations, preserves prior learning and validates backups", () => {
    const old = initialState(),
      id = old.knowledge[0].id;
    const s = saveAnnotation(old, id, "老师批注：فِي\n搭配待复习");
    expect(s.annotations![id]).toContain("فِي");
    expect(s.knowledge).toEqual(old.knowledge);
    expect(parseBackup(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(saveAnnotation(s, id, "").annotations![id]).toBeUndefined();
    expect(removeKnowledge(s, id).annotations![id]).toBeUndefined();
    expect(() => saveAnnotation(s, "missing", "x")).toThrow();
    expect(() =>
      parseBackup({ ...s, annotations: { missing: "x" } }),
    ).toThrow();
    expect(() =>
      parseBackup({
        ...s,
        wordProgress: {
          [id]: { stage: 1, due: "bad", seen: 1, lastKnown: true },
        },
      }),
    ).toThrow();
  });
});

it("builds the review plan from word ratings and carries overdue words forward", () => {
  const original = initialState();
  const id = original.knowledge[0].id;
  const learned = recordWord(original, id, true, "2026-10-25");
  expect(wordReviewPlan(original)).toEqual([]);
  expect(wordReviewPlan(learned, "2026-10-27")[0]).toMatchObject({
    knowledge: { id },
    due: "2026-10-26",
    overdue: true,
  });
  const reviewed = recordWord(learned, id, true, "2026-10-27");
  expect(wordReviewPlan(reviewed, "2026-10-27")[0]).toMatchObject({
    due: "2026-10-30",
    overdue: false,
  });
  expect(reviewed.progress).toEqual(original.progress);
});
