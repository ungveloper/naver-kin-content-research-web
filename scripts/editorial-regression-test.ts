import { existsSync, readFileSync } from "node:fs";
import { buildEditorialPreflight } from "../lib/editorial-preflight";
import { shortlistSiteContents } from "../lib/content-index";
import {
  IM_NOT_AI_UPSTREAM_POLICY,
  IM_NOT_AI_UPSTREAM_SOURCE,
} from "../lib/im-not-ai-upstream-policy";
import type {
  EditorialContext,
  EditorialDisposition,
  ResearchEvidenceBundle,
  SiteContentRecord,
} from "../lib/types";

type Fixture = {
  name: string;
  expected: EditorialDisposition;
  duplicate?: number;
  demand?: number;
  official?: number;
  coverage?: number;
  questionLength?: number;
};

function bundle(fixture: Fixture): ResearchEvidenceBundle {
  const coverageCount = fixture.coverage ?? 4;
  const coverage = {
    trend: coverageCount >= 1,
    cafe: coverageCount >= 2,
    blog: coverageCount >= 3,
    news: coverageCount >= 4,
    web: coverageCount >= 5,
  };

  return {
    id: fixture.name,
    query: "테스트 질문",
    discoveryCategory: "디지털",
    discoveredProblem:
      "x".repeat(fixture.questionLength ?? 220),
    sourceSignalIds: [],
    questions: [],
    questionStats: {
      rawCount: fixture.demand ?? 3,
      uniqueCount: fixture.demand ?? 3,
      groupedCount: fixture.demand ?? 3,
    },
    trend: {
      query: "테스트",
      keywords: ["테스트"],
      comparisonBatch: 0,
      recentAverage: 1,
      series: [],
      note: "",
    },
    cafe: [],
    blog: [],
    news: [],
    web: Array.from(
      { length: fixture.official ?? 2 },
      (_, index) => ({
        source: "naver-web" as const,
        title: `공식 근거 ${index + 1}`,
        officialCandidate: true,
      }),
    ),
    coverage,
  };
}

function context(fixture: Fixture): EditorialContext {
  const similarity = fixture.duplicate ?? 0.1;
  return {
    totalPublishedPosts: 1200,
    revalidationDue90: 0,
    revalidationDue180: 0,
    searchConsoleQueryCount: 0,
    bundles: [{
      bundleId: fixture.name,
      existingContentMatches:
        similarity > 0
          ? [{
              title: "기존 글",
              url: "https://example.com/existing",
              similarity,
              revalidationWindowDays: 180,
              revalidationDue: false,
            }]
          : [],
      searchConsoleMatches: [],
      likelyDuplicate: similarity >= 0.72,
    }],
  };
}

const fixtures: Fixture[] = [
  ...Array.from({ length: 6 }, (_, index) => ({
    name: `standalone-${index + 1}`,
    expected: "standalone-post" as const,
    duplicate: 0.1 + index * 0.03,
    demand: 2 + index,
    official: 2 + (index % 2),
    coverage: 4 + (index % 2),
    questionLength: 220 + index * 10,
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    name: `update-${index + 1}`,
    expected: "existing-post-update" as const,
    duplicate: 0.72 + index * 0.04,
    demand: 3,
    official: 2,
    coverage: 4,
    questionLength: 240,
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    name: `kin-only-${index + 1}`,
    expected: "kin-answer-only" as const,
    duplicate: 0.05,
    demand: 1,
    official: index % 2,
    coverage: 2,
    questionLength: 70 + index * 12,
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    name: `reject-${index + 1}`,
    expected: "reject" as const,
    duplicate: 0,
    demand: 0,
    official: 0,
    coverage: index % 2,
    questionLength: 50 + index * 10,
  })),
];

let failures = 0;

for (const fixture of fixtures) {
  const result = buildEditorialPreflight(
    [bundle(fixture)],
    context(fixture),
    {
      questionText:
        "x".repeat(fixture.questionLength ?? 220),
    },
  )[0];

  if (result.recommendedDisposition !== fixture.expected) {
    failures += 1;
    console.error(
      `[회귀 실패] ${fixture.name}: expected ${fixture.expected}, got ${result.recommendedDisposition}`,
    );
  }

  if (
    result.qualityScore < 0
    || result.qualityScore > 100
    || !Number.isFinite(result.qualityScore)
  ) {
    failures += 1;
    console.error(
      `[회귀 실패] ${fixture.name}: invalid qualityScore`,
    );
  }
}

