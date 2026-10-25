import { useEffect, useState } from "react";
export function Annotation({
  id,
  value,
  save,
}: {
  id: string;
  value: string;
  save: (id: string, text: string) => boolean;
}) {
  const [draft, setDraft] = useState(value),
    [message, setMessage] = useState("");
  useEffect(() => {
    setDraft(value);
  }, [id, value]);
  useEffect(() => setMessage(""), [id]);
  return (
    <details className="annotation">
      <summary>我的批注{value ? " · 已保存" : ""}</summary>
      <label className="field">
        词条批注
        <textarea
          dir="auto"
          rows={4}
          maxLength={20000}
          placeholder="记下老师补充的用法、自己的理解或疑问…"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setMessage("尚未保存");
          }}
        />
      </label>
      <button
        onClick={() => {
          if (save(id, draft)) setMessage("批注已保存");
          else setMessage("保存失败，请重试");
        }}
      >
        保存批注
      </button>
      <small role="status">{message}</small>
      <p className="muted">批注只记在这张词卡下，并随完整备份保存。</p>
    </details>
  );
}
