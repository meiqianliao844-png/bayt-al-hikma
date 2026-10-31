import { test, expect } from "@playwright/test";
test("studies only a selected topic and remembers it across reloads", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "背单词", exact: true }).click();
  const select = page.getByLabel("背词专题", { exact: true });
  await select.selectOption("arabic-literature-lesson-01-2026-10-31-v1");
  await expect(page.getByText(/符合条件 183 张/)).toBeVisible();
  await expect(page.getByText(/本轮不会混入其他专题/)).toBeVisible();
  await page.getByRole("button", { name: "开始背单词", exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await expect(page.locator(".practice-top .tag")).toContainText(
      "阿拉伯文学史第一讲",
    );
    await page.getByRole("button", { name: "显示释义", exact: true }).click();
    await page
      .getByRole("button", { name: "认识，下一词 →", exact: true })
      .click();
  }
  await page.reload();
  await page.getByRole("button", { name: "背单词", exact: true }).click();
  await expect(page.getByLabel("背词专题", { exact: true })).toHaveValue(
    "arabic-literature-lesson-01-2026-10-31-v1",
  );
  await expect(page.getByText(/符合条件 183 张/)).toBeVisible();
  await page.getByLabel("背词范围").selectOption("due");
  await expect(page.getByText(/符合条件 0 张/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "开始背单词", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("背词范围").selectOption("all");
  await page.getByLabel("背词专题", { exact: true }).selectOption("");
  await expect(page.getByText(/符合条件 597 张/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
