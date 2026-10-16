import assert from "node:assert/strict";
import fs from "node:fs";

const read = (name) => fs.readFileSync(name, "utf8");
const layout = read("lib/output-layout.ts");
const research = read("lib/research.ts");
const review = read("lib/topic-review.ts");
const quality = read("lib/content-quality.ts");
const policy = read("lib/editorial-policy.ts");

const sectionNames = [
  "# 1. 게시용 본문",
  "# 2. 게시 전 확인 자료",
  "# 3. 대표 이미지 생성 프롬프트",
  "# 4. Rank Math SEO 패키지",
  "# 5. 네이버 지식iN 답변 추천",
];
const lines = layout.split(/\r?\n/).map((x) => x.trim());
const indexes = sectionNames.map((title) => {
  const hits = lines.filter((x) => x === title);
  assert.equal(hits.length, 1, `${title}: 실제 예시 heading은 정확히 1개`);
  return layout.indexOf(`\n${title}\n`);
});
assert.ok(indexes.every((x) => x >= 0));
assert.ok(indexes.every((x, i) => i === 0 || x > indexes[i - 1]),
  "섹션 순서가 news형 1~4 + 지식iN 5와 달라졌습니다.");

const article = layout.slice(indexes[0], indexes[1]);
assert.ok(article.includes("<!-- 게시용 본문 시작 -->"));
assert.ok(article.includes("<!-- 게시용 본문 끝 -->"));
assert.ok(article.includes('${"```"}markdown\n<!-- 게시용 본문 시작 -->'),
  "#1 본문은 markdown 코드 블록으로 시작해야 합니다.");
assert.ok(article.includes('<!-- 게시용 본문 끝 -->\n${"```"}'),
  "#1 본문 끝 주석 직후 하나의 코드 블록을 닫아야 합니다.");
assert.equal((article.match(/\$\{"```"\}/g) || []).length, 2,
  "#1 코드 블록은 정확히 한 쌍이어야 합니다.");
assert.ok(article.indexOf("<!-- 게시용 본문 시작 -->") < article.indexOf("<!-- 게시용 본문 끝 -->"));

const reviewSection = layout.slice(indexes[1], indexes[2]);
for (const section of [
  "검증 기준일:", "## 원 질문·문제 맥락 검증",
  "## 검색 의도 및 SEO 검증", "## 공식 자료 및 출처 충돌 검토",
  "## 핵심 주장 검증표", "## 기존 글 중복 및 내부링크",
  "## AdSense 및 콘텐츠 품질 점검", "## 출판 SEO 점검",
]) assert.ok(reviewSection.includes(section), `편집 검증 자료 누락: ${section}`);
assert.ok(!reviewSection.includes('${"```"}'), "#2에 코드 블록을 만들지 않습니다.");

for (const s of ["## 포커스 키워드", "## SEO title", "## 영문 퍼머링크",
  "## SEO description", "## 글 태그", "## 카테고리명"]) {
  assert.ok(layout.includes(s), `Rank Math 필드 누락: ${s}`);
}
for (const s of ["[대표 이미지 생성 프롬프트]", "## 원문 질문",
  "## 추천 답변", "[[게시 후 실제 글 URL]]", "생활/실용정보"]) {
  assert.ok(layout.includes(s), `출력 규칙 누락: ${s}`);
}
// One markdown block around #1 + eight text blocks for #3-#5. #2 has no fences.
assert.equal((layout.match(/\$\{"```"\}/g) || []).length, 18,
  "복사용 코드 블록은 총 9개(#1 markdown 1개 + #3~#5 text 8개)여야 합니다.");
assert.ok(layout.includes("전체 코드 블록 총 9개"));
assert.ok(layout.includes("' - 3분 전'을 정확히 한 번만 붙인다"));

assert.ok(research.includes('import { KIN_OUTPUT_LAYOUT_CONTRACT } from "@/lib/output-layout";'));
assert.ok(review.includes('import { KIN_OUTPUT_LAYOUT_CONTRACT } from "@/lib/output-layout";'));
assert.equal((research.match(/\$\{KIN_OUTPUT_LAYOUT_CONTRACT\}/g) || []).length, 1,
  "후보 작성 프롬프트가 공통 계약을 참조하지 않습니다.");
assert.equal((review.match(/\$\{KIN_OUTPUT_LAYOUT_CONTRACT\}/g) || []).length, 2,
  "직접 URL과 선택형 프롬프트가 모두 공통 계약을 참조해야 합니다.");

for (const [name, source] of [["lib/research.ts", research], ["lib/topic-review.ts", review]]) {
  assert.ok(source.includes("SEO title 브랜드 규칙:"), `${name}: SEO title 규칙 누락`);
  assert.ok(!source.includes("별도의 “게시 전 확인 자료”로 노출하지 말고"),
    `${name}: 편집 검증 자료 금지 문구가 남았습니다.`);
  assert.ok(!source.includes("“게시 전 확인 자료”, 별도 검증 보고서"),
    `${name}: 옛 출력 금지 계약이 남았습니다.`);
  assert.ok(!source.includes("정확히 아래 4개만"), `${name}: 옛 4섹션 계약이 남았습니다.`);
}
assert.ok(quality.includes("전체 9개 코드 블록"));
assert.ok(policy.includes("# 5. 네이버 지식iN 답변 추천만 출력한다."));

console.log("KIN 출력 구조 회귀 테스트 통과: news #1~#4 + KIN #5, #1 markdown 복사블록 1개, #2 검증 자료, #3~#5 text 8블록, 두 생성 경로 공통 계약");
