import {
  bundledCollections,
  bundledFoldable,
  bundledExpressions,
} from "./core";
import type { Knowledge } from "./core";
export type StudyTopic = {
  id: string;
  title: string;
  query: string;
  ids: Set<string>;
};
/** Membership uses stable card IDs, so reused words can belong to several topics. */
export function studyTopics(knowledge: Knowledge[]): StudyTopic[] {
  const existing = new Set(knowledge.map((k) => k.id));
  const topics = bundledCollections.map((c) => ({
    id: c.pack.id,
    title: c.title,
    query: c.searchQuery || c.pack.title,
    ids: new Set(
      [
        ...c.pack.knowledge,
        ...(c.pack.id === bundledFoldable.id
          ? bundledExpressions.knowledge
          : []),
      ]
        .map((k) => k.id)
        .filter((id) => existing.has(id)),
    ),
  }));
  const assigned = new Set(topics.flatMap((t) => [...t.ids]));
  for (const category of new Set(
    knowledge.filter((k) => !assigned.has(k.id)).map((k) => k.category),
  ))
    topics.push({
      id: "category:" + category,
      title: category,
      query: "",
      ids: new Set(
        knowledge.filter((k) => k.category === category).map((k) => k.id),
      ),
    });
  return topics.filter((t) => t.ids.size);
}
export function savedStudyTopic(topics: StudyTopic[]) {
  try {
    const id = localStorage.getItem("hikma-word-topic") || "";
    return topics.some((t) => t.id === id) ? id : "";
  } catch {
    return "";
  }
}
export function saveStudyTopic(id: string) {
  try {
    localStorage.setItem("hikma-word-topic", id);
  } catch {
    /* Learning remains usable if preferences cannot be stored. */
  }
}
