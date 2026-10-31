import { test, expect } from "@playwright/test";
test("literature lesson is grouped, reviewable, annotated and choice-only", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page
    .getByRole("button", { name: "查看文学史第一讲", exact: true })
    .click();
  await expect(
    page.getByText("共 183 个知识点", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("搜索知识", { exact: true }).fill("文学批评");
  await page
    .getByRole("button", { name: "展开学习 ↗", exact: true })
    .first()
    .click();
  const d = page.getByRole("dialog");
  await expect(
    d.getByRole("button", { name: "慢速", exact: true }).first(),
  ).toBeVisible();
  await d.getByRole("tab", { name: /^练习/ }).click();
  await expect(d.getByRole("button", { name: /^练习本词/ })).toBeVisible();
  await d.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page
    .getByRole("button", { name: "清除搜索与筛选", exact: true })
    .click();
  await page
    .getByRole("button", { name: "专题练习 · 阿拉伯文学史第一讲", exact: true })
    .click();
  await expect(page.locator(".answers button")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
