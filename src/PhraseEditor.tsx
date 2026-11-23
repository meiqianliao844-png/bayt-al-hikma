import { useState } from "react";
import type { State } from "./core";

export type CustomPhrase = { arabic: string; chinese: string };

export function saveCustomPhrases(
  state: State,
  id: string,
  phrases: CustomPhrase[] | undefined,
): State {
  if (!state.knowledge.some((card) => card.id === id))
    throw Error("词卡不存在");
  if (
    phrases &&
    (phrases.length > 100 ||
      phrases.some(
        (p) =>
          !p.arabic.trim() ||
          p.arabic.length > 10000 ||
          p.chinese.length > 10000,
      ))
  )
    throw Error("请填写阿语搭配，每张卡最多保存100条，每个文本最多10000字");
  const customPhrases = { ...state.customPhrases };
  if (phrases === undefined) delete customPhrases[id];
  else
    customPhrases[id] = phrases.map((p) => ({
      arabic: p.arabic.trim(),
      chinese: p.chinese.trim(),
    }));
  return { ...state, customPhrases };
}

export function PhraseEditor({
  phrases,
  customized,
  save,
}: {
  phrases: CustomPhrase[];
  customized: boolean;
  save: (phrases: CustomPhrase[] | undefined) => boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CustomPhrase[]>([]);
  const [message, setMessage] = useState("");
  function submit(value: CustomPhrase[] | undefined) {
    try {
      if (!save(value)) {
        setMessage("保存失败，请重试");
        return;
      }
      setEditing(false);
      setMessage(value === undefined ? "已恢复原资料搭配" : "搭配已保存");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  return (
    <div className="phrase-editor">
      {!editing ? (
        <button
          onClick={() => {
            setDraft(phrases.map((p) => ({ ...p })));
            setMessage("");
            setEditing(true);
          }}
        >
          修改／自定义搭配
        </button>
      ) : (
        <div>
          <p>填写阿语搭配和中文解释，可添加或删除条目。</p>
          {draft.map((phrase, index) => (
            <div className="phrase-editor-row" key={index}>
              <label className="field">
                阿语搭配 {index + 1}
                <textarea
                  lang="ar"
                  dir="rtl"
                  className="arabic"
                  rows={2}
                  maxLength={10000}
                  value={phrase.arabic}
                  onChange={(e) =>
                    setDraft(
                      draft.map((p, i) =>
                        i === index ? { ...p, arabic: e.target.value } : p,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                中文解释 {index + 1}
                <textarea
                  rows={2}
                  maxLength={10000}
                  value={phrase.chinese}
                  onChange={(e) =>
                    setDraft(
                      draft.map((p, i) =>
                        i === index ? { ...p, chinese: e.target.value } : p,
                      ),
                    )
                  }
                />
              </label>
              <button
                onClick={() => setDraft(draft.filter((_, i) => i !== index))}
              >
                删除搭配 {index + 1}
              </button>
            </div>
          ))}
          <div className="button-row">
            <button
              disabled={draft.length >= 100}
              onClick={() => setDraft([...draft, { arabic: "", chinese: "" }])}
            >
              添加搭配
            </button>
            <button className="primary" onClick={() => submit(draft)}>
              保存搭配
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setMessage("");
              }}
            >
              取消修改
            </button>
          </div>
        </div>
      )}
      {customized && !editing && (
        <button onClick={() => submit(undefined)}>恢复原资料搭配</button>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
