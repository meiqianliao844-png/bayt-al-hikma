import { describe, it, expect } from "vitest";
import source from "../data/imports/spongebob-mystery-02.curated.json";
import {
  bundledMystery02,
  initialState,
  installBundledPacks,
  parseBackup,
  parsePack,
  removeKnowledge,
} from "./core";
import { installSupplement } from "./supplement";
import { completeNounNumbers } from "./noun-numbers.mjs";
import { wordContext } from "./word-context";
describe("deduplicated continuation and noun number pairs", () => {
  const without = () => {
    const s = initialState();
    return {
      ...s,
      installedPacks: s.installedPacks?.filter(
        (id) => id !== bundledMystery02.id,
      ),
      knowledge: s.knowledge.filter(
        (k) => !k.id.startsWith(bundledMystery02.id + "-"),
      ),
      questions: s.questions.filter(
        (q) => !q.id.startsWith(bundledMystery02.id + "-"),
      ),
    };
  };
  it("has exactly 30 new IDs and reuses 18 canonical cards, with only new-context exercises for reused words", () => {
    const p = parsePack(bundledMystery02);
    expect(p.knowledge).toHaveLength(48);
    expect(p.questions).toHaveLength(136);
    expect(p.knowledge.filter((k) => k.id.startsWith(p.id + "-"))).toHaveLength(
      30,
    );
    for (const c of source.cards.filter((c) => c.existingId)) {
      expect(p.knowledge.some((k) => k.id === c.existingId)).toBe(true);
      expect(
        p.questions
          .filter((q) => q.knowledgeId === c.existingId)
          .every((q) => q.type === "context-fill"),
      ).toBe(true);
    }
    for (const q of p.questions) {
      expect(q.grading).toBe("choice");
      expect(new Set(q.options).size).toBe(4);
    }
    expect(p.questions.some((q) => q.prompt.includes("هَلْ أَعِرْنِي"))).toBe(
      false,
    );
  });
  it("appends examples without replacing personal meanings or schedules, then skips repeat installation", () => {
    let s = without();
    const id = "spongebob-mystery-customer-01-catch";
    s = {
      ...s,
      knowledge: s.knowledge.map((k) =>
        k.id === id ? { ...k, meaning: "我的抓住笔记" } : k,
      ),
      favorites: [id],
      wordProgress: {
        [id]: { stage: 2, due: "2026-11-02", seen: 5, lastKnown: true },
      },
      annotations: { [id]: "不可丢失" },
    };
    const old = structuredClone(s);
    const next = installBundledPacks(s);
    expect(s).toEqual(old);
    expect(next.knowledge).toHaveLength(567);
    expect(next.questions).toHaveLength(1422);
    const k = next.knowledge.find((k) => k.id === id)!;
    expect(k.meaning).toBe("我的抓住笔记");
    expect(k.examples?.some((e) => e.arabic === "أَمْسَكْتُ!")).toBe(true);
    expect(
      wordContext(k, next.knowledge, "海绵宝宝 · 神秘顾客02").examples[0]
        .arabic,
    ).toBe("أَمْسَكْتُ!");
    expect(next.wordProgress).toEqual(old.wordProgress);
    expect(next.annotations).toEqual(old.annotations);
    expect(next.favorites).toEqual(old.favorites);
    expect(installBundledPacks(next)).toBe(next);
    expect(parseBackup(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });
  it("does not resurrect deleted reused cards or leave orphan questions", () => {
    const id = "spongebob-mystery-customer-01-catch";
    const s = removeKnowledge(without(), id);
    const next = installBundledPacks(s);
    expect(next.knowledge.some((k) => k.id === id)).toBe(false);
    expect(next.questions.some((q) => q.knowledgeId === id)).toBe(false);
    expect(() => parseBackup(JSON.parse(JSON.stringify(next)))).not.toThrow();
  });
  it("also reuses an exact personal card, redirecting new exercises to its ID", () => {
    let s = without();
    const incoming = bundledMystery02.knowledge.find((k) =>
      k.id.endsWith("-wallet"),
    )!;
    s = {
      ...s,
      knowledge: [
        ...s.knowledge,
        { ...incoming, id: "my-wallet", examples: [] },
      ],
    };
    const next = installSupplement(s, bundledMystery02);
    expect(
      next.knowledge.filter((k) => k.arabic === incoming.arabic),
    ).toHaveLength(1);
    expect(
      next.questions
        .filter((q) => q.id.includes("-wallet-"))
        .every((q) => q.knowledgeId === "my-wallet"),
    ).toBe(true);
  });
  it("pairs known plurals with singulars in old and new cards, including phrase components", () => {
    const s = initialState();
    const pairs = (id: string) =>
      s.knowledge.find((k) => k.id === id)!.vocabulary!.noun!.numberPairs!;
    expect(pairs(bundledMystery02.id + "-home")).toContainEqual(
      expect.objectContaining({ singular: "دَارٌ", plural: "دِيَارٌ" }),
    );
    expect(pairs(bundledMystery02.id + "-jellyfish")).toContainEqual(
      expect.objectContaining({
        singular: "قِنْدِيلُ الْبَحْرِ",
        plural: "قَنَادِيلُ الْبَحْرِ",
      }),
    );
    expect(pairs(bundledMystery02.id + "-magazine")).toContainEqual(
      expect.objectContaining({ singular: "سَمَكَةٌ", plural: "أَسْمَاكٌ" }),
    );
    expect(pairs("news-20261025-4c99c03c-term-t001")).toContainEqual(
      expect.objectContaining({ singular: "وَزِيرٌ", plural: "وُزَرَاءُ" }),
    );
    expect(
      s.knowledge.find((k) => k.id === "news-20261025-4c99c03c-term-t001")
        ?.vocabulary?.noun?.singular,
    ).not.toBe("مَجْلِسُ الْوَزِيرِ");
    expect(completeNounNumbers(s.knowledge)).toBe(s.knowledge);
  });
});
