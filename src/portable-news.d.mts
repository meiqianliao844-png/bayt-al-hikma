import type { Pack } from "./core";
export function isPortableNews(data: unknown): boolean;
export function convertPortableNews(data: unknown): {
  pack: Pack;
  report: {
    sourceSchema: string;
    targetSchemaVersion: number;
    namespace: string;
    sourceTitle: string;
    counts: {
      verbs: number;
      terms: number;
      knowledge: number;
      questions: number;
    };
    notes: { sourceId: string; field: string; note: string }[];
    sourceNote: string;
    generation: string;
  };
};
