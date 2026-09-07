# 최근성 완화 + 에버그린 우선순위 패치

변경 내용
- 지식iN 문제 발견을 `recent(sort=date)` 30건 + 제한된 `evergreen(sort=sim)` 12건의 이중 레인으로 변경했습니다.
- 최근 질문에는 우선순위 가산점을 주지만 오래된 관련 질문을 하드 컷하지 않습니다.
- NAVER 검색어트렌드를 최근 90일 주간 → 최근 30일 일간으로 변경하고 최근 7일 평균을 현재 수요 힌트로 사용합니다.
- 최근 30일의 지속성(활성일 비율/전후반 변동)을 보조 설명으로 추가합니다.
- ChatGPT Pro 심사 프롬프트에서 최근성은 가산점, evergreen은 장기 반복 검색·답변 수명·계절 반복성 기준으로 별도 평가하도록 강화했습니다.
- evergreen=4~5가 될 수 있는 조건과 단발성 이슈의 낮은 점수 기준을 명시했습니다.
- 최대 3개 추천에서 숫자를 채우기보다 좋은 에버그린 후보를 우선하도록 했습니다.

수정 파일
- `app/api/research/auto/route.ts`
- `lib/topic-review.ts`


## 공개 카테고리

- WordPress 공개 카테고리는 `생활 가이드` 하나로 통일합니다.
- `집 관리 / 디지털 생활 / 생활 행정 / 정리·보관 / 제품 사용`은 앱 내부 편집 분류로만 유지합니다.
- 내부 분류는 후보 다양성·검색 의도·편집 판단에 사용하며 최종 WordPress 카테고리로 출력하지 않습니다.


## 네이버 지식iN 답변 추천 출력

최종 발행 결과에 `# 4. 네이버 지식iN 답변 추천`을 추가합니다. 선택된 Evidence Bundle에서 최종 글과 의도가 가장 가까운 실제 지식iN 질문을 고르고, 원문 제목/URL/질문 맥락을 확인한 뒤 질문 자체에 충분히 답하는 짧은 답변을 만듭니다. 링크는 결론을 숨기는 광고성 유도가 아니라, 이미 핵심 답을 받은 사용자가 조건별 예외나 상세 확인 순서를 추가로 보고 싶을 때 참고하는 선택적 링크 1개만 허용합니다. 실제 WordPress URL이 아직 없으면 `[[게시 후 실제 글 URL]]` placeholder를 사용합니다. 이 #4 섹션은 WordPress 게시 본문에 포함하지 않습니다.

## 원 질문 우선 + 사람 중심 SEO 발행 정책

- **최우선 순위는 SEO가 아니라 실제 지식iN 질문에 정확히 답하는 것**입니다.
- 자동 탐색과 지식iN URL 직접 입력 모두 `buildTopicReviewPrompt()`에서 동일한 질문 우선/사람 중심 정책을 사용합니다.
- 자동 탐색에서도 최종 후보와 가장 가까운 대표 지식iN 질문을 먼저 정한 뒤 그 질문에 답하는 글을 작성합니다.
- 직접 URL 입력에서는 입력한 원문 질문 자체를 최우선 앵커로 유지합니다.
- 첫 1~2문장에서 핵심 답을 주고 그 뒤에 필요한 조건·예외·실행 순서만 확장합니다.
- 질문의 제품·증상·상황·시점·지역·이미 시도한 방법 등 답을 바꾸는 조건을 유지합니다.
- SEO를 이유로 원 질문을 넓은 주제로 바꾸거나 관련 없는 연관 키워드·일반론을 추가하지 않습니다.
- 검색결과 단순 재서술, 고정 H2/H3/FAQ 구조, 키워드 반복, 범용 AI식 도입·마무리를 억제합니다.
- 핵심 사실은 현재 유효한 공식 1차 출처로 검증하고 직접 경험·실측을 창작하지 않습니다.
- 지식iN 답변은 포스팅 홍보용 티저가 아니라 해당 질문에 독립적으로 충분한 답이 되도록 작성합니다.
- 검색 상위 노출이나 AdSense 승인을 보장하지 않으며 발행 전 사람의 사실·링크·문장 검토를 전제로 합니다.

## im-not-ai 최종 한국어 윤문

최종 WordPress 원고와 네이버 지식iN 추천 답변은 사실 검증·원 질문 대응·SEO 구성을 먼저 완료한 뒤,
마지막에 [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai)의 한국어 윤문 규칙을
보수적인 light/monolith 후처리 단계로 적용합니다.