const siteDocs: SiteContentRecord[] = [
  {
    id: "1",
    title: "아이폰 사진 백업과 복원 방법",
    excerpt:
      "아이클라우드 사진과 기기 백업을 확인하고 복원하는 순서",
    url: "https://example.com/iphone-backup",
    revalidationWindowDays: 90,
    revalidationDue: false,
  },
  {
    id: "2",
    title: "대형폐기물 배출 신청 방법",
    excerpt:
      "지자체 대형폐기물 신고와 배출번호 확인",
    url: "https://example.com/waste",
    revalidationWindowDays: 90,
    revalidationDue: false,
  },
  {
    id: "3",
    title: "냉장고 식재료 보관 정리",
    excerpt: "냉장 냉동 식재료 정리 방법",
    url: "https://example.com/fridge",
    revalidationWindowDays: 180,
    revalidationDue: false,
  },
];

const shortlist = shortlistSiteContents(
  "아이폰 사진 아이클라우드 백업 복원",
  siteDocs,
  8,
);

if (shortlist[0]?.id !== "1") {
  failures += 1;
  console.error(
    "[회귀 실패] WordPress BM25 shortlist가 관련 글을 1위로 찾지 못했습니다.",
  );
}

const ruleIds =
  IM_NOT_AI_UPSTREAM_POLICY.match(/\b[A-Z]-\d+\b/g) || [];

if (ruleIds.length < 20) {
  failures += 1;
  console.error(
    `[회귀 실패] im-not-ai upstream 핵심 규칙이 너무 적습니다 (${ruleIds.length}).`,
  );
}

if (
  !/^[0-9a-f]{40}$/i.test(IM_NOT_AI_UPSTREAM_SOURCE.commit)
  || !IM_NOT_AI_UPSTREAM_SOURCE.version
) {
  failures += 1;
  console.error(
    "[회귀 실패] im-not-ai upstream metadata가 올바르지 않습니다.",
  );
}

const topicReviewSource = readFileSync(
  "lib/topic-review.ts",
  "utf8",
);

for (const required of [
  "IM_NOT_AI_UPSTREAM_POLICY",
  "EDITORIAL_DISPOSITION_POLICY",
  "MULTI_PASS_FINAL_VALIDATION_POLICY",
  "FINAL_OUTPUT_POLISH_POLICY",
  "ARTICLE_EVIDENCE_DISCIPLINE_POLICY",
  "KIN_ANSWER_READABILITY_POLICY",
  "PUBLIC_ARTICLE_SOURCE_SEPARATION_POLICY",
  "KIN_TRAFFIC_BRIDGE_POLICY",
  "ACTIVE_PROMPT_VERSION",
]) {
  if (!topicReviewSource.includes(required)) {
    failures += 1;
    console.error(
      `[회귀 실패] topic-review에서 ${required}를 찾지 못했습니다.`,
    );
  }
}

const notionPromptSource = readFileSync(
  "app/api/notion/prompt/route.ts",
  "utf8",
);

for (const forbidden of [
  '"## ChatGPT Pro 작성 프롬프트"',
  '"아래 프롬프트 전체를 그대로 복사해 ChatGPT Pro에 붙여넣으세요."',
]) {
  if (notionPromptSource.includes(forbidden)) {
    failures += 1;
    console.error(
      `[회귀 실패] Notion prompt route에 제거 대상 안내문이 남아 있습니다: ${forbidden}`,
    );
  }
}

if (!notionPromptSource.includes("return codeBlocks;")) {
  failures += 1;
  console.error(
    "[회귀 실패] Notion block fallback이 코드 블록만 반환하지 않습니다.",
  );
}

const notionSchemaSource = readFileSync(
  "lib/notion-editorial-schema.ts",
  "utf8",
);

if (!notionSchemaSource.includes('"질문": { rich_text: {} }')) {
  failures += 1;
  console.error("[회귀 실패] Notion schema에 '질문' rich_text 속성이 없습니다.");
}

for (const required of [
  '"생성일시": { created_time: {} }',
  '"질문 작성 일시": { date: {} }',
]) {
  if (!notionSchemaSource.includes(required)) {
    failures += 1;
    console.error(`[회귀 실패] Notion 시간 속성 누락: ${required}`);
  }
}
if (notionSchemaSource.includes('"발견일시"')) {
  failures += 1;
  console.error("[회귀 실패] 제거 대상 발견일시가 schema에 남아 있습니다.");
}

