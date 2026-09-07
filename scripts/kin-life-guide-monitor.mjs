import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const NAVER_BASE_URL = process.env.NAVER_API_HUB_BASE_URL || "https://naverapihub.apigw.ntruss.com";
const NOTION_VERSION = "2026-03-11";
const SCORE_THRESHOLD = numberEnv("MONITOR_SCORE_THRESHOLD", 8);
const MAX_PAGES_PER_RUN = integerEnv("MONITOR_MAX_PAGES_PER_RUN", 5, 1, 20);
const SEEDS_PER_RUN = integerEnv("MONITOR_SEEDS_PER_RUN", 28, 1, 40);
const SEARCH_DISPLAY = 50;
const MAX_DEDUPE_CHECKS = 14;
const MAX_RAW_SCORE = 14.5;
const MAX_EVERGREEN_SCORE = 3;
const MAX_FOCUSED_PROMPTS_PER_RUN = integerEnv("MONITOR_MAX_FOCUSED_PROMPTS_PER_RUN", 5, 1, 10);
const FOCUSED_RESEARCH_CLI = process.env.FOCUSED_RESEARCH_CLI || "./node_modules/.bin/tsx";

const seeds = [
  ["휴대폰 백업 복원 데이터 이전", "디지털 생활"],
  ["아이폰 사진 파일 옮기기 백업", "디지털 생활"],
  ["갤럭시 백업 복원 Smart Switch", "디지털 생활"],
  ["앱 데이터 계정 동기화 초기화", "디지털 생활"],
  ["컴퓨터 파일 백업 복구 저장", "디지털 생활"],
  ["와이파이 블루투스 연결 설정 안됨", "디지털 생활"],
  ["카카오톡 대화 백업 복원 PC", "디지털 생활"],
  ["클라우드 사진 파일 동기화 문제", "디지털 생활"],

  ["대형폐기물 신청 배출 수거", "생활 행정"],
  ["분리수거 재활용 버리는 방법", "생활 행정"],
  ["주민센터 온라인 민원 신청 방법", "생활 행정"],
  ["전입신고 주소변경 생활 민원", "생활 행정"],
  ["우편 택배 반송 수령 생활", "생활 행정"],
  ["공공서비스 신청 준비물 생활", "생활 행정"],

  ["세탁기 청소 필터 배수 사용", "집 관리"],
  ["에어컨 필터 청소 관리", "집 관리"],
  ["냉장고 냉동실 보관 정리", "집 관리"],
  ["집 곰팡이 습기 환기 관리", "집 관리"],
  ["욕실 주방 청소 보관 관리", "집 관리"],

  ["이불 옷 보관 정리 방법", "정리·보관"],
  ["식재료 냉장 냉동 보관 방법", "정리·보관"],
  ["이사 짐 정리 보관 방법", "정리·보관"],
  ["서류 사진 파일 정리 보관", "정리·보관"],

  ["제품 사용법 설정 초기화", "제품 사용"],
  ["제품 연결 설치 사용 안됨", "제품 사용"],
  ["충전 배터리 설정 사용 방법", "제품 사용"],
  ["기기 교체 이전 초기 설정", "제품 사용"],
  ["설명서 없이 설정 사용 방법", "제품 사용"],
];

const hardExcludeGroups = {
  "의료·건강": [
    "병원", "의사", "약사", "약 ", "약물", "복용", "처방", "증상", "진단", "치료", "질환", "질병",
    "수술", "통증", "혈압", "혈당", "임신", "생리", "영양제", "다이어트", "칼로리", "건강검진",
    "출혈", "혈변", "대변", "기침", "구토", "설사", "항문", "피부질환", "두통", "발열", "상처", "감염",
  ],
  "법률·분쟁": [
    "고소", "고발", "소송", "변호사", "법률", "법적", "처벌", "형사", "민사", "합의금", "손해배상",
    "내용증명", "벌금", "징역", "전과", "노동법", "근로기준법", "해고", "산재",
  ],
  "금융·재정": [
    "대출", "주식", "코인", "투자", "재테크", "보험", "연금", "세금", "절세", "신용점수", "카드론",
    "이자", "채무", "채권", "파산", "회생", "청약", "증권",
  ],
  "전문 안전 작업": [
    "가스 누출", "가스누출", "누전", "감전", "배선 작업", "전기공사", "분전반", "차단기 교체", "석면",
    "보일러 분해", "가스 배관", "구조 균열", "화재 진압",
  ],
};

