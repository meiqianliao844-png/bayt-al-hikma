import { describe, it, expect } from "vitest";
import source from "../data/imports/shared-future.corpus.json";
import {
  bundledSharedFuture,
  initialState,
  installBundledPacks,
  parseBackup,
  parsePack,
  normalize,
} from "./core";
import { wordContext } from "./word-context";
import { recordWord, saveAnnotation, wordReviewPlan } from "./study";
describe("shared future Word corpus", () => {
  it("preserves all 85 source rows with stable IDs and two valid choice questions each", () => {
    const pack = parsePack(bundledSharedFuture);
    expect(pack.knowledge).toHaveLength(85);
    expect(pack.questions).toHaveLength(170);
    expect(new Set(pack.knowledge.map((k) => k.category)).size).toBe(6);
    source.records.forEach((r, i) => {
      const k = pack.knowledge[i];
      expect(k.meaning).toBe(r.chinese);
      expect(k.vocabulary?.sources?.[0].note).toContain(r.arabic);
      if (r.number !== 73)
        expect(normalize(k.arabic)).toBe(normalize(r.arabic));
      const context = wordContext(k, pack.knowledge);
      expect(context.phrases[0].chinese).toBe(r.chinese);
      expect(k.examples).toBeUndefined();
      const qs = pack.questions.filter((q) => q.knowledgeId === k.id);
      expect(qs).toHaveLength(2);
      for (const q of qs) {
        expect(q.grading).toBe("choice");
        expect(q.options).toContain(q.answer);
        expect(new Set(q.options).size).toBe(4);
      }
    });
  });
  it("documents the corrected source typo instead of teaching it as the answer", () => {
    const k = bundledSharedFuture.knowledge[72];
    expect(normalize(k.arabic)).toContain("استئساد");
    expect(k.confusion).toContain("استناد");
    expect(k.vocabulary?.sources?.[0].url).toContain("wafa.ps");
  });
  it("installs into saved learning records once and preserves ratings, annotations and edits", () => {
    let old = initialState();
    old = {
      ...old,
      knowledge: old.knowledge.filter(
        (k) => !k.id.startsWith("shared-future-"),
      ),
      questions: old.questions.filter(
        (q) => !q.id.startsWith("shared-future-"),
      ),
      installedPacks: old.installedPacks?.filter(
        (id) => id !== bundledSharedFuture.id,
      ),
    };
    const id = old.knowledge[0].id;
    old = saveAnnotation(
      recordWord(old, id, true, "2026-10-25"),
      id,
      "我的原有批注",
    );
    const before = structuredClone(old),
      next = installBundledPacks(old);
    expect(old).toEqual(before);
    expect(next.knowledge).toHaveLength(330);
    expect(next.questions).toHaveLength(852);
    expect(next.wordProgress).toEqual(old.wordProgress);
    expect(next.annotations).toEqual(old.annotations);
    expect(next.history).toEqual(old.history);
    expect(next.progress).toEqual(old.progress);
    expect(installBundledPacks(next)).toBe(next);
    expect(wordReviewPlan(next, "2026-10-25")).toHaveLength(1);
    expect(parseBackup(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });
});