- vendored snapshot: v2.3.2 / commit `9747f036cdc28a1a8aea4dc71fef1f7846eb96f7`
- upstream 규칙: `vendor/im-not-ai/quick-rules.md`
- upstream MIT license: `vendor/im-not-ai/LICENSE`
- 런타임 프롬프트 모듈: `lib/im-not-ai-humanize.ts`
- 자동 탐색과 지식iN URL 직접 입력 모두 동일하게 적용
- 사실·주장·수치·날짜·고유명사·제품명·기관명·직접 인용·URL을 문체보다 우선 보존
- Gutenberg HTML 태그·속성·링크 구조는 윤문 대상에서 제외
- 목적은 탐지기 우회가 아니라 한국어 번역투·기계적 병렬·상투구·반복 리듬을 줄이는 편집 품질 개선


## 최근 자동 탐색·지식iN 프롬프트 저장

같은 브라우저에서는 최근 생성한 작성 프롬프트 한 세트를 localStorage에 보존합니다.

- `reviewPrompt`
- 지식iN `sourceQuestion`
- Evidence Bundle
- `editorialContext`
- 자동 탐색 seed/cooldown/warning
- 입력한 지식iN URL

Focused Research에서 지식iN URL로 직접 조사한 경우에는 생성된 `reviewPrompt`를 해당 Notion 페이지의 **본문 전체**로도 저장합니다. 기존 자동 수집 페이지에 있던 공개 카테고리·내부 분류·점수·에버그린·질문 원문 등의 본문 중복 표시는 제거되고, 해당 정보는 상단 데이터베이스 속성에만 유지됩니다.

Notion 본문은 `ChatGPT Pro 작성 프롬프트` 코드 블록 전용 영역으로 사용하므로, Notion에서 프롬프트 전체를 복사해 ChatGPT Pro에 붙여넣는 흐름으로 운영합니다.

### Next.js 실행 환경의 Notion 변수

GitHub Actions Secrets는 Next.js/Vercel 런타임으로 자동 전달되지 않습니다. Focused Research 버튼에서 Notion 저장을 사용하려면 앱 실행 환경에도 다음 값을 설정해야 합니다.

- `NOTION_API_KEY`
- `NOTION_DATA_SOURCE_ID`
- `NOTION_URL_PROPERTY` — 선택 사항. 현재 데이터베이스의 URL 속성명이 `원문 URL`이 아니라면 지정

로컬 개발은 `.env.local`, Vercel 배포는 Project Settings → Environment Variables에 같은 값을 넣습니다.

## 자동 API → Focused Research → Notion → ChatGPT Pro 운영 흐름

자동 탐색과 사용자가 직접 지식iN URL을 입력하는 흐름은 최종적으로 같은 Focused Research 파이프라인을 사용합니다.

1. GitHub Actions가 NAVER 지식iN API를 조회하고 중복·제외 분야·문제 구체성·반복 수요·에버그린 점수로 1차 후보를 선정합니다.
2. 통과한 후보의 `원문 URL`을 사람이 다시 입력하지 않고, GitHub Actions가 로컬로 띄운 동일 Next.js `/api/research/auto`의 `sourceUrl`에 자동 전달합니다.
3. 직접 URL 입력과 똑같이 원문 질문 본문, 유사 독립 질문, NAVER 검색어트렌드, 카페, 블로그, 뉴스, 웹/공식 근거 후보를 Evidence Bundle로 다시 수집합니다.
4. `WORDPRESS_SITE_URL`의 기존 글을 최대 500건 동기화해 실질적으로 같은 검색 의도의 기존 글이 있는지 검토 데이터에 포함합니다.
5. 최종 ChatGPT Pro 프롬프트에는 다음 품질 정책을 모두 포함합니다.
   - 원 질문에 첫 1~2문장부터 직접 답하기
   - 현재 유효한 1차 공식 원문 재검증
   - 기존 WordPress 글과 실질 중복이면 신규 글 보류
   - Google 사람 중심 SEO와 검색 의도 일치
   - 저가치·대량생성·검색결과 재조합·의미 없는 글자 수 채우기 금지
   - AdSense 승인을 보장하지 않되 저가치/무검토 자동생성으로 보일 위험을 낮추는 품질 점검
   - im-not-ai 한국어 최종 윤문
   - 원 질문 → 근거 → SEO/저가치 → 문체 → 최종 교차검증의 5단계 반복 검수
