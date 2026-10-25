import { useState } from "react";
import type { State } from "./core";
import { today, shuffle } from "./core";
import { recordWord } from "./study";
import { AudioTools } from "./Audio";
import { Annotation } from "./Annotation";
import { matchesKnowledge } from "./search";
import { wordContext } from "./word-context";
export function WordStudy({
  state,
  initialScope = "all",
  save,
  note,
  star,
}: {
  state: State;
  initialScope?: string;
  save: (s: State) => boolean;
  note: (id: string, text: string) => boolean;
  star: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(""),
    [scope, setScope] = useState(initialScope),
    [limit, setLimit] = useState(20),
    [queue, setQueue] = useState<string[] | null>(null),
    [index, setIndex] = useState(0),
    [revealed, setRevealed] = useState(false),
    [again, setAgain] = useState<string[]>([]),
    [knownCount, setKnownCount] = useState(0);
  const candidates = state.knowledge.filter(
    (k) =>
      matchesKnowledge(k, query, state.annotations?.[k.id]) &&
      (!category || k.category === category) &&
      (scope === "all" ||
        (scope === "favorites" && state.favorites.includes(k.id)) ||
        (scope === "due" &&
          state.wordProgress?.[k.id] &&
          state.wordProgress[k.id].due <= today())),
  );
  const k = queue
    ? state.knowledge.find((k) => k.id === queue[index])
    : undefined;
  const context = k ? wordContext(k, state.knowledge) : null;
  function rate(known: boolean) {
    if (!k || !queue) return;
    if (!save(recordWord(state, k.id, known))) return;
    if (known) setKnownCount((n) => n + 1);
    if (!known && !again.includes(k.id)) {
      setQueue([...queue, k.id]);
      setAgain([...again, k.id]);
    }
    setIndex((n) => n + 1);
    setRevealed(false);
  }
  if (queue && !k)
    return (
      <section className="panel word-study">
        <h2>这一轮背完了</h2>
        <p>
          完成 {index} 次复习，其中 {knownCount} 次标记为认识。
        </p>
        <p className="muted">
          不熟悉的词已在本轮追加一次，并安排明天复习。进度已保存。
        </p>
        <button className="primary" onClick={() => setQueue(null)}>
          再背一组
        </button>
      </section>
    );
  if (queue && k)
    return (
      <section className="panel word-study">
        <div className="practice-top">
          <span className="tag">{k.category}</span>
          <span>
            第 {index + 1} / {queue.length} 次
          </span>
          <button onClick={() => setQueue(null)}>结束本轮</button>
        </div>
        <progress value={index} max={queue.length} />
        <p className="eyebrow">看词 · 回想 · 翻面</p>
        <h2 className="arabic word-front" lang="ar" dir="rtl">
          {k.arabic}
        </h2>
        <AudioTools text={k.arabic} url={k.audioUrl} />
        {!revealed ? (
          <button
            className="primary reveal-word"
            onClick={() => setRevealed(true)}
          >
            显示释义
          </button>
        ) : (
          <div className="word-back">
            <h2>{k.meaning}</h2>
            <section className="word-context" aria-label="搭配与语境">
              <h3>放回语境里记</h3>
              {context?.phrases.map((p, i) => (
                <div className="example" key={`phrase-${i}`}>
                  <span className="tag">{p.label}</span>
                  <p className="arabic" lang="ar" dir="rtl">
                    {p.arabic}
                  </p>
                  {p.chinese && <p>{p.chinese}</p>}
                  <AudioTools text={p.arabic} />
                </div>
              ))}
              {context?.examples.map((e, i) => (
                <div className="example" key={`example-${i}`}>
                  <span className="tag">
                    {e.context || "资料例句（是否文章原句未注明）"}
                  </span>
                  <p className="arabic" lang="ar" dir="rtl">
                    {e.arabic}
                  </p>
                  <p>{e.chinese}</p>
                  <AudioTools text={e.arabic} url={e.audioUrl} />
                </div>
              ))}
              {!context?.phrases.length && !context?.examples.length && (
                <p className="muted">
                  原资料暂未收录这条词汇的搭配或原句，可在下方批注中补充。
                </p>
              )}
            </section>
            {k.verb && (
              <details>
                <summary>词形提示</summary>
                <p className="arabic" dir="rtl" lang="ar">
                  {[k.verb.past, k.verb.present, k.verb.masdar]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </details>
            )}
            <button onClick={() => star(k.id)}>
              {state.favorites.includes(k.id) ? "★ 已收藏" : "☆ 收藏这个词"}
            </button>
            <Annotation
              id={k.id}
              value={state.annotations?.[k.id] || ""}
              save={note}
            />
            <div className="word-ratings">
              <button onClick={() => rate(false)}>再学一次</button>
              <button className="primary" onClick={() => rate(true)}>
                认识，下一词 →
              </button>
            </div>
          </div>
        )}
      </section>
    );
  return (
    <section className="panel">
      <h2>像背单词一样，一张一张过</h2>
      <p>先看阿语回想意思，点击翻面，再标记认识或再学。不需要输入答案。</p>
      <div className="toolbar">
        <label className="search">
          <input
            type="search"
            dir="auto"
            aria-label="搜索背词词库"
            placeholder="搜索阿语或中文，只背匹配的词…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="背词分类"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">全部分类</option>
          {[...new Set(state.knowledge.map((k) => k.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="背词范围"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="all">全部词卡</option>
          <option value="due">今日到期</option>
          <option value="favorites">我的收藏</option>
        </select>
        <select
          aria-label="每轮词数"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n} 个 / 轮
            </option>
          ))}
        </select>
      </div>
      <p className="muted">
        符合条件 {candidates.length} 张 · 已背过{" "}
        {Object.keys(state.wordProgress || {}).length} 张
      </p>
      <button
        className="primary"
        disabled={!candidates.length}
        onClick={() => {
          setQueue(
            shuffle(candidates)
              .slice(0, limit)
              .map((k) => k.id),
          );
          setIndex(0);
          setRevealed(false);
          setAgain([]);
          setKnownCount(0);
        }}
      >
        开始背单词
      </button>
    </section>
  );
}
