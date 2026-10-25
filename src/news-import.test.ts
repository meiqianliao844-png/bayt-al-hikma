import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import portableSource from "../data/imports/azerbaijan-school-uniform.portable.json";
import { convertPortableNews, isPortableNews } from "./portable-news.mjs";
import nativeSchema from "./knowledge-pack.schema.json";
import {
  bundledNews,
  parsePack,
  initialState,
  installBundledNews,
  recordAnswer,
  parseBackup,
  localRepository,
  removeKnowledge,
  checkAnswer,
  gradingMode,
} from "./core";
import type { State } from "./core";
import seed from "./seed.json";
const raw = (): any => structuredClone(portableSource);
const legacy = (): State => ({
  version: 1,
  knowledge: structuredClone(seed.knowledge),
  questions: structuredClone(seed.questions),
  favorites: ["guard"],
  progress: {},
  history: [],
});

describe("uploaded portable news conversion", () => {
  it("proves the uploaded format is not native, then validates the converted native pack", () => {
    const input = raw();
    const validate = new Ajv().compile(nativeSchema);
    expect(validate(input)).toBe(false);
    const { pack, report } = convertPortableNews(input);
    expect(validate(pack)).toBe(true);
    expect(parsePack(pack)).toEqual(pack);
    expect(parsePack(input)).toEqual(pack);
    expect(report.counts).toEqual({
      verbs: 51,
      terms: 55,
      knowledge: 106,
      questions: 277,
    });
    expect(bundledNews).toEqual(pack);
  });
  it("preserves every supplied form, bilingual example, term and topic without inventing missing forms", () => {
    const input = raw();
    const { pack } = convertPortableNews(input);
    for (const v of input.verbs) {
      const k = pack.knowledge.find((x) => x.id.endsWith(`-verb-${v.id}`))!;
      expect(k.arabic).toBe(v.lemma);
      expect(k.meaning).toBe(v.meaning_zh);
      expect(k.examples?.[0]).toMatchObject({
        arabic: v.example_ar,
        chinese: v.example_zh,
      });
      expect(k.vocabulary?.phrases?.[0].arabic).toBe(v.collocation);
      if (v.id !== "v048") {
        expect(k.verb?.past).toBe(v.lemma);
        expect(k.verb?.present).toBe(v.imperfect);
      }
      if (v.masdar !== "—") expect(k.verb?.masdar).toBe(v.masdar);
      else expect(k.verb?.masdar).toBeUndefined();
      expect(
        pack.questions.filter((q) => q.knowledgeId === k.id).length,
      ).toBeGreaterThanOrEqual(4);
    }
    for (const term of input.terms) {
      const k = pack.knowledge.find((x) => x.id.endsWith(`-term-${term.id}`))!;
      expect(k.arabic).toBe(term.arabic);
      expect(k.meaning).toBe(term.chinese);
      expect(k.category).toBe(`校服新闻 · ${term.category}`);
      expect(pack.questions.some((q) => q.knowledgeId === k.id)).toBe(true);
    }
    const modal = pack.knowledge.find((k) => k.id.endsWith("-v048"))!;
    expect(modal.verb?.past).toBeUndefined();
    expect(modal.verb?.present).toBe("يَنْبَغِي");
    expect(pack.knowledge.find((k) => k.id.endsWith("-v042"))!.verb?.past).toBe(
      "وُجِدَ",
    );
  });
  it("generates stable namespaced IDs, unique answer choices, constrained blanks and self-assessed translations", () => {
    const { pack } = convertPortableNews(raw());
    expect(convertPortableNews(raw()).pack).toEqual(pack);
    expect(new Set(pack.knowledge.map((k) => k.id)).size).toBe(106);
    expect(new Set(pack.questions.map((q) => q.id)).size).toBe(277);
    const ids = new Set(pack.knowledge.map((k) => k.id));
    for (const q of pack.questions) {
      expect(ids.has(q.knowledgeId)).toBe(true);
      if (q.type === "context-fill" || q.type === "preposition") {
        expect(gradingMode(q)).toBe("exact");
        expect(checkAnswer(q, q.answer)).toBe(true);
        expect(checkAnswer(q, "答案不正确")).toBe(false);
      } else if (q.type === "ar-choice") {
        expect(new Set(q.options).size).toBe(q.options?.length);
        expect(q.options?.filter((x) => x === q.answer)).toHaveLength(1);
        expect(checkAnswer(q, q.answer)).toBe(true);
      } else {
        expect(gradingMode(q)).toBe("self");
        expect(q.rubric?.length).toBeGreaterThan(0);
        expect(() => checkAnswer(q, q.answer)).toThrow();
      }
    }
  });
  it("does not mutate the source and rejects malformed source fields, invalid dates and duplicate IDs", () => {
    const input = raw(),
      before = structuredClone(input);
    convertPortableNews(input);
    expect(input).toEqual(before);
    expect(() => convertPortableNews({})).toThrow();
    expect(isPortableNews(null)).toBeFalsy();
    for (const mutate of [
      (d: ReturnType<typeof raw>) => d.verbs.push(d.verbs[0]),
      (d: ReturnType<typeof raw>) => (d.date = "2026-02-30"),
      (d: ReturnType<typeof raw>) => delete d.verbs[0].example_zh,
      (d: ReturnType<typeof raw>) => (d.terms[0].type = "verb_collocation"),
    ]) {
      const d = raw();
      mutate(d);
      expect(() => convertPortableNews(d)).toThrow();
    }
  });
});
describe("non-destructive bundled installation", () => {
  it("adds 106 cards and 259 questions once and preserves user edits, favorites, progress and history", () => {
    let old = legacy();
    old = recordAnswer(old, old.questions[0], "旧答案", false, "2026-10-25");
    old.knowledge.push({
      ...bundledNews.knowledge[0],
      meaning: "用户已编辑的解释",
    });
    const original = structuredClone(old),
      installed = installBundledNews(old);
    expect(old).toEqual(original);
    expect(installed.knowledge).toHaveLength(113);
    expect(installed.questions).toHaveLength(297);
    expect(
      installed.knowledge.find((k) => k.id === bundledNews.knowledge[0].id)
        ?.meaning,
    ).toBe("用户已编辑的解释");
    expect(installed.favorites).toEqual(old.favorites);
    expect(installed.progress).toEqual(old.progress);
    expect(installed.history).toEqual(old.history);
    expect(installBundledNews(installed)).toBe(installed);
    expect(parseBackup(JSON.parse(JSON.stringify(installed)))).toEqual(
      installed,
    );
  });
  it("keeps the legacy storage key, makes no load-time writes and respects intentional deletions after installation", () => {
    const stored = JSON.stringify(legacy());
    const original = globalThis.localStorage;
    let writes = 0;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => {
          expect(key).toBe("hikma-v1");
          return stored;
        },
        setItem: () => {
          writes++;
          throw Error("quota");
        },
      },
    });
    try {
      const loaded = localRepository.load();
      expect(loaded.knowledge).toHaveLength(221);
      expect(writes).toBe(0);
      expect(loaded.favorites).toEqual(["guard"]);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
    }
    const installed = initialState();
    const deleted = removeKnowledge(installed, bundledNews.knowledge[0].id);
    expect(installBundledNews(deleted)).toBe(deleted);
    expect(
      deleted.knowledge.some((k) => k.id === bundledNews.knowledge[0].id),
    ).toBe(false);
  });
});
