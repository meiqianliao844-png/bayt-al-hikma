import { useState } from "react";
import { today, saveJournal, type State, type JournalEntry } from "./core";
const moods = [
  "😊 开心",
  "🌱 有收获",
  "💪 有动力",
  "😌 平静",
  "😵 有点累",
  "🌧️ 低落",
];
const weather = [
  "☀️ 晴",
  "⛅ 多云",
  "☁️ 阴",
  "🌧️ 雨",
  "⛈️ 雷雨",
  "❄️ 雪",
  "🌬️ 有风",
];
const empty: JournalEntry = { text: "", mood: "", weather: "" };
export function Journal({
  state,
  save,
}: {
  state: State;
  save: (s: State) => boolean;
}) {
  const [date, setDate] = useState(today());
  const [drafts, setDrafts] = useState<Record<string, JournalEntry>>({});
  const [message, setMessage] = useState("");
  const entry = drafts[date] || state.journal?.[date] || empty;
  const update = (patch: Partial<JournalEntry>) => {
    setDrafts({ ...drafts, [date]: { ...entry, ...patch } });
    setMessage("尚未保存");
  };
  const dates = Object.keys(state.journal || {})
    .sort()
    .reverse();
  return (
    <>
      <section className="panel journal-editor" aria-label="每日小记编辑">
        <label className="field">
          小记日期
          <input
            type="date"
            aria-label="小记日期"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setMessage("");
            }}
          />
        </label>
        <fieldset>
          <legend>今天的心情</legend>
          <div className="button-row">
            {moods.map((m) => (
              <button
                key={m}
                aria-pressed={entry.mood === m}
                onClick={() => update({ mood: entry.mood === m ? "" : m })}
              >
                {m}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>今天的天气</legend>
          <div className="button-row">
            {weather.map((w) => (
              <button
                key={w}
                aria-pressed={entry.weather === w}
                onClick={() =>
                  update({ weather: entry.weather === w ? "" : w })
                }
              >
                {w}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          学习心情与感受
          <textarea
            aria-label="学习心情与感受"
            rows={6}
            dir="auto"
            maxLength={20000}
            placeholder="今天记住了哪个表达？遇到了什么困难？也可以只是写一句此刻的感受…"
            value={entry.text}
            onChange={(e) => update({ text: e.target.value })}
          />
        </label>
        <button
          className="primary"
          onClick={() => {
            try {
              if (save(saveJournal(state, date, entry))) {
                const next = { ...drafts };
                delete next[date];
                setDrafts(next);
                setMessage("小记已保存");
              } else setMessage("保存失败，内容仍保留，请重试");
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          保存小记
        </button>
        <span className="journal-status" role="status">
          {message}
        </span>
        <p className="muted">
          选择符号或写下感受后点击保存。同一天可以继续修改；小记随完整学习备份一起保存。
        </p>
      </section>
      <h2>往日小记 · {dates.length} 天</h2>
      {dates.length ? (
        dates.map((d) => {
          const e = state.journal![d];
          return (
            <article className="panel journal-entry" key={d}>
              <h3>{d}</h3>
              <p>
                {e.mood} {e.weather}
              </p>
              {e.text && (
                <p dir="auto" className="journal-text">
                  {e.text}
                </p>
              )}
              <button
                onClick={() => {
                  setDate(d);
                  setMessage("");
                  document
                    .querySelector(".journal-editor")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                查看或修改 · {d}
              </button>
            </article>
          );
        })
      ) : (
        <p className="muted">还没有小记，从今天的一句话开始吧。</p>
      )}
    </>
  );
}
