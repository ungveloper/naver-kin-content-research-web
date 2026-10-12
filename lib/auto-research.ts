import type { ContentMode } from "@/lib/types";

export type AutoResearchCategory = string;

export type AutoResearchSeed = {
  query: string;
  category: AutoResearchCategory;
  audience: string;
  evergreen: number;
  contentMode: ContentMode;
  uniqueOutput: string;
  verificationPlan: string;
};

type DiscoveryScope = {
  category: AutoResearchCategory;
  label: string;
  queries: string[];
  audience: string;
  evergreen: number;
  contentMode: ContentMode;
  uniqueOutput: string;
  verificationPlan: string;
};

const BASE_SCOPES: DiscoveryScope[] = [
  {
    category: "digital-practical",
    label: "디지털 활용",
    queries: [
      "휴대폰 파일 사진 옮기기", "PDF 합치기 나누기 용량 줄이기", "프린터 스캔 PDF 저장",
      "와이파이 블루투스 연결 문제", "이메일 첨부파일 저장 열기", "온라인 계정 로그인 기기 변경",
      "스마트폰 알림 권한 설정", "USB 외장하드 파일 인식", "QR코드 문서 스캔",
    ],
    audience: "스마트폰·PC·온라인 서비스를 일상에서 실제로 쓰다가 막힌 사용자",
    evergreen: 5,
    contentMode: "research-verification",
    uniqueOutput: "공식 도움말과 실제 질문을 교차해 실패 조건과 해결 순서를 분리한 실용 가이드",
    verificationPlan: "서비스·OS·제조사 공식 도움말을 우선 확인한다.",
  },
  {
    category: "living-admin",
    label: "생활 행정",
    queries: [
      "대형폐기물 신고 배출", "음식물쓰레기 분리배출", "재활용 버리는 방법",
      "주민센터 서류 발급", "무인민원발급기 사용", "전입신고 주소 변경",
      "공공시설 예약 이용", "분실물 신고 찾기", "폐가전 수거 신청",
    ],
    audience: "일상에서 행정·공공서비스 절차를 정확히 완료하려는 사용자",
    evergreen: 4,
    contentMode: "research-verification",
    uniqueOutput: "공식 원문 기준의 준비물·단계·예외·완료 확인 체크리스트",
    verificationPlan: "정부·지자체·공공기관 최신 원문을 우선 확인한다.",
  },
  {
    category: "transport-delivery",
    label: "교통·이동·택배",
    queries: [
      "택배 오배송 주소 변경", "우편 등기 수령 반송", "편의점 택배 보내는 방법",
      "공항 짐 보관 이용", "기차 버스 분실물 찾기", "주차 정산 이용 방법",
      "교통카드 환불 잔액", "자전거 보관 이동", "이사 짐 포장 순서",
    ],
    audience: "이동·배송·수령 과정에서 바로 실행할 방법을 찾는 사용자",
    evergreen: 4,
    contentMode: "research-verification",
    uniqueOutput: "상황별 이용 절차와 예외를 나눈 실행 가이드",
    verificationPlan: "운영사·공공기관·서비스 공식 안내를 확인한다.",
  },
  {
    category: "home-living",
    label: "주거·생활 관리",
    queries: [
      "빨래 쉰내 냄새 건조", "욕실 물때 곰팡이 청소", "배수구 냄새 막힘",
      "창문 결로 물방울", "매트리스 얼룩 냄새", "벽지 테이프 자국",
      "주방 후드 기름때", "냉장고 냄새 성에", "방충망 창틀 청소",
    ],
    audience: "집에서 반복되는 생활 불편을 안전하게 해결하려는 사용자",
    evergreen: 5,
    contentMode: "research-verification",
    uniqueOutput: "원인·재질·상태에 따라 방법을 나눈 조건별 해결표",
    verificationPlan: "제품·소재 공식 관리법과 안전 주의사항을 확인한다.",
  },
  {
    category: "food-kitchen",
    label: "식생활·주방",
    queries: [
      "채소 과일 냉장 보관", "밥 빵 떡 냉동 보관 해동", "쌀 잡곡 보관 벌레",
      "반찬 남은 음식 보관", "밀폐용기 냄새 얼룩", "양념 조미료 보관",
      "도시락 보관 가져가기", "김 견과류 눅눅 보관", "주방용기 냄새 제거",
    ],
    audience: "식재료·주방용품을 낭비 없이 관리하려는 사용자",
    evergreen: 5,
    contentMode: "research-verification",
    uniqueOutput: "보관 조건·기간·용기 차이를 비교한 실용 기준표",
    verificationPlan: "식품 안전 관련 사실은 공식 기관 자료로 확인한다.",
  },
  {
    category: "clothing-laundry",
    label: "의류·세탁",
    queries: [
      "옷 얼룩 세탁 제거", "수건 냄새 세탁", "신발 세척 건조",
      "패딩 니트 세탁 보관", "흰옷 이염 세탁", "옷 라벨 세탁기호 보는 법",
      "운동화 냄새 관리", "계절 옷 보관", "가방 모자 세척 보관",
    ],
    audience: "의류·신발·패브릭을 손상 없이 관리하려는 사용자",
    evergreen: 5,
    contentMode: "research-verification",
    uniqueOutput: "소재와 오염 종류별 가능한 방법과 피해야 할 방법을 나눈 표",
    verificationPlan: "케어라벨·제조사·공식 안전 자료를 확인한다.",
  },
  {
    category: "product-use",
    label: "제품 활용",
    queries: [
      "에어프라이어 첫 사용 세척", "전기밥솥 설정 세척", "식기세척기 세제 필터",
      "커피머신 세척 사용", "로봇청소기 지도 초기화", "제습기 물통 필터",
      "가습기 세척 사용", "공기청정기 필터 알림", "TV 리모컨 연결 설정",
    ],
    audience: "생활제품을 설명서대로 제대로 사용하고 관리하려는 사용자",
    evergreen: 5,
    contentMode: "research-verification",
    uniqueOutput: "공식 설명서를 실제 사용 순서로 다시 배열한 단계별 가이드",
    verificationPlan: "제조사 설명서와 고객지원 문서를 우선 확인한다.",
  },
  {
    category: "documents-work",
    label: "문서·업무 실용",
    queries: [
      "PDF 서명 넣기", "문서 스캔 파일 만들기", "사진을 PDF로 만들기",
      "엑셀 CSV 파일 열기", "압축파일 풀기 만들기", "파일 이름 일괄 정리",
      "영수증 보증서 정리", "온라인 양식 제출 파일", "문서 인쇄 여백 설정",
    ],
    audience: "회사·학교·개인 업무에서 문서와 파일을 처리하려는 사용자",
    evergreen: 5,
    contentMode: "research-verification",
    uniqueOutput: "실제 완료 절차와 호환성 문제를 중심으로 한 가이드",
    verificationPlan: "운영체제·서비스 공식 도움말을 기준으로 검증한다.",
  },
  {
    category: "local-daily",
    label: "지역 생활",
    queries: [
      "도서관 회원증 대출 반납", "공공체육시설 예약", "공영주차장 이용 방법",
      "종량제봉투 판매소 찾기", "지역 분리배출 요일", "생활폐기물 수거 문의",
      "무인민원발급기 위치 이용", "우체국 등기 찾기", "공공자전거 이용 방법",
    ],
    audience: "거주 지역의 실제 생활 서비스를 이용하려는 사용자",
    evergreen: 4,
    contentMode: "research-verification",
    uniqueOutput: "지역별 차이를 분리하고 공식 조회 경로를 바로 찾는 안내",
    verificationPlan: "해당 지자체·공공기관 공식 페이지를 최신 기준으로 확인한다.",
  },
  {
    category: "leisure-practical",
    label: "여가·문화 실용",
    queries: [
      "도서관 책 예약 연장", "공연 티켓 모바일 입장", "영화관 예매 취소 방법",
      "전시 관람 예약 준비", "캠핑 장비 보관 정리", "여행 짐 싸기 체크",
      "사진 인화 파일 준비", "중고책 기증 방법", "공공문화시설 이용",
    ],
    audience: "여가·문화생활에서 예약·준비·이용 절차가 궁금한 사용자",
    evergreen: 4,
    contentMode: "research-verification",
    uniqueOutput: "이용 전 준비와 취소·변경·보관까지 이어지는 체크리스트",
    verificationPlan: "시설·운영사 공식 안내를 우선 확인한다.",
  },
  {
    category: "consumer-practical",
    label: "소비자 실용정보",
    queries: [
      "온라인 주문 옵션 변경", "배송 전 주문 취소", "제품 보증서 찾기",
      "영수증 없이 구매내역 확인", "택배 포장 재사용", "제품 모델명 확인 방법",
      "소모품 규격 확인", "설명서 찾는 방법", "구매 후 초기 설정",
    ],
    audience: "구매 이후 배송·보증·설명서·모델 확인 문제를 해결하려는 사용자",
    evergreen: 4,
    contentMode: "research-verification",
    uniqueOutput: "공식 판매자·제조사 절차와 준비 정보를 분리한 가이드",
    verificationPlan: "제조사·판매처 공식 정책과 실제 화면 경로를 확인한다.",
  },
];

