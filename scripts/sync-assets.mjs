import { copyFileSync, mkdirSync } from "node:fs";
// Keep downloads identical to the schemas and initial data actually used by the app.
copyFileSync(
  new URL("../src/knowledge-pack.schema.json", import.meta.url),
  new URL("../public/knowledge-pack.schema.json", import.meta.url),
);
copyFileSync(
  new URL("../src/seed.json", import.meta.url),
  new URL("../public/examples/starter.json", import.meta.url),
);
copyFileSync(
  new URL("../src/vocabulary-sample.json", import.meta.url),
  new URL("../public/examples/vocabulary.json", import.meta.url),
);

mkdirSync(new URL("../public/packs/", import.meta.url), { recursive: true });
for (const name of [
  "azerbaijan-school-uniform.json",
  "azerbaijan-school-uniform.report.json",
  "shared-future.json",
  "shared-future.report.json",
  "arabic-literature-lesson-01.json",
  "arabic-literature-lesson-01.report.json",
  "foldable-expressions.json",
  "foldable-expressions.report.json",
  "foldable-tech.json",
  "foldable-tech.report.json",
  "spongebob-mystery-02.json",
  "spongebob-mystery-02.report.json",
  "spongebob-mystery-01.json",
  "spongebob-mystery-01.report.json",
  "spongebob-01.json",
  "spongebob-01.report.json",
]) {
  copyFileSync(
    new URL(`../src/data/${name}`, import.meta.url),
    new URL(`../public/packs/${name}`, import.meta.url),
  );
}
