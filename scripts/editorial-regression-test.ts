import { readFileSync } from "node:fs";
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
    discoveryCategory: "디지털 생활",
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
