import {
  NOTION_EDITORIAL_TRACKING_SCHEMA,
} from "../lib/notion-editorial-schema";

const NOTION_VERSION = "2026-03-11";

async function main() {
  const apiKey =
    process.env.NOTION_API_KEY?.trim();
  const dataSourceId =
    process.env.NOTION_DATA_SOURCE_ID?.trim();

  if (!apiKey || !dataSourceId) {
    console.log(
      "[Notion schema] 자격증명이 없어 생략합니다.",
    );
    return;
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };

  const response = await fetch(
    `https://api.notion.com/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
    {
      headers,
      signal: AbortSignal.timeout(20_000),
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Notion ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  const schema = JSON.parse(text) as {
    properties?: Record<string, unknown>;
  };
  const current = schema.properties || {};

  const missing = Object.fromEntries(
    Object.entries(
      NOTION_EDITORIAL_TRACKING_SCHEMA,
    ).filter(([name]) => !(name in current)),
  );

  if (!Object.keys(missing).length) {
    console.log(
      "[Notion schema] 품질 추적 속성이 이미 최신입니다.",
    );
    return;
  }

  const patch = await fetch(
    `https://api.notion.com/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        properties: missing,
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );

  const patchText = await patch.text();
  if (!patch.ok) {
    if (patch.status === 403) {
      console.warn(
        "[Notion schema] 구조 변경 권한이 없어 자동 속성 추가를 생략합니다. 기존 프롬프트 저장은 계속 사용할 수 있습니다.",
      );
      return;
    }
    throw new Error(
      `Notion ${patch.status}: ${patchText.slice(0, 500)}`,
    );
  }

  console.log(
    `[Notion schema] 새 추적 속성 ${Object.keys(missing).length}개 추가`,
  );
}

main().catch((error) => {
  console.error(
    `[Notion schema] ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
