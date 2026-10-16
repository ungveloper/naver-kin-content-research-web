import assert from 'node:assert/strict';
import fs from 'node:fs';

const raw = fs.readFileSync('lib/output-layout.ts', 'utf8');
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(raw).toString('base64');
const { KIN_OUTPUT_LAYOUT_CONTRACT: contract } = await import(moduleUrl);

const headings = [
  '# 1. 게시용 본문',
  '# 2. 게시 전 확인 자료',
  '# 3. 대표 이미지 생성 프롬프트',
  '# 4. Rank Math SEO 패키지',
  '# 5. 네이버 지식iN 답변 추천',
];
const lines = contract.split(/\r?\n/).map(s => s.trim());
const actualHeadings = lines.filter(s => /^# [1-5]\. /.test(s));
assert.deepEqual(actualHeadings, headings, '실제 출력 골격의 5개 H1 번호·이름·순서');
const offsets = headings.map(s => contract.indexOf('\n' + s + '\n'));
assert.ok(offsets.every(v => v >= 0));
assert.ok(offsets.every((v,i) => i===0 || v>offsets[i-1]));
const [article, review, image, seo, kin] = offsets.map((v,i) => contract.slice(v,offsets[i+1] ?? contract.length));

for (const s of [
  '<!-- 게시용 본문 시작 -->', '<!-- 게시용 본문 끝 -->',
  '## 자주 묻는 질문(FAQ)', '## 출처 및 참고자료',
  '### 공식 자료', '### 추가 참고자료',
]) assert.ok(article.includes(s), 'WordPress 완성 본문 누락: '+s);
assert.ok(article.indexOf('<!-- 게시용 본문 끝 -->') > article.indexOf('## 출처 및 참고자료'));
assert.ok(!article.includes('```'), '#1에는 code fence 불가');
assert.ok(!review.includes('```'), '#2에는 code fence 불가');
for (const s of [
  '## 원 질문·문제 맥락 검증', '## 검색 의도 및 SEO 검증',
  '## Google·Naver SEO 검증','## 공식 자료 및 출처 충돌 검토',
  '## 콘텐츠 품질 및 발행 판단','## 핵심 주장 검증표',
  '## 기존 글 중복 및 내부링크','## AdSense 및 콘텐츠 품질 점검',
  '## 출판 SEO 점검','## 검증에 사용한 주요 출처',
]) assert.ok(review.includes(s), '뉴스 수준 편집 검증 섹션 누락: '+s);
for (const s of [
  '## 포커스 키워드','## SEO title','## 영문 퍼머링크',
  '## SEO description','## 글 태그','## 카테고리명',
]) assert.ok(seo.includes(s), 'Rank Math 필드 누락: '+s);
assert.ok(kin.includes('## 원문 질문'));
assert.ok(kin.includes('## 추천 답변'));
assert.ok(kin.includes('[[게시 후 실제 글 URL]]'));
assert.ok(image.includes('[대표 이미지 생성 프롬프트]'));
assert.equal((contract.match(/```text/g)||[]).length,8,'#3 이미지 1 + #4 SEO 6 + #5 KIN 1');
assert.equal((contract.match(/```/g)||[]).length,16,'총 8개 완결된 코드 블록만 허용');

// All Markdown table headers in the rendered template must have valid, contiguous
// pipe separators and consistent column counts, unlike the user's broken tables.
const separators = /^\|\s*:?-{3,}:?\s*\|/;
const tableLines = review.split('\n');
let tables = 0;
for (let i=0;i<tableLines.length-1;i++) {
  const line=tableLines[i].trim();
  const next=tableLines[i+1].trim();
  if (line.startsWith('|') && separators.test(next)) {
    const num = s => s.split('|').length-2;
    assert.equal(num(line),num(next),'표 헤더와 구분선 열 개수 일치');
    assert.ok(num(line)>=2,'2열 이상의 정상적인 표');
    let rows=0;
    for(let j=i+2;j<tableLines.length && tableLines[j].trim().startsWith('|');j++) {
      assert.equal(num(tableLines[j].trim()),num(line),'표 데이터 행 열 개수 일치');
      rows++;
    }
    assert.ok(rows>=1,'빈 검증표 금지');
    tables++;
  }
}
assert.ok(tables>=4,'Google·Naver 비교/품질 판단/주장 검증/출판 SEO 표');
for (const marker of [
  '최소 2개', 'FAQ 3~5개', 'utm_source', '직접 확인 불가',
  '독립 글 클릭 이유', '120~160자', '생활/실용정보',
  "' - 3분 전'을 정확히 한 번만 붙인다",
]) assert.ok(contract.includes(marker),'실제 뉴스 수준 품질 규칙 누락: '+marker);

const research=fs.readFileSync('lib/research.ts','utf8');
const reviewSource=fs.readFileSync('lib/topic-review.ts','utf8');
assert.equal((research.match(/\$\{KIN_OUTPUT_LAYOUT_CONTRACT\}/g)||[]).length,1,'후보 조사 프롬프트 주입');
assert.equal((reviewSource.match(/\$\{KIN_OUTPUT_LAYOUT_CONTRACT\}/g)||[]).length,2,'직접 URL과 번호 선택 경로 주입');
for(const source of [research,reviewSource]) {
  assert.ok(source.includes('[참고 뉴스 앱 실제 아웃풋과 내용 품질 일치 — 최종 우선]'));
}
console.log('뉴스 아웃풋 실질 정합성 회귀 테스트 통과: 완성 본문·FAQ·공식 출처·Google/Naver 비교·품질판정·4개 유효 표·SEO 6필드·KIN 답변');
