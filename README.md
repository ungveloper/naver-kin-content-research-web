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
- `디지털 / 행정 / 집 관리 / 정리 보관 / 제품 사용`은 앱 내부 편집 분류로만 유지합니다.
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

모든 자동/직접 URL 최종 프롬프트에는 `PROMPT_VERSION`이 포함됩니다. 현재 기본 버전은 `2026-09-08.v3`입니다. 버전이 바뀌면 Notion의 `프롬프트 버전` 속성에도 기록해 어떤 규칙으로 작성된 글인지 추적할 수 있습니다.

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

Notion 구조 변경 권한이 없으면 프롬프트 저장 자체는 중단하지 않고 추적 속성 생성만 건너뜁니다.

### 6. 공통 Focused Research 실행

GitHub Actions가 더 이상 `npm run dev`로 Next.js 서버를 띄운 뒤 HTTP로 자기 자신을 호출하지 않습니다. `scripts/focused-research-cli.ts`가 실제 `/api/site-content`, `/api/research/auto`, `/api/notion/prompt` route handler를 직접 호출합니다.

따라서 자동 후보와 사용자가 `지식iN 원문으로 바로 조사`에 넣은 URL은 동일한 코드 경로를 사용하면서도 서버 준비 대기·포트·dev server 실패 지점은 제거됩니다.

### 7. Search Console 검색어 신호

Search Console 연결은 **새 프롬프트를 만들 때 현재 사이트의 실제 검색어 성과를 참고하는 용도**로만 사용합니다.
기존 CSV 업로드 또는 서비스 계정 query 데이터는 Focused Research의 `searchPerformance` 입력으로 활용할 수 있습니다.

발행 후 개별 WordPress URL의 30일 성과를 Notion에 기록하는 `Content Performance Feedback` workflow는 사용하지 않습니다.
Notion에 게시 URL을 입력할 필요도 없습니다.

### 운영 피드백

최종 흐름은 다음과 같습니다.

NAVER API 발견 → 1차 점수 → 원문 확인 → 독립 글 가치 사전 판정 → 기존 WordPress 중복 검사 → Evidence 수집 → 질문/공식 근거/SEO/저가치/im-not-ai/교차검증 → Notion 최종 프롬프트 생성

Search Console/AdSense/SEO 관련 검수는 품질을 높이기 위한 신호이며 검색 순위나 AdSense 승인을 보장하지 않습니다.

## 안정성 v2 — 자동 최신화·전체 글 인덱스·회귀 테스트

### im-not-ai 자동 최신화

`im-not-ai Auto Update` GitHub Actions가 6시간마다 `epoko77-ai/im-not-ai`의 `main` commit SHA를 확인합니다.

새 upstream이 있으면:

1. `quick-rules.md`, MIT LICENSE, upstream metadata 동기화
2. 최신 quick-rules에서 이 프로젝트에 필요한 핵심 규칙 자동 추출
3. 24개 편집 판정 회귀 테스트 + BM25 + 프롬프트 정책 검사
4. `npm run lint`
5. `npm run build`
6. `git diff --check`

를 모두 통과한 경우에만 `변경: im-not-ai 최신 규칙 자동 동기화` 커밋을 `main`에 push합니다.

따라서 최신 upstream을 자동 적용하지만, upstream 변경이 빌드나 핵심 편집 판정을 깨뜨리면 기존 검증된 버전이 그대로 유지됩니다.

실제 최종 프롬프트 버전은 `기본 프롬프트 버전 + im-not-ai version + upstream commit 앞 7자리`로 기록되므로 어떤 im-not-ai 규칙으로 만들어졌는지 Notion에서 추적할 수 있습니다.

### WordPress 전체 글 인덱스

Focused Research는 더 이상 최신 500개에서만 중복 글을 찾지 않습니다.

- WordPress REST API에서 최대 10,000개까지 전체 글을 순회
- title + excerpt + slug를 무료 로컬 BM25 인덱스로 1차 검색
- 상위 48개만 기존 의미 유사도 계산
- 최종 최대 8개만 ChatGPT Pro editorialContext에 전달

