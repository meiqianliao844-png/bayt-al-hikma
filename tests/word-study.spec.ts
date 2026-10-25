import { test, expect } from "@playwright/test";
test("flashcards reveal meanings, save annotations and word progress, and retain both after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "背单词", exact: true }).click();
  await page.getByRole("button", { name: "开始背单词", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "认识，下一词 →", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".word-front")).toHaveCSS(
    "font-family",
    /Times New Roman/,
  );
  await page.getByRole("button", { name: "显示释义", exact: true }).click();
  await page.locator(".annotation summary").click();
  await page.getByLabel("词条批注", { exact: true }).fill("我的测试批注 فِي");
  await page.getByRole("button", { name: "保存批注", exact: true }).click();
  await expect(page.locator(".annotation")).toContainText("批注已保存");
  await page.getByRole("button", { name: "再学一次", exact: true }).click();
  let s = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  expect(Object.keys(s.wordProgress)).toHaveLength(1);
  expect(Object.values(s.annotations)).toContain("我的测试批注 فِي");
  expect(s.questions).toHaveLength(580);
  await page.reload();
  s = await page.evaluate(() => JSON.parse(localStorage.getItem("hikma-v1")!));
  expect(Object.keys(s.wordProgress)).toHaveLength(1);
  expect(Object.values(s.annotations)).toContain("我的测试批注 فِي");
  await page.getByRole("button", { name: "智慧试炼", exact: true }).click();
  await page
    .getByRole("heading", { name: "阿译中", exact: true })
    .locator("..")
    .getByRole("button")
    .click();
  await expect(page.locator(".practice textarea")).toHaveCount(0);
  await expect(page.locator(".answers button").first()).toBeVisible();
});

test("revealing a news verb shows its supplied collocation and bilingual teaching context directly beneath the meaning", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "背单词", exact: true }).click();
  await page.getByLabel("背词分类").selectOption("校服新闻 · 动词搭配");
  await page.getByRole("button", { name: "开始背单词", exact: true }).click();
  await expect(page.getByRole("region", { name: "搭配与语境" })).toHaveCount(0);
  await page.getByRole("button", { name: "显示释义", exact: true }).click();
  const context = page.getByRole("region", { name: "搭配与语境" });
  await expect(context.getByText("原资料搭配", { exact: true })).toBeVisible();
  await expect(context.getByText(/教学例句/).first()).toBeVisible();
  await expect(context.locator(".arabic").first()).toBeVisible();
});
