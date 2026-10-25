import { describe, it, expect } from "vitest";
import seed from "./seed.json";
import {
  parsePack,
  initialState,
  recordAnswer,
  mergePack,
  parseBackup,
  removeKnowledge,
  normalize,
} from "./core";
describe("knowledge packages", () => {
  it("validates starter and covers all eight types", () => {
    expect(parsePack(seed).knowledge).toHaveLength(7);
    expect(new Set(seed.questions.map((q) => q.type)).size).toBe(8);
  });
  it("rejects dangling references and duplicates", () => {
    expect(() =>
      parsePack({
        ...seed,
        questions: [{ ...seed.questions[0], knowledgeId: "missing" }],
      }),
    ).toThrow();
    expect(() =>
      parsePack({ ...seed, knowledge: [seed.knowledge[0], seed.knowledge[0]] }),
    ).toThrow();
  });
  it("requires valid options and dates", () => {
    expect(() =>
      parsePack({
        ...seed,
        questions: [{ ...seed.questions[0], answer: "wrong" }],
      }),
    ).toThrow();
    expect(() =>
      parsePack({
        ...seed,
        knowledge: [{ ...seed.knowledge[0], date: "2026-02-30" }],
        questions: [],
      }),
    ).toThrow();
  });
  it("keeps existing entries unless update is explicit", () => {
    const s = initialState();
    const p = parsePack({
      ...seed,
      knowledge: [{ ...seed.knowledge[0], meaning: "changed" }],
      questions: [],
    });
    expect(mergePack(s, p, false).knowledge[0].meaning).toBe(
      s.knowledge[0].meaning,
    );
    expect(mergePack(s, p, true).knowledge[0].meaning).toBe("changed");
  });
});
describe("learning and persistence", () => {
  it("schedules 1, 3, 7, 14, 30 days and resets on errors", () => {
    let s = initialState();
    const q = s.questions[0];
    for (const [i, date] of [
      "2026-10-26",
      "2026-10-28",
      "2026-11-01",
      "2026-11-08",
      "2026-11-24",
    ].entries()) {
      s = recordAnswer(s, q, "answer", true, "2026-10-25");
      expect(s.progress[q.id].due).toBe(date);
      expect(s.progress[q.id].stage).toBe(i);
    }
    s = recordAnswer(s, q, "wrong", false, "2026-10-25");
    expect(s.progress[q.id]).toMatchObject({
      stage: 0,
      due: "2026-10-26",
      errors: 1,
      attempts: 6,
    });
  });
  it("round trips a complete backup", () => {
    const s = recordAnswer(
      { ...initialState(), favorites: ["guard"] },
      initialState().questions[0],
      "test",
      false,
    );
    expect(parseBackup(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("rejects broken backups and cascades deletion", () => {
    const s = initialState();
    expect(() => parseBackup({ ...s, progress: { no: {} } })).toThrow();
    const next = removeKnowledge(
      recordAnswer(s, s.questions[0], "wrong", false),
      s.knowledge[0].id,
    );
    expect(
      next.questions.some((q) => q.knowledgeId === s.knowledge[0].id),
    ).toBe(false);
    expect(next.history).toHaveLength(0);
    expect(Object.keys(next.progress)).toHaveLength(0);
  });
  it("normalizes optional harakat for comparison", () => {
    expect(normalize("حَرَسُ الشَّرَفِ")).toBe("حرس الشرف");
  });
});
