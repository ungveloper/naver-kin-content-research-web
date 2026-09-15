import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CONTENT_REGISTRY_COLLECTIONS,
  buildRegistrySearchTokens,
  extractKinDocId,
  normalizeRegistryTitle,
  scoreRegistrySimilarity,
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

assert.equal(seed.length, 17);
assert.equal(new Set(seed.map((item) => item.kin_doc_id)).size, 17);
assert.ok(seed.every((item) => item.history_state === "seen"));
assert.ok(seed.every((item) => !("status" in item)));

const withArticle = seed.filter(
  (item) => item.wordpress_url && item.slug,
);
const historyOnly = seed.filter(
  (item) => !item.wordpress_url && !item.slug,
);

assert.equal(withArticle.length, 12);
assert.equal(historyOnly.length, 5);

const tokens = buildRegistrySearchTokens(
  "갤럭시 워치 카카오톡 일시적인 오류",
  "워치에서 카톡 실행 시 오류가 나고 재연결해도 같습니다.",
);

assert.ok(tokens.length > 0);
assert.ok(tokens.length <= 30);

const similar = scoreRegistrySimilarity(
  {
    title: "갤럭시워치 카톡 오류문제 해결법",
    body: "갤럭시 워치에서 카톡을 연결하면 일시적인 오류가 계속 뜹니다.",
  },
  {
    title: "갤럭시 워치 카카오톡 일시적인 오류",
    body: "워치에서 카톡 실행 시 일시적인 오류가 나오고 재연결해도 같습니다.",
  },
);

assert.equal(similar.similar, true);

const different = scoreRegistrySimilarity(
  {
    title: "갤럭시워치 카톡 오류문제 해결법",
    body: "갤럭시 워치에서 카톡을 연결하면 일시적인 오류가 계속 뜹니다.",
  },
  {
    title: "갤럭시 워치 배터리가 빨리 닳아요",
    body: "충전해도 하루를 못 가고 배터리가 빠르게 줄어듭니다.",
  },
);

assert.equal(different.similar, false);

const monitor = fs.readFileSync(
  new URL("./kin-life-guide-monitor.mjs", import.meta.url),
  "utf8",
);

assert.match(monitor, /findContentRegistryHistoryMatch/);
assert.match(monitor, /recordContentRegistryQuestion/);
assert.match(monitor, /Firestore 전체 히스토리/);

const runner = fs.readFileSync(
  new URL("./seed-content-registry.mjs", import.meta.url),
  "utf8",
);

assert.match(runner, /Firestore 통합 history seed/);

console.log(
  "Firestore 통합 history 회귀 테스트 통과: "
  + "17개 seen + 자동 history 기록 + 유사 질문 제외",
);
