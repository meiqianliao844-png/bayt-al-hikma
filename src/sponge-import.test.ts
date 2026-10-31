import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import rawSource from "../data/imports/spongebob-01.portable.json";
import newsSource from "../data/imports/azerbaijan-school-uniform.portable.json";
import schema from "./knowledge-pack.schema.json";
import { convertPortableNews } from "./portable-news.mjs";
import {
  bundledSponge,
  bundledNews,
  initialState,
  parsePack,
  parseBackup,
  installBundledNews,
  installBundledPacks,
  recordAnswer,
  removeKnowledge,
  mergePack,
} from "./core";
import seed from "./seed.json";
import type { State } from "./core";
const raw = (): any => structuredClone(rawSource);
const oldNews = (): State =>
  installBundledNews({
    version: 1,
    knowledge: structuredClone(seed.knowledge),
    questions: structuredClone(seed.questions),
    favorites: ["guard"],
    history: [],
    progress: {},
  });
describe("SpongeBob portable variant", () => {
  it("adapts term/meaning_zh and top-level source explicitly, preserving all 108 entries and notes", () => {
    const input = raw(),
      before = structuredClone(input),
      { pack, report } = convertPortableNews(input);
    expect(new Ajv().compile(schema)(input)).toBe(false);
    expect(parsePack(input)).toEqual(pack);
    expect(pack).toEqual(bundledSponge);
    expect(report.counts).toEqual({
      verbs: 54,
      terms: 54,
      knowledge: 108,
      questions: 283,
    });
    expect(report.sourceReviewNotes).toEqual(input.review_notes);
    expect(report.sourceProfile).toBe("animation-subtitles");
    expect(input).toEqual(before);
    for (const v of input.verbs) {
      const k = pack.knowledge.find((k) => k.id.endsWith(`-verb-${v.id}`))!;
      expect(k.arabic).toBe(v.lemma);
      expect(k.meaning).toBe(v.meaning_zh);
      expect(k.verb?.past).toBe(v.lemma);
      expect(k.verb?.present).toBe(v.imperfect);
      expect(k.examples?.[0]).toMatchObject({
        arabic: v.example_ar,
        chinese: v.example_zh,
      });
      expect(k.vocabulary?.phrases?.[0].arabic).toBe(v.collocation);
    }
    for (const v of input.terms) {
      const k = pack.knowledge.find((k) => k.id.endsWith(`-term-${v.id}`))!;
      expect(k.arabic).toBe(v.arabic);
      expect(k.meaning).toBe(v.meaning_zh);
      expect(k.category).toBe(`海绵宝宝01 · ${v.category}`);
      expect(pack.questions.some((q) => q.knowledgeId === k.id)).toBe(true);
    }
  });
  it("does not present mixed explanatory text as a masdar or conflate two different verbs", () => {
    const p = convertPortableNews(raw()).pack;
    const find = (id: string) => p.knowledge.find((k) => k.id.endsWith(id))!;
    expect(find("sponge-v002").verb?.masdar).toBeUndefined();
    expect(find("sponge-v002").verb?.note).toContain("وُجُودٌ");
    expect(find("sponge-v038").verb?.past).toBe("مَلَكَ");
    expect(find("sponge-v041").verb?.past).toBe("اِمْتَلَكَ");
    expect(find("sponge-v038").vocabulary?.family?.[0].knowledgeId).toBe(
      find("sponge-v041").id,
    );
    for (const id of ["sponge-v017", "sponge-v032"])
      expect(find(id).verb?.note).toContain("固定表达");
    for (const k of p.knowledge) expect(k.category).not.toContain("校服新闻");
    for (const q of p.questions.filter((q) => q.type === "zh-fill"))
      expect(q.grading).toBe("self");
  });
  it("preserves the news conversion byte-for-byte and builds stable, disjoint IDs", () => {
    expect(convertPortableNews(newsSource).pack).toEqual(bundledNews);
    expect(convertPortableNews(raw()).pack).toEqual(
      convertPortableNews(raw()).pack,
    );
    const ids = new Set(bundledNews.knowledge.map((k) => k.id));
    expect(bundledSponge.knowledge.every((k) => !ids.has(k.id))).toBe(true);
    expect(new Set(bundledSponge.questions.map((q) => q.id)).size).toBe(283);
    const owned = bundledSponge.questions.find((q) =>
      q.id.includes("sponge-v038-choice"),
    )!;
    expect(owned.options?.filter((o) => o.includes("拥有"))).toHaveLength(1);
  });
  it("rejects malformed animation terms and review notes rather than guessing formats", () => {
    for (const mutate of [
      (d: any) => delete d.terms[0].meaning_zh,
      (d: any) => (d.terms[0].type = "news_term"),
      (d: any) => (d.review_notes = [{ source: "x" }]),
      (d: any) => (d.verbs[0].example_ar = null),
    ]) {
      const d = raw();
      mutate(d);
      expect(() => convertPortableNews(d)).toThrow();
    }
  });
});
describe("multi-collection data retention", () => {
  it("adds cartoon cards to a previous news installation without changing user edits, favorites or schedules", () => {
    let old = oldNews();
    old = recordAnswer(old, old.questions[0], "旧答案", false, "2026-10-25");
    old.knowledge.push({
      ...bundledSponge.knowledge[0],
      meaning: "用户已有注释",
    });
    old.favorites.push(bundledSponge.knowledge[0].id);
    const before = structuredClone(old),
      next = installBundledPacks(old);
    expect(old).toEqual(before);
    expect(next.knowledge).toHaveLength(360);
    expect(next.questions).toHaveLength(988);
    expect(
      next.knowledge.find((k) => k.id === bundledSponge.knowledge[0].id)
        ?.meaning,
    ).toBe("用户已有注释");
    expect(next.history).toEqual(old.history);
    expect(next.progress).toEqual(old.progress);
    expect(next.favorites).toEqual(old.favorites);
    expect(installBundledPacks(next)).toBe(next);
    expect(parseBackup(JSON.parse(JSON.stringify(next)))).toEqual(next);
    expect(mergePack(next, bundledSponge, false)).toEqual(next);
  });
  it("keeps explicit deletions deleted and includes both collections in fresh state", () => {
    const s = initialState();
    expect(s.knowledge).toHaveLength(360);
    expect(s.questions).toHaveLength(988);
    const n = removeKnowledge(s, bundledSponge.knowledge[0].id);
    expect(installBundledPacks(n)).toBe(n);
    expect(n.installedPacks).toContain(bundledNews.id);
    expect(n.installedPacks).toContain(bundledSponge.id);
  });
});
