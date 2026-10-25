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
  new URL(
    "../data/imports/azerbaijan-school-uniform.portable.json",
    import.meta.url,
  ),
  "utf8",
);

test("installs the news collection on top of old data, groups by topic, and exposes forms/audio/favorites/practice", async ({
  page,
}) => {
  const q = seed.questions[0];
  const old = {
    version: 1,
    knowledge: seed.knowledge,
    questions: seed.questions,
    favorites: ["guard"],
    progress: {
      [q.id]: {
        stage: 0,
        due: "2026-10-26",
        errors: 1,
        attempts: 1,
        lastAnswer: "旧答案",
        lastCorrect: false,
      },
    },
    history: [
      {
        questionId: q.id,
        answer: "旧答案",
        correct: false,
        at: "2026-10-25T01:00:00.000Z",
      },
    ],
  };
  await page.addInitScript(
    (state) => localStorage.setItem("hikma-v1", JSON.stringify(state)),
    old,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page.getByRole("button", { name: "查看新闻专题", exact: true }).click();
  await expect(
    page.getByText("共 106 个知识点", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("知识分组")).toHaveValue("category");
  await expect(
    page.locator(".day-title").filter({ hasText: "校服新闻 · 教育" }).first(),
  ).toBeVisible();
  await page.getByLabel("搜索知识").fill("批准、通过");
  await page.getByRole("button", { name: "展开学习 ↗", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "词形变化", exact: true }).click();
  await expect(
    dialog.getByText("أَقَرَّ", { exact: true }).first(),
  ).toBeVisible();
  await expect(dialog.getByText("يُقِرُّ", { exact: true })).toBeVisible();
  await expect(dialog.getByText("إِقْرَارٌ", { exact: true })).toBeVisible();
  await dialog.getByRole("tab", { name: "固定搭配", exact: true }).click();
  await expect(
    dialog.getByText("أَقَرَّ شَيْئًا", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("tab", { name: "例句", exact: true }).click();
  await expect(
    dialog.getByText("内阁批准了新的修订。", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "慢速", exact: true }).first(),
  ).toBeVisible();
  await dialog.getByRole("tab", { name: /^练习/ }).click();
  await expect(
    dialog.getByRole("button", { name: "练习本词 · 4 题", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  expect(saved.knowledge).toHaveLength(221);
  expect(saved.questions).toHaveLength(580);
  expect(saved.favorites).toContain("guard");
  expect(saved.favorites).toContain(news.knowledge[0].id);
  expect(saved.history).toEqual(old.history);
  expect(saved.progress).toEqual(old.progress);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("accepts the original portable file through explicit conversion and repeated import does not duplicate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "知识包与备份", exact: true }).click();
  await page.getByLabel("选择知识包", { exact: true }).setInputFiles({
    name: "portable.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await expect(page.getByRole("heading", { name: /导入预览/ })).toBeVisible();
  await expect(page.getByText(/106 个知识点，277/)).toBeVisible();
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "新增 0 个知识点、0 道题",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  expect(saved.knowledge).toHaveLength(221);
  expect(saved.questions).toHaveLength(580);
});
