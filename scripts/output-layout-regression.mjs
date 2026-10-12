import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "lib/research.ts"),
  "utf8",
);

const header =
  "==================================================\n"
  + "최종 출력 형식 — ChatGPT 화면 렌더링 + Auto Publisher 전달 규격\n"
  + "==================================================";
const footer = "가장 중요한 규칙:";
const layoutMarker =
  "[뉴스형 출력 레이아웃 계약 — 데이터 구성은 그대로 유지]";

const section1 = "# " + "1. 게시용 본문";
const section2 = "# " + "2. 대표 이미지 생성 프롬프트";
const section3 = "# " + "3. Rank Math SEO 패키지";
const section4 = "# " + "4. 네이버 지식iN 답변 추천";
const forbiddenEditorHeading = "# " + "2. 게시 전 확인 자료";
const seoTitleField = "## SEO" + " title";

const start = source.indexOf(header);
const end = source.indexOf(footer, start);

assert.ok(start >= 0, "최종 출력 규격 header가 없습니다.");
assert.ok(end > start, "최종 출력 규격 footer가 없습니다.");

const block = source.slice(start, end);
const lines = block.split(/\r?\n/).map((line) => line.trim());

assert.ok(block.includes(layoutMarker), "뉴스형 출력 레이아웃 계약이 없습니다.");

for (const heading of [section1, section2, section3, section4]) {
  assert.equal(
    lines.filter((line) => line === heading).length,
    1,
    `${heading} 실제 heading은 정확히 1개여야 합니다.`,
  );
}

for (const marker of [
  "<!-- 게시용 본문 시작 -->",
  "<!-- 게시용 본문 끝 -->",
  "[대표 이미지 생성 프롬프트]",
  "## 포커스 키워드",
  seoTitleField,
  "## 영문 퍼머링크",
  "## SEO description",
  "## 글 태그",
  "## 카테고리명",
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
  "뉴스 앱 전용 편집자 검증 heading이 실제 KIN 출력에 추가되면 안 됩니다.",
);

assert.equal(
  lines.some((line) => line.startsWith("# 1. 게시용 본문”이어야 한다.")),
  false,
  "legacy malformed '# 1' line이 남아 있습니다.",
);

assert.equal(
  lines.some((line) =>
    line.startsWith("- 허용되는 fenced code block은 “# 2. 대표 이미지 생성 프롬프트”")
  ),
  false,
  "legacy malformed fenced-code 안내 line이 남아 있습니다.",
);

assert.equal(
  lines.some((line) =>
    line.startsWith(
      "- 최종 답변의 첫 번째 비어 있지 않은 줄은 반드시 “# 1. 게시용 본문”이어야 한다.",
    )
  ),
  true,
  "정상적인 첫 heading 안내 문장이 사라졌습니다.",
);

console.log(
  "KIN 뉴스형 출력 구조 회귀 테스트 통과: "
  + "canonical 4섹션 + malformed line 제거 + 정상 안내 문장 보존",
);