const areaTerms = {
  "디지털 생활": [
    "휴대폰", "스마트폰", "아이폰", "갤럭시", "안드로이드", "컴퓨터", "노트북", "pc", "윈도우", "앱", "계정",
    "백업", "복원", "동기화", "클라우드", "icloud", "파일", "사진", "데이터", "카카오톡", "와이파이", "블루투스",
  ],
  "생활 행정": [
    "대형폐기물", "폐기물", "분리수거", "재활용", "배출", "수거", "주민센터", "민원", "전입신고", "주소변경",
    "신고", "신청", "우편", "택배", "공공", "구청", "시청", "동사무소",
  ],
  "집 관리": [
    "세탁기", "냉장고", "에어컨", "청소", "필터", "배수", "욕실", "주방", "환기", "습기", "곰팡이", "건조",
    "세척", "집안", "가전",
  ],
  "정리·보관": [
    "보관", "정리", "수납", "냉장", "냉동", "이불", "옷", "식재료", "서류", "짐", "보관함", "정리함",
  ],
  "제품 사용": [
    "사용법", "사용 방법", "설정", "초기화", "설치", "연결", "교체", "충전", "업데이트", "오류", "안됨", "안 돼",
    "작동", "기기", "제품", "설명서",
  ],
};

const problemTerms = [
  "어떻게", "방법", "왜", "언제", "얼마나", "가능", "안됨", "안돼", "안 돼", "없어", "사라", "오류", "문제",
  "복구", "복원", "백업", "옮기", "이전", "버리", "배출", "수거", "보관", "청소", "세척", "설정", "초기화",
  "연결", "설치", "교체", "삭제", "변경", "준비", "확인", "차이", "되나요", "인가요", "할까요", "인가",
];

const evergreenStrongTerms = [
  "방법", "차이", "언제", "가능", "백업", "복원", "이전", "옮기", "보관", "버리", "배출", "수거", "청소", "세척",
  "설정", "초기화", "연결", "설치", "교체", "준비물", "확인", "사용법", "오류", "안됨",
];

const ephemeralTerms = [
  "오늘", "지금 실시간", "실시간", "방금", "속보", "이벤트", "쿠폰", "할인", "특가", "프로모션", "당첨", "오픈런",
  "서버 터짐", "먹통", "장애 발생", "오늘만",
];

const shoppingNoiseTerms = ["최저가", "구매 추천", "뭐 살까요", "추천해주세요", "판매처", "가격 비교", "중고 가격"];
const htmlEntityPattern = /&(?:amp|lt|gt|quot|apos|#39);/g;

main().catch((error) => {
  console.error(`[KIN monitor] ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exitCode = 1;
});

async function main() {
  requireEnv("NAVER_API_HUB_CLIENT_ID");
  requireEnv("NAVER_API_HUB_CLIENT_SECRET");
  requireEnv("NOTION_API_KEY");
  requireEnv("NOTION_DATA_SOURCE_ID");

  const schema = await retrieveNotionDataSource();
  const notionProperties = resolveNotionProperties(schema.properties || {});
  if (!notionProperties.url) {
    throw new Error(
      "Notion 데이터 소스에 URL 속성이 필요합니다. `원문 URL`(URL 타입)을 추가하거나 Repository Variable `NOTION_URL_PROPERTY`에 실제 URL 속성명을 지정하세요.",
    );
  }

  await backfillMissingQuestionSummaries(notionProperties);

  const selectedSeeds = rotatingSeedBatch();
  console.log(`[KIN monitor] ${selectedSeeds.length}개 탐색어 조회 · 기준점수 ${SCORE_THRESHOLD}`);

  const raw = [];
  for (const [query, area] of selectedSeeds) {
    try {
      const items = await searchKin(query);
      items.forEach((item, index) => raw.push({ ...item, seedQuery: query, seedArea: area, dateRank: index + 1 }));
    } catch (error) {
      console.warn(`[KIN monitor] 검색 실패: ${query} · ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const unique = dedupeByUrlAndTitle(raw)
    .map(analyzeQuestion)
    .filter((item) => !item.excluded)
    .filter((item) => item.scopeScore >= 2 && item.problemScore >= 1);

  const clustered = clusterQuestions(unique)
    .map(scoreCluster)
    .filter((item) => item.totalScore >= SCORE_THRESHOLD)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, MAX_DEDUPE_CHECKS);

  if (!clustered.length) {
    console.log(`[KIN monitor] 등록 후보 없음 · 원시 ${raw.length}건 / 중복·제외 후 ${unique.length}건`);
    return;
  }

  let created = 0;
  let focusedPromptsGenerated = 0;

  for (const rawCandidate of clustered) {
    if (created >= MAX_PAGES_PER_RUN) break;
    const existingPage = await findNotionPageByUrl(rawCandidate.link, notionProperties.url.name);
    const candidate = await hydrateKinQuestion(rawCandidate);

    const validation = validateHydratedQuestion(candidate);
    if (!validation.ok) {
      console.log(`[KIN monitor] 원문 재검증 제외: ${candidate.title} · ${validation.reason}`);
      await sleep(360);
      continue;
    }

    if (existingPage) {
      if (candidate.questionText && notionProperties.summary) {
        await updateNotionQuestionSummary(existingPage.id, candidate, notionProperties);
      }

      const hasPrompt = await notionPageHasFocusedPrompt(existingPage.id);
      if (!hasPrompt && focusedPromptsGenerated < MAX_FOCUSED_PROMPTS_PER_RUN) {
        if (await generateAndSaveFocusedPrompt(candidate)) focusedPromptsGenerated += 1;
      } else {
        console.log(`[KIN monitor] 이미 등록됨${hasPrompt ? " · 프롬프트 준비 완료" : ""}: ${candidate.title}`);
      }

      await sleep(360);
      continue;
    }

    await createNotionPage(candidate, notionProperties);
    created += 1;
    console.log(`[KIN monitor] Notion 후보 등록: ${candidate.title} · ${scoreToPercent(candidate.totalScore, MAX_RAW_SCORE)}점/100 (raw ${candidate.totalScore.toFixed(1)}/${MAX_RAW_SCORE})`);

    if (focusedPromptsGenerated < MAX_FOCUSED_PROMPTS_PER_RUN) {
      if (await generateAndSaveFocusedPrompt(candidate)) focusedPromptsGenerated += 1;
    }

    await sleep(360);
  }

  if (focusedPromptsGenerated < MAX_FOCUSED_PROMPTS_PER_RUN) {
    focusedPromptsGenerated += await backfillMissingFocusedPrompts(
      notionProperties,
      MAX_FOCUSED_PROMPTS_PER_RUN - focusedPromptsGenerated,
    );
  }

  console.log(
    `[KIN monitor] 완료 · 원시 ${raw.length}건 / 1차 통과 ${unique.length}건 / 점수 통과 ${clustered.length}건 / 신규 등록 ${created}건 / 최종 프롬프트 ${focusedPromptsGenerated}건`,
  );
}

function rotatingSeedBatch() {
  const batches = Math.ceil(seeds.length / SEEDS_PER_RUN);
  const halfHourSlot = Math.floor(Date.now() / 1_800_000);
  const batchIndex = halfHourSlot % batches;
  const start = batchIndex * SEEDS_PER_RUN;
  return seeds.slice(start, start + SEEDS_PER_RUN);
}

async function searchKin(query) {
  const url = new URL(`${NAVER_BASE_URL}/search/v1/kin`);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(SEARCH_DISPLAY));
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "date");

  const response = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_API_HUB_CLIENT_ID,
      "X-NCP-APIGW-API-KEY": process.env.NAVER_API_HUB_CLIENT_SECRET,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`NAVER ${response.status}: ${text.slice(0, 300)}`);
  const data = safeJson(text);
  return Array.isArray(data?.items) ? data.items : [];
}

