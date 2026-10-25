import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const seed = JSON.parse(
  readFileSync(new URL("../src/seed.json", import.meta.url), "utf8"),
);
const news = JSON.parse(
  readFileSync(
    new URL("../src/data/azerbaijan-school-uniform.json", import.meta.url),
    "utf8",
  ),
);
const raw = readFileSync(
  new URL("../data/imports/spongebob-01.portable.json", import.meta.url),
  "utf8",
);
test("adds animation to a saved news installation, keeps progress and exposes subtitle notes, forms and examples", async ({
  page,
}) => {
  const q = seed.questions[0],
    old = {
      version: 1,
      knowledge: [...seed.knowledge, ...news.knowledge],
      questions: [...seed.questions, ...news.questions],
      favorites: ["guard"],
      installedPacks: [news.id],
      history: [
        {
          questionId: q.id,
          answer: "旧新闻进度",
          correct: false,
          at: "2026-10-25T01:00:00.000Z",
        },
      ],
      progress: {
        [q.id]: {
          stage: 0,
          due: "2026-10-26",
          errors: 1,
          attempts: 1,
          lastAnswer: "旧新闻进度",
          lastCorrect: false,
        },
      },
    };
  await page.addInitScript((data) => {
    if (!localStorage.getItem("hikma-v1"))
      localStorage.setItem("hikma-v1", JSON.stringify(data));
  }, old);
  await page.goto("/");
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page
    .getByText("字幕核对备注（4 条，未据音频确认）", { exact: true })
    .click();
  await expect(
    page.getByText("أُرِيدُ آلَاتِي", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "查看海绵宝宝01", exact: true })
    .click();
  await expect(
    page.getByText("共 108 个知识点", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("知识分组")).toHaveValue("category");
  await page.getByLabel("搜索知识").fill("触碰某物");
  await page.getByRole("button", { name: "展开学习 ↗", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByRole("tab", { name: "词形变化", exact: true }).click();
  await expect(d.getByText("يَلْمِسُ", { exact: true })).toBeVisible();
  await expect(d.getByText("لَمْسٌ", { exact: true })).toBeVisible();
  await d.getByRole("tab", { name: "例句", exact: true }).click();
  await expect(
    d.getByText("未经允许别碰我的东西。", { exact: true }),
  ).toBeVisible();
  await expect(
    d.getByRole("button", { name: "慢速", exact: true }).first(),
  ).toBeVisible();
  await d.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await page.reload();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  expect(saved.knowledge).toHaveLength(221);
  expect(saved.questions).toHaveLength(580);
  expect(saved.history).toEqual(old.history);
  expect(saved.progress).toEqual(old.progress);
  expect(saved.favorites).toContain("guard");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("the original animation JSON can be reimported without duplicate cards", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "知识包与备份", exact: true }).click();
  await page
    .getByLabel("选择知识包", { exact: true })
    .setInputFiles({
      name: "sponge.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  await expect(page.getByRole("heading", { name: /导入预览/ })).toBeVisible();
  await expect(page.getByText(/108 个知识点，283/)).toBeVisible();
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "新增 0 个知识点、0 道题",
  );
});
