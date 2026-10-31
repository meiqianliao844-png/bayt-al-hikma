import type { Knowledge, Pack, State } from "./core";
const norm = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .trim()
    .replace(/\s+/g, " ");
function key(value: unknown): string {
  if (typeof value === "string") return norm(value);
  const o = value as Record<string, unknown>;
  if (o?.arabic)
    return `${norm(String(o.arabic))}|${o.relation || o.kind || ""}`;
  if (o?.plural && o.singular)
    return `${norm(String(o.plural))}|${norm(String(o.singular))}`;
  if (o?.pronoun) return String(o.pronoun);
  if (o?.label) return String(o.label);
  return JSON.stringify(value);
}
/** Fill missing data and append distinct arrays; existing personal text always wins. */
export function supplementMissing(old: unknown, incoming: unknown): unknown {
  if (old === undefined || old === null || old === "") return incoming;
  if (Array.isArray(old) && Array.isArray(incoming)) {
    const result = [...old],
      seen = new Map(result.map((v, i) => [key(v), i]));
    for (const item of incoming) {
      const at = seen.get(key(item));
      if (at === undefined) {
        seen.set(key(item), result.length);
        result.push(item);
      } else result[at] = supplementMissing(result[at], item);
    }
    return result;
  }
  if (
    old &&
    incoming &&
    typeof old === "object" &&
    typeof incoming === "object" &&
    !Array.isArray(old) &&
    !Array.isArray(incoming)
  ) {
    const out = { ...old } as Record<string, unknown>;
    for (const [k, v] of Object.entries(incoming))
      if (!["__proto__", "constructor", "prototype"].includes(k))
        out[k] = supplementMissing(out[k], v);
    return out;
  }
  return old;
}
export function installSupplement(state: State, pack: Pack): State {
  const items = new Map(state.knowledge.map((k) => [k.id, k]));
  const aliases = new Map<string, string>();
  const signature = (k: Knowledge) => `${norm(k.arabic)}|${norm(k.meaning)}`;
  for (const incoming of pack.knowledge) {
    let old = items.get(incoming.id);
    if (!old && !incoming.id.startsWith(pack.id + "-")) continue; // Respect previously deleted canonical cards.
    if (!old)
      old = [...items.values()].find(
        (k) => signature(k) === signature(incoming),
      );
    const canonical = old?.id || incoming.id;
    aliases.set(incoming.id, canonical);
    items.set(
      canonical,
      old ? (supplementMissing(old, incoming) as Knowledge) : incoming,
    );
  }
  const questions = new Map(state.questions.map((q) => [q.id, q]));
  const fingerprint = (q: Pack["questions"][number]) =>
    [q.knowledgeId, q.type, norm(q.prompt), norm(q.answer)].join("|");
  const seen = new Set(state.questions.map(fingerprint));
  for (const source of pack.questions) {
    const knowledgeId = aliases.get(source.knowledgeId) || source.knowledgeId;
    if (!items.has(knowledgeId) || questions.has(source.id)) continue;
    const q = { ...source, knowledgeId };
    const f = fingerprint(q);
    if (!seen.has(f)) {
      questions.set(q.id, q);
      seen.add(f);
    }
  }
  return {
    ...state,
    knowledge: [...items.values()],
    questions: [...questions.values()],
  };
}
