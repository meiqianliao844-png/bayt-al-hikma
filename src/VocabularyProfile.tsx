import { AskGPT } from "./AskGPT";
import { NounNumbers } from "./NounNumbers";
import { useState } from "react";
import { AudioTools } from "./Audio";
import type { Knowledge, Question } from "./core";
import { questionLabels, relationLabels } from "./vocabulary";
import type { FamilyMember, LexicalRelation } from "./vocabulary";

const tabs = [
  "基本释义",
  "词形变化",
  "词根词族",
  "近反义词",
  "固定搭配",
  "例句",
  "易混辨析",
  "练习",
];
const pending = "尚未补充";
function Field({
  label,
  value,
  arabic = false,
}: {
  label: string;
  value?: string;
  arabic?: boolean;
}) {
  return (
    <div className="profile-field">
      <dt>{label}</dt>
      <dd
        dir={arabic ? "rtl" : "auto"}
        lang={arabic ? "ar" : undefined}
        className={arabic ? "arabic" : undefined}
      >
        {value || pending}
      </dd>
    </div>
  );
}
function Spoken({ text }: { text: string }) {
  return (
    <>
      <p className="arabic" lang="ar" dir="rtl">
        {text}
      </p>
      <AudioTools text={text} />
    </>
  );
}
export function VocabularyProfile({
  k,
  knowledge,
  questions,
  open,
  practice,
}: {
  k: Knowledge;
  knowledge: Knowledge[];
  questions: Question[];
  open: (k: Knowledge) => void;
  practice: (q: Question[]) => void;
}) {
  const [tab, setTab] = useState(0);
  const v = k.vocabulary;
  const related = questions.filter((q) => q.knowledgeId === k.id);
  function Link({ item }: { item: FamilyMember | LexicalRelation }) {
    const target = item.knowledgeId
      ? knowledge.find((x) => x.id === item.knowledgeId)
      : knowledge.find((x) => x.arabic === item.arabic);
    return (
      <div className="lexeme-heading">
        {target ? (
          <button
            className="arabic profile-link"
            dir="rtl"
            lang="ar"
            onClick={() => open(target)}
          >
            {item.arabic} ↗
          </button>
        ) : (
          <span className="arabic" dir="rtl" lang="ar">
            {item.arabic}
          </span>
        )}
        <span>{item.chinese}</span>
        {item.knowledgeId && !target && <small>关联档案尚未导入</small>}
      </div>
    );
  }
  function Family({ items }: { items?: FamilyMember[] }) {
    return items?.length ? (
      items.map((x, i) => (
        <article className="profile-entry" key={i}>
          <Link item={x} />
          <p className="muted">
            {x.partOfSpeech} ·{" "}
            {x.commonness === "rare"
              ? "罕见派生词"
              : x.commonness === "common"
                ? "常用词"
                : "频率未标注"}
          </p>
          {x.note && <p>{x.note}</p>}
          <AudioTools text={x.arabic} />
        </article>
      ))
    ) : (
      <p className="muted">{pending}。未自动推导或编造同根词。</p>
    );
  }
  return (
    <section className="vocabulary-profile">
      <AskGPT key={k.id} k={k} />
      <div className="profile-tabs" role="tablist" aria-label="词汇档案">
        {tabs.map((name, i) => (
          <button
            key={name}
            id={`profile-tab-${i}`}
            role="tab"
            aria-selected={tab === i}
            aria-controls="profile-panel"
            tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i)}
            onKeyDown={(e) => {
              let next = tab;
              if (e.key === "ArrowRight") next = (tab + 1) % tabs.length;
              else if (e.key === "ArrowLeft")
                next = (tab + tabs.length - 1) % tabs.length;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = tabs.length - 1;
              else return;
              e.preventDefault();
              setTab(next);
              document.getElementById(`profile-tab-${next}`)?.focus();
            }}
          >
            {name}
            {i === 7 ? ` · ${related.length}` : ""}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="profile-panel"
        aria-labelledby={`profile-tab-${tab}`}
        tabIndex={0}
      >
        {tab === 0 && (
          <>
            <NounNumbers k={k} />
            <dl className="profile-grid">
              <Field label="词性" value={v?.partOfSpeech} />
              <Field label="词根" value={k.root} arabic />
              <Field label="构词形式" value={k.form} />
              <Field label="音译（辅助读音）" value={v?.transliteration} />
              <Field label="语言变体" value={v?.variety} />
              <Field label="语体" value={v?.usage?.register} />
              <Field label="使用频率" value={v?.usage?.frequency} />
            </dl>
            <dl>
              <Field label="语法说明" value={k.grammar} />
              <Field
                label="使用场景与口译提示"
                value={v?.usage?.interpretation || k.scenario}
              />
              <Field label="停顿与连读" value={k.pauseNote} />
            </dl>
            {v?.usage?.mistakes?.length ? (
              <details open>
                <summary>常见错误</summary>
                <ul>
                  {v.usage.mistakes.map((m, i) => (
                    <li dir="auto" key={i}>
                      {m}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {v?.usage?.note && <p>{v.usage.note}</p>}
            <p className="muted">
              音译仅作辅助；请以完整标符与原音为准。留空表示资料待补充，不代表“不适用”。
            </p>
            {v?.sources?.length ? (
              <details>
                <summary>资料与核对说明</summary>
                {v.sources.map((s, i) => (
                  <p key={i}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.label}
                      </a>
                    ) : (
                      s.label
                    )}
                    {s.note && ` · ${s.note}`}
                  </p>
                ))}
              </details>
            ) : null}
          </>
        )}
        {tab === 1 && (
          <>
            <NounNumbers k={k} />
            <h3>动词变化</h3>
            {k.verb?.applicable === false ? (
              <p>不适用。{k.verb.note}</p>
            ) : (
              <>
                <p className="muted">
                  {k.verb?.note ||
                    "基本词形通常使用第三人称阳性单数；命令式通常为第二人称阳性单数。无命令式的人称不补造词形。"}
                </p>
                <dl className="profile-grid">
                  {(
                    [
                      ["past", "过去式"],
                      ["present", "现在式"],
                      ["imperative", "命令式"],
                      ["masdar", "动名词"],
                      ["activeParticiple", "主动分词"],
                      ["passiveParticiple", "被动分词"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      value={k.verb?.[key]}
                      arabic
                    />
                  ))}
                </dl>
                {k.verb?.conjugations?.length ? (
                  <div className="profile-table-wrap">
                    <table>
                      <caption>常见人称变位</caption>
                      <thead>
                        <tr>
                          <th>人称</th>
                          <th>过去式</th>
                          <th>现在式</th>
                          <th>命令式</th>
                          <th>说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {k.verb.conjugations.map((c, i) => (
                          <tr key={i}>
                            <th className="arabic" lang="ar" dir="rtl">
                              {c.pronoun}
                            </th>
                            {(["past", "present", "imperative"] as const).map(
                              (f) => (
                                <td
                                  key={f}
                                  className="arabic"
                                  lang="ar"
                                  dir="rtl"
                                >
                                  {c[f] || pending}
                                </td>
                              ),
                            )}
                            <td>{c.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">人称变位尚未补充。</p>
                )}
              </>
            )}
            <h3>名词 / 形容词变化</h3>
            {v?.noun?.applicable === false ? (
              <p>不适用。{v.noun.note}</p>
            ) : (
              <>
                <p>{v?.noun?.note}</p>
                <dl className="profile-grid">
                  {(
                    [
                      ["singular", "单数"],
                      ["dual", "双数（默认主格）"],
                      ["gender", "阴阳性"],
                      ["masculine", "阳性"],
                      ["feminine", "阴性"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      value={v?.noun?.[key]}
                      arabic={key !== "gender"}
                    />
                  ))}
                </dl>
                <h4>复数形式</h4>
                {v?.noun?.plurals?.length ? (
                  v.noun.plurals.map((p, i) => (
                    <div className="profile-entry" key={i}>
                      <span className="tag">
                        {
                          {
                            broken: "破碎复数",
                            "sound-masculine": "规则阳性复数",
                            "sound-feminine": "规则阴性复数",
                            other: "其他",
                          }[p.kind]
                        }
                      </span>
                      <Spoken text={p.arabic} />
                      <p>{p.note}</p>
                    </div>
                  ))
                ) : (
                  <p className="muted">{pending}</p>
                )}
                <details>
                  <summary>常见派生形式</summary>
                  <Family items={v?.noun?.derivatives} />
                </details>
              </>
            )}
          </>
        )}
        {tab === 2 && (
          <>
            <h3>词根词族 · {k.root || pending}</h3>
            <p className="muted">
              同根并不等于同义。点击已有知识档案可跳转；未收录的词形只展示，不生成虚构页面。
            </p>
            <Family items={v?.family} />
          </>
        )}
        {tab === 3 && (
          <>
            <p className="muted">
              区分可替换的近义表达、相关词和语义对立；有差别的词不视作严格同义词。
            </p>
            {["近义与相关词", "反义与语义对立"].map((heading, n) => (
              <section key={heading}>
                <h3>{heading}</h3>
                {v?.relations
                  ?.filter((x) =>
                    n
                      ? ["antonym", "semantic-opposite"].includes(x.relation)
                      : !["antonym", "semantic-opposite"].includes(x.relation),
                  )
                  .map((x, i) => (
                    <article className="profile-entry" key={i}>
                      <span className="tag">{relationLabels[x.relation]}</span>
                      <Link item={x} />
                      <p>{x.distinction}</p>
                      {x.variety && <small>{x.variety}</small>}
                      <AudioTools text={x.arabic} />
                    </article>
                  ))}
                {!v?.relations?.some((x) =>
                  n
                    ? ["antonym", "semantic-opposite"].includes(x.relation)
                    : !["antonym", "semantic-opposite"].includes(x.relation),
                ) && (
                  <p className="muted">
                    尚未收录经核对的条目；不据此判断该词存在或不存在严格近反义词。
                  </p>
                )}
              </section>
            ))}
          </>
        )}
        {tab === 4 && (
          <>
            {k.collocations?.map((c, i) => (
              <div className="profile-entry" key={`old-${i}`}>
                <span className="tag">原有搭配</span>
                <Spoken text={c} />
                <small>中文释义尚未补充</small>
              </div>
            ))}
            {v?.phrases?.map((p, i) => (
              <div className="profile-entry" key={i}>
                <span className="tag">
                  {
                    {
                      "verb-preposition": "动词＋介词",
                      phrase: "常用词组",
                      idiom: "惯用表达",
                    }[p.kind]
                  }
                </span>
                <Spoken text={p.arabic} />
                <p>{p.chinese}</p>
                <p className="muted">{p.note}</p>
              </div>
            ))}
            {!k.collocations?.length && !v?.phrases?.length && <p>{pending}</p>}
          </>
        )}
        {tab === 5 && (
          <>
            {k.examples?.map((ex, i) => (
              <article className="example" key={i}>
                {ex.context && <span className="tag">{ex.context}</span>}
                <p className="arabic" dir="rtl" lang="ar">
                  {ex.arabic}
                </p>
                <p>{ex.chinese}</p>
                {ex.variety && <small>{ex.variety}</small>}
                <AudioTools text={ex.arabic} url={ex.audioUrl} />
              </article>
            ))}
            {!k.examples?.length && (
              <p>{pending}。不为凑齐场景而编造不自然的例句。</p>
            )}
          </>
        )}
        {tab === 6 && (
          <>
            {k.confusion && <p>{k.confusion}</p>}
            {v?.contrasts?.map((c, i) => (
              <div className="profile-entry" key={i}>
                <Spoken text={c.arabic} />
                <p>{c.chinese}</p>
                <dl>
                  <Field label="何时可互换" value={c.interchangeable} />
                  <Field label="何时不可互换" value={c.notInterchangeable} />
                </dl>
              </div>
            ))}
            {!k.confusion && !v?.contrasts?.length && <p>{pending}</p>}
          </>
        )}
        {tab === 7 && (
          <>
            <p>练习均关联当前知识点，全部为点选题，不需要输入答案。</p>
            <button
              className="primary"
              disabled={!related.length}
              onClick={() => practice(related)}
            >
              练习本词 · {related.length} 题
            </button>
            {related.map((q) => (
              <details key={q.id}>
                <summary>
                  {questionLabels[q.type]} · <span dir="auto">{q.prompt}</span>
                </summary>
                <p dir="auto">参考答案：{q.answer}</p>
                <p>{q.explanation}</p>
                {q.rubric?.map((r, i) => (
                  <p key={i}>{r}</p>
                ))}
              </details>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
