import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const vocabulary = JSON.parse(
  readFileSync(
    new URL("../src/vocabulary-sample.json", import.meta.url),
    "utf8",
  ),
);
const upload = (data: unknown) => ({
  name: "vocabulary.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(data)),
});

test("enriched profiles retain old knowledge, link families, expose tabs and keep progress after supplement/reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "知识包与备份", exact: true }).click();
  await page
    .getByLabel("选择知识包", { exact: true })
    .setInputFiles(upload(vocabulary));
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page.getByLabel("搜索知识").fill("写；书写");
  await page.getByRole("button", { name: "展开学习 ↗", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("tab", { name: "基本释义", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await dialog.getByRole("tab", { name: "词形变化", exact: true }).click();
  await expect(dialog.getByRole("table")).toContainText("تَكْتُبِينَ");
  await expect(dialog.getByText("不适用。", { exact: false })).toBeVisible();
  await dialog.getByRole("tab", { name: "近反义词", exact: true }).click();
  await expect(
    dialog.getByText("语义对立（非严格反义词）", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("tab", { name: "词根词族", exact: true }).click();
  await dialog.getByRole("button", { name: "كِتَابٌ ↗", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "书；书籍", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("tab", { name: "词形变化", exact: true }).click();
  await expect(dialog.getByText("كِتَابَانِ", { exact: true })).toBeVisible();
  await expect(dialog.getByText("كُتُبٌ", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await dialog.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  expect(before.knowledge).toHaveLength(224);
  expect(before.knowledge.some((k: { id: string }) => k.id === "guard")).toBe(
    true,
  );
  await page.getByRole("button", { name: "知识包与备份", exact: true }).click();
  const k = vocabulary.knowledge[0];
  await page.getByLabel("选择知识包", { exact: true }).setInputFiles(
    upload({
      schemaVersion: 1,
      id: "patch",
      title: "补充",
      knowledge: [
        {
          id: k.id,
          arabic: k.arabic,
          meaning: k.meaning,
          date: k.date,
          category: k.category,
          vocabulary: { usage: { frequency: "每日复习" } },
        },
      ],
      questions: [],
    }),
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await page.reload();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  const updated = after.knowledge.find(
    (x: { id: string }) => x.id === "lex-kataba",
  );
  expect(updated.verb.past).toBe("كَتَبَ");
  expect(updated.examples).toHaveLength(5);
  expect(updated.vocabulary.usage.frequency).toBe("每日复习");
  expect(after.history).toEqual(before.history);
  expect(after.progress).toEqual(before.progress);
  expect(after.questions).toEqual(before.questions);
});

test("new constrained conjugation grades automatically and the associated profile is reachable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "知识包与备份", exact: true }).click();
  await page
    .getByLabel("选择知识包", { exact: true })
    .setInputFiles(upload(vocabulary));
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await page.getByRole("button", { name: "智慧试炼", exact: true }).click();
  await page
    .getByRole("heading", { name: "动词变位", exact: true })
    .locator("..")
    .getByRole("button")
    .click();
  await page
    .locator(".answers")
    .getByRole("button", { name: "كَتَبَتْ", exact: true })
    .click();
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await expect(page.getByText("✓ 已掌握", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "关联知识：写；书写", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("tab", { name: "词形变化", exact: true }),
  ).toBeVisible();
});
