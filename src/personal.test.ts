import { describe, it, expect } from "vitest";
import { initialState, saveJournal, parseBackup } from "./core";
import { wallpaperPalette, contrastOnWhite } from "./wallpaper";
describe("daily journal and wallpaper palette", () => {
  it("saves and edits date entries without changing learning data, and restores them in backups", () => {
    const old = initialState();
    const entry = {
      text: "今天记住了新表达。\nمُجْتَمَعٌ",
      mood: "🌱 有收获",
      weather: "☀️ 晴",
    };
    const next = saveJournal(old, "2026-10-25", entry);
    expect(next.journal?.["2026-10-25"]).toEqual(entry);
    expect(old.journal).toBeUndefined();
    expect(next.knowledge).toEqual(old.knowledge);
    expect(next.progress).toEqual(old.progress);
    expect(parseBackup(JSON.parse(JSON.stringify(next)))).toEqual(next);
    expect(
      Object.keys(
        saveJournal(next, "2026-10-25", { ...entry, text: "修改" }).journal!,
      ),
    ).toHaveLength(1);
    expect(
      saveJournal(next, "2026-10-24", {
        text: "",
        mood: "😊 开心",
        weather: "",
      }).journal?.["2026-10-24"].mood,
    ).toBe("😊 开心");
  });
  it("rejects invalid dates and malformed journal backup entries", () => {
    const s = initialState();
    for (const entry of [
      null,
      { text: 1, mood: "", weather: "" },
      { text: "x".repeat(20001), mood: "", weather: "" },
      { text: "", mood: "", weather: "" },
    ])
      expect(() =>
        parseBackup({ ...s, journal: { "2026-10-25": entry } }),
      ).toThrow();
    expect(() =>
      saveJournal(s, "2026-02-30", { text: "x", mood: "", weather: "" }),
    ).toThrow();
    expect(() => parseBackup({ ...s, journal: [] })).toThrow();
  });
  it("derives an image-colored palette with accessible white button text, including bright and monochrome images", () => {
    for (const input of [
      [255, 255, 255],
      [0, 0, 0],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [220, 180, 90],
    ]) {
      const p = wallpaperPalette(input);
      const channels = p.primary
        .slice(1)
        .match(/../g)!
        .map((n) => parseInt(n, 16));
      expect(contrastOnWhite(channels)).toBeGreaterThanOrEqual(7);
      expect(p.hover).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(wallpaperPalette([255, 0, 0]).primary).not.toBe(
      wallpaperPalette([0, 0, 255]).primary,
    );
  });
});