const SEASONAL_QUERIES: Record<number, string[]> = {
  1: ["한파 생활 준비", "겨울 결로 관리", "겨울 빨래 건조"],
  2: ["이사철 짐 정리", "봄 준비 생활", "겨울용품 보관"],
  3: ["봄철 집 관리", "환절기 의류 정리", "봄 공공시설 이용"],
  4: ["봄 나들이 준비", "계절 옷 보관", "황사 후 집 청소"],
  5: ["초여름 생활 준비", "여름 전 가전 점검", "여름 식재료 보관"],
  6: ["장마 빨래 건조", "습기 곰팡이 관리", "여름 이사 준비"],
  7: ["폭염 생활 준비", "냉방 제품 사용", "여름 음식 보관"],
  8: ["여름 휴가 짐 정리", "폭염 집 관리", "가을 준비 생활"],
  9: ["가을 옷 정리", "환절기 집 관리", "추석 생활 준비"],
  10: ["가을 집 관리", "겨울 준비 생활", "난방 전 점검"],
  11: ["초겨울 생활 준비", "계절 이불 정리", "겨울 가전 관리"],
  12: ["연말 정리", "한파 생활 준비", "겨울 보관 관리"],
};

function dayOfYear(date: Date) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 0);
  return Math.floor((Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - start) / 86_400_000);
}

