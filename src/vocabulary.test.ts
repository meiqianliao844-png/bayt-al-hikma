import { describe, expect, it } from "vitest";
import oldSeed from "./seed.json";
import vocabularySeed from "./vocabulary-sample.json";
import {
  initialState,
  parsePack,
  mergePack,
  parseBackup,
  recordAnswer,
  gradingMode,
  checkAnswer,
  localRepository,
} from "./core";
import type { Knowledge, Question } from "./core";

const rich = () => parsePack(structuredClone(vocabularySeed));
const supplement = (k: Knowledge) =>
  parsePack({
    schemaVersion: 1,
    id: "supplement",
    title: "补充",
    knowledge: [k],
    questions: [],
  });
describe("backwards-compatible vocabulary enrichment", () => {
  it("accepts unchanged old packs, backups and the ten-skill vocabulary example", () => {
    expect(parsePack(oldSeed)).toEqual(oldSeed);
    expect(parseBackup(JSON.parse(JSON.stringify(initialState())))).toEqual(
      initialState(),
    );
    const p = rich();
    expect(new Set(p.questions.map((q) => q.type)).size).toBe(11);
    expect(
      p.knowledge[0].vocabulary?.relations?.some(
        (x) => x.relation === "semantic-opposite",
      ),
    ).toBe(true);
  });
  it("keeps the existing storage key and restores enriched backups without loss", () => {
    const p = rich();
    let state = mergePack(initialState(), p, false);
    state = recordAnswer(
      { ...state, favorites: ["lex-kataba"] },
      p.questions[0],
      "my answer",
      false,
      "2026-10-25",
    );
    const store = new Map<string, string>();
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        setItem: (k: string, v: string) => store.set(k, v),
        getItem: (k: string) => store.get(k),
      },
    });
    try {
      localRepository.save(state);
      expect([...store.keys()]).toEqual(["hikma-v1"]);
      expect(localRepository.load()).toEqual(state);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });
  it("accepts incomplete optional morphology and explicitly inapplicable forms", () => {
    const k = {
      ...oldSeed.knowledge[0],
      verb: { imperative: "اُكْتُبْ" },
      vocabulary: { noun: { applicable: false, note: "动词条目" } },
    };
    expect(supplement(k).knowledge[0].verb?.past).toBeUndefined();
    expect(() =>
      supplement({ ...k, vocabulary: { partOfSpeech: "" } }),
    ).not.toThrow();
    expect(() =>
      supplement({
        ...k,
        vocabulary: { noun: { applicable: false, gender: "不适用" } },
      }),
    ).not.toThrow();
  });
  it("deeply supplements fields, unions keyed collections, and preserves progress and history", () => {
    const p = rich();
    let s = mergePack(initialState(), p, false);
    s = recordAnswer(
      { ...s, favorites: ["lex-kataba"] },
      p.questions[0],
      "test",
      true,
      "2026-10-25",
    );
    const old = s.knowledge.find((k) => k.id === "lex-kataba")!;
    const patch = supplement({
      id: old.id,
      arabic: old.arabic,
      meaning: old.meaning,
      date: old.date,
      category: old.category,
      verb: { conjugations: [{ pronoun: "أَنَا", note: "新增注释" }] },
      vocabulary: {
        usage: { frequency: "常用" },
        family: [
          {
            arabic: "كَاتِبٌ",
            chinese: "写作者；作家",
            knowledgeId: "lex-katib",
            note: "新增链接注释",
          },
        ],
      },
    });
    const next = mergePack(s, patch, true);
    const k = next.knowledge.find((k) => k.id === old.id)!;
    expect(k.verb?.past).toBe(old.verb?.past);
    expect(k.verb?.conjugations?.[0].past).toBe("كَتَبْتُ");
    expect(k.verb?.conjugations?.[0].note).toBe("新增注释");
    expect(k.vocabulary?.usage?.register).toBe(old.vocabulary?.usage?.register);
    expect(k.vocabulary?.family).toHaveLength(old.vocabulary!.family!.length);
    expect(
      k.vocabulary?.family?.find((f) => f.arabic === "كَاتِبٌ")?.note,
    ).toBe("新增链接注释");
    expect(k.examples).toEqual(old.examples);
    expect(next.history).toEqual(s.history);
    expect(next.progress).toEqual(s.progress);
    expect(next.favorites).toEqual(s.favorites);
    expect(mergePack(next, patch, true)).toEqual(next);
    expect(mergePack(s, patch, false)).toEqual(s);
    expect(parseBackup(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });
  it("does not merge options when explicitly updating a question", () => {
    const p = rich();
    const state = mergePack(initialState(), p, false);
    const q = { ...p.questions[1], options: ["كُتُبٌ", "كَاتِبٌ"] };
    expect(
      mergePack(
        state,
        { ...p, knowledge: [], questions: [q] },
        true,
      ).questions.find((x) => x.id === q.id)?.options,
    ).toEqual(q.options);
  });
  it("rejects invented relation labels, unknown fields, non-HTTPS sources and audio", () => {
    const k = rich().knowledge[0];
    expect(() =>
      supplement({
        ...k,
        vocabulary: {
          relations: [
            { arabic: "x", chinese: "x", relation: "same", distinction: "x" },
          ],
        },
      } as unknown as Knowledge),
    ).toThrow();
    expect(() =>
      supplement({ ...k, vocabulary: { madeUp: 1 } } as unknown as Knowledge),
    ).toThrow();
    expect(() =>
      supplement({
        ...k,
        vocabulary: { sources: [{ label: "bad", url: "javascript:alert(1)" }] },
      }),
    ).toThrow();
    expect(() =>
      supplement({
        ...k,
        examples: [
          { arabic: "x", chinese: "x", audioUrl: "http://example.com/a.mp3" },
        ],
      }),
    ).toThrow();
  });
});
describe("vocabulary practice grading", () => {
  it("preserves all eight legacy grading modes", () => {
    for (const q of parsePack(oldSeed).questions)
      expect(gradingMode(q)).toBe(
        ["zh-ar", "ar-choice", "preposition", "synonym"].includes(q.type)
          ? "choice"
          : "self",
      );
  });
  it("grades constrained forms ignoring harakat, accepts supplied alternatives, rejects incorrect forms", () => {
    const q = rich().questions[0];
    expect(checkAnswer(q, " كَتَبَتْ ")).toBe(true);
    expect(checkAnswer(q, "كتبت")).toBe(true);
    expect(checkAnswer(q, "يَكْتُبُ")).toBe(false);
    expect(checkAnswer({ ...q, acceptedAnswers: ["بديل"] }, "بديل")).toBe(true);
    const choice = rich().questions[1];
    expect(checkAnswer(choice, choice.answer)).toBe(true);
    expect(
      checkAnswer(
        choice,
        choice.options!.find((x) => x !== choice.answer)!,
      ),
    ).toBe(false);
  });
  it("never string-grades open translations or corrections", () => {
    for (const q of rich().questions.filter((q) =>
      ["zh-fill", "ar-zh", "grammar"].includes(q.type),
    )) {
      expect(gradingMode(q)).toBe("self");
      expect(() => checkAnswer(q, q.answer)).toThrow();
    }
    const bad = rich();
    bad.questions = [
      { ...bad.questions.find((q) => q.type === "ar-zh")!, grading: "exact" },
    ];
    expect(() => parsePack(bad)).toThrow();
  });
  it("requires valid choices for new objective questions and rejects exact grading of synonyms", () => {
    const p = rich();
    p.questions = [{ ...p.questions[1], answer: "not-an-option" }];
    expect(() => parsePack(p)).toThrow();
    const q: Question = {
      id: "q",
      knowledgeId: p.knowledge[0].id,
      type: "synonym",
      prompt: "x",
      answer: "x",
      explanation: "x",
      grading: "exact",
    };
    expect(() => parsePack({ ...p, questions: [q] })).toThrow();
  });
});
