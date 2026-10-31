/** Optional enrichment; v1 records and progress remain unchanged. Arabic forms are
 * curated input, never inferred by mechanically combining roots and patterns. */
export type Lexeme = { arabic: string; chinese: string; knowledgeId?: string };
export type FamilyMember = Lexeme & {
  partOfSpeech?: string;
  commonness?: "common" | "rare";
  note?: string;
};
export type LexicalRelation = Lexeme & {
  relation:
    "synonym" | "near-synonym" | "related" | "antonym" | "semantic-opposite";
  distinction: string;
  variety?: string;
};
export type VerbForms = {
  applicable?: boolean;
  note?: string;
  past?: string;
  present?: string;
  imperative?: string;
  masdar?: string;
  activeParticiple?: string;
  passiveParticiple?: string;
  conjugations?: {
    pronoun: string;
    past?: string;
    present?: string;
    imperative?: string;
    note?: string;
  }[];
};
export type NounNumberPair = {
  singular: string;
  plural: string;
  chinese?: string;
  note?: string;
};
export type NounForms = {
  numberPairs?: NounNumberPair[];
  applicable?: boolean;
  note?: string;
  singular?: string;
  dual?: string;
  plurals?: {
    arabic: string;
    kind: "sound-masculine" | "sound-feminine" | "broken" | "other";
    note?: string;
  }[];
  gender?: string;
  masculine?: string;
  feminine?: string;
  derivatives?: FamilyMember[];
};
export type Vocabulary = {
  partOfSpeech?: string;
  transliteration?: string;
  variety?: string;
  noun?: NounForms;
  family?: FamilyMember[];
  relations?: LexicalRelation[];
  phrases?: (Lexeme & {
    kind: "verb-preposition" | "phrase" | "idiom";
    note?: string;
  })[];
  contrasts?: {
    arabic: string;
    chinese: string;
    interchangeable?: string;
    notInterchangeable?: string;
  }[];
  usage?: {
    register?: string;
    frequency?: string;
    mistakes?: string[];
    interpretation?: string;
    note?: string;
  };
  sources?: { label: string; url?: string; note?: string }[];
};
export const questionLabels: Record<string, string> = {
  "zh-ar": "中文选阿语",
  "ar-choice": "阿语选中文",
  "zh-fill": "中译阿选择",
  "ar-zh": "阿译中",
  preposition: "介词与搭配",
  grammar: "语法纠错",
  synonym: "近义词辨析",
  interpretation: "口译情景",
  conjugation: "动词变位",
  "noun-number": "单复数转换",
  root: "词根识别",
  derivation: "派生词辨析",
  antonym: "反义词匹配",
  "context-fill": "例句语境填空",
};
export const relationLabels = {
  synonym: "严格近义词",
  "near-synonym": "近义词（有差别）",
  related: "相关词（非近义词）",
  antonym: "严格反义词",
  "semantic-opposite": "语义对立（非严格反义词）",
};
