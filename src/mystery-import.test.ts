import { describe, it, expect } from "vitest";
import source from "../data/imports/spongebob-mystery-01.curated.json";
import {
  bundledMystery,
  initialState,
  installBundledPacks,
  parsePack,
  parseBackup,
  mergePack,
  recordAnswer,
} from "./core";
import { recordWord, saveAnnotation } from "./study";
import { wordContext } from "./word-context";
describe("mystery customer subtitle import", () => {
  it("validates 24 cards and 102 choice questions, retaining the supplied dates and exact source captions", () => {
    const pack = parsePack(bundledMystery);
    expect(pack.knowledge).toHaveLength(24);
    expect(pack.questions).toHaveLength(102);
    for (const k of pack.knowledge) {
      expect(k.date).toBe("2026-10-03");
      expect(k.examples?.length).toBeGreaterThan(0);
      for (const e of k.examples || []) {
        expect(e.context).toContain("未核音");
        if (!e.context?.includes("标题"))
          expect(
            source.transcript.some(
              (l) => l.arabic === e.arabic && l.chinese === e.chinese,
            ),
          ).toBe(true);
      }
      expect(wordContext(k, pack.knowledge).phrases[0].label).toBe(
        "台词搭配（整理形式）",
      );
    }
    for (const q of pack.questions) {
      expect(q.grading).toBe("choice");
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
      expect(pack.knowledge.some((k) => k.id === q.knowledgeId)).toBe(true);
    }
  });
  it("covers every subtitle verb without inventing missing or inapplicable morphology", () => {
    const card = (key: string) =>
      bundledMystery.knowledge.find((k) => k.id.endsWith("-" + key))!;
    expect(bundledMystery.knowledge.filter((k) => k.verb)).toHaveLength(11);
    for (const key of [
      "remember",
      "find",
      "go",
      "still",
      "not-be",
      "try",
      "return",
      "come",
      "enjoy",
      "catch",
      "escape",
    ])
      expect(card(key).verb).toBeDefined();
    expect(card("find").examples).toHaveLength(2);
    expect(card("find").verb?.note).toContain("被动式");
    expect(card("not-be").verb?.present).toBeUndefined();
    expect(card("come").verb?.past).toBeUndefined();
    expect(card("still").verb?.masdar).toBeUndefined();
    expect(card("return").grammar).toContain("命令");
    expect(card("catch").verb?.present).toBe("يُمْسِكُ");
  });
  it("adds the collection once while retaining all previous learning, journal entries and personal edits", () => {
    let s = initialState();
    s = {
      ...s,
      installedPacks: s.installedPacks?.filter((x) => x !== bundledMystery.id),
      knowledge: s.knowledge.filter(
        (k) => !k.id.startsWith(bundledMystery.id + "-"),
      ),
      questions: s.questions.filter(
        (q) => !q.id.startsWith(bundledMystery.id + "-"),
      ),
    };
    s = recordAnswer(
      s,
      s.questions[0],
      s.questions[0].answer,
      true,
      "2026-10-31",
    );
    s = saveAnnotation(
      recordWord(s, s.knowledge[0].id, true, "2026-10-31"),
      s.knowledge[0].id,
      "原有批注",
    );
    s.journal = {
      "2026-10-31": {
        text: "今天继续学习",
        mood: "🌱 有收获",
        weather: "☀️ 晴",
      },
    };
    const before = structuredClone(s),
      next = installBundledPacks(s);
    expect(s).toEqual(before);
    expect(next.knowledge).toHaveLength(330);
    expect(next.questions).toHaveLength(852);
    for (const key of [
      "history",
      "progress",
      "wordProgress",
      "annotations",
      "journal",
      "favorites",
    ] as const)
      expect(next[key]).toEqual(s[key]);
    expect(installBundledPacks(next)).toBe(next);
    expect(mergePack(next, bundledMystery, false)).toEqual(next);
    expect(parseBackup(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });
});
