import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const layout = read("lib/output-layout.ts");
const research = read("lib/research.ts");
const review = read("lib/topic-review.ts");

assert.ok(layout.includes("# 4. Rank Math SEO 패키지"));
assert.ok(layout.includes("## SEO title"));
assert.ok(layout.includes("SEO title 끝에는 ' - 3분 전'"));
assert.ok(layout.includes("H1에는 사이트명을 붙이지 않는다"));

for (const [name, source] of [["lib/research.ts", research], ["lib/topic-review.ts", review]]) {
  assert.ok(source.includes("SEO title 브랜드 규칙:"), `${name}: 브랜드 규칙 누락`);
  assert.ok(source.includes('정확히 " - 3분 전"을 한 번만 붙인다'), `${name}: suffix 규칙 누락`);
  assert.ok(source.includes('게시용 본문의 H1 제목에는 " - 3분 전"을 붙이지 않는다'), `${name}: H1 규칙 누락`);
  assert.ok(source.includes('이미 " - 3분 전"으로 끝나면 중복해서 다시 붙이지 않는다'), `${name}: 중복 방지 누락`);
  assert.ok(source.includes("${KIN_OUTPUT_LAYOUT_CONTRACT}"), `${name}: 공통 출력 규격 누락`);
}
console.log("SEO title 브랜드 회귀 테스트 통과: 공통 Rank Math 4번 + 정확한 브랜드 접미사 + H1 미적용");