async function hydrateKinQuestion(candidate) {
  const urls = kinQuestionFetchUrls(candidate.link);
  const fetchProfiles = [
    {
      name: "mobile",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    },
    {
      name: "desktop",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
    },
  ];

  let lastError = "";
  let bestFallback = "";
  let bestFallbackTitle = "";
  let bestFallbackUrl = "";

  for (const url of urls) {
    for (const profile of fetchProfiles) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.5",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Referer: "https://kin.naver.com/",
            "User-Agent": profile.userAgent,
          },
          redirect: "follow",
        });

        if (!response.ok) {
          lastError = `${profile.name} HTTP ${response.status} (${url})`;
          continue;
        }

        const html = await response.text();
        const pageTitle = extractKinQuestionTitle(html);
        const questionText = extractKinQuestionText(html);

        if (questionText) {
          return {
            ...candidate,
            link: canonicalKinQuestionUrl(candidate.link),
            title: pageTitle || candidate.title,
            questionText,
            questionTextVerified: true,
            questionTextSource: "page-body",
            questionSourceUrl: url,
          };
        }

        const metaFallback = extractKinQuestionMetaDescription(html);
        if (!bestFallback && metaFallback) {
          bestFallback = metaFallback;
          bestFallbackTitle = pageTitle || candidate.title;
          bestFallbackUrl = url;
        }

        lastError = `본문 영역 추출 실패 (${profile.name} · ${url})`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  const canonicalUrl = canonicalKinQuestionUrl(candidate.link);

  if (bestFallback) {
    console.warn(`[KIN monitor] 질문 본문 DOM 추출 실패, 원문 meta description 사용: ${canonicalUrl}`);
    return {
      ...candidate,
      link: canonicalUrl,
      title: bestFallbackTitle || candidate.title,
      questionText: bestFallback,
      questionTextVerified: false,
      questionTextSource: "meta-description",
      questionSourceUrl: bestFallbackUrl || canonicalUrl,
    };
  }

  console.warn(`[KIN monitor] 질문 원문 확인 실패: ${canonicalUrl} · ${lastError || "알 수 없는 오류"}`);
  return {
    ...candidate,
    link: canonicalUrl,
    questionText: "",
    questionTextVerified: false,
    questionTextSource: "unavailable",
  };
}

