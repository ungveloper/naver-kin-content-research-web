import assert from 'node:assert/strict';
import fs from 'node:fs';

// Execute the actual TypeScript's JavaScript-compatible String.raw template.
// Tests rendered prompt output, not merely the existence of keywords in source.
const source = fs.readFileSync('lib/output-layout.ts', 'utf8');
const mod = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const { KIN_OUTPUT_LAYOUT_CONTRACT: contract } = await import(mod);
const names = [
  '# 1. 게시용 본문', '# 2. 게시 전 확인 자료',
  '# 3. 대표 이미지 생성 프롬프트', '# 4. Rank Math SEO 패키지',
  '# 5. 네이버 지식iN 답변 추천',
];
const positions = names.map(name => contract.indexOf('\n' + name + '\n'));
assert.ok(positions.every(v => v !== -1), '5섹션 제목 누락');
assert.ok(positions.every((v,i) => i===0 || v>positions[i-1]), '상위 섹션 순서 오류');
const parts = positions.map((v,i) => contract.slice(v, positions[i+1] ?? contract.length));
const [article, review, image, seo, kin] = parts;
assert.match(article,/\n# 1\. 게시용 본문\n\n```markdown\n<!-- 게시용 본문 시작 -->/,
  '#1은 Markdown 원문 복사용 하나의 블록으로 열려야 함');
assert.match(article,/<!-- 게시용 본문 끝 -->\n```\n\s*$/,
  '#1 끝 주석 다음에 코드 블록이 즉시 닫혀야 함');
assert.equal((article.match(/```/g)||[]).length,2,'#1 중첩/분리 코드 블록 금지');
const content = article.split('```markdown\n')[1].split('\n```')[0];
assert.match(content,/^<!-- 게시용 본문 시작 -->\n\n# /,
  '복사할 Markdown은 시작 주석과 WordPress H1을 포함');
assert.ok(content.includes('## 출처 및 참고자료'),'복사 범위에 WordPress 본문 출처가 포함되어야 함');
assert.ok(content.trimEnd().endsWith('<!-- 게시용 본문 끝 -->'));
assert.doesNotMatch(content,/# 2\. 게시 전 확인 자료|# 4\. Rank Math SEO 패키지/,
  '복사할 본문에 편집자 자료/SEO 항목이 섞이면 안 됨');
assert.equal((review.match(/```/g)||[]).length,0,'#2는 기존처럼 일반 Markdown');
assert.equal((image.match(/```/g)||[]).length,2,'#3은 text 코드 블록 1개');
assert.equal((seo.match(/```/g)||[]).length,12,'#4 여섯 개 필드는 각각 text 코드 블록');
assert.equal((kin.match(/```/g)||[]).length,2,'#5 답변은 text 코드 블록 1개');
assert.equal((contract.match(/```markdown/g)||[]).length,1);
assert.equal((contract.match(/```text/g)||[]).length,8);
assert.equal((contract.match(/```/g)||[]).length,18,'총 9개 완결된 코드 블록');

for (const p of ['lib/research.ts','lib/topic-review.ts']) {
  const s = fs.readFileSync(p,'utf8');
  assert.ok(s.includes('최종 복사 UI 규격은 이번 변경을 가장 우선한다.'),p+': 복사 출력 우선규칙 누락');
  assert.ok(s.includes('${KIN_OUTPUT_LAYOUT_CONTRACT}'),p+': 공통 계약 연결 누락');
}
const quality = fs.readFileSync('lib/content-quality.ts','utf8');
assert.ok(quality.includes('standalone-post 전체 9개 코드 블록'));
console.log('KIN 본문 단일 복사블록 실구조 검증 통과: #1 markdown 1개(주석·H1·출처 포함), #2 원문 검증, #3~#5 text 8개, 전체 9개');
