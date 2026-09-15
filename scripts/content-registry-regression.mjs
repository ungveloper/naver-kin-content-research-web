import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CONTENT_REGISTRY_COLLECTIONS,
  extractKinDocId,
  normalizeRegistryTitle,
} from "./content-registry.mjs";

assert.deepEqual(CONTENT_REGISTRY_COLLECTIONS, {
  questions: "kinQuestions",
  articles: "contentArticles",
  relations: "questionArticleRelations",
});

assert.equal(
  extractKinDocId(
    "https://kin.naver.com/qna/detail.naver?dirId=50203&docId=494695482",
  ),
  "494695482",
);

assert.equal(
  normalizeRegistryTitle("  에어팟프로2   페어링  "),
  "에어팟프로2 페어링",
);

const seed = JSON.parse(
  fs.readFileSync(
    new URL("../data/content-registry-seed-20260915.json", import.meta.url),
    "utf8",
  ),
);

const published = seed.filter((item) => item.status === "published");
const hold = seed.filter((item) => item.status === "hold");

assert.equal(seed.length, 17);
assert.equal(published.length, 12);
assert.equal(hold.length, 5);

assert.equal(
  new Set(seed.map((item) => item.kin_doc_id)).size,
  17,
);
assert.equal(
  new Set(published.map((item) => item.wordpress_url)).size,
  12,
);
assert.equal(
  new Set(published.map((item) => item.slug)).size,
  12,
);

assert.ok(
  published.every((item) => item.wordpress_url && item.slug),
);
assert.ok(
  hold.every((item) => !item.wordpress_url && !item.slug),
);

assert.ok(
  published.some((item) => item.kin_doc_id === "494823020"),
);
assert.ok(
  hold.some((item) => item.kin_doc_id === "493369291"),
);

const runner = fs.readFileSync(
  new URL("./seed-content-registry.mjs", import.meta.url),
  "utf8",
);

assert.match(
  runner,
  /content-registry-seed-20260915\.json/,
);
assert.match(runner, /seed:published/);
assert.match(runner, /seed:hold/);

const registrySource = fs.readFileSync(
  new URL("./content-registry.mjs", import.meta.url),
  "utf8",
);

assert.match(registrySource, /registryStatus:\s*status/);
assert.match(registrySource, /relationType:\s*"hold"/);

const monitor = fs.readFileSync(
  new URL("./kin-life-guide-monitor.mjs", import.meta.url),
  "utf8",
);

assert.match(
  monitor,
  /Firestore 콘텐츠 레지스트리에 이미 있어 제외/,
);
assert.doesNotMatch(
  monitor,
  /Supabase 콘텐츠 레지스트리/,
);

const workflow = fs.readFileSync(
  new URL(
    "../.github/workflows/kin-life-guide-monitor.yml",
    import.meta.url,
  ),
  "utf8",
);

assert.match(
  workflow,
  /FIREBASE_SERVICE_ACCOUNT_JSON:\s*\$\{\{\s*secrets\.FIREBASE_SERVICE_ACCOUNT_JSON\s*\}\}/,
);
assert.doesNotMatch(workflow, /SUPABASE_/);

console.log(
  "Firestore 콘텐츠 레지스트리 회귀 테스트 통과: "
  + "질문 17개(정상 발행 12 + 보류 5) + 3 collections + exact gate",
);
