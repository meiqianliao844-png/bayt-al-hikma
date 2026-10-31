import { test, expect } from "@playwright/test";
test("home search accepts Chinese and unvocalized Arabic; matching cards can be studied", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("输入阿语或中文查词", { exact: true }).fill("恃强凌弱");
  await page.getByRole("button", { name: "搜索词库", exact: true }).click();
  await expect(page.getByText("共 1 个知识点", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "恃强凌弱", exact: true }),
  ).toBeVisible();
  await page.getByLabel("搜索知识", { exact: true }).fill("استئساد");
  await expect(page.getByText("共 1 个知识点", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "展开学习 ↗", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("恃强凌弱");
  await page.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page.getByLabel("搜索知识", { exact: true }).fill("没有这个词xyz");
  await expect(page.getByText("共 0 个知识点", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "清除搜索与筛选", exact: true })
    .click();
  await expect(
    page.getByText("共 360 个知识点", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "背单词", exact: true }).click();
  await page.getByLabel("搜索背词词库", { exact: true }).fill("استئساد");
  await expect(page.getByText(/符合条件 1 张/)).toBeVisible();
  await page.getByRole("button", { name: "开始背单词", exact: true }).click();
  await page.getByRole("button", { name: "显示释义", exact: true }).click();
  await expect(page.locator(".word-back")).toContainText("恃强凌弱");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
