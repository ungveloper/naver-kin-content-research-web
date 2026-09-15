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
    new URL("../data/content-registry-seed-20260914.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(seed.length, 11);
assert.equal(new Set(seed.map((item) => item.kin_doc_id)).size, 11);
assert.equal(new Set(seed.map((item) => item.wordpress_url)).size, 11);
assert.equal(new Set(seed.map((item) => item.slug)).size, 11);

const monitor = fs.readFileSync(
  new URL("./kin-life-guide-monitor.mjs", import.meta.url),
  "utf8",
);

assert.match(monitor, /Firestore 콘텐츠 레지스트리에 이미 있어 제외/);
assert.doesNotMatch(monitor, /Supabase 콘텐츠 레지스트리/);

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
  "Firestore 콘텐츠 레지스트리 회귀 테스트 통과: 3 collections + 11 seeds + monitor exact gate",
);
