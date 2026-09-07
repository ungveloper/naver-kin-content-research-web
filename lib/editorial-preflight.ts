import type {
  EditorialContext,
  EditorialPreflight,
  ResearchEvidenceBundle,
} from "@/lib/types";

type SourceQuestionLike = {
  questionText?: string;
} | null | undefined;

export function buildEditorialPreflight(
  bundles: ResearchEvidenceBundle[],
  editorialContext: EditorialContext,
  sourceQuestion?: SourceQuestionLike,
): EditorialPreflight[] {
  return bundles.map((bundle) => {
    const bundleContext = editorialContext.bundles.find(
      (item) => item.bundleId === bundle.id,
    );
    const duplicateSimilarity =
      bundleContext?.existingContentMatches[0]?.similarity || 0;
    const officialEvidenceCount = bundle.web.filter(
      (item) => item.officialCandidate,
    ).length;
    const coverageCount = Object.values(bundle.coverage)
      .filter(Boolean).length;
    const questionDemand = bundle.questionStats.uniqueCount;
    const questionLength = (
      sourceQuestion?.questionText
      || bundle.discoveredProblem
      || bundle.query
    ).trim().length;

    let recommendedDisposition:
      EditorialPreflight["recommendedDisposition"] = "standalone-post";
    let rationale =
      "독립 검색 의도와 Evidence가 있어 WordPress 독립 글 후보로 검증할 가치가 있습니다.";

    if (bundleContext?.likelyDuplicate || duplicateSimilarity >= 0.72) {
      recommendedDisposition = "existing-post-update";
      rationale =
        "기존 WordPress 글과 검색 의도가 매우 가까워 신규 URL보다 기존 글 업데이트를 우선 검토해야 합니다.";
    } else if (
      questionDemand === 0
      && officialEvidenceCount === 0
      && coverageCount <= 1
    ) {
      recommendedDisposition = "reject";
      rationale =
        "반복 수요와 검증 가능한 근거가 모두 약해 자동 제작 후보로 쓰기 어렵습니다.";
    } else if (
      questionLength <= 160
      && questionDemand <= 1
      && officialEvidenceCount <= 1
      && coverageCount <= 2
    ) {
      recommendedDisposition = "kin-answer-only";
      rationale =
        "질문 자체에는 답할 가치가 있지만 독립 WordPress 글로 확장하면 분량 채우기가 될 가능성이 높습니다.";
    }

    const evidenceScore = Math.min(
      24,
      coverageCount * 4 + officialEvidenceCount * 4,
    );
    const demandScore = Math.min(22, questionDemand * 5);
    const trendScore = bundle.coverage.trend ? 8 : 0;
    const uniquenessScore = Math.max(
      0,
      20 - Math.round(duplicateSimilarity * 20),
    );
    const penalty =
      recommendedDisposition === "reject"
        ? 25
        : recommendedDisposition === "existing-post-update"
          ? 10
          : 0;

    const qualityScore = Math.max(
      0,
      Math.min(
        100,
        26
          + evidenceScore
          + demandScore
          + trendScore
          + uniquenessScore
          - penalty,
      ),
    );

    return {
      bundleId: bundle.id,
      recommendedDisposition,
      rationale,
      qualityScore,
      officialEvidenceCount,
      duplicateSimilarity:
        Math.round(duplicateSimilarity * 100) / 100,
      questionDemand,
      coverageCount,
    };
  });
}
