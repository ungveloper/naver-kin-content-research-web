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
