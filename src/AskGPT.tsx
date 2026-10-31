import { useState } from "react";
import type { Knowledge } from "./core";
export function gptQuestion(k: Knowledge, question = "") {
  return [
    "我是中文母语的阿拉伯语学习者，请用中文讲解下列学习材料。",
    `当前词句：${k.arabic.slice(0, 1000)}`,
    `已有释义（供参考，请核对）：${k.meaning.slice(0, 600)}`,
    ...(k.examples || [])
      .slice(0, 2)
      .map(
        (e) =>
          `语境（${e.context || "来源属性未注明"}）：${e.arabic.slice(0, 800)}\n参考译文：${e.chinese.slice(0, 500)}`,
      ),
    `我的问题：${question.trim() || "我看不懂这个表达，请逐词拆解，解释句法、搭配、词形和语境含义。"}`,
    "请区分现代标准语与方言；阿语尽量完整标符，名词复数请列单数。若材料有误请指出；不确定的词形或事实请明确说明，不要编造出处。",
  ].join("\n\n");
}
export function AskGPT({ k }: { k: Knowledge }) {
  const [expanded, setExpanded] = useState(false),
    [question, setQuestion] = useState(""),
    [status, setStatus] = useState("");
  const prompt = gptQuestion(k, question);
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("问题已复制，可在 ChatGPT 中粘贴。");
    } catch {
      setStatus("未能自动复制，请在下方选中并复制问题。");
    }
  }
  return (
    <section className="ask-gpt" aria-label="GPT学习答疑">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        ✦ 问 GPT
      </button>
      {expanded && (
        <div className="gpt-panel">
          <p>带上当前词句和原文语境，到 ChatGPT 继续问。</p>
          <label>
            你想问什么？
            <textarea
              aria-label="向GPT提出的疑问"
              dir="auto"
              maxLength={1000}
              rows={2}
              placeholder="例如：这里为什么用这个介词？"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setStatus("");
              }}
            />
          </label>
          <div className="button-row">
            <button type="button" onClick={copy}>
              复制问题
            </button>
            <a
              className="gpt-open"
              href={`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              打开 ChatGPT ↗
            </a>
          </div>
          <p className="muted">
            在 ChatGPT
            中继续对话；若问题未自动带入，请复制后粘贴。仅带上本卡内容和你填写的问题，不附加学习记录或小记。
          </p>
          {status && <p role="status">{status}</p>}
          <details>
            <summary>查看／手动复制完整问题</summary>
            <textarea
              aria-label="完整GPT提问内容"
              dir="auto"
              readOnly
              rows={8}
              value={prompt}
              onFocus={(e) => e.currentTarget.select()}
            />
          </details>
        </div>
      )}
    </section>
  );
}
