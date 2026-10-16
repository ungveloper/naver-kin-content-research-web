import assert from "node:assert/strict";
import fs from "node:fs";

const types = fs.readFileSync("lib/types.ts", "utf8");
const auto = fs.readFileSync("lib/auto-research.ts", "utf8");
const topic = fs.readFileSync("lib/topic-review.ts", "utf8");
const route = fs.readFileSync("app/api/research/auto/route.ts", "utf8");
const monitor = fs.readFileSync("scripts/kin-life-guide-monitor.mjs", "utf8");
const research = fs.readFileSync("lib/research.ts", "utf8");

assert.ok(types.includes("export type FixedContentCategory = string;"));
assert.equal(topic.includes("category가 고정 5개 범위를 벗어났습니다"), false);
assert.ok(topic.includes("생활/실용정보 범위의 자연스러운 내부 편집 라벨"));
assert.ok(topic.includes("항상 “생활/실용정보”"));
assert.ok(research.includes("생활/실용정보"));

for (const label of [
  "디지털 활용",
  "생활 행정",
  "교통·이동·택배",
  "주거·생활 관리",
  "식생활·주방",
  "의류·세탁",
  "제품 활용",
  "문서·업무 실용",
  "지역 생활",
  "여가·문화 실용",
  "소비자 실용정보",
]) {
  assert.ok(auto.includes(label), `auto-research scope 누락: ${label}`);
  assert.ok(monitor.includes(label), `monitor scope 누락: ${label}`);
}

assert.ok(auto.includes("getAutoResearchSeeds(date: Date, offset = 0, count = 8)"));
assert.ok(route.includes("getAutoResearchSeeds(now, offset, 8)"));
assert.ok(monitor.includes('label: "recent", sort: "date", display: 35'));
assert.ok(monitor.includes('label: "evergreen", sort: "sim", display: 20'));
assert.ok(monitor.includes("function diversifyByArea(items, limit)"));

const seedStart = monitor.indexOf("const seeds = [");
const seedEnd = monitor.indexOf("const hardExcludeGroups = {", seedStart);
const seedBlock = monitor.slice(seedStart, seedEnd);
const rows = [...seedBlock.matchAll(/\["[^"]+",\s*"([^"]+)"\]/g)];
assert.ok(rows.length >= 80, `monitor seed 부족: ${rows.length}`);

for (const forbidden of [
  "즉 본문 구간에는 fenced code block이 0개여야 한다.",
  "복사용 코드 블록은 지정된 #2·#3·#4 내부에만 존재해야 한다.",
]) {
  assert.equal(topic.includes(forbidden), false, `#1 코드블록 충돌 규칙 잔존: ${forbidden}`);
}

const layout = fs.readFileSync("lib/output-layout.ts", "utf8");
assert.ok(layout.includes("# 2. 게시 전 확인 자료"));
assert.ok(layout.includes("# 5. 네이버 지식iN 답변 추천"));
assert.equal((topic.match(/\$\{KIN_OUTPUT_LAYOUT_CONTRACT\}/g) || []).length, 2,
  "직접 URL과 번호 선택 모두 공통 5섹션을 사용해야 합니다.");
assert.ok(layout.includes("전체 코드 블록은 총 9개"));
assert.ok(layout.includes("#2에는 코드 블록을 만들지 않고 일반 Markdown으로 작성한다."));
assert.ok(layout.includes("markdown 언어 지정 코드 블록을 정확히 하나"));

console.log(
  "생활/실용정보 통합 회귀 테스트 통과: "
  + "열린 category + 11개 예시 scope + 80개 이상 KIN seed + 뉴스형 5섹션",
);
