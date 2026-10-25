import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Sun,
  Feather,
  RotateCcw,
  Upload,
  Search,
  Star,
  ArrowUpRight,
  Check,
  Menu,
} from "lucide-react";
import { AudioTools } from "./Audio";
import { WordPlanSummary } from "./WordPlanSummary";
import { WordStudy } from "./WordStudy";
import { Annotation } from "./Annotation";
import { choiceOnly, saveAnnotation, wordReviewPlan } from "./study";
import { VocabularyProfile } from "./VocabularyProfile";
import { questionLabels } from "./vocabulary";
import {
  type State,
  type Knowledge,
  type Pack,
  type Question,
  localRepository,
  initialState,
  today,
  parsePack,
  parseBackup,
  mergePack,
  recordAnswer,
  removeKnowledge,
  normalize,
  shuffle,
  bundledCollections,
  installBundledPacks,
} from "./core";
import "./style.css";
const labels = questionLabels;
let startupError = "";
let loaded: State;
try {
  loaded = localRepository.load();
} catch {
  startupError =
    "本地数据读取失败。原数据未覆盖，请先导出原始存储或恢复有效备份。";
  loaded = initialState();
}
function download(data: unknown, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function App() {
  const [s, setS] = useState(loaded);
  const [page, setPage] = useState("home");
  const [notice, setNotice] = useState(startupError);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [fav, setFav] = useState(false);
  const [groupBy, setGroupBy] = useState<"date" | "category">("date");
  const [detail, setDetail] = useState<Knowledge | null>(null);
  const [editing, setEditing] = useState<Knowledge | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [update, setUpdate] = useState(false);
  const [backup, setBackup] = useState<State | null>(null);
  const [practice, setPractice] = useState<Question[] | null>(null);
  const commit = (next: State) => {
    try {
      localRepository.save(next);
      setS(next);
      setNotice("已保存到此浏览器");
      return true;
    } catch {
      setNotice("保存失败：浏览器存储空间不足或不可用。请导出备份后重试。");
      return false;
    }
  };
  const [wordScope, setWordScope] = useState("all");
  const plan = wordReviewPlan(s);
  const dueWords = plan.filter((p) => p.overdue);
  const openWordReview = () => {
    setWordScope("due");
    setPage("words");
  };
  const due = s.questions.filter(
    (q) => s.progress[q.id] && s.progress[q.id].due <= today(),
  );
  const wrong = s.questions.filter((q) => s.progress[q.id]?.errors > 0);
  const mastered = s.knowledge.filter((k) => {
    const qs = s.questions.filter((q) => q.knowledgeId === k.id);
    return (
      qs.length > 0 &&
      qs.every(
        (q) =>
          (s.progress[q.id]?.stage ?? -1) >= 4 && s.progress[q.id]?.lastCorrect,
      )
    );
  }).length;
  const filtered = s.knowledge.filter(
    (k) =>
      (!search ||
        normalize(
          [
            k.arabic,
            k.meaning,
            k.root,
            k.category,
            JSON.stringify(k.vocabulary || {}),
            ...(k.collocations || []),
          ].join(" "),
        )
          .toLowerCase()
          .includes(normalize(search).toLowerCase())) &&
      (!category || k.category === category) &&
      (!date || k.date === date) &&
      (!fav || s.favorites.includes(k.id)),
  );
  function start(q: Question[]) {
    setPractice(shuffle(choiceOnly(q, s.knowledge, s.questions)));
    setPage("practice");
  }
  async function read(file: File | undefined, restore = false) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("文件不能超过 10 MB");
      const data = JSON.parse(await file.text());
      if (restore) setBackup(installBundledPacks(parseBackup(data)));
      else {
        setPack(
          parsePack(
            data,
            s.knowledge.map((k) => k.id),
          ),
        );
        setUpdate(false);
      }
      setNotice("校验通过，请预览并确认");
    } catch (e) {
      setNotice(
        "文件校验失败：" + (e instanceof Error ? e.message : "未知错误"),
      );
      setPack(null);
      setBackup(null);
    }
  }
  return (
    <div className="shell">
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("home");
          }}
        >
          <div className="brand-mark">۞</div>
          <div>
            <b>智慧宫</b>
            <span lang="ar" dir="rtl">
              بَيْتُ الْحِكْمَةِ
            </span>
          </div>
        </a>
        <div className="nav-caption">你的阿拉伯语学习空间</div>
        <nav>
          {[
            ["home", "学习庭院", Sun],
            ["library", "每日知识库", BookOpen],
            ["words", "背单词", BookOpen],
            ["practice", "智慧试炼", Feather],
            ["review", "错题与复习", RotateCcw],
            ["import", "知识包与备份", Upload],
          ].map(([id, title, Icon]) => (
            <button
              key={id as string}
              className={page === id ? "active" : ""}
              onClick={() => {
                setPage(id as string);
                if (id === "practice") setPractice(null);
              }}
            >
              {React.createElement(Icon as typeof Sun, { size: 19 })}
              {title as string}
              {id === "review" && dueWords.length > 0 && (
                <em>{dueWords.length}</em>
              )}
            </button>
          ))}
        </nav>
        <div className="aside-quote">
          <span lang="ar" dir="rtl">
            الْعِلْمُ نُورٌ
          </span>
          <p>
            知识是一束光。
            <br />
            让每一天的积累，照亮更远的路。
          </p>
          <small>本地学习空间 · 数据保存在当前浏览器</small>
        </div>
      </aside>
      <main>
        <header>
          <span>
            <Menu size={15} /> 个人学习空间 <i>/</i>{" "}
            {
              (
                {
                  home: "学习庭院",
                  library: "每日知识库",
                  words: "背单词",
                  practice: "智慧试炼",
                  review: "错题与复习",
                  import: "知识包与备份",
                } as Record<string, string>
              )[page]
            }
          </span>
          <span className="date">
            {new Date().toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </span>
        </header>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button aria-label="关闭通知" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
        {page === "home" && (
          <>
            <section className="hero">
              <div className="eyebrow">BAYT AL-HIKMA · 日积月累，学以致用</div>
              <h1>
                在语言之间，
                <br />
                发现更广阔的世界<span>。</span>
              </h1>
              <p>
                从一个词根，到一段对话。
                <br />
                把今天的领悟，变成明天的从容表达。
              </p>
              <button
                className="primary"
                onClick={
                  dueWords.length
                    ? openWordReview
                    : () => {
                        setWordScope("all");
                        setPage("words");
                      }
                }
              >
                开始今日学习 <ArrowUpRight size={17} />
              </button>
              <button onClick={() => setPage("words")}>开始背单词 →</button>
              <div className="hero-art">
                <span>۞</span>
                <b lang="ar" dir="rtl">
                  بَيْتُ
                  <br />
                  الْحِكْمَةِ
                </b>
                <small>智慧，自积累而来</small>
              </div>
            </section>
            <div className="stats">
              <Stat
                number={s.knowledge.length}
                label="积累的知识点"
                note="每一词，都是新的视野"
              />
              <Stat
                number={dueWords.length}
                label="今日待复习词卡"
                note="让记忆，在重逢中扎根"
              />
              <Stat
                number={mastered}
                label="已掌握知识点"
                note="完成全部关联题的五阶复习"
              />
              <Stat
                number={s.history.length}
                label="累计练习次数"
                note={`已练习 ${Object.keys(s.progress).length} / ${s.questions.length} 题`}
              />
            </div>
            <WordPlanSummary state={s} />
            <section className="section-title">
              <div>
                <span className="eyebrow">YOUR DAILY COLLECTION</span>
                <h2>拾取今日的知识</h2>
              </div>
              <button
                className="text-button"
                onClick={() => setPage("library")}
              >
                走进知识库 →
              </button>
            </section>
            <div className="cards">
              {s.knowledge.slice(-3).map((k) => (
                <Card
                  key={k.id}
                  k={k}
                  starred={s.favorites.includes(k.id)}
                  open={() => setDetail(k)}
                  star={() =>
                    commit({
                      ...s,
                      favorites: s.favorites.includes(k.id)
                        ? s.favorites.filter((x) => x !== k.id)
                        : [...s.favorites, k.id],
                    })
                  }
                />
              ))}
            </div>
            <section className="journey">
              <div>
                <span className="eyebrow">温故 · 知新</span>
                <h2>记忆需要恰到好处的重逢</h2>
                <p>按第 1、3、7、14、30 天的间隔循序复习，让表达成为习惯。</p>
              </div>
              <button onClick={() => setPage("review")}>
                查看我的复习计划 →
              </button>
            </section>
          </>
        )}
        {page === "words" && (
          <>
            <Title
              eyebrow="WORD BY WORD"
              title="背单词"
              text="看阿语，回想意思，再翻面。每天一点，慢慢记牢。"
            />
            <WordPlanSummary state={s} />
            <WordStudy
              initialScope={wordScope}
              state={s}
              save={commit}
              note={(id, text) => commit(saveAnnotation(s, id, text))}
              star={(id) =>
                commit({
                  ...s,
                  favorites: s.favorites.includes(id)
                    ? s.favorites.filter((x) => x !== id)
                    : [...s.favorites, id],
                })
              }
            />
          </>
        )}
        {page === "library" && (
          <>
            <Title
              eyebrow="THE COLLECTION"
              title="每日知识库"
              text="将零散的领悟，编织成自己的语言体系。"
            />
            <div className="toolbar">
              <label className="search">
                <Search size={17} />
                <input
                  aria-label="搜索知识"
                  placeholder="搜索阿语、中文、词根…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <select
                aria-label="分类筛选"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">全部分类</option>
                {[...new Set(s.knowledge.map((k) => k.category))].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <input
                aria-label="学习日期筛选"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                className={fav ? "selected" : ""}
                onClick={() => setFav(!fav)}
              >
                ☆ 收藏
              </button>
              <button
                className="primary"
                onClick={() =>
                  setEditing({
                    id: crypto.randomUUID(),
                    arabic: "",
                    meaning: "",
                    category: "个人积累",
                    date: today(),
                    examples: [],
                  })
                }
              >
                ＋ 添加知识
              </button>
            </div>
            {bundledCollections.map((collection) => (
              <section
                className="news-collection panel"
                key={collection.pack.id}
                aria-label={collection.title}
              >
                <div>
                  <span className="eyebrow">
                    LEARNING COLLECTION · 学习专题
                  </span>
                  <h2>{collection.title}</h2>
                  <p>
                    {collection.verbs > 0 &&
                      `${collection.verbs} 组动词搭配 · `}
                    {collection.terms} 条词汇 ·{" "}
                    {collection.pack.questions.length} 道练习。{collection.note}
                  </p>
                  {collection.reviewNotes.length > 0 && (
                    <details>
                      <summary>
                        字幕核对备注（{collection.reviewNotes.length}{" "}
                        条，未据音频确认）
                      </summary>
                      {collection.reviewNotes.map((n, i) => (
                        <div className="subtitle-note" key={i}>
                          <p lang="ar" dir="rtl" className="arabic">
                            {n.source}
                          </p>
                          <p>{n.note}</p>
                        </div>
                      ))}
                    </details>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearch(collection.pack.title);
                    setCategory("");
                    setDate("");
                    setFav(false);
                    setGroupBy("category");
                  }}
                >
                  {collection.viewLabel}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    const ids = new Set(
                      collection.pack.questions.map((q) => q.id),
                    );
                    start(s.questions.filter((q) => ids.has(q.id)));
                  }}
                >
                  专题练习 · {collection.title}
                </button>
              </section>
            ))}
            <div className="group-toolbar">
              <p className="muted">共 {filtered.length} 个知识点</p>
              <label>
                分组方式{" "}
                <select
                  aria-label="知识分组"
                  value={groupBy}
                  onChange={(e) =>
                    setGroupBy(e.target.value as "date" | "category")
                  }
                >
                  <option value="date">按日期</option>
                  <option value="category">按主题 / 分类</option>
                </select>
              </label>
            </div>
            {[...new Set(filtered.map((k) => k[groupBy]))]
              .sort((a, b) =>
                groupBy === "date"
                  ? b.localeCompare(a)
                  : a.localeCompare(b, "zh-CN"),
              )
              .map((day) => (
                <section className="day-group" key={day}>
                  <h2 className="day-title">
                    {day}
                    <span>
                      {filtered.filter((k) => k[groupBy] === day).length}{" "}
                      个知识点
                    </span>
                  </h2>
                  <div className="cards">
                    {filtered
                      .filter((k) => k[groupBy] === day)
                      .map((k) => (
                        <Card
                          key={k.id}
                          k={k}
                          starred={s.favorites.includes(k.id)}
                          open={() => setDetail(k)}
                          star={() =>
                            commit({
                              ...s,
                              favorites: s.favorites.includes(k.id)
                                ? s.favorites.filter((x) => x !== k.id)
                                : [...s.favorites, k.id],
                            })
                          }
                        />
                      ))}
                  </div>
                </section>
              ))}
            {!filtered.length && (
              <Empty text="暂无匹配知识，可清除筛选或添加知识。" />
            )}
          </>
        )}
        {page === "practice" && (
          <>
            <Title
              eyebrow="THE DAILY CHALLENGE"
              title="智慧试炼"
              text="在练习中理解，在表达中掌握。"
            />
            {practice ? (
              <Practice
                key={practice.map((q) => q.id).join(",")}
                questions={practice}
                knowledge={s.knowledge}
                open={setDetail}
                submit={(q, a, c) => commit(recordAnswer(s, q, a, c))}
                finish={() => setPractice(null)}
              />
            ) : (
              <>
                <div className="panel">
                  <h2>今天，练一点新的</h2>
                  <p>
                    所有练习都点选作答，自动批改；不需要手动输入。翻译题选择资料对应的参考表达。
                  </p>
                  <button
                    className="primary"
                    disabled={!s.questions.length}
                    onClick={() => start(s.questions)}
                  >
                    练习全部题目 · {s.questions.length} 题
                  </button>
                  <button onClick={() => start(due)} disabled={!due.length}>
                    只练今日复习 · {due.length} 题
                  </button>
                </div>
                <div className="cards">
                  {Object.entries(labels).map(([type, label]) => (
                    <div className="panel" key={type}>
                      <h3>{label}</h3>
                      <p>
                        {s.questions.filter((q) => q.type === type).length} 道题
                      </p>
                      <button
                        disabled={!s.questions.some((q) => q.type === type)}
                        onClick={() =>
                          start(s.questions.filter((q) => q.type === type))
                        }
                      >
                        开始练习 →
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {page === "review" && (
          <>
            <Title
              eyebrow="RETURN & REMEMBER"
              title="错题与间隔复习"
              text="复习计划与背单词同步：标记认识后按 1、3、7、14、30 天安排；再学一次则安排次日复习。选择题记录单独保留。"
            />
            <WordPlanSummary state={s} />
            <div className="panel">
              <h2>今日待复习 · {dueWords.length} 张词卡</h2>
              <p>包含已到期和逾期的词卡。背词后会自动更新下次复习日期。</p>
              <button
                className="primary"
                disabled={!dueWords.length}
                onClick={openWordReview}
              >
                开始背词复习
              </button>
            </div>
            <h2>复习计划</h2>
            {plan.length ? (
              plan.map((p) => (
                <div className="schedule" key={p.knowledge.id}>
                  <span>
                    <span lang="ar" dir="rtl">
                      {p.knowledge.arabic}
                    </span>{" "}
                    · {p.knowledge.meaning}
                  </span>
                  <span>
                    {p.due} · {p.overdue ? "待复习" : "已安排"} · 第{" "}
                    {p.stage + 1} 阶段
                  </span>
                </div>
              ))
            ) : (
              <Empty text="还没有背词记录。开始背单词并标记掌握情况后，这里会自动生成复习计划。" />
            )}
            <div className="panel">
              <h2>选择题复习 · {due.length} 题</h2>
              <button
                className="primary"
                disabled={!due.length}
                onClick={() => start(due)}
              >
                开始复习
              </button>
              <button disabled={!wrong.length} onClick={() => start(wrong)}>
                重练历史错题 · {wrong.length} 题
              </button>
            </div>
            <h2>错题记录</h2>
            {wrong.length ? (
              wrong.map((q) => (
                <div className="review-row" key={q.id}>
                  <span className="tag">{labels[q.type]}</span>
                  <h3 dir="auto">{q.prompt}</h3>
                  <p>
                    上次答案：
                    <span dir="auto">
                      {s.progress[q.id].lastAnswer || "（未填写）"}
                    </span>
                  </p>
                  <p>
                    累计错误 {s.progress[q.id].errors} 次 · 下次复习{" "}
                    {s.progress[q.id].due} · 最近
                    {s.progress[q.id].lastCorrect ? "答对" : "待巩固"}
                  </p>
                  <details>
                    <summary>查看参考与解析</summary>
                    <p dir="auto">{q.answer}</p>
                    <p>{q.explanation}</p>
                  </details>
                </div>
              ))
            ) : (
              <Empty text="还没有错题，去智慧试炼检验一下自己的积累。" />
            )}
          </>
        )}
        {page === "import" && (
          <>
            <Title
              eyebrow="GATHER & PRESERVE"
              title="知识包与学习备份"
              text="把每天的答疑，带进你的智慧宫。"
            />
            <div className="two-cols">
              <section className="panel">
                <Upload size={28} />
                <h2>导入每日知识包</h2>
                <p>
                  上传 JSON → 校验结构 → 预览 → 确认导入。以稳定 ID
                  去重，默认保留已有内容。
                </p>
                <label className="file-button">
                  选择知识包
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      void read(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="links">
                  <a href="./examples/starter.json" download>
                    下载示例知识包
                  </a>
                  <a href="./examples/vocabulary.json" download>
                    深度词汇示例（10 类练习）
                  </a>
                  {bundledCollections.map((c) => (
                    <React.Fragment key={c.pack.id}>
                      <a href={`./packs/${c.download}.json`} download>
                        {c.title} · 已转换知识包
                      </a>
                      <a href={`./packs/${c.download}.report.json`} download>
                        {c.title} · 转换报告
                      </a>
                    </React.Fragment>
                  ))}
                  <a href="./knowledge-pack.schema.json" download>
                    JSON Schema
                  </a>
                </div>
              </section>
              <section className="panel">
                <h2>完整备份与恢复</h2>
                <p>
                  包含知识、题目、收藏、错题、答题历史和复习计划。请定期备份，清除浏览器数据会删除本地进度。
                </p>
                <button
                  onClick={() => download(s, `hikma-backup-${today()}.json`)}
                >
                  导出完整备份
                </button>
                <button
                  onClick={() => {
                    const raw = localStorage.getItem("hikma-v1");
                    download(raw ? { raw } : s, "hikma-raw-recovery.json");
                  }}
                >
                  导出原始存储（故障排查）
                </button>
                <label className="file-button secondary">
                  选择备份恢复
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      void read(e.target.files?.[0], true);
                      e.target.value = "";
                    }}
                  />
                </label>
              </section>
            </div>
            {pack && (
              <section className="panel">
                <h2>导入预览：{pack.title}</h2>
                <p>
                  {pack.knowledge.length} 个知识点，{pack.questions.length}{" "}
                  道题。已有知识 ID：
                  {
                    pack.knowledge.filter((k) =>
                      s.knowledge.some((x) => x.id === k.id),
                    ).length
                  }
                  ；已有题目 ID：
                  {
                    pack.questions.filter((q) =>
                      s.questions.some((x) => x.id === q.id),
                    ).length
                  }
                  。
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={update}
                    onChange={(e) => setUpdate(e.target.checked)}
                  />{" "}
                  更新相同 ID
                  的知识与题目（知识按字段补充，保留未提供内容与复习记录；题目整条更新）
                </label>
                <div className="preview-list">
                  {pack.knowledge.map((k) => (
                    <p key={k.id}>
                      <b lang="ar" dir="rtl">
                        {k.arabic}
                      </b>{" "}
                      · {k.meaning}{" "}
                      <small>
                        {s.knowledge.some((x) => x.id === k.id)
                          ? "已存在"
                          : "新增"}
                      </small>
                    </p>
                  ))}
                  {pack.questions.map((q) => (
                    <details key={q.id}>
                      <summary>
                        {labels[q.type]} · {q.prompt}
                      </summary>
                      <p dir="auto">参考：{q.answer}</p>
                      <p>{q.explanation}</p>
                    </details>
                  ))}
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    const n = pack.knowledge.filter(
                      (k) => !s.knowledge.some((x) => x.id === k.id),
                    ).length;
                    const nq = pack.questions.filter(
                      (q) => !s.questions.some((x) => x.id === q.id),
                    ).length;
                    if (!commit(mergePack(s, pack, update))) return;
                    setPack(null);
                    setNotice(
                      `导入完成：新增 ${n} 个知识点、${nq} 道题；${update ? "更新" : "保留"}相同 ID 内容。`,
                    );
                  }}
                >
                  确认导入
                </button>
                <button onClick={() => setPack(null)}>取消</button>
              </section>
            )}
            {backup && (
              <section className="panel">
                <h2>恢复预览</h2>
                <p>
                  {backup.knowledge.length} 个知识点、{backup.questions.length}{" "}
                  道题、{backup.history.length}{" "}
                  次练习。恢复会覆盖当前全部学习数据，请先导出当前备份。
                </p>
                <button
                  className="danger"
                  onClick={() => {
                    if (commit(backup)) setBackup(null);
                  }}
                >
                  确认覆盖并恢复
                </button>
                <button onClick={() => setBackup(null)}>取消</button>
              </section>
            )}
          </>
        )}
        <footer>
          <span>智慧宫 · بَيْتُ الْحِكْمَةِ</span>
          <span>每一份积累，都有回响。</span>
        </footer>
      </main>
      {detail && (
        <Modal close={() => setDetail(null)}>
          <span className="tag">
            {detail.category} · {detail.date}
          </span>
          <h2 className="arabic detail-ar" lang="ar" dir="rtl">
            {detail.arabic}
          </h2>
          <h2>{detail.meaning}</h2>
          <AudioTools text={detail.arabic} url={detail.audioUrl} />
          <Annotation
            id={detail.id}
            value={s.annotations?.[detail.id] || ""}
            save={(id, text) => commit(saveAnnotation(s, id, text))}
          />
          <VocabularyProfile
            key={detail.id}
            k={detail}
            knowledge={s.knowledge}
            questions={s.questions}
            open={setDetail}
            practice={(qs) => {
              start(qs);
              setDetail(null);
            }}
          />
          <div className="button-row">
            <button
              onClick={() => {
                setEditing(detail);
                setDetail(null);
              }}
            >
              编辑知识
            </button>
            <button
              onClick={() => {
                start(s.questions.filter((q) => q.knowledgeId === detail.id));
                setDetail(null);
              }}
            >
              练习相关题目
            </button>
            <button
              className="danger"
              onClick={() => {
                if (confirm("删除此知识及其关联题目、错题和复习记录？")) {
                  commit(removeKnowledge(s, detail.id));
                  setDetail(null);
                }
              }}
            >
              删除
            </button>
          </div>
        </Modal>
      )}
      {editing && (
        <Modal close={() => setEditing(null)}>
          <Editor
            initial={editing}
            cancel={() => setEditing(null)}
            save={(k) => {
              try {
                parsePack({
                  schemaVersion: 1,
                  id: "edit",
                  title: "edit",
                  knowledge: [k],
                  questions: [],
                });
                const ok = commit({
                  ...s,
                  knowledge: s.knowledge.some((x) => x.id === k.id)
                    ? s.knowledge.map((x) => (x.id === k.id ? k : x))
                    : [...s.knowledge, k],
                });
                if (ok) setEditing(null);
                return ok;
              } catch (e) {
                setNotice(String(e));
                return false;
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
function Stat({
  number,
  label,
  note,
}: {
  number: number;
  label: string;
  note: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{number.toString().padStart(2, "0")}</b>
      <small>{note}</small>
    </div>
  );
}
function Title({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <BookOpen size={30} />
      <p>{text}</p>
    </div>
  );
}
function Card({
  k,
  starred,
  open,
  star,
}: {
  k: Knowledge;
  starred: boolean;
  open: () => void;
  star: () => void;
}) {
  return (
    <article className="knowledge-card">
      <div className="card-top">
        <span className="tag">{k.category}</span>
        <button aria-label={starred ? "取消收藏" : "收藏"} onClick={star}>
          <Star size={17} fill={starred ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="card-content" onClick={open}>
        <h2 className="arabic" dir="rtl" lang="ar">
          {k.arabic}
        </h2>
        <h3>{k.meaning}</h3>
        <p>{k.form || "我的阿语积累"}</p>
      </button>
      <AudioTools text={k.arabic} url={k.audioUrl} />
      <div className="card-bottom">
        <small>{k.date}</small>
        <button onClick={open}>展开学习 ↗</button>
      </div>
    </article>
  );
}
function Modal({
  children,
  close,
}: {
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          "button,input,textarea,select,a[href],audio",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handler);
      prev?.focus();
    };
  }, []);
  return (
    <div className="overlay" onClick={close}>
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="知识详情与编辑"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" aria-label="关闭弹窗" onClick={close}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
function Editor({
  initial,
  save,
  cancel,
}: {
  initial: Knowledge;
  save: (k: Knowledge) => boolean;
  cancel: () => void;
}) {
  const [k, set] = useState(initial);
  const [examples, setExamples] = useState<NonNullable<Knowledge["examples"]>>(
    initial.examples || [],
  );
  const [error, setError] = useState("");
  const [vocabularyJSON, setVocabularyJSON] = useState(
    initial.vocabulary ? JSON.stringify(initial.vocabulary, null, 2) : "",
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const next = {
            ...k,
            examples,
            vocabulary: vocabularyJSON.trim()
              ? JSON.parse(vocabularyJSON)
              : undefined,
          };
          parsePack({
            schemaVersion: 1,
            id: "edit",
            title: "edit",
            knowledge: [next],
            questions: [],
          });
          if (!save(next))
            setError("保存失败，请检查浏览器存储空间并导出备份。");
        } catch (e) {
          setError(
            "校验失败：" +
              (e instanceof Error ? e.message : "例句必须是合法 JSON 数组"),
          );
        }
      }}
    >
      <h2>编辑知识</h2>
      <p className="muted">稳定 ID：{k.id}</p>
      {(
        [
          "arabic",
          "meaning",
          "root",
          "form",
          "category",
          "date",
          "grammar",
          "confusion",
          "scenario",
          "pauseNote",
          "audioUrl",
        ] as const
      ).map((key) => (
        <label className="field" key={key}>
          {
            {
              arabic: "阿语原文（请录入完整标符）",
              meaning: "中文释义",
              root: "词根",
              form: "构词形式",
              category: "知识分类",
              date: "学习日期",
              grammar: "语法说明",
              confusion: "易混词辨析",
              scenario: "场景及口译提示",
              pauseNote: "停顿与连读说明",
              audioUrl: "真人音频 HTTPS 地址（可选）",
            }[key]
          }
          <input
            required={["arabic", "meaning", "category", "date"].includes(key)}
            type={key === "date" ? "date" : "text"}
            dir={key === "arabic" ? "rtl" : "auto"}
            value={k[key] || ""}
            onChange={(e) => set({ ...k, [key]: e.target.value })}
          />
        </label>
      ))}
      <label className="field">
        常见搭配（每行一条）
        <textarea
          dir="auto"
          value={k.collocations?.join("\n") || ""}
          onChange={(e) =>
            set({
              ...k,
              collocations: e.target.value.split("\n").filter(Boolean),
            })
          }
        />
      </label>
      <fieldset>
        <legend>动词变化（可选，可逐步补充）</legend>
        {(
          [
            "past",
            "present",
            "imperative",
            "masdar",
            "activeParticiple",
            "passiveParticiple",
          ] as const
        ).map((key, i) => (
          <label className="field" key={key}>
            {
              ["过去式", "现在式", "命令式", "动名词", "主动分词", "被动分词"][
                i
              ]
            }
            <input
              dir="rtl"
              value={k.verb?.[key] || ""}
              onChange={(e) => {
                const verb = {
                  ...k.verb,
                  [key]: e.target.value,
                };
                set({
                  ...k,
                  verb: Object.values(verb).some(Boolean) ? verb : undefined,
                });
              }}
            />
          </label>
        ))}
      </fieldset>
      <details className="editor-enrichment">
        <summary>深度词汇档案 · 逐步补充</summary>
        <p className="muted">
          可填词性、音译、名词变化、词族、近反义词、中文搭配与使用提示。只填写已确认资料。不适用的形态使用
          applicable: false；其他未知字段可省略。
        </p>
        <a href="./examples/vocabulary.json" download>
          下载完整字段示例
        </a>
        <label className="field">
          深度词汇档案 JSON（仅 vocabulary 对象）
          <textarea
            rows={14}
            spellCheck={false}
            value={vocabularyJSON}
            onChange={(e) => setVocabularyJSON(e.target.value)}
            placeholder={'{"partOfSpeech":"动词","variety":"现代标准阿拉伯语"}'}
          />
        </label>
      </details>
      <fieldset>
        <legend>双语例句</legend>
        {examples.map((ex, i) => (
          <div key={i}>
            <label className="field">
              例句 {i + 1} · 阿语
              <textarea
                dir="rtl"
                lang="ar"
                value={ex.arabic}
                required
                onChange={(e) =>
                  setExamples(
                    examples.map((x, n) =>
                      n === i ? { ...x, arabic: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <label className="field">
              例句 {i + 1} · 中文
              <input
                value={ex.chinese}
                required
                onChange={(e) =>
                  setExamples(
                    examples.map((x, n) =>
                      n === i ? { ...x, chinese: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <label className="field">
              例句 {i + 1} · 语境
              <input
                value={ex.context || ""}
                onChange={(e) =>
                  setExamples(
                    examples.map((x, n) =>
                      n === i ? { ...x, context: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <label className="field">
              例句 {i + 1} · 语言变体
              <input
                value={ex.variety || ""}
                onChange={(e) =>
                  setExamples(
                    examples.map((x, n) =>
                      n === i ? { ...x, variety: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              onClick={() => setExamples(examples.filter((_, n) => n !== i))}
            >
              移除此例句
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setExamples([...examples, { arabic: "", chinese: "" }])
          }
        >
          ＋ 添加双语例句
        </button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button className="primary" type="submit">
        保存知识
      </button>
      <button type="button" onClick={cancel}>
        取消
      </button>
    </form>
  );
}
function Practice({
  questions,
  knowledge,
  open,
  submit,
  finish,
}: {
  questions: Question[];
  knowledge: Knowledge[];
  open: (k: Knowledge) => void;
  submit: (q: Question, a: string, c: boolean) => boolean;
  finish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [shown, setShown] = useState(false);
  const [graded, setGraded] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const q = questions[index];
  React.useEffect(() => {
    setOptions(q?.options ? shuffle(q.options) : []);
  }, [q?.id]);
  if (!q)
    return (
      <div className="panel">
        <Check />
        <h2>{questions.length ? "本轮练习完成" : "暂无可练习题目"}</h2>
        <p>
          完成 {questions.length} 题，掌握 {score}{" "}
          题。复习计划已按每道题的表现更新。
        </p>
        <button onClick={finish}>返回练习选择</button>
      </div>
    );
  const knowledgePoint = knowledge.find((k) => k.id === q.knowledgeId);
  function grade(c: boolean) {
    if (graded !== null) return false;
    if (!submit(q, answer, c)) return false;
    setGraded(c);
    if (c) setScore((n) => n + 1);
    return true;
  }
  return (
    <section className="practice panel">
      <div className="practice-top">
        <span className="tag">{labels[q.type]}</span>
        <span>
          {index + 1} / {questions.length}
        </span>
      </div>
      <progress value={index} max={questions.length} />
      <h2 dir="auto">{q.prompt}</h2>
      {knowledgePoint && (
        <button className="text-button" onClick={() => open(knowledgePoint)}>
          关联知识：{knowledgePoint.meaning}
        </button>
      )}
      <div className="answers">
        {options.map((a) => (
          <button
            key={a}
            disabled={shown}
            className={answer === a ? "selected" : ""}
            dir="auto"
            onClick={() => setAnswer(a)}
          >
            {a}
          </button>
        ))}
      </div>
      {!shown && (
        <button
          className="primary"
          disabled={!answer.trim()}
          onClick={() => {
            if (!grade(answer === q.answer)) return;
            setShown(true);
          }}
        >
          提交答案
        </button>
      )}
      {shown && (
        <div className="feedback">
          <h3>{graded ? "✓ 已掌握" : "继续巩固，下次会更熟悉"}</h3>
          <p dir="auto">参考答案：{q.answer}</p>
          <p>{q.explanation}</p>
          {q.rubric && (
            <ul>
              {q.rubric.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
          {graded !== null && (
            <button
              className="primary"
              onClick={() => {
                setIndex(index + 1);
                setAnswer("");
                setShown(false);
                setGraded(null);
              }}
            >
              下一题 →
            </button>
          )}
        </div>
      )}
      <button className="text-button" onClick={finish}>
        结束本轮
      </button>
    </section>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