function kinQuestionFetchUrls(value) {
  try {
    const raw = new URL(value);
    const dirId = raw.searchParams.get("dirId") || extractPathPart(raw.pathname, "dirs");
    const docId = raw.searchParams.get("docId") || extractPathPart(raw.pathname, "docs");
    const d1id = raw.searchParams.get("d1id") || "";
    const candidates = [raw.toString()];

    if (dirId && docId) {
      candidates.push(`https://m.kin.naver.com/qna/dirs/${encodeURIComponent(dirId)}/docs/${encodeURIComponent(docId)}`);
      candidates.push(`https://kin.naver.com/qna/dirs/${encodeURIComponent(dirId)}/docs/${encodeURIComponent(docId)}`);

      const desktop = new URL("https://kin.naver.com/qna/detail.naver");
      if (d1id) desktop.searchParams.set("d1id", d1id);
      desktop.searchParams.set("dirId", dirId);
      desktop.searchParams.set("docId", docId);
      candidates.push(desktop.toString());

      const mobile = new URL("https://m.kin.naver.com/qna/detail.naver");
      if (d1id) mobile.searchParams.set("d1id", d1id);
      mobile.searchParams.set("dirId", dirId);
      mobile.searchParams.set("docId", docId);
      candidates.push(mobile.toString());
    }

    candidates.push(canonicalKinQuestionUrl(value));
    return [...new Set(candidates.filter(Boolean))];
  } catch {
    return [canonicalKinQuestionUrl(value)];
  }
}

function extractPathPart(pathname, marker) {
  const parts = String(pathname || "").split("/").filter(Boolean);
  const index = parts.indexOf(marker);
  return index >= 0 ? parts[index + 1] || "" : "";
}

function validateHydratedQuestion(candidate) {
  // Naver 검색 API의 description은 답변 스니펫일 수 있으므로 최종 등록 판단에는 사용하지 않습니다.
  const sourceText = `${candidate.title} ${candidate.questionText || ""}`.toLowerCase();
  const excludedBy = findExcludedGroup(sourceText);
  if (excludedBy) return { ok: false, reason: `제외 분야(${excludedBy})` };

  const areaScores = Object.entries(areaTerms).map(([area, terms]) => [area, countMatches(sourceText, terms)]);
  areaScores.sort((a, b) => b[1] - a[1]);
  const [bestArea, areaHits] = areaScores[0] || [candidate.area || candidate.seedArea || "생활 가이드", 0];
  const problemHits = countMatches(sourceText, problemTerms);
  const hasQuestionMark = candidate.title.includes("?");

  // 질문 본문을 읽은 경우에는 실제 질문 내용에서 생활 가이드 범위가 확인되어야 합니다.
  if (candidate.questionTextVerified && areaHits === 0) {
    return { ok: false, reason: "실제 질문 본문이 생활 가이드 범위와 맞지 않음" };
  }
  if (candidate.questionTextVerified && problemHits === 0 && !hasQuestionMark) {
    return { ok: false, reason: "실제 질문에서 해결해야 할 문제 의도가 약함" };
  }

  candidate.area = bestArea || candidate.area || candidate.seedArea || "생활 가이드";
  return { ok: true };
}

function extractKinQuestionText(html) {
  const structured = extractQuestionTextFromJsonLd(html);
  if (isUsableQuestionText(structured)) return normalizeQuestionText(structured);

  const classCandidates = [
    "questionDetail",
    "c-heading__content",
    "question-content",
  ];

  for (const className of classCandidates) {
    const value = extractHtmlByClass(html, className);
    const extracted = htmlToText(value);
    if (isUsableQuestionText(extracted)) return normalizeQuestionText(extracted);
  }

  return "";
}

function extractKinQuestionMetaDescription(html) {
  const candidates = [
    extractMetaContent(html, "og:description"),
    extractMetaContent(html, "twitter:description"),
  ];

  for (const value of candidates) {
    const normalized = normalizeQuestionText(value);
    if (isUsableQuestionText(normalized)) return normalized;
  }
  return "";
}

function extractQuestionTextFromJsonLd(html) {
  const scripts = [...String(html || "").matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(match[1]).trim());
      const found = findQuestionNode(parsed);
      if (found) {
        const value = found.text || found.description || "";
        if (isUsableQuestionText(value)) return value;
      }
    } catch {
      // 일부 페이지의 JSON-LD가 완전한 JSON이 아닐 수 있으므로 다음 후보를 계속 확인합니다.
    }
  }
  return "";
}

function findQuestionNode(value) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findQuestionNode(item);
      if (found) return found;
    }
    return null;
  }

  const type = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (type.some((item) => String(item || "").toLowerCase() === "question")) return value;

  for (const child of Object.values(value)) {
    const found = findQuestionNode(child);
    if (found) return found;
  }
  return null;
}

function isUsableQuestionText(value) {
  const text = cleanText(value || "");
  if (text.length < 2) return false;
  const lower = text.toLowerCase();
  const blocked = [
    "네이버 지식in", "지식인에서 답변", "답변을 입력해주세요", "메뉴 더보기", "답변 1개", "답변 2개",
    "페이지를 찾을 수 없습니다", "접근이 제한", "서비스 이용이 제한",
  ];
  return !blocked.some((term) => lower.includes(term.toLowerCase()));
}

