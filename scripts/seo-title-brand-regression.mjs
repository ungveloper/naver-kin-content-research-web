import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const roots = ["app", "lib", "scripts"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const files = [];

function walk(root) {
  if (!fs.existsSync(root)) return;

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);

    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    if (extensions.has(path.extname(full))) {
      files.push(full);
    }
  }
}

for (const root of roots) {
  walk(root);
}

const promptSources = files
  .map((file) => ({
    file,
    text: fs.readFileSync(file, "utf8"),
  }))
  .filter(({ text }) => (
    text.includes("# 3. Rank Math SEO 패키지")
    && text.includes("## SEO title")
  ));

assert.ok(
  promptSources.length >= 1,
  "Rank Math SEO prompt source를 찾지 못했습니다.",
);

for (const { file, text } of promptSources) {
  assert.ok(
    text.includes("SEO title 브랜드 규칙:"),
    `${file}: SEO title 브랜드 규칙이 없습니다.`,
  );

  assert.ok(
    text.includes('정확히 " - 3분 전"을 한 번만 붙인다'),
    `${file}: SEO title suffix 규칙이 없습니다.`,
  );

  assert.ok(
    text.includes('게시용 본문의 H1 제목에는 " - 3분 전"을 붙이지 않는다'),
    `${file}: H1 미적용 규칙이 없습니다.`,
  );

  assert.ok(
    text.includes('이미 " - 3분 전"으로 끝나면 중복해서 다시 붙이지 않는다'),
    `${file}: suffix 중복 방지 규칙이 없습니다.`,
  );
}

console.log(
  "SEO title 브랜드 회귀 테스트 통과: "
  + "SEO title만 ' - 3분 전' suffix + H1 미적용 + 중복 방지",
);