외부 embedding API나 유료 벡터 데이터베이스는 사용하지 않습니다.

### 회귀 테스트

`scripts/editorial-regression-test.ts`는 최소 다음을 검사합니다.

- `standalone-post` 6개
- `existing-post-update` 6개
- `kin-answer-only` 6개
- `reject` 6개
- WordPress BM25 관련 글 검색
- im-not-ai upstream metadata/핵심 규칙
- 최종 프롬프트의 필수 품질 정책 존재
- 전체 im-not-ai 룰북이 다시 프롬프트에 통째로 들어가지 않는지

로컬에서는 `npm run test:regression`으로 실행합니다.

### Notion 파이프라인 추적

권한이 허용되면 다음 속성을 추가로 사용합니다.

- 파이프라인 상태: 발견 / 원문 확인 / 리서치 중 / 프롬프트 준비 / 게시 완료 / 보류 / 오류
- 마지막 오류
- 재시도 횟수
- 마지막 검증일

자동 Focused Research가 실패하면 오류 내용과 재시도 횟수를 남기고, 성공하면 `프롬프트 준비` 상태로 바꿉니다.


## Prompt v2 — Notion code-only · 자연스러운 최종 출력

프롬프트 기본 버전은 현재 `2026-09-08.v4`입니다. 실제 추적 버전에는 현재 im-not-ai upstream version/commit도 계속 붙습니다.

### Notion 본문

`지식iN 원문으로 바로 조사` 및 자동 Focused Research가 저장하는 Notion 페이지 본문은 이제 별도 제목과 안내 문장 없이 프롬프트 코드 블록부터 바로 시작합니다.

- `ChatGPT Pro 작성 프롬프트` heading 제거
- `아래 프롬프트 전체를 그대로 복사해 ChatGPT Pro에 붙여넣으세요.` 안내문 제거
- Update content 권한이 없어 block fallback이 동작해도 code block만 저장
- 과거 heading 방식 페이지는 monitor가 계속 기존 프롬프트로 인식해 중복 생성하지 않음

### 최종 원고 다듬기

ChatGPT Pro 최종 작성 단계에는 다음 정책을 추가했습니다.

- 제목: 키워드 나열·`총정리`·`N가지`·`이렇게 봅니다` 같은 공식형 패턴보다 실제 편집자가 쓴 자연스러운 제목 우선
- 링크: 설명형 앵커 텍스트 사용, utm/gclid/fbclid 등 추적 파라미터 제거, 같은 공식 링크 반복 금지
- 표/목록: 조건·절차·예외는 목록 우선, 동일한 비교축이 실제로 필요할 때만 표 사용
- 지식iN 답변: WordPress 요약본이 아니라 질문자에게 직접 답하는 3~6문장 중심의 짧은 답변
- 코드 블록: 빈 코드 블록 중복 금지, 각 값은 내용이 있는 코드 블록 1개만 출력
- 링크 유도: 지식iN 답변만으로 해결되면 블로그 링크를 억지로 넣지 않음

## Notion 질문 원문 저장 · 프롬프트 전용 운영

Notion은 발행 후 성과 관리가 아니라 **질문 원문과 최종 ChatGPT Pro 프롬프트를 보관하는 곳**으로 사용합니다.

- 기존 `질문 요약` 속성 대신 `질문`(rich_text)을 사용합니다.
- 원문 HTML에서 추출한 질문은 요약하지 않고 전체 본문을 `질문`에 저장합니다.
- 직접 URL mode와 GitHub Actions 자동 탐색 모두 같은 기준을 사용합니다.
- 기존 `질문 요약`/`요약` 속성명도 마이그레이션 기간 동안 읽을 수 있지만 새 기준은 `질문`입니다.
- 새 후보는 페이지 생성 시 `질문` 속성에 원문 전체를 저장합니다.
- 기존 페이지의 `질문` 속성은 Notion Update content 권한을 요구하므로 자동 backfill하지 않습니다. 기존 페이지라도 원문은 매 실행에서 다시 읽어 Focused Research와 프롬프트 생성에 사용합니다.
- `게시 URL`, `게시일`, `30일 노출`, `30일 클릭`, `30일 CTR`, `30일 평균순위`는 자동 생성 schema에서 제거했습니다.
- `Content Performance Feedback` workflow도 제거했습니다.
- Search Console query 데이터는 원한다면 새 프롬프트의 주제 판단 신호로만 계속 사용할 수 있습니다.