function normalizeQuestionText(value) {
  return htmlToText(value)
    .replace(/^질문\s*/i, "")
    .replace(/\s*답변\s*\d+개[\s\S]*$/i, "")
    .trim()
    // 비정상적으로 큰 페이지 전체 텍스트가 들어오는 사고만 막고 일반 질문 본문은 끝까지 보존합니다.
    .slice(0, 8000);
}

function extractKinQuestionTitle(html) {
  const ogTitle = extractMetaContent(html, "og:title");
  if (ogTitle) return cleanKinTitle(htmlToText(ogTitle));
  const titleBlock = htmlToText(extractHtmlByClass(html, "title"));
  if (titleBlock) return cleanKinTitle(titleBlock);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  return cleanKinTitle(htmlToText(titleTag));
}

function cleanKinTitle(value) {
  return cleanText(value)
    .replace(/^질문\s*/i, "")
    .replace(/\s*[:|\-]\s*지식iN.*$/i, "")
    .trim()
    .slice(0, 180);
}

function extractHtmlByClass(html, className) {
  const escaped = escapeRegExp(className);
  const source = String(html || "");
  const openPattern = new RegExp(
    `<([a-z0-9]+)\\b[^>]*class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>`,
    "i",
  );
  const openMatch = openPattern.exec(source);
  if (!openMatch) return "";

  const tagName = openMatch[1].toLowerCase();
  const contentStart = openMatch.index + openMatch[0].length;
  const tokenPattern = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*>`, "gi");
  tokenPattern.lastIndex = contentStart;
  let depth = 1;
  let token;

  while ((token = tokenPattern.exec(source))) {
    const tokenText = token[0];
    const isClosing = tokenText.startsWith("</");
    const isSelfClosing = /\/\s*>$/.test(tokenText);
    if (isClosing) depth -= 1;
    else if (!isSelfClosing) depth += 1;

    if (depth === 0) return source.slice(contentStart, token.index);
  }

  return "";
}

function extractMetaContent(html, propertyName) {
  const escaped = escapeRegExp(propertyName);
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function htmlToText(value) {
  if (!value) return "";
  return decodeHtmlEntities(
    String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[\t\r ]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function canonicalKinQuestionUrl(value) {
  try {
    const url = new URL(value);
    if (!/(^|\.)kin\.naver\.com$/i.test(url.hostname)) return normalizeUrl(value);
    const dirId = url.searchParams.get("dirId") || "";
    const docId = url.searchParams.get("docId") || "";
    if (!docId) return normalizeUrl(value);
    const canonical = new URL("https://kin.naver.com/qna/detail.naver");
    if (dirId) canonical.searchParams.set("dirId", dirId);
    canonical.searchParams.set("docId", docId);
    return canonical.toString();
  } catch {
    return String(value || "").trim();
  }
}

function analyzeQuestion(item) {
  const title = cleanText(item.title || "");
  const description = cleanText(item.description || "");
  const combined = `${title} ${description}`.toLowerCase();
  const excludedBy = findExcludedGroup(combined);
  if (excludedBy) return { ...item, title, description, excluded: true, excludedBy };

  const areaScores = Object.entries(areaTerms).map(([area, terms]) => [area, countMatches(combined, terms)]);
  areaScores.sort((a, b) => b[1] - a[1]);
  const [bestArea, areaHits] = areaScores[0] || [item.seedArea || "생활 가이드", 0];
  const scopeScore = Math.min(4, areaHits >= 4 ? 4 : areaHits >= 2 ? 3 : areaHits === 1 ? 2 : 0);

  const problemHits = countMatches(combined, problemTerms);
  const hasQuestionMark = title.includes("?");
  const problemScore = Math.min(3, problemHits >= 3 ? 3 : problemHits >= 1 ? 2 : hasQuestionMark ? 1 : 0);

  const evergreenHits = countMatches(combined, evergreenStrongTerms);
  const ephemeralHits = countMatches(combined, ephemeralTerms);
  let evergreenScore = evergreenHits >= 3 ? 3 : evergreenHits >= 1 ? 2 : 1;
  if (ephemeralHits > 0) evergreenScore = Math.max(0, evergreenScore - 2);

  const noisePenalty = countMatches(combined, shoppingNoiseTerms) * 1.5 + (title.length < 8 ? 1 : 0);
  const recencyHint = item.dateRank <= 10 ? 1.5 : item.dateRank <= 25 ? 1 : 0.5;

  return {
    ...item,
    title,
    description,
    excluded: false,
    area: bestArea || item.seedArea || "생활 가이드",
    scopeScore,
    problemScore,
    evergreenScore,
    recencyHint,
    noisePenalty,
    tokens: importantTokens(`${title} ${description}`),
  };
}

function clusterQuestions(items) {
  const clusters = [];
  for (const item of items) {
    let best = null;
    let bestSimilarity = 0;
    for (const cluster of clusters) {
      const similarity = tokenJaccard(item.tokens, cluster.tokens);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        best = cluster;
      }
    }
    if (best && bestSimilarity >= 0.48) {
      best.items.push(item);
      best.tokens = unionTokens(best.tokens, item.tokens);
    } else {
      clusters.push({ items: [item], tokens: item.tokens });
    }
  }
  return clusters;
}

function scoreCluster(cluster) {
  const representative = [...cluster.items].sort((a, b) => {
    const scoreA = a.scopeScore + a.problemScore + a.evergreenScore + a.recencyHint - a.noisePenalty;
    const scoreB = b.scopeScore + b.problemScore + b.evergreenScore + b.recencyHint - b.noisePenalty;
    return scoreB - scoreA;
  })[0];

  const independentLinks = new Set(cluster.items.map((item) => normalizeUrl(item.link)).filter(Boolean));
  const seedQueries = [...new Set(cluster.items.map((item) => item.seedQuery))];
  const repeatedDemandScore = Math.min(3, Math.max(0, independentLinks.size - 1) * 0.8 + Math.max(0, seedQueries.length - 1) * 0.4);
  const totalScore =
    representative.scopeScore +
    representative.problemScore +
    representative.evergreenScore +
    representative.recencyHint +
    repeatedDemandScore -
    representative.noisePenalty;

  return {
    ...representative,
    totalScore,
    repeatedDemandScore,
    independentQuestionCount: independentLinks.size,
    relatedTitles: cluster.items
      .filter((item) => item.link !== representative.link)
      .map((item) => item.title)
      .filter(Boolean)
      .slice(0, 5),
    matchedSeeds: seedQueries.slice(0, 6),
  };
}

function dedupeByUrlAndTitle(items) {
  const urls = new Set();
  const titles = new Set();
  const out = [];
  for (const item of items) {
    const url = normalizeUrl(item.link);
    const title = normalizeText(cleanText(item.title || ""));
    if (!url || !title || urls.has(url) || titles.has(title)) continue;
    urls.add(url);
    titles.add(title);
    out.push({ ...item, link: url });
  }
  return out;
}

function findExcludedGroup(text) {
  for (const [group, terms] of Object.entries(hardExcludeGroups)) {
    if (terms.some((term) => text.includes(term.toLowerCase()))) return group;
  }
  return "";
}

function countMatches(text, terms) {
  return terms.reduce((sum, term) => sum + (text.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function importantTokens(text) {
  const stopwords = new Set([
    "질문", "문의", "관련", "궁금", "해주세요", "합니다", "하는", "하고", "있나요", "되나요", "인가요", "어떻게", "제가",
    "이거", "저거", "정도", "때문", "대해서", "경우", "방법", "좀", "수", "것", "거", "요",
  ]);
  return [...new Set(normalizeText(text).split(" ").filter((token) => token.length >= 2 && !stopwords.has(token)))].slice(0, 30);
}

function tokenJaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let intersection = 0;
  for (const token of aSet) if (bSet.has(token)) intersection += 1;
  return intersection / (aSet.size + bSet.size - intersection);
}

function unionTokens(a, b) {
  return [...new Set([...a, ...b])].slice(0, 40);
}

async function retrieveNotionDataSource() {
  return notionFetch(`/v1/data_sources/${encodeURIComponent(process.env.NOTION_DATA_SOURCE_ID)}`);
}

function resolveNotionProperties(properties) {
  const entries = Object.values(properties || {});
  const title = entries.find((prop) => prop.type === "title");
  const requestedUrl = process.env.NOTION_URL_PROPERTY?.trim();
  const url = requestedUrl
    ? entries.find((prop) => prop.name === requestedUrl && prop.type === "url")
    : findProperty(entries, ["원문 URL", "지식iN URL", "URL", "링크", "Source URL"], "url");

  return {
    title,
    url,
    foundAt: findProperty(entries, ["발견일시", "발견 일시", "발견일", "수집일", "Created"], "date"),
    score: findProperty(entries, ["점수", "우선순위 점수", "Score"], "number"),
    evergreen: findProperty(entries, ["에버그린", "Evergreen"], "number"),
    demand: findProperty(entries, ["유사 질문", "독립 질문", "반복 수요"], "number"),
    summary: findProperty(entries, ["질문 요약", "요약", "Summary"], "rich_text"),
    category: findProperty(entries, ["카테고리", "Category"], "select"),
    area: findProperty(entries, ["내부 분류", "주제 영역", "Topic Area"], "select"),
    status: findProperty(entries, ["상태", "Status"], ["select", "status"]),
  };
}

function findProperty(entries, aliases, types) {
  const allowedTypes = Array.isArray(types) ? types : [types];
  return entries.find((prop) => aliases.includes(prop.name) && allowedTypes.includes(prop.type));
}

async function findNotionPageByUrl(url, propertyName) {
  const result = await notionFetch(`/v1/data_sources/${encodeURIComponent(process.env.NOTION_DATA_SOURCE_ID)}/query`, {
    method: "POST",
    body: {
      page_size: 1,
      filter: {
        property: propertyName,
        url: { equals: url },
      },
    },
  });
  return Array.isArray(result?.results) ? result.results[0] || null : null;
}

async function updateNotionQuestionSummary(pageId, candidate, props) {
  if (!pageId || !props.summary || !candidate.questionText) return;
  const properties = {
    [props.summary.name]: { rich_text: richTextChunks(candidate.questionText, 1800, 8000) },
  };
  await notionFetch(`/v1/pages/${encodeURIComponent(pageId)}`, {
    method: "PATCH",
    body: { properties },
  });
}

async function backfillMissingQuestionSummaries(props) {
  if (!props.summary || !props.url || !props.title) return;

  const result = await notionFetch(`/v1/data_sources/${encodeURIComponent(process.env.NOTION_DATA_SOURCE_ID)}/query`, {
    method: "POST",
    body: {
      page_size: 10,
      filter: {
        property: props.summary.name,
        rich_text: { contains: "원문 질문 본문을 자동으로 확인하지 못했습니다" },
      },
    },
  });

  const pages = Array.isArray(result?.results) ? result.results : [];
  if (!pages.length) return;

  console.log(`[KIN monitor] 기존 질문 요약 backfill ${pages.length}건 확인`);

  for (const page of pages) {
    const url = page?.properties?.[props.url.name]?.url || "";
    if (!url) continue;

    const titleParts = page?.properties?.[props.title.name]?.title || [];
    const title = Array.isArray(titleParts)
      ? titleParts.map((item) => item?.plain_text || item?.text?.content || "").join("").trim()
      : "";

    const candidate = await hydrateKinQuestion({
      link: url,
      title: title || "지식iN 질문",
    });

    if (candidate.questionText) {
      await updateNotionQuestionSummary(page.id, candidate, props);
      console.log(`[KIN monitor] 기존 질문 요약 backfill 완료: ${candidate.title}`);
    } else {
      console.warn(`[KIN monitor] 기존 질문 요약 backfill 실패: ${url}`);
    }

    await sleep(360);
  }
}

async function generateAndSaveFocusedPrompt(candidate) {
  try {
    const { stdout, stderr } = await execFileAsync(
      FOCUSED_RESEARCH_CLI,
      ["scripts/focused-research-cli.ts", candidate.link],
      {
        env: process.env,
        timeout: 300_000,
        maxBuffer: 32 * 1024 * 1024,
      },
    );

    if (stderr?.trim()) {
      console.warn(
        `[KIN monitor] Focused CLI 참고: ${stderr.trim().slice(0, 1200)}`,
      );
    }

    const lines = String(stdout || "")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    const result = safeJson(lines[lines.length - 1] || "");
    if (!result?.ok) {
      throw new Error(
        "Focused Research CLI가 성공 응답을 반환하지 않았습니다.",
      );
    }

    console.log(
      `[KIN monitor] Focused Research → Notion 최종 프롬프트 저장: ${candidate.title}`
      + `${result.pageUrl ? ` · ${result.pageUrl}` : ""}`
      + `${result.promptVersion ? ` · prompt ${result.promptVersion}` : ""}`,
    );
    return true;
  } catch (error) {
    console.warn(
      `[KIN monitor] Focused Research 자동 프롬프트 실패: ${candidate.title} · ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}

