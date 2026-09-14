import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("./kin-life-guide-monitor.mjs", import.meta.url),
  "utf8",
);

const kinImportMatches = source.match(
  /import\s*\{[\s\S]*?\}\s*from\s*["']\.\/kin-question-page\.mjs["'];?/g,
) || [];

assert.equal(
  kinImportMatches.length,
  1,
  "./kin-question-page.mjs named import는 정확히 1개여야 합니다.",
);

assert.match(
  source,
  /async function findNotionPageByExactTitle\s*\(/,
  "Notion exact-title helper가 필요합니다.",
);

assert.match(
  source,
  /title:\s*\{\s*equals:\s*exactTitle\s*\}/,
  "Notion title filter는 equals exact-match여야 합니다.",
);

assert.match(
  source,
  /const exactTitleSeenThisRun = new Set\(\);/,
  "같은 실행 내 동일 제목 중복 방지가 필요합니다.",
);

assert.match(
  source,
  /typeof notionProperties\.title === "string"/,
  "Notion title resolver의 string 형태를 지원해야 합니다.",
);

assert.match(
  source,
  /\|\| "제목"/,
  "Notion 제목 속성 fallback이 필요합니다.",
);

assert.match(
  source,
  /Notion에 동일 제목이 이미 있어 제외/,
  "기존 Notion exact-title 제외 경로가 필요합니다.",
);

assert.doesNotMatch(
  source,
  /findNotionPageByExactTitle[\s\S]{0,1100}(?:levenshtein|fuzzy)/i,
  "1차 제목 중복 방지는 fuzzy가 아니라 exact-match여야 합니다.",
);

console.log(
  "Notion 동일 제목 회귀 테스트 통과: import 단일화 + title equals exact-match + same-run dedupe",
);