function pickRotating<T>(items: T[], index: number) {
  if (!items.length) throw new Error("탐색 범위가 비어 있습니다.");
  return items[((index % items.length) + items.length) % items.length];
}

export function getAutoResearchSeeds(date: Date, offset = 0, count = 8): AutoResearchSeed[] {
  const day = dayOfYear(date);
  const month = date.getUTCMonth() + 1;
  const rotation = Math.max(0, offset);

  const seasonal: DiscoveryScope = {
    category: "seasonal-practical",
    label: "계절 생활",
    queries: SEASONAL_QUERIES[month] || ["계절 생활 불편"],
    audience: "지금 계절에 반복되는 생활 문제를 해결하려는 사용자",
    evergreen: 3,
    contentMode: "research-verification",
    uniqueOutput: "현재 계절의 실제 질문과 공식 기준을 교차한 실용 체크리스트",
    verificationPlan: "현재 연도·시점과 공식 최신 원문을 확인한다.",
  };

  const scopes = [...BASE_SCOPES, seasonal];
  const target = Math.max(1, Math.min(count, scopes.length));
  const start = (day + rotation * 3) % scopes.length;
  const selected: AutoResearchSeed[] = [];

  for (let i = 0; i < target; i += 1) {
    const scope = scopes[(start + i) % scopes.length];
    selected.push({
      query: pickRotating(scope.queries, day + rotation * 5 + i * 3),
      category: scope.category,
      audience: scope.audience,
      evergreen: scope.evergreen,
      contentMode: scope.contentMode,
      uniqueOutput: scope.uniqueOutput,
      verificationPlan: scope.verificationPlan,
    });
  }

  return selected;
}

export function autoResearchCategoryLabel(category: AutoResearchCategory) {
  const scope = BASE_SCOPES.find((item) => item.category === category);
  if (scope) return scope.label;
  if (category === "seasonal-practical") return "계절 생활";
  return "생활/실용정보";
}

const STOP_WORDS = new Set([
  "방법", "관련", "문의", "질문", "궁금", "궁금해요", "궁금합니다", "알려주세요", "어떻게",
  "되나요", "될까요", "인가요", "해주세요", "추천", "정도", "혹시", "때", "경우", "문제", "해결",
  "사용", "가능", "확인", "평균",
]);

const STRONG_THEME_WORDS = [
  "필터", "배터리", "저장공간", "사진", "청소", "세척", "정리", "보관", "폐기물", "신청", "신고",
  "냄새", "소음", "누수", "배수", "충전", "데이터", "계정", "건조", "교체", "백업", "동기화",
  "수납", "습기", "결로", "설치", "알림", "파일", "와이파이", "세탁", "배송", "택배", "서류",
  "발급", "예약", "반송", "수령", "스캔", "인쇄", "해동", "얼룩",
];

const ENTITY_WORDS = [
  "에어컨", "공기청정기", "세탁기", "건조기", "냉장고", "가습기", "보일러", "전자레인지",
  "노트북", "스마트폰", "휴대폰", "아이폰", "갤럭시", "컴퓨터", "프린터", "카카오톡",
  "매트리스", "소파", "옷", "이불", "쌀", "택배", "대형폐기물", "폐가전", "쓰레기",
  "도서관", "주차장", "PDF", "우편", "등기", "신발", "커피머신", "에어프라이어",
];

export function topicTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^0-9a-z가-힣]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export function topicSimilarity(a: string, b: string) {
  const left = new Set(topicTokens(a));
  const right = new Set(topicTokens(b));
  if (!left.size || !right.size) return 0;

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  const jaccard = union ? intersection / union : 0;
  const containment = intersection / Math.min(left.size, right.size);
  const compactA = [...left].join("");
  const compactB = [...right].join("");
  const contains = compactA.includes(compactB) || compactB.includes(compactA) ? 0.18 : 0;

  return Math.min(1, jaccard * 0.65 + containment * 0.35 + contains);
}

export function topicEntity(value: string) {
  return ENTITY_WORDS.find((word) => value.includes(word)) || "";
}

export function topicTheme(value: string) {
  return STRONG_THEME_WORDS.find((word) => value.includes(word)) || "";
}

export function isSameTopicCluster(a: string, b: string) {
  const similarity = topicSimilarity(a, b);
  if (similarity >= 0.5) return true;

  const entityA = topicEntity(a);
  const entityB = topicEntity(b);
  const themeA = topicTheme(a);
  const themeB = topicTheme(b);
  return Boolean(entityA && entityA === entityB && themeA && themeA === themeB);
}