## 내부 분류 5개 · Notion 페이지 아이콘

Notion의 `카테고리`는 계속 `생활 가이드`로 고정하고, `내부 분류`는 아래 5개 값으로 통일합니다.

- 디지털
- 행정
- 집 관리
- 정리 보관
- 제품 사용

자동 KIN 탐색, Focused Research의 내부 분류 추론, ChatGPT Pro review JSON 검증 모두 같은 5개 값을 사용합니다.

GitHub Actions 또는 직접 URL 흐름이 **새 Notion 페이지를 생성할 때** 페이지 아이콘은 `✔️`를 사용합니다.
이미 존재하는 Notion 페이지의 아이콘은 자동으로 덮어쓰지 않습니다.

Notion의 `내부 분류` select에 새 이름이 아직 없더라도 Integration이 parent data source에 write 권한을 가지고 있으면 새 페이지 생성 시 새 select 이름을 기록하도록 구성했습니다.
기존 페이지의 과거 분류값은 자동으로 일괄 변경하지 않습니다.

## Prompt v4 — 공개 본문 원 질문 분리 · 지식iN 참고 유입

최종 WordPress 글은 지식iN 질문에서 문제와 조건을 발견하더라도 **특정 질문에 답하는 글처럼 보이지 않는 독립 공개 콘텐츠**로 작성합니다.

### WordPress #1~#3

- 원 지식iN 질문은 내부 편집 앵커로만 사용
- `질문에 나온`, `질문처럼`, `질문의 경우`, `질문자`, `원 질문`, `지식iN에서` 등 출처 암시 표현 금지
- 원문 제목·URL·개인 사연 비노출
- 답을 바꾸는 조건은 유지하되 일반 독자용 조건/사례로 재편집
- 제도상 핵심 숫자는 유지하고, 원 질문의 우연한 물건 개수·고유 조합은 불필요하면 일반화
- 실제 원문 질문 정보는 운영용 #4에서만 노출

### 지식iN #4 추천 답변

WordPress `standalone-post`가 실제로 생성되면 추천 답변은:

1. 질문의 핵심 답을 링크 없이도 충분히 제공
2. 결과를 바꾸는 조건·다음 행동을 짧게 설명
3. 마지막에 WordPress 글에서 추가로 볼 실제 세부 정보를 자연스럽게 안내
4. `[[게시 후 실제 글 URL]]`을 정확히 1번 포함

하도록 합니다.

즉 **답을 일부러 숨겨 클릭을 유도하지 않지만, 답변이 충분하다는 이유로 관련 WordPress 참고 링크를 빼지도 않습니다.**

`kin-answer-only`, `existing-post-update`, `reject`, `direct-test`처럼 새 WordPress 글이 없는 경우에는 placeholder 링크를 만들지 않습니다.

## Notion Insert-only 권한 대응

GitHub Actions용 Notion Integration이 새 페이지/블록 삽입은 가능하지만 기존 페이지 속성 수정(Update content)은 허용하지 않는 환경에서도 KIN Monitor가 중단되지 않도록 했습니다.

- 기존 Notion 페이지의 `질문` 속성을 자동 PATCH/backfill하지 않음
- 새 Notion 페이지는 생성 시 `질문` 원문 전체를 함께 저장
- 기존 페이지도 지식iN 원문을 다시 읽어 Focused Research 입력에는 전체 질문을 사용
- `파이프라인 상태` 같은 기존 페이지 속성 PATCH가 403이면 경고만 남기고 해당 실행에서 추가 속성 PATCH를 생략
- 프롬프트 본문 저장은 기존 `replace_content → Insert content block fallback` 경로를 그대로 사용
- 따라서 기존 페이지 속성 Update content 권한이 없어도 프롬프트 생성 자체를 우선해서 계속 진행

