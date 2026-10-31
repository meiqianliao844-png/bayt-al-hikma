import { it, expect } from "vitest";
import { gptQuestion } from "./AskGPT";
it("builds a contextual question from only the selected card and explicit user question", () => {
  const k = {
    id: "a",
    arabic: "أَقَرَّ بِوُجُودِ مُشْكِلَةٍ",
    meaning: "承认存在问题",
    date: "2026-10-31",
    category: "测试",
    examples: [
      {
        arabic: "أَقَرَّ بِوُجُودِ مُشْكِلَةٍ.",
        chinese: "承认存在问题。",
        context: "原资料",
      },
    ],
  };
  const s = gptQuestion(k, "为什么用 بِـ？");
  expect(s).toContain(k.examples[0].arabic);
  expect(s).toContain("为什么用 بِـ？");
  expect(s).toContain("名词复数请列单数");
  expect(s).not.toContain("undefined");
});
