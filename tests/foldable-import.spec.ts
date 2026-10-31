import { test, expect } from "@playwright/test";
test("technology focus topic separates source excerpts and teaching examples and shows singular forms", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page
    .getByRole("button", { name: "查看折叠手机专题", exact: true })
    .click();
  await expect(page.getByText("共 56 个知识点", { exact: true })).toBeVisible();
  await page
    .getByLabel("分类筛选", { exact: true })
    .selectOption("折叠手机 · 26个重点词");
  await page
    .getByLabel("搜索知识", { exact: true })
    .fill("科技新闻 折叠手机 投诉");
  await page
    .getByRole("button", { name: "展开学习 ↗", exact: true })
    .first()
    .click();
  const d = page.getByRole("dialog");
  await expect(d.getByRole("region", { name: "名词单复数" })).toContainText(
    "شَكْوَى",
  );
  await d.getByRole("tab", { name: "例句", exact: true }).click();
  await expect(d.getByText(/原素材/).first()).toBeVisible();
  await expect(d.getByText(/教学例句/).first()).toBeVisible();
  await d.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page
    .getByRole("button", { name: "清除搜索与筛选", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "专题练习 · 科技新闻 · 折叠手机",
      exact: true,
    })
    .click();
  await expect(page.locator(".answers button")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
