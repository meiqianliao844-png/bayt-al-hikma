import type { State } from "./core";
import { wordReviewPlan } from "./study";
export function WordPlanSummary({ state }: { state: State }) {
  const plan = wordReviewPlan(state);
  const due = plan.filter((p) => p.overdue).length;
  const future = plan.length - due;
  const next = plan.find((p) => !p.overdue)?.due;
  return (
    <section className="panel" aria-label="背词复习进度">
      <h2>背词复习进度</h2>
      <p>
        已背词卡 {plan.length} 张 · 今日到期 {due} 张 · 未来已安排 {future} 张
      </p>
      <p className="muted">
        {!plan.length
          ? "标记认识或再学一次后，将自动保存并安排复习。"
          : due
            ? "今日到期包含逾期未复习的词卡。完成背词复习后自动更新计划。"
            : "背词记录已保存，今天没有到期词卡。首次学习的词安排次日复习。"}
        {next ? ` 下次复习日期：${next}。` : ""}
      </p>
    </section>
  );
}
