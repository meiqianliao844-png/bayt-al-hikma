import { describe, it, expect } from "vitest";
import {
  bundledFoldable,
  initialState,
  installBundledPacks,
  parsePack,
  parseBackup,
} from "./core";
describe("foldable technology learning text", () => {
  it("preserves the 26 supplied focus entries, reusing two old cards rather than creating duplicate lemmas", () => {
    const p = parsePack(bundledFoldable);
    expect(p.knowledge).toHaveLength(26);
    expect(p.questions).toHaveLength(96);
    expect(p.knowledge.filter((k) => k.id.startsWith(p.id + "-"))).toHaveLength(
      24,
    );
    expect(
      p.knowledge.some((k) => k.id === "news-20261025-4c99c03c-verb-v001"),
    ).toBe(true);
    for (const k of p.knowledge) {
      expect(k.examples?.[0].context).toContain("原素材");
      expect(k.examples?.[1].context).toContain("教学例句");
      expect(k.vocabulary?.sources?.[0].note).toContain("未核实");
    }
    for (const q of p.questions) {
      expect(q.grading).toBe("choice");
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
    }
  });
  it("labels dialect comments, keeps plural singulars, and does not turn related expressions into strict antonyms", () => {
    const p = bundledFoldable;
    expect(
      p.knowledge.find((k) => k.id.endsWith("focus-19"))?.examples?.[0].variety,
    ).toContain("方言");
    expect(
      p.knowledge.find((k) => k.id.endsWith("focus-07"))?.vocabulary?.noun
        ?.numberPairs,
    ).toContainEqual(
      expect.objectContaining({ singular: "شَكْوَى", plural: "شَكَاوَى" }),
    );
    expect(
      p.knowledge
        .flatMap((k) => k.vocabulary?.relations || [])
        .filter((r) => r.relation === "antonym"),
    ).toHaveLength(0);
    expect(p.knowledge.find((k) => k.id.endsWith("focus-11"))?.form).toContain(
      "第八式",
    );
  });
  it("installs once without replacing personal descriptions, records or backups", () => {
    let s = initialState();
    s = {
      ...s,
      installedPacks: s.installedPacks?.filter(
        (id) => id !== bundledFoldable.id,
      ),
      knowledge: s.knowledge.filter(
        (k) => !k.id.startsWith(bundledFoldable.id + "-"),
      ),
      questions: s.questions.filter(
        (q) => !q.id.startsWith(bundledFoldable.id + "-"),
      ),
    };
    const id = "news-20261025-4c99c03c-verb-v001";
    s.knowledge = s.knowledge.map((k) =>
      k.id === id ? { ...k, meaning: "我自己的批准释义" } : k,
    );
    s.annotations = { [id]: "旧批注" };
    const n = installBundledPacks(s);
    expect(n.knowledge).toHaveLength(597);
    expect(n.questions).toHaveLength(1512);
    expect(n.knowledge.find((k) => k.id === id)?.meaning).toBe(
      "我自己的批准释义",
    );
    expect(n.annotations).toEqual(s.annotations);
    expect(n.history).toEqual(s.history);
    expect(installBundledPacks(n)).toBe(n);
    expect(parseBackup(JSON.parse(JSON.stringify(n)))).toEqual(n);
  });
});
