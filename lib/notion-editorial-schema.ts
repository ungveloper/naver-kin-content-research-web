export const NOTION_EDITORIAL_TRACKING_SCHEMA = {
  "질문": { rich_text: {} },
  "생성일시": { created_time: {} },
  "질문 작성 일시": { date: {} },
  "프롬프트 버전": { rich_text: {} },
  "초안 유형": {
    select: {
      options: [
        { name: "독립 글" },
        { name: "기존 글 업데이트" },
        { name: "지식iN 답변만" },
        { name: "제외" },
      ],
    },
  },
  "사전 품질 점수": { number: { format: "number" } },
  "공식 근거 후보 수": { number: { format: "number" } },
  "중복도": { number: { format: "number" } },
  "최종 판정": {
    select: {
      options: [
        { name: "검토 전" },
        { name: "게시" },
        { name: "기존 글 업데이트" },
        { name: "지식iN 답변만" },
        { name: "보류" },
        { name: "제외" },
      ],
    },
  },
  "질문 충족": { checkbox: {} },
  "게시 보류 사유": { rich_text: {} },
  "파이프라인 상태": {
    select: {
      options: [
        { name: "발견" },
        { name: "원문 확인" },
        { name: "리서치 중" },
        { name: "프롬프트 준비" },
        { name: "보류" },
        { name: "오류" },
      ],
    },
  },
  "마지막 오류": { rich_text: {} },
  "재시도 횟수": { number: { format: "number" } },
  "마지막 검증일": { date: {} },
} as const;

export function editorialDispositionLabel(
  value:
    | "standalone-post"
    | "existing-post-update"
    | "kin-answer-only"
    | "reject",
) {
  switch (value) {
    case "standalone-post":
      return "독립 글";
    case "existing-post-update":
      return "기존 글 업데이트";
    case "kin-answer-only":
      return "지식iN 답변만";
    default:
      return "제외";
  }
}