for (const forbidden of [
  '"게시 URL"',
  '"게시일"',
  '"30일 노출"',
  '"30일 클릭"',
  '"30일 CTR"',
  '"30일 평균순위"',
]) {
  if (notionSchemaSource.includes(forbidden)) {
    failures += 1;
    console.error(
      `[회귀 실패] 프롬프트 전용 운영에서 제거한 발행 후 추적 속성이 남아 있습니다: ${forbidden}`,
    );
  }
}

for (const removedPath of [
  "scripts/content-performance-feedback.ts",
  ".github/workflows/content-performance-feedback.yml",
]) {
  if (existsSync(removedPath)) {
    failures += 1;
    console.error(
      `[회귀 실패] 제거한 Performance Feedback 파일이 다시 생겼습니다: ${removedPath}`,
    );
  }
}

const autoResearchSource = readFileSync(
  "app/api/research/auto/route.ts",
  "utf8",
);
const kinMonitorSource = readFileSync(
  "scripts/kin-life-guide-monitor.mjs",
  "utf8",
);

if (!notionPromptSource.includes("fullQuestionRichText")) {
  failures += 1;
  console.error("[회귀 실패] 직접 URL Notion 저장이 질문 전체 본문 helper를 사용하지 않습니다.");
}
if (!kinMonitorSource.includes("fullQuestionRichText")) {
  failures += 1;
  console.error("[회귀 실패] 자동 KIN 저장이 질문 전체 본문 helper를 사용하지 않습니다.");
}
if (
  kinMonitorSource.includes("backfillMissingQuestions(")
  || kinMonitorSource.includes("updateNotionQuestion(")
) {
  failures += 1;
  console.error(
    "[회귀 실패] Insert-only Notion 환경에서 기존 페이지 질문 속성을 PATCH하는 경로가 다시 생겼습니다.",
  );
}

if (!kinMonitorSource.includes("notionPagePropertyPatchUnavailable")) {
  failures += 1;
  console.error(
    "[회귀 실패] Notion 기존 페이지 속성 PATCH 403 비치명 처리 플래그가 없습니다.",
  );
}

if (
  !kinMonitorSource.includes(
    'rich_text: fullQuestionRichText(candidate.questionText)',
  )
) {
  failures += 1;
  console.error(
    "[회귀 실패] 새 Notion 페이지 생성 시 질문 원문 전체 저장 로직이 없습니다.",
  );
}

const categoryContractSources = {
  types: readFileSync("lib/types.ts", "utf8"),
  topicReview: topicReviewSource,
  autoResearch: readFileSync("lib/auto-research.ts", "utf8"),
  autoRoute: autoResearchSource,
  kinMonitor: kinMonitorSource,
  research: readFileSync("lib/research.ts", "utf8"),
};

for (const required of [
  "디지털",
  "행정",
  "집 관리",
  "정리 보관",
  "제품 사용",
]) {
  if (!categoryContractSources.topicReview.includes(required)) {
    failures += 1;
    console.error(`[회귀 실패] 새 내부 분류가 topic-review에 없습니다: ${required}`);
  }
}

for (const [sourceName, source] of Object.entries(categoryContractSources)) {
  for (const forbidden of [
    '"디지털 생활"',
    '"생활 행정"',
    '"정리·보관"',
  ]) {
    if (source.includes(forbidden)) {
      failures += 1;
      console.error(
        `[회귀 실패] ${sourceName}에 이전 내부 분류 값이 남아 있습니다: ${forbidden}`,
      );
    }
  }
}

for (const [sourceName, source] of [
  ["direct Notion route", notionPromptSource],
  ["KIN monitor", kinMonitorSource],
]) {
  if (!source.includes('icon: { type: "emoji", emoji: "✔️" }')) {
    failures += 1;
    console.error(`[회귀 실패] ${sourceName}의 새 페이지에 ✔️ 아이콘이 없습니다.`);
  }
}

if (!kinMonitorSource.includes('properties[prop.name] = { select: { name: value } };')) {
  failures += 1;
  console.error(
    "[회귀 실패] KIN monitor가 새 Notion select 이름을 직접 기록하도록 설정되지 않았습니다.",
  );
}

