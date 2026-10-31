import { it, expect } from "vitest";
import {
  bundledExpressions,
  initialState,
  installBundledPacks,
  parsePack,
} from "./core";
import transcript from "./data/foldable-tech.report.json";
it("keeps source passages exact, supplies breakdowns and choice practice for every new phrase/sentence", () => {
  const p = parsePack(bundledExpressions);
  expect(p.knowledge).toHaveLength(30);
  expect(p.questions).toHaveLength(90);
  for (const k of p.knowledge) {
    expect(k.grammar?.length).toBeGreaterThan(60);
    const e = k.examples![0];
    const ids = e.context!.match(/T\d+/g)!;
    expect(
      ids
        .map((id) => transcript.transcript.find((t) => t.id === id)!.arabic)
        .join(" "),
    ).toBe(e.arabic);
    expect(p.questions.filter((q) => q.knowledgeId === k.id)).toHaveLength(3);
  }
});
it("installs the expansion over an already installed technology pack once without touching word progress", () => {
  const s = initialState();
  const ids = new Set(bundledExpressions.knowledge.map((k) => k.id));
  s.installedPacks = s.installedPacks?.filter(
    (id) => id !== bundledExpressions.id,
  );
  s.knowledge = s.knowledge.filter((k) => !ids.has(k.id));
  s.questions = s.questions.filter((q) => !ids.has(q.knowledgeId));
  const id = "tech-foldable-20261031-focus-01";
  s.wordProgress = {
    [id]: { seen: 4, stage: 2, lastKnown: true, due: "2026-11-07" },
  };
  s.annotations = { [id]: "科技旧批注" };
  const n = installBundledPacks(s);
  expect(n.knowledge).toHaveLength(597);
  expect(n.questions).toHaveLength(1512);
  expect(n.wordProgress).toEqual(s.wordProgress);
  expect(n.annotations).toEqual(s.annotations);
  expect(installBundledPacks(n)).toBe(n);
});