6. 완성된 `reviewPrompt`를 해당 Notion 페이지 본문 전체에 `ChatGPT Pro 작성 프롬프트`로 저장합니다.
7. 사용자는 Notion에서 프롬프트 전체를 직접 복사해 ChatGPT Pro에 붙여넣습니다.
8. ChatGPT Pro의 WordPress 게시용 본문·대표 이미지 프롬프트·Rank Math SEO 패키지·지식iN 답변 추천 결과를 사람이 최종 확인한 뒤 WordPress에 직접 게시합니다.

GitHub Actions의 자동 경로는 별도의 축약형 프롬프트를 만들지 않습니다. 사람이 `지식iN 원문으로 바로 조사`에 URL을 넣었을 때 사용하는 동일 `sourceUrl` 코드 경로와 `buildTopicReviewPrompt()`를 그대로 사용합니다.

### 자동 경로 설정값

- `WORDPRESS_SITE_URL`: 기존 WordPress 글 중복 검사용. 미설정 시 현재 사이트 `https://3minago.com`을 기본값으로 사용합니다.
- `MONITOR_MAX_FOCUSED_PROMPTS_PER_RUN`: 한 번의 GitHub Actions 실행에서 최종 프롬프트를 생성할 최대 후보 수. 미설정 시 5개입니다.
- 기존 `NAVER_API_HUB_CLIENT_ID`, `NAVER_API_HUB_CLIENT_SECRET`, `NOTION_API_KEY`, `NOTION_DATA_SOURCE_ID` Secret은 그대로 사용합니다.

이미 Notion에 `검토 전` 상태로 남아 있고 아직 `ChatGPT Pro 작성 프롬프트`가 없는 최근 후보도 실행당 남은 한도 내에서 자동 backfill합니다.

### Notion 403과 프롬프트 본문 저장 권한

Focused Research의 `이 질문 조사하기`는 다음 순서로 동작합니다.

1. 입력한 지식iN URL을 `/api/research/auto`의 `sourceUrl`로 조사
2. Evidence Bundle과 최종 `reviewPrompt` 생성
3. 원문 URL이 같은 기존 Notion 페이지 조회
4. 상단 데이터베이스 속성은 그대로 유지
5. 해당 페이지 본문을 `ChatGPT Pro 작성 프롬프트`로 저장
6. 사용자가 Notion에서 프롬프트 전체를 복사해 ChatGPT Pro에 붙여넣기

Notion의 `PATCH /v1/pages/{page_id}/markdown` 전체 교체는 Integration의 **Update content** 권한이 필요합니다. 권한이 없으면 Notion이 `403 Insufficient permissions for this endpoint`를 반환합니다.

현재 코드는 이 403을 감지하면 `PATCH /v1/blocks/{page_id}/children`의 **Insert content** 방식으로 자동 fallback하여 같은 페이지 맨 위에 최종 프롬프트를 저장합니다. 따라서 새 Notion 페이지를 만들 수 있는 Insert content 권한이 이미 있다면 직접 URL 흐름도 프롬프트 저장까지 완료할 수 있습니다.

다만 본문을 매번 깨끗하게 **전체 교체**하려면 Notion Developer/Integration 설정에서 해당 연결에 Update content 권한도 허용하는 것을 권장합니다. 데이터베이스 자체도 그 Integration에 연결/공유되어 있어야 합니다.

Vercel과 GitHub Actions가 서로 다른 `NOTION_API_KEY`를 사용하면 권한 상태도 달라질 수 있으므로, 두 실행 환경이 의도한 동일 Integration token을 사용하는지 확인합니다.

## 편집 시스템 v1 — 규칙 추가보다 측정·분류·피드백

이 프로젝트는 더 이상 프롬프트 규칙을 무한히 늘리는 방향으로 운영하지 않습니다. 핵심 원칙은 **규칙 압축, 공통 실행 경로, 결과 측정, 발행 후 피드백**입니다.

### 1. 프롬프트 버전

모든 자동/직접 URL 최종 프롬프트에는 `PROMPT_VERSION`이 포함됩니다. 현재 버전은 `2026-09-07.v1`입니다. 버전이 바뀌면 Notion의 `프롬프트 버전` 속성에도 기록해 어떤 규칙으로 작성된 글인지 추적할 수 있습니다.

