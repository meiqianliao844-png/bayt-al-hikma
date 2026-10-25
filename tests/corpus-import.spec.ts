import { test, expect } from "@playwright/test";
test("new corpus appears in its topic with choice exercises and saved future review counts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page
    .getByRole("button", { name: "查看人类命运共同体", exact: true })
    .click();
  await expect(page.getByText("共 85 个知识点", { exact: true })).toBeVisible();
  await page.getByLabel("搜索知识").fill("恃强凌弱");
  await page.getByRole("button", { name: "展开学习 ↗", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("اسْتِئْسَادُ");
  await dialog.getByRole("button", { name: "关闭弹窗", exact: true }).click();
  await page.getByRole("button", { name: "背单词", exact: true }).click();
  await page.getByLabel("背词分类").selectOption("人类命运共同体 · 理念与价值");
  await page.getByRole("button", { name: "开始背单词", exact: true }).click();
  await page.getByRole("button", { name: "显示释义", exact: true }).click();
  await expect(page.getByRole("region", { name: "搭配与语境" })).toBeVisible();
  await page
    .getByRole("button", { name: "认识，下一词 →", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "背词复习进度" }),
  ).toContainText("已背词卡 1 张 · 今日到期 0 张 · 未来已安排 1 张");
  await expect(
    page.getByRole("region", { name: "背词复习进度" }),
  ).toContainText("下次复习日期");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "背词复习进度" }),
  ).toContainText("已背词卡 1 张");
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page
    .getByRole("button", {
      name: "专题练习 · 时政阿拉伯语 · 人类命运共同体",
      exact: true,
    })
    .click();
  await expect(page.locator(".answers button")).toHaveCount(4);
  await expect(page.locator(".practice textarea")).toHaveCount(0);
});
