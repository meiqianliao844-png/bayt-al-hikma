import { test, expect } from "@playwright/test";
test("edits original phrases, reloads, clears and restores them", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "背单词", exact: true }).click();
  await page.getByLabel("搜索背词词库").fill("世俗主义者");
  await page.getByRole("button", { name: "开始背单词", exact: true }).click();
  await page.getByRole("button", { name: "显示释义", exact: true }).click();
  await page
    .getByRole("button", { name: "修改／自定义搭配", exact: true })
    .click();
  const original = await page
    .getByLabel("阿语搭配 1", { exact: true })
    .inputValue();
  await page.getByLabel("阿语搭配 1", { exact: true }).fill("كَتَبَ رِسَالَةً");
  await page.getByLabel("中文解释 1", { exact: true }).fill("我的写信搭配");
  await page.getByRole("button", { name: "添加搭配", exact: true }).click();
  const last = page.locator(".phrase-editor-row").last();
  await last.locator("textarea").nth(0).fill("قَرَأَ كِتَابًا");
  await last.locator("textarea").nth(1).fill("我的阅读搭配");
  await page.getByRole("button", { name: "保存搭配", exact: true }).click();
  await expect(page.getByText("我的写信搭配", { exact: true })).toBeVisible();
  await expect(page.getByText("我的阅读搭配", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "背单词", exact: true }).click();
  await page.getByLabel("搜索背词词库").fill("我的阅读搭配");
  await expect(page.getByText(/符合条件 1 张/)).toBeVisible();
  await page.getByRole("button", { name: "开始背单词", exact: true }).click();
  await page.getByRole("button", { name: "显示释义", exact: true }).click();
  await expect(page.getByText("我的写信搭配", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "修改／自定义搭配", exact: true })
    .click();
  while (await page.locator(".phrase-editor-row").count())
    await page
      .locator(".phrase-editor-row")
      .first()
      .getByRole("button")
      .click();
  await page.getByRole("button", { name: "保存搭配", exact: true }).click();
  await expect(page.getByText("我的写信搭配", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "恢复原资料搭配", exact: true })
    .click();
  await expect(page.getByRole("region", { name: "搭配与语境" })).toContainText(
    original,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
