import { it, expect } from "vitest";
import {
  initialState,
  parseBackup,
  installBundledPacks,
  removeKnowledge,
} from "./core";
import { saveCustomPhrases } from "./PhraseEditor";
import { wordContext } from "./word-context";
it("retains edits and empty overrides across backups and bundle installation", () => {
  const state = initialState();
  const card = state.knowledge[0];
  const before = structuredClone(card);
  const edited = saveCustomPhrases(state, card.id, [
    { arabic: "كَتَبَ رِسَالَةً", chinese: "写了一封信" },
  ]);
  expect(parseBackup(JSON.parse(JSON.stringify(edited)))).toEqual(edited);
  expect(installBundledPacks(edited).customPhrases).toEqual(
    edited.customPhrases,
  );
  expect(card).toEqual(before);
  const empty = saveCustomPhrases(edited, card.id, []);
  expect(
    parseBackup(JSON.parse(JSON.stringify(empty))).customPhrases?.[card.id],
  ).toEqual([]);
  expect(
    saveCustomPhrases(empty, card.id, undefined).customPhrases?.[card.id],
  ).toBeUndefined();
  expect(
    removeKnowledge(edited, card.id).customPhrases?.[card.id],
  ).toBeUndefined();
  expect(() =>
    parseBackup({
      ...edited,
      customPhrases: { [card.id]: [{ arabic: "", chinese: "" }] },
    }),
  ).toThrow();
});
it("lets the editor load every original phrase even when preview shows two", () => {
  const k = {
    ...initialState().knowledge[0],
    collocations: ["أ", "ب", "ج"],
    vocabulary: undefined,
  };
  expect(wordContext(k, [k]).phrases).toHaveLength(2);
  expect(wordContext(k, [k], "", true).phrases).toHaveLength(3);
});
