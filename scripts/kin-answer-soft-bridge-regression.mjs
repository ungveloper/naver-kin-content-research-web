import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const roots = ["app", "lib", "scripts"];
const exts = new Set([".ts", ".tsx", ".js", ".mjs"]);
const sources = [];

function walk(root) {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (exts.has(path.extname(full))) {
      const text = fs.readFileSync(full, "utf8");
      if (text.includes("네이버 지식iN 답변 추천") && text.includes("지식iN 답변 링크 연결 규칙:")) {
        sources.push({ file: full, text });
      }
    }
  }
}
for (const root of roots) walk(root);

assert.ok(sources.length >= 1, "지식iN 추천 답변 prompt source를 찾지 못했습니다.");

const required = [
  "링크 유도 문장은 선택 사항이다",
  "추가 궁금증이 실제로 있을 때만",
  "구체적인 확인 포인트 1~2개",
  "광고성·상투적 CTA는 쓰지 않는다",
  "낚시성 표현이나 과장은 금지한다",
  "실제 게시글에 없는 내용을 링크에 있다고 암시하거나 새 사실을 만들지 않는다",
  "같은 문장 틀을 매 답변마다 반복하지 않는다",
  "유도 문장 없이 링크만 둬도 된다",
  "의미, 수치, 제품명, 모델명, URL은 바꾸지 않고",
];

for (const { file, text } of sources) {
  for (const needle of required) {
    assert.ok(text.includes(needle), `${file}: 정책 누락 - ${needle}`);
  }
}

console.log(
  "지식iN 답변 링크 유도 회귀 테스트 통과: 핵심답변 우선 + 선택적 호기심 연결 + 광고성 CTA 금지 + 사실/URL 보존",
);
