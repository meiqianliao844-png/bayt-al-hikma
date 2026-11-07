import { describe, it, expect } from "vitest";
import {
  bundledLiterature,
  initialState,
  installBundledPacks,
  parsePack,
  parseBackup,
} from "./core";
describe("uploaded literature lesson", () => {
  it("validates every supplied card and choice without inventing source examples", () => {
    const p = parsePack(bundledLiterature);
    expect(p.knowledge).toHaveLength(183);
    expect(p.questions).toHaveLength(338);
    expect(p.knowledge.filter((k) => k.verb)).toHaveLength(63);
    expect(p.knowledge.filter((k) => k.examples?.length)).toHaveLength(5);
    for (const q of p.questions) {
      expect(q.grading).toBe("choice");
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(q.options?.length);
    }
  });
  it("upgrades an existing library once and preserves all personal records and prior edits", () => {
    const full = initialState(),
      ids = new Set(bundledLiterature.knowledge.map((k) => k.id)),
      qs = new Set(bundledLiterature.questions.map((q) => q.id));
    const old = {
      ...full,
      installedPacks: full.installedPacks?.filter(
        (id) => id !== bundledLiterature.id,
      ),
      knowledge: full.knowledge.filter((k) => !ids.has(k.id)),
      questions: full.questions.filter((q) => !qs.has(q.id)),
    };
    const id = old.knowledge[0].id;
    old.knowledge[0] = { ...old.knowledge[0], meaning: "我的释义" };
    old.favorites = [id];
    old.annotations = { [id]: "批注" };
    old.journal = { "2026-10-31": { text: "文学", mood: "🙂", weather: "☀️" } };
    old.wordProgress = {
      [id]: { stage: 2, due: "2026-11-07", seen: 3, lastKnown: true },
    };
    const n = installBundledPacks(old);
    expect(n.knowledge).toHaveLength(1082);
    expect(n.questions).toHaveLength(1947);
    expect(n.knowledge.find((k) => k.id === id)?.meaning).toBe("我的释义");
    for (const key of [
      "favorites",
      "annotations",
      "journal",
      "wordProgress",
      "progress",
      "history",
    ] as const)
      expect(n[key]).toEqual(old[key]);
    expect(installBundledPacks(n)).toBe(n);
    expect(parseBackup(JSON.parse(JSON.stringify(n)))).toEqual(n);
  });
  it("keeps previously imported lesson edits under the uploaded stable IDs", () => {
    const s = initialState();
    s.installedPacks = s.installedPacks?.filter(
      (id) => id !== bundledLiterature.id,
    );
    const id = bundledLiterature.knowledge[0].id;
    s.knowledge = s.knowledge.map((k) =>
      k.id === id ? { ...k, meaning: "个人笔记释义" } : k,
    );
    const n = installBundledPacks(s);
    expect(n.knowledge.filter((k) => k.id === id)).toHaveLength(1);
    expect(n.knowledge.find((k) => k.id === id)?.meaning).toBe("个人笔记释义");
  });
});

it("adds textbook excerpts to an installed lesson without replacing edits", () => {
  const state = initialState();
  const id = "lit1-k-5c23608f557c";
  const original = bundledLiterature.knowledge.find((card) => card.id === id)!;
  state.knowledge = state.knowledge.map((card) =>
    card.id === id ? { ...original, meaning: "我的爱情诗释义" } : card,
  );
  state.installedPacks = state.installedPacks?.filter(
    (id) => id !== "lit1-original-context-v1",
  );
  const next = installBundledPacks(state);
  const card = next.knowledge.find((card) => card.id === id);
  expect(card?.meaning).toBe("我的爱情诗释义");
  expect(card?.examples?.[0].context).toContain("教材第 4 页");
  expect(installBundledPacks(next)).toBe(next);
});

it("removes retired dialect cards and their questions from old installations", () => {
  const state = initialState();
  const id = "population-20261107-48";
  const question = state.questions[0];
  const retired = state.knowledge[0];
  const next = installBundledPacks({
    ...state,
    knowledge: [...state.knowledge, { ...retired, id }],
    questions: [
      ...state.questions,
      { ...question, id: id + "-meaning", knowledgeId: id },
    ],
    favorites: [...state.favorites, id],
  });
  expect(next.knowledge).toEqual(state.knowledge);
  expect(next.questions).toEqual(state.questions);
  expect(next.favorites).toEqual(state.favorites);
});
