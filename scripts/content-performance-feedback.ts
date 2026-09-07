import {
  fetchSearchConsolePagePerformance,
  hasSearchConsoleCredentials,
} from "../lib/search-console";
import {
  NOTION_EDITORIAL_TRACKING_SCHEMA,
} from "../lib/notion-editorial-schema";

const NOTION_VERSION = "2026-03-11";
const MAX_PAGES = Math.max(
  1,
  Math.min(
    100,
    Number(
      process.env.CONTENT_FEEDBACK_MAX_PAGES,
    ) || 50,
  ),
);

function config() {
  const apiKey =
    process.env.NOTION_API_KEY?.trim();
  const dataSourceId =
    process.env.NOTION_DATA_SOURCE_ID?.trim();
  if (!apiKey || !dataSourceId) {
    throw new Error(
      "NOTION_API_KEY / NOTION_DATA_SOURCE_ID가 필요합니다.",
    );
  }
  return { apiKey, dataSourceId };
}

async function notionFetch(
  path: string,
  method = "GET",
  body?: unknown,
) {
  const { apiKey } = config();
  const response = await fetch(
    `https://api.notion.com${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: body
        ? JSON.stringify(body)
        : undefined,
      signal: AbortSignal.timeout(30_000),
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Notion ${response.status}: ${text.slice(0, 500)}`,
    );
  }
  return text ? JSON.parse(text) : null;
}

async function ensureSchema() {
  const { dataSourceId } = config();
  const schema = await notionFetch(
    `/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
  );
  const current = schema?.properties || {};
  const missing = Object.fromEntries(
    Object.entries(
      NOTION_EDITORIAL_TRACKING_SCHEMA,
    ).filter(([name]) => !current[name]),
  );

  if (Object.keys(missing).length) {
    await notionFetch(
      `/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
      "PATCH",
      { properties: missing },
    );
  }
}

function propertyValue(
  page: { properties?: Record<string, { url?: string }> },
  name: string,
) {
  return page.properties?.[name];
}

async function main() {
  if (!hasSearchConsoleCredentials()) {
    console.log(
      "[성과 피드백] Search Console 자격증명이 없어 이번 실행은 생략합니다.",
    );
    return;
  }

  try {
    await ensureSchema();
  } catch (error) {
    console.warn(
      `[성과 피드백] Notion 품질 추적 속성 자동 생성 실패: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }

  const { dataSourceId } = config();
  const result = await notionFetch(
    `/v1/data_sources/${encodeURIComponent(dataSourceId)}/query`,
    "POST",
    {
      page_size: Math.min(100, MAX_PAGES),
    },
  );

  const pages = Array.isArray(result?.results)
    ? result.results
    : [];
  let updated = 0;

  for (const page of pages) {
    if (updated >= MAX_PAGES) break;

    const publishedUrl =
      propertyValue(
        page,
        "게시 URL",
      )?.url?.trim();
    if (!publishedUrl) continue;

    const metric =
      await fetchSearchConsolePagePerformance(
        publishedUrl,
      );
    if (!metric) continue;

    const properties: Record<
      string,
      unknown
    > = {
      "30일 노출": {
        number: metric.impressions,
      },
      "30일 클릭": {
        number: metric.clicks,
      },
      "30일 CTR": {
        number: metric.ctr,
      },
      "30일 평균순위": {
        number: metric.position,
      },
    };

    try {
      await notionFetch(
        `/v1/pages/${encodeURIComponent(page.id)}`,
        "PATCH",
        { properties },
      );
      updated += 1;
      console.log(
        `[성과 피드백] ${publishedUrl} · 노출 ${metric.impressions} · 클릭 ${metric.clicks} · 평균순위 ${metric.position.toFixed(1)}`,
      );
    } catch (error) {
      console.warn(
        `[성과 피드백] ${publishedUrl} 업데이트 실패: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }

  console.log(
    `[성과 피드백] 완료 · ${updated}개 게시 URL의 최근 30일 성과 갱신`,
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : String(error),
  );
  process.exitCode = 1;
});