### 2. 독립 글 가치 판정

최종 원고 전에 반드시 아래 중 하나로 분류합니다.

- `standalone-post`: 독립 WordPress 글
- `existing-post-update`: 신규 URL 대신 기존 글 업데이트
- `kin-answer-only`: 독립 글로 억지 확장하지 않고 지식iN 답변만
- `reject`: 자동 제작 제외

앱은 Evidence와 기존 글 중복도를 사용해 `preflight` 사전 판정을 제공하고, ChatGPT Pro가 공식 근거를 재검증한 뒤 최종 결정을 내립니다.

### 3. im-not-ai 경량화

`vendor/im-not-ai`의 upstream snapshot과 MIT 라이선스는 그대로 보존합니다. 다만 매 프롬프트에 전체 룰북을 반복 삽입하지 않고 `IM_NOT_AI_PROJECT_POLICY`의 프로젝트 전용 핵심 규칙만 사용합니다. 원 질문·사실 검증·SEO보다 문체 규칙이 더 큰 토큰 비중을 차지하지 않게 하기 위한 조치입니다.

### 4. 기존 WordPress 중복 검사

WordPress REST API에서 최대 500개의 제목·URL·수정일과 excerpt를 가져옵니다. 각 신규 Evidence Bundle과 유사도를 로컬에서 먼저 계산하고 가장 가까운 최대 8개만 editorialContext에 남깁니다. 전체 500개를 프롬프트에 직접 밀어 넣지 않습니다.

### 5. Notion 품질 추적

권한이 허용되면 다음 데이터베이스 속성을 자동 생성합니다.

- 프롬프트 버전
- 초안 유형
- 사전 품질 점수
- 공식 근거 후보 수
- 중복도
- 최종 판정
- 질문 충족
- 게시 보류 사유
- 게시 URL
- 게시일
- 30일 노출 / 클릭 / CTR / 평균순위

Notion 구조 변경 권한이 없으면 프롬프트 저장 자체는 중단하지 않고 추적 속성 생성만 건너뜁니다.

### 6. 공통 Focused Research 실행

GitHub Actions가 더 이상 `npm run dev`로 Next.js 서버를 띄운 뒤 HTTP로 자기 자신을 호출하지 않습니다. `scripts/focused-research-cli.ts`가 실제 `/api/site-content`, `/api/research/auto`, `/api/notion/prompt` route handler를 직접 호출합니다.

따라서 자동 후보와 사용자가 `지식iN 원문으로 바로 조사`에 넣은 URL은 동일한 코드 경로를 사용하면서도 서버 준비 대기·포트·dev server 실패 지점은 제거됩니다.

### 7. Search Console 피드백 루프

기존 CSV 업로드 방식은 계속 사용할 수 있습니다. 추가로 서비스 계정 자격증명이 있으면 GitHub Actions가 최근 30일 Search Console query 데이터를 자동으로 불러와 다음 Focused Research의 `searchPerformance`에 넣습니다.

Notion에서 사람이 `게시 URL`을 입력하면 별도 `Content Performance Feedback` workflow가 최근 30일 페이지 성과를 매일 갱신합니다.

필요한 설정:

- Secret `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`
- Secret `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` 또는 `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY_BASE64`
- Variable `GOOGLE_SEARCH_CONSOLE_SITE_URL` — Search Console에 등록된 정확한 property 값. 예: `sc-domain:3minago.com` 또는 URL-prefix property
- Variable `CONTENT_FEEDBACK_MAX_PAGES` — 선택 사항, 기본 50

Google 서비스 계정 이메일을 해당 Search Console property 사용자로 추가해야 합니다.

### 운영 피드백

최종 흐름은 다음과 같습니다.

NAVER API 발견 → 1차 점수 → 원문 확인 → 독립 글 가치 사전 판정 → 기존 WordPress 중복 검사 → Evidence 수집 → 질문/공식 근거/SEO/저가치/im-not-ai/교차검증 → Notion 최종 프롬프트 → ChatGPT Pro → 사람 검수/WordPress 게시 → 게시 URL 기록 → 최근 30일 Search Console 성과 회수 → 다음 후보 판단에 반영

Search Console/AdSense/SEO 관련 검수는 품질을 높이기 위한 신호이며 검색 순위나 AdSense 승인을 보장하지 않습니다.
