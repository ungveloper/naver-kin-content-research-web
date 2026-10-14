import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CONTENT_REGISTRY_COLLECTIONS,
  REGISTRY_SIMILARITY_POLICY,
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

assert.equal(REGISTRY_SIMILARITY_POLICY.excludeScore, 0.44);
assert.equal(REGISTRY_SIMILARITY_POLICY.warningScore, 0.3);

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

const exclude = scoreRegistrySimilarity(
  {
    title: "갤럭시워치 카톡 오류문제 해결법",
    body: "갤럭시 워치에서 카톡을 연결하면 일시적인 오류가 계속 뜹니다.",
  },
  {
    title: "갤럭시 워치 카카오톡 일시적인 오류",
    body: "워치에서 카톡 실행 시 일시적인 오류가 나오고 재연결해도 같습니다.",
  },
);

assert.equal(exclude.decision, "exclude");

const warning = scoreRegistrySimilarity(
  {
    title: "갤럭시워치 카톡 오류문제 해결법",
    body: "갤럭시 워치에서 카톡을 연결하면 일시적인 오류가 계속 뜹니다.",
  },
  {
    title: "갤럭시 워치 카톡 알림이 늦어요",
    body: "카카오톡 알림이 몇 분 뒤에 워치로 와요.",
  },
);

assert.equal(warning.decision, "warning");

const fresh = scoreRegistrySimilarity(
  {
    title: "갤럭시워치 카톡 오류문제 해결법",
    body: "갤럭시 워치에서 카톡을 연결하면 일시적인 오류가 계속 뜹니다.",
  },
  {
    title: "갤럭시 워치 배터리가 빨리 닳아요",
    body: "충전해도 하루를 못 가고 배터리가 빠르게 줄어듭니다.",
  },
);

assert.equal(fresh.decision, "new");

const registrySource = fs.readFileSync(
  new URL("./content-registry.mjs", import.meta.url),
  "utf8",
);

assert.match(registrySource, /claimContentRegistryQuestion/);
assert.match(registrySource, /claimed:\s*false/);
assert.match(registrySource, /claimed:\s*true/);

const monitor = fs.readFileSync(
  new URL("./kin-life-guide-monitor.mjs", import.meta.url),
  "utf8",
);

assert.match(monitor, /claimContentRegistryQuestion/);
assert.match(monitor, /Firestore 전체 히스토리 필수 설정 누락/);
assert.match(monitor, /Firestore 전체 히스토리 처리 실패/);
assert.match(monitor, /유사 경고 통과/);
assert.match(monitor, /동시 실행 claim 충돌로 제외/);

const workflow = fs.readFileSync(
  new URL(
    "../.github/workflows/kin-life-guide-monitor.yml",
    import.meta.url,
  ),
  "utf8",
);

assert.match(workflow, /^concurrency:/m);
assert.match(workflow, /group:\s*kin-life-guide-monitor/);
assert.match(workflow, /cancel-in-progress:\s*false/);

assert.match(
  workflow,
  /^jobs:/m,
);
assert.match(
  workflow,
  /kin-life-guide-monitor\.mjs/,
);
assert.match(
  workflow,
  /FIREBASE_SERVICE_ACCOUNT_JSON/,
);
assert.match(
  workflow,
  /vars\.KIN_AUTO_MONITOR_ENABLED/,
);
assert.match(
  workflow,
  /github\.event_name\s*==\s*'workflow_dispatch'/,
);
assert.match(
  workflow,
  /workflow_dispatch:/,
);

assert.match(
  workflow,
  /timezone:\s*['"]Asia\/Seoul['"]/,
);

console.log(
  "Firestore history 안전장치 회귀 테스트 통과: "
  + "fail-closed + atomic claim + concurrency + 3단계 유사도",
);
