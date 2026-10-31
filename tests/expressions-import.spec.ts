import { test, expect } from "@playwright/test";
test("technology phrases are independently memorized with visible context and breakdowns", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page
    .getByRole("button", {
      name: "背本专题 · 科技手机 · 词组与长句精读",
      exact: true,
    })
    .click();
  await expect(page.getByText(/符合条件 30 张/)).toBeVisible();
  await page.getByRole("button", { name: "开始背单词", exact: true }).click();
  await page.getByRole("button", { name: "显示释义", exact: true }).click();
  await expect(page.getByText("拆解与用法", { exact: true })).toBeVisible();
  await expect(page.locator(".word-breakdown")).toHaveAttribute("open", "");
  await expect(page.getByRole("region", { name: "搭配与语境" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "✦ 问 GPT", exact: true }),
  ).toBeVisible();
});
