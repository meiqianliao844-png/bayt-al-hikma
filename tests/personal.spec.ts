import { test, expect } from "@playwright/test";
test("daily journal retains mood, weather and text on reload and complete backup restore", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "每日小记", exact: true }).click();
  await page.getByLabel("小记日期", { exact: true }).fill("2026-10-25");
  await page.getByRole("button", { name: "🌱 有收获", exact: true }).click();
  await page.getByRole("button", { name: "☀️ 晴", exact: true }).click();
  await page
    .getByLabel("学习心情与感受", { exact: true })
    .fill("今天多记住了一些词！");
  await page.getByRole("button", { name: "保存小记", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "每日小记编辑" }),
  ).toContainText("小记已保存");
  await page.reload();
  await page.getByRole("button", { name: "每日小记", exact: true }).click();
  await expect(page.getByLabel("学习心情与感受", { exact: true })).toHaveValue(
    "今天多记住了一些词！",
  );
  await expect(
    page.getByRole("button", { name: "🌱 有收获", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hikma-v1")!),
  );
  await page.getByRole("button", { name: "知识包与备份", exact: true }).click();
  await page.getByLabel("选择备份恢复").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await page.getByRole("button", { name: "确认覆盖并恢复" }).click();
  await page.getByRole("button", { name: "每日小记", exact: true }).click();
  await expect(page.locator(".journal-entry")).toContainText("☀️ 晴");
  await expect(page.locator(".journal-entry")).toContainText(
    "今天多记住了一些词！",
  );
});
test("wallpaper upload adapts button colors, persists locally and restores defaults", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("页面壁纸", { exact: true }).click();
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 10;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#a03030";
    ctx.fillRect(0, 0, 10, 10);
    return c.toDataURL("image/png").split(",")[1];
  });
  const input = page.getByLabel("上传壁纸", { exact: true });
  await expect(input).toBeEnabled();
  await input.setInputFiles({
    name: "wallpaper.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(page.locator("html")).toHaveAttribute("data-wallpaper", "true");
  await expect(
    page.getByText("壁纸已保存，按钮配色已自动适配", { exact: true }),
  ).toBeVisible();
  const searchButton = page.getByRole("button", {
    name: "搜索词库",
    exact: true,
  });
  await expect(searchButton).not.toHaveCSS(
    "background-color",
    "rgb(33, 76, 63)",
  );
  await searchButton.hover();
  const hover = await page.evaluate(() => {
    const hex =
      document.documentElement.style.getPropertyValue("--wallpaper-hover");
    const channels = hex
      .slice(1)
      .match(/../g)!
      .map((v) => parseInt(v, 16));
    return `rgb(${channels.join(", ")})`;
  });
  await expect(searchButton).toHaveCSS("background-color", hover);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-wallpaper", "true");
  await page.getByText("页面壁纸", { exact: true }).click();
  await page.getByRole("button", { name: "恢复默认壁纸", exact: true }).click();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-wallpaper",
    "true",
  );
  await page.reload();
  await expect(
    page.getByRole("region", { name: "背词复习进度" }),
  ).toBeVisible();
});
