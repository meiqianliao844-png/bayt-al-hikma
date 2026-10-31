import { test, expect } from "@playwright/test";
test("continuation reuses existing cards, shows noun singulars and studies the current source context", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page
    .getByRole("button", { name: "查看神秘顾客02", exact: true })
    .click();
  await expect(page.getByText("共 48 个知识点", { exact: true })).toBeVisible();
  await page.getByLabel("搜索知识", { exact: true }).fill("神秘顾客02 水母");
  await page
    .getByRole("button", { name: "展开学习 ↗", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("region", { name: "名词单复数" }),
  ).toContainText("قِنْدِيلُ");
  await dialog.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page
    .getByRole("button", { name: "清除搜索与筛选", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "背本专题 · 海绵宝宝 · 神秘顾客02",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("背词专题", { exact: true })).toHaveValue(
    "spongebob-mystery-customer-02",
  );
  await page
    .getByLabel("搜索背词词库", { exact: true })
    .fill("海绵宝宝 · 神秘顾客02 抓住");
  await expect(page.getByText(/符合条件 1 张/)).toBeVisible();
  await page.getByRole("button", { name: "开始背单词", exact: true }).click();
  await page.getByRole("button", { name: "显示释义", exact: true }).click();
  await expect(page.getByRole("region", { name: "搭配与语境" })).toContainText(
    "أَمْسَكْتُ!",
  );
  await page
    .getByRole("button", { name: "认识，下一词 →", exact: true })
    .click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  expect(state.knowledge).toHaveLength(597);
  expect(state.questions).toHaveLength(1512);
  expect(
    state.wordProgress["spongebob-mystery-customer-01-catch"],
  ).toBeDefined();
  await page.reload();
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page
    .getByRole("button", { name: "查看神秘顾客02", exact: true })
    .click();
  await expect(page.getByText("共 48 个知识点", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
