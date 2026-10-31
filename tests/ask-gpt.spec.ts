import { test, expect } from "@playwright/test";
test("opens a contextual GPT handoff without including the learning backup", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "每日知识库", exact: true }).click();
  await page.getByLabel("搜索知识", { exact: true }).fill("文学批评");
  await page
    .getByRole("button", { name: "展开学习 ↗", exact: true })
    .first()
    .click();
  const d = page.getByRole("dialog");
  await d.getByRole("button", { name: "✦ 问 GPT", exact: true }).click();
  await d.getByLabel("向GPT提出的疑问").fill("为什么这样搭配？");
  const link = d.getByRole("link", { name: "打开 ChatGPT ↗", exact: true });
  const href = await link.getAttribute("href");
  const url = new URL(href!);
  expect(url.origin).toBe("https://chatgpt.com");
  expect(url.searchParams.get("q")).toContain("为什么这样搭配？");
  expect(url.searchParams.get("q")).toContain("النَّقْدُ الْأَدَبِيُّ");
  expect(url.searchParams.get("q")).not.toContain("wordProgress");
  expect(await link.getAttribute("target")).toBe("_blank");
  await d.getByText("查看／手动复制完整问题", { exact: true }).click();
  await expect(d.getByLabel("完整GPT提问内容")).toHaveValue(
    url.searchParams.get("q")!,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
