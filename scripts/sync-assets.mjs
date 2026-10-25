import { copyFileSync } from "node:fs";
// Keep downloads identical to the schemas and initial data actually used by the app.
copyFileSync(
  new URL("../src/knowledge-pack.schema.json", import.meta.url),
  new URL("../public/knowledge-pack.schema.json", import.meta.url),
);
copyFileSync(
  new URL("../src/seed.json", import.meta.url),
  new URL("../public/examples/starter.json", import.meta.url),
);