## Prompt v5 — 비교 근거 규율 · 출력 위생 · 지식iN 가독성

제품 비교형 원고에서 공식 치수를 근거 없이 리터 용량으로 환산해 서로 다른 규격의 제품을 직접 순위 비교하지 않도록 보강했습니다.

- 공식값과 편집 계산을 구분
- 다른 규격 제품은 절대 용량보다 수납 구조·접근성·공식 치수 중심으로 비교
- 리뷰 수·평점·가격·재고처럼 변동성이 큰 수치는 핵심일 때만 사용
- 사용자 리뷰는 경험 신호로만 사용하고 내구성·품질 일반화 금지
- 추적 파라미터 제거
- zero-width/BOM 문자 제거
- 깨질 가능성이 있는 표는 목록으로 전환
- standalone-post 복사용 `text` 코드블록은 정확히 8개만 사용하고 빈 코드블록 금지

지식iN 추천 답변은 모바일에서 읽기 쉽게:

1. 결론 1~2문장
2. 필요할 때만 조건별 불릿 2~4개
3. 중요한 예외·확인사항 1~2문장
4. WordPress 추가 정보 안내 문장
5. 다음 줄에 `[[게시 후 실제 글 URL]]` 단독 표기

형식으로 정리합니다.

이 정책은 Google/AdSense 승인을 보장하기 위한 점수 맞추기가 아니라, 독자에게 실제 가치가 있고 원본 근거와 편집 판단이 구분되는 페이지를 만들기 위한 품질 게이트입니다.

## Notion 시간 속성

- `생성일시`: Notion `created_time`으로 페이지가 실제 생성된 시각을 표시합니다.
- `질문 작성 일시`: 네이버 지식iN 원문 질문이 작성된 시각입니다. Question JSON-LD → 게시 메타 → 질문 영역 `작성일` 순으로 확인합니다.
- 기존 `발견일시`: 페이지 생성 시각과 중복되므로 제거합니다.
- 지식iN이 `N분 전`·`N시간 전`처럼 상대 시간만 공개하면 수집 시각을 기준으로 환산합니다. 날짜만 공개하면 시간을 임의로 만들지 않습니다.

별도 `출처` 속성은 두지 않습니다. 이 데이터베이스는 지식iN 전용이고 `원문 URL`이 각 행의 실제 출처 역할을 합니다. WordPress 공개 글에서는 지식iN을 사실 근거로 인용하지 않고, 제조사·정부·공공기관·서비스 운영사 등 검증한 1차 자료를 사용합니다.

## WordPress 공식 출처 표기

지식iN은 문제 발견과 검색 의도 확인용으로 사용하고, WordPress 공개 본문의 사실 근거는 현재 유효한 공식 1차 자료로 검증합니다.

- 법·행정·지원·안전 기준: 정부·공공기관·지자체·서비스 운영사 공식 원문
- 제품 치수·구성·호환·판매 여부: 제조사 또는 공식 판매처 원문
- 가격·재고·리뷰 수·평점처럼 변동성이 큰 값: 꼭 필요할 때만 확인일과 함께 사용
- 중요한 사실 가까이에 설명형 앵커 텍스트로 링크
- 모든 문단에 링크를 붙이지 않고 핵심 검증 주장에 필요한 만큼만 사용
- 동일 공식 링크 반복 금지
- 검색 중계 URL과 추적 파라미터 제거
- 공식 근거를 확인하지 못한 중요한 사실은 URL을 만들지 않고 주장 자체를 제거하거나 범위를 낮춤
- 지식iN 원문 제목·URL·작성자·개인 사연은 WordPress #1~#3의 사실 출처로 노출하지 않음

출처 목록의 개수 자체는 품질 목표가 아닙니다. 공식 자료를 단순 재서술하는 대신 조건별 판단, 비교, 실행 순서처럼 독자에게 추가 가치를 제공하는 것이 우선입니다.

이 정책은 Google 검색 순위나 AdSense 승인을 보장하지 않으며, 검증 가능성과 사람 중심 콘텐츠 품질을 높이기 위한 발행 기준입니다.
