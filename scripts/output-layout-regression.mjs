import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "lib/research.ts"),
  "utf8",
);

const layoutMarker =
  "[뉴스형 출력 레이아웃 계약 — 데이터 구성은 그대로 유지]";
const section1 = "# " + "1. 게시용 본문";
const section2 = "# " + "2. 대표 이미지 생성 프롬프트";
const section3 = "# " + "3. Rank Math SEO 패키지";
const section4 = "# " + "4. 네이버 지식iN 답변 추천";
const forbiddenEditorHeading = "# " + "2. 게시 전 확인 자료";
const seoTitleField = "## SEO" + " title";

const start = source.indexOf(layoutMarker);
const end = source.indexOf("가장 중요한 규칙:", start);

assert.ok(start >= 0, "뉴스형 출력 레이아웃 계약이 없습니다.");
assert.ok(end > start, "뉴스형 출력 레이아웃 계약 범위를 찾지 못했습니다.");

const block = source.slice(start, end);
const lines = block.split(/\r?\n/).map((line) => line.trim());

for (const marker of [
  section1,
  "<!-- 게시용 본문 시작 -->",
  "<!-- 게시용 본문 끝 -->",
  section2,
  "[대표 이미지 생성 프롬프트]",
  section3,
  "## 포커스 키워드",
  seoTitleField,
  "## 영문 퍼머링크",
  "## SEO description",
  "## 글 태그",
  "## 카테고리명",
  section4,
  "## 원문 질문",
  "## 추천 답변",
  "[[게시 후 실제 글 URL]]",
  "생활 가이드",
]) {
  assert.ok(block.includes(marker), `출력 구조 계약 누락: ${marker}`);
}

assert.equal(
  lines.includes(forbiddenEditorHeading),
  false,
  "뉴스 앱의 게시 전 확인 자료가 실제 KIN 출력 heading으로 추가되면 안 됩니다.",
);

assert.ok(
  block.includes(
    "화면 구조 때문에 사실·수치·본문·SEO 값·대표 이미지 프롬프트·지식iN 답변 내용을 추가·삭제·요약·재작성하지 않는다.",
  ),
  "데이터 불변 계약이 없습니다.",
);

assert.ok(
  lines.includes(section1)
    && lines.includes(section2)
    && lines.includes(section3)
    && lines.includes(section4),
  "KIN 4개 상위 출력 heading 중 하나 이상이 없습니다.",
);

console.log(
  "KIN 뉴스형 출력 구조 회귀 테스트 통과: "
  + "4섹션 데이터 유지 + 금지 편집 heading 없음 + 뉴스형 코드 블록 레이아웃",
);