if (
  autoResearchSource.includes(".trim()\n    .slice(0, 8000)")
  || kinMonitorSource.includes(".trim()\n    .slice(0, 8000)")
) {
  failures += 1;
  console.error("[회귀 실패] 질문 추출에 8,000자 잘림이 다시 들어왔습니다.");
}

const contentQualitySource = readFileSync(
  "lib/content-quality.ts",
  "utf8",
);
const researchPromptSource = readFileSync(
  "lib/research.ts",
  "utf8",
);

for (const required of [
  "ARTICLE_EVIDENCE_DISCIPLINE_POLICY",
  "KIN_ANSWER_READABILITY_POLICY",
  "zero-width",
  "공식 용량이 아닌 단순 계산값",
  "[[게시 후 실제 글 URL]]은 CTA 문장과 붙이지 말고",
]) {
  if (!contentQualitySource.includes(required)) {
    failures += 1;
    console.error(
      `[회귀 실패] 강화된 콘텐츠/지식iN 품질 정책 누락: ${required}`,
    );
  }
}

for (const [sourceName, source] of [
  ["topic-review", topicReviewSource],
  ["research", researchPromptSource],
]) {
  for (const required of [
    "ARTICLE_EVIDENCE_DISCIPLINE_POLICY",
    "KIN_ANSWER_READABILITY_POLICY",
  ]) {
    if (!source.includes(required)) {
      failures += 1;
      console.error(
        `[회귀 실패] ${sourceName}에 ${required}가 연결되지 않았습니다.`,
      );
    }
  }
}

for (const required of [
  "text 코드 블록이 정확히 8개",
  "[[게시 후 실제 글 URL]]은 홍보 문장과 같은 줄에 붙이지 않고 마지막 줄에 단독으로 둔다",
  "상품평 평균·리뷰 개수처럼 자주 바뀌는 숫자는 핵심 판단에 꼭 필요하지 않으면 빼고",
]) {
  if (!topicReviewSource.includes(required)) {
    failures += 1;
    console.error(
      `[회귀 실패] 최종 출력 형식/근거 규율 누락: ${required}`,
    );
  }
}

for (const required of [
  "PUBLIC_ARTICLE_SOURCE_SEPARATION_POLICY",
  "KIN_TRAFFIC_BRIDGE_POLICY",
  "[[게시 후 실제 글 URL]]",
  "질문에 나온",
]) {
  if (!contentQualitySource.includes(required)) {
    failures += 1;
    console.error(
      `[회귀 실패] 공개본문/지식iN 유입 정책에서 ${required}를 찾지 못했습니다.`,
    );
  }
}

for (const [sourceName, source] of [
  ["topic-review", topicReviewSource],
  ["research", researchPromptSource],
]) {
  for (const required of [
    "PUBLIC_ARTICLE_SOURCE_SEPARATION_POLICY",
    "KIN_TRAFFIC_BRIDGE_POLICY",
  ]) {
    if (!source.includes(required)) {
      failures += 1;
      console.error(
        `[회귀 실패] ${sourceName}에 ${required}가 연결되지 않았습니다.`,
      );
    }
  }
}

for (const forbidden of [
  "링크가 불필요하면 [[게시 후 실제 글 URL]] 자체를 출력하지 않는다.",
  "링크가 불필요하면 링크 문장과 [[게시 후 실제 글 URL]]을 출력하지 않는다.",
]) {
  if (contentQualitySource.includes(forbidden) || topicReviewSource.includes(forbidden)) {
    failures += 1;
    console.error(
      `[회귀 실패] 이전 선택적 링크 규칙이 남아 있습니다: ${forbidden}`,
    );
  }
}

if (!contentQualitySource.includes("standalone-post")) {
  failures += 1;
  console.error(
    "[회귀 실패] 지식iN 유입 링크가 standalone-post 조건으로 제한되지 않았습니다.",
  );
}

if (
  topicReviewSource.includes(
    "${IM_NOT_AI_QUICK_RULES}",
  )
) {
  failures += 1;
  console.error(
    "[회귀 실패] 전체 im-not-ai 룰북이 다시 프롬프트에 삽입됐습니다.",
  );
}

if (failures) {
  console.error(`회귀 테스트 실패: ${failures}건`);
  process.exit(1);
}

console.log(
  `회귀 테스트 통과: 편집 판정 ${fixtures.length}개 + BM25 + im-not-ai + 프롬프트 정책`,
);
