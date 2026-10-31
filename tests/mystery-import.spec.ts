import { test, expect } from "@playwright/test";
test("mystery customer topic exposes source subtitles, tricky forms and choice-only exercises", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page
    .getByRole("button", { name: "查看神秘顾客01", exact: true })
    .click();
  await expect(page.getByText("共 24 个知识点", { exact: true })).toBeVisible();
  await page.getByLabel("搜索知识", { exact: true }).fill("神秘顾客01 抓住");
  await expect(page.getByText("共 1 个知识点", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "展开学习 ↗", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "词形变化", exact: true }).click();
  await expect(dialog.getByText("يُمْسِكُ", { exact: true })).toBeVisible();
  await dialog.getByRole("tab", { name: "例句", exact: true }).click();
  await expect(
    dialog.getByText("سَأُمْسِكُ بِهِ هَذِهِ الْمَرَّةَ!", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("这次我一定要抓住他！", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page
    .getByRole("button", { name: "清除搜索与筛选", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "专题练习 · 海绵宝宝 · 神秘顾客01",
      exact: true,
    })
    .click();
  await expect(page.locator(".answers button")).toHaveCount(4);
  await expect(page.locator(".practice textarea")).toHaveCount(0);
  await page.getByRole("button", { name: "背单词", exact: true }).click();
  await page
    .getByLabel("搜索背词词库", { exact: true })
    .fill("神秘顾客01 抓住");
  await page.getByRole("button", { name: "开始背单词", exact: true }).click();
  await page.getByRole("button", { name: "显示释义", exact: true }).click();
  await expect(page.getByRole("region", { name: "搭配与语境" })).toContainText(
    "这次我一定要抓住他！",
  );
  await page
    .getByRole("button", { name: "认识，下一词 →", exact: true })
    .click();
  const s = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  expect(s.knowledge).toHaveLength(330);
  expect(s.questions).toHaveLength(852);
  expect(Object.keys(s.wordProgress)).toHaveLength(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
