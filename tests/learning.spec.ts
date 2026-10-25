import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const seed = JSON.parse(
  readFileSync(new URL("../src/seed.json", import.meta.url), "utf8"),
) as typeof import("../src/seed.json");
test("knowledge CRUD, favorites, RTL and reload persistence", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /在语言之间/ })).toBeVisible();
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page.getByRole("button", { name: "＋ 添加知识" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("阿语原文（请录入完整标符）").fill("كِتَابٌ");
  await dialog.getByLabel("中文释义").fill("书籍");
  await dialog.getByRole("button", { name: "保存知识" }).click();
  await page.getByLabel("搜索知识").fill("书籍");
  await expect(page.getByRole("heading", { name: "كِتَابٌ" })).toHaveAttribute(
    "dir",
    "rtl",
  );
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page.getByLabel("搜索知识").fill("书籍");
  await expect(page.getByRole("heading", { name: "书籍" })).toBeVisible();
  await page.getByRole("button", { name: "展开学习 ↗" }).click();
  await page.getByRole("button", { name: "编辑知识", exact: true }).click();
  await page.getByLabel("中文释义").fill("一本书");
  await page.getByRole("button", { name: "保存知识" }).click();
  await page.getByLabel("搜索知识").fill("一本书");
  await page.getByRole("button", { name: "展开学习 ↗" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(
    page.getByText("暂无匹配知识，可清除筛选或添加知识。"),
  ).toBeVisible();
});
test("objective grading records errors; translations also use choices", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "智慧试炼", exact: true }).click();
  await page
    .getByRole("heading", { name: "中文选阿语", exact: true })
    .locator("..")
    .getByRole("button")
    .click();
  const qtext = await page.locator(".practice h2").innerText();
  const q = seed.questions.find((q) => q.prompt === qtext)!;
  await page.locator(".answers button").filter({ hasText: q.answer }).click();
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await expect(page.getByText("✓ 已掌握")).toBeVisible();
  await page.getByRole("button", { name: "下一题 →" }).click();
  const nextText = await page.locator(".practice h2").innerText();
  const next = seed.questions.find((q) => q.prompt === nextText)!;
  const wrong = next.options!.find((x) => x !== next.answer)!;
  await page.locator(".answers button").filter({ hasText: wrong }).click();
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await expect(page.getByText("继续巩固，下次会更熟悉")).toBeVisible();
  await page.getByRole("button", { name: "错题与复习", exact: true }).click();
  await expect(page.getByText("累计错误 1 次", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "智慧试炼", exact: true }).click();
  await page
    .getByRole("heading", { name: "阿译中", exact: true })
    .locator("..")
    .getByRole("button")
    .click();
  const translationPrompt = await page.locator(".practice h2").innerText();
  const translationAnswer = await page.evaluate(
    (prompt) =>
      JSON.parse(localStorage.getItem("hikma-v1")!).questions.find(
        (q: { prompt: string }) => q.prompt === prompt,
      ).answer,
    translationPrompt,
  );
  await page
    .locator(".answers")
    .getByRole("button", { name: translationAnswer, exact: true })
    .click();
  await page.getByRole("button", { name: "提交答案", exact: true }).click();
  await expect(page.getByText("✓ 已掌握")).toBeVisible();
  await expect(page.locator(".practice textarea")).toHaveCount(0);
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  expect(data.history).toHaveLength(3);
});
test("import validation, preview, ID dedup, update, backup and restore", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "知识包与备份" }).click();
  const upload = page.getByLabel("选择知识包");
  await upload.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.getByRole("status")).toContainText("文件校验失败");
  const payload = {
    ...seed,
    knowledge: [{ ...seed.knowledge[0], meaning: "测试更新" }],
    questions: [],
  };
  await upload.setInputFiles({
    name: "daily.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await expect(page.getByRole("heading", { name: /导入预览/ })).toBeVisible();
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("新增 0 个知识点");
  await upload.setInputFiles({
    name: "daily.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "确认导入", exact: true }).click();
  let state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  expect(state.knowledge[0].meaning).toBe("测试更新");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出完整备份", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/hikma-backup/);
  state.favorites = ["guard"];
  await page.getByLabel("选择备份恢复").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await page.getByRole("button", { name: "确认覆盖并恢复" }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("hikma-v1")!).favorites,
    ),
  ).toEqual(["guard"]);
});
test("audio capability warning and responsive layout", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    if ("speechSynthesis" in window)
      Object.defineProperty(speechSynthesis, "getVoices", { value: () => [] });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /朗读/ }).first().click();
  await expect(
    page.getByText(/未检测到阿拉伯语音色|当前浏览器不支持语音合成/).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-home.png`,
    fullPage: true,
  });
});

test("recording creates a playable local clip and cleans up on navigation", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.grantPermissions(["microphone"]);
  await page.goto("/");
  await page
    .getByRole("button", { name: "○ 跟读录音", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "■ 停止录音", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "■ 停止录音", exact: true }).click();
  await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
  await expect(page.getByText(/可回放录音，与原音对照/)).toBeVisible();
  await page.locator("audio").evaluate((a: HTMLAudioElement) => a.play());
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  expect(errors).toEqual([]);
});

test("storage failures leave the knowledge editor open and do not report success", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page.getByRole("button", { name: "＋ 添加知识" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("阿语原文（请录入完整标符）").fill("كِتَابٌ");
  await dialog.getByLabel("中文释义").fill("书籍");
  await dialog.getByRole("button", { name: "保存知识" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("保存失败");
  expect(
    await page.evaluate(() => localStorage.getItem("hikma-v1")),
  ).toBeNull();
});