function blockPlainText(block) {
  const content = block?.[block?.type];
  const richTextItems = Array.isArray(content?.rich_text) ? content.rich_text : [];
  return richTextItems.map((item) => item?.plain_text || item?.text?.content || "").join("");
}

async function notionPageHasFocusedPrompt(pageId) {
  if (!pageId) return false;
  try {
    const result = await notionFetch(`/v1/blocks/${encodeURIComponent(pageId)}/children?page_size=10`);
    const blocks = Array.isArray(result?.results) ? result.results : [];
    return blocks.some((block) => blockPlainText(block).includes("ChatGPT Pro 작성 프롬프트"));
  } catch (error) {
    console.warn(`[KIN monitor] Notion 프롬프트 존재 확인 실패: ${pageId} · ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function notionStatusFilter(statusProp, value) {
  if (!statusProp || !value) return undefined;
  if (statusProp.type === "status") {
    return { property: statusProp.name, status: { equals: value } };
  }
  if (statusProp.type === "select") {
    return { property: statusProp.name, select: { equals: value } };
  }
  return undefined;
}

async function backfillMissingFocusedPrompts(props, limit) {
  if (!limit || !props.url || !props.title) return 0;

  const body = { page_size: 20 };
  const statusFilter = notionStatusFilter(props.status, "검토 전");
  if (statusFilter) body.filter = statusFilter;
  if (props.foundAt) {
    body.sorts = [{ property: props.foundAt.name, direction: "descending" }];
  }

  let result;
  try {
    result = await notionFetch(`/v1/data_sources/${encodeURIComponent(process.env.NOTION_DATA_SOURCE_ID)}/query`, {
      method: "POST",
      body,
    });
  } catch (error) {
    console.warn(`[KIN monitor] 기존 Notion 프롬프트 backfill 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
    return 0;
  }

  const pages = Array.isArray(result?.results) ? result.results : [];
  let generated = 0;

  for (const page of pages) {
    if (generated >= limit) break;
    if (await notionPageHasFocusedPrompt(page.id)) continue;

    const url = page?.properties?.[props.url.name]?.url || "";
    if (!url) continue;

    const titleParts = page?.properties?.[props.title.name]?.title || [];
    const title = Array.isArray(titleParts)
      ? titleParts.map((item) => item?.plain_text || item?.text?.content || "").join("").trim()
      : "";

    if (await generateAndSaveFocusedPrompt({ link: url, title: title || "지식iN 질문" })) {
      generated += 1;
      await sleep(360);
    }
  }

  if (generated) {
    console.log(`[KIN monitor] 기존 검토 전 후보의 최종 프롬프트 backfill ${generated}건 완료`);
  }
  return generated;
}

async function createNotionPage(candidate, props) {
  if (!props.title) throw new Error("Notion 데이터 소스에서 Title 속성을 찾지 못했습니다.");
  const properties = {
    [props.title.name]: { title: richText(candidate.title, 180) },
    [props.url.name]: { url: candidate.link },
  };

  if (props.foundAt) properties[props.foundAt.name] = { date: { start: new Date().toISOString() } };
  if (props.score) properties[props.score.name] = { number: scoreToPercent(candidate.totalScore, MAX_RAW_SCORE) };
  if (props.evergreen) properties[props.evergreen.name] = { number: scoreToPercent(candidate.evergreenScore, MAX_EVERGREEN_SCORE) };
  if (props.demand) properties[props.demand.name] = { number: candidate.independentQuestionCount };
  if (props.summary) {
    const summary = candidate.questionText
      || "원문 질문 내용을 자동으로 확인하지 못했습니다. 원문 URL에서 직접 확인이 필요합니다.";
    properties[props.summary.name] = { rich_text: richTextChunks(summary, 1800, 8000) };
  }
  setExistingSelect(properties, props.category, "생활 가이드");
  setExistingSelect(properties, props.area, candidate.area);
  setExistingSelect(properties, props.status, "검토 전");

  await notionFetch("/v1/pages", {
    method: "POST",
    body: {
      parent: { type: "data_source_id", data_source_id: process.env.NOTION_DATA_SOURCE_ID },
      properties,
    },
  });

}

function setExistingSelect(properties, prop, value) {
  if (!prop || !value) return;
  if (prop.type === "select") {
    const options = prop.select?.options || [];
    if (options.some((option) => option.name === value)) properties[prop.name] = { select: { name: value } };
  } else if (prop.type === "status") {
    const options = prop.status?.options || [];
    if (options.some((option) => option.name === value)) properties[prop.name] = { status: { name: value } };
  }
}

async function notionFetch(path, options = {}) {
  const response = await fetch(`https://api.notion.com${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Notion ${response.status}: ${text.slice(0, 700)}`);
  return safeJson(text);
}

function richText(content, maxLength) {
  const text = String(content || "").slice(0, maxLength);
  const bold = text.match(/^\*\*(.+)\*\*$/);
  if (bold) {
    return [{ type: "text", text: { content: bold[1] }, annotations: { bold: true } }];
  }
  return [{ type: "text", text: { content: text } }];
}

function richTextChunks(content, chunkSize = 1800, maxTotal = 8000) {
  const text = String(content || "").slice(0, maxTotal);
  if (!text) return [];
  const chunks = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push({ type: "text", text: { content: text.slice(index, index + chunkSize) } });
  }
  return chunks;
}

function scoreToPercent(value, maxValue) {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / maxValue) * 100)));
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(htmlEntityPattern, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (/(^|\.)kin\.naver\.com$/i.test(url.hostname) && /\/qna\/detail\.naver$/i.test(url.pathname)) {
      const dirId = url.searchParams.get("dirId") || "";
      const docId = url.searchParams.get("docId") || "";
      if (docId) {
        const canonical = new URL("https://kin.naver.com/qna/detail.naver");
        if (dirId) canonical.searchParams.set("dirId", dirId);
        canonical.searchParams.set("docId", docId);
        return canonical.toString();
      }
    }
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => url.searchParams.delete(key));
    url.hash = "";
    return url.toString();
  } catch {
    return String(value).trim();
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function integerEnv(name, fallback, min, max) {
  const value = Math.floor(Number(process.env[name]));
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function requireEnv(name) {
  if (!process.env[name]?.trim()) throw new Error(`필수 환경변수 ${name}가 없습니다.`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
