import type { Knowledge } from "./core";
export function NounNumbers({ k }: { k: Knowledge }) {
  const noun = k.vocabulary?.noun;
  const pairs = noun?.numberPairs || [];
  if (!pairs.length && !noun?.plurals?.length) return null;
  return (
    <section className="noun-numbers" aria-label="名词单复数">
      <h3>{k.verb ? "例句名词：单数 ↔ 复数" : "单数 ↔ 复数"}</h3>
      {pairs.length
        ? pairs.map((p, i) => (
            <div key={i} className="number-pair">
              <span>{p.chinese}</span>
              <span lang="ar" dir="rtl">
                {p.singular} ↔ {p.plural}
              </span>
              {p.note && <small>{p.note}</small>}
            </div>
          ))
        : noun?.plurals?.map((p, i) => (
            <div className="number-pair" key={i}>
              <span lang="ar" dir="rtl">
                {noun.singular || "单数待补充"} ↔ {p.arabic}
              </span>
            </div>
          ))}
    </section>
  );
}
