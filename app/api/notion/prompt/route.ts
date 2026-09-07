import { NextRequest, NextResponse } from "next/server";

const NOTION_VERSION = "2026-03-11";
const MAX_NOTION_MARKDOWN_BYTES = 470_000;

type SourceQuestion = {
  url: string;
  title: string;
  description?: string;
  questionText: string;
  questionTextVerified: boolean;
  questionTextSource: "page-body" | "meta-description";
};

type SavePromptRequest = {
  sourceUrl?: string;
  reviewPrompt?: string;
  sourceQuestion?: SourceQuestion;
};

type NotionProperty = {
  id?: string;
  name: string;
  type: string;
  select?: { options?: Array<{ name?: string }> };
  status?: { options?: Array<{ name?: string }> };
};

type NotionPage = {
  id: string;
  url?: string;
  properties?: Record<string, unknown>;
};

function notionConfig() {
  const apiKey = process.env.NOTION_API_KEY?.trim();
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID?.trim();
  if (!apiKey || !dataSourceId) {
    throw new Error(
      "Notion 저장 설정이 없습니다. 실행 환경에 NOTION_API_KEY와 NOTION_DATA_SOURCE_ID를 추가해주세요.",
    );
  }
  return { apiKey, dataSourceId };
}

async function notionFetch(
  path: string,
  options: { method?: string; body?: unknown } = {},
) {
  const { apiKey } = notionConfig();
  const response = await fetch(`https://api.notion.com${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const text = await response.text();
  if (!response.ok) {
    let message = text.slice(0, 700);
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      // 원문 오류를 그대로 사용합니다.
    }
    throw new Error(`Notion ${response.status}: ${message}`);
  }

  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function findProperty(
  entries: NotionProperty[],
  aliases: string[],
  types: string | string[],
) {
  const allowed = Array.isArray(types) ? types : [types];
  return entries.find(
    (property) => aliases.includes(property.name) && allowed.includes(property.type),
  );
}

function resolveNotionProperties(properties: Record<string, NotionProperty>) {
  const entries = Object.values(properties || {});
  const requestedUrl = process.env.NOTION_URL_PROPERTY?.trim();
  const url = requestedUrl
    ? entries.find(
        (property) =>
          property.name === requestedUrl && property.type === "url",
      )
    : findProperty(
        entries,
        ["원문 URL", "지식iN URL", "URL", "링크", "Source URL"],
        "url",
      );

  return {
    title: entries.find((property) => property.type === "title"),
    url,
    foundAt: findProperty(
      entries,
      ["발견일시", "발견 일시", "발견일", "수집일", "Created"],
      "date",
    ),
    summary: findProperty(
      entries,
      ["질문 요약", "요약", "Summary"],
      "rich_text",
    ),
    category: findProperty(entries, ["카테고리", "Category"], "select"),
    status: findProperty(entries, ["상태", "Status"], ["select", "status"]),
  };
}

function richTextChunks(
  content: string,
  chunkSize = 1800,
  maxTotal = 8000,
) {
  const text = String(content || "").slice(0, maxTotal);
  const chunks: Array<{ type: "text"; text: { content: string } }> = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push({
      type: "text",
      text: { content: text.slice(index, index + chunkSize) },
    });
  }
  return chunks;
}

function setExistingSelect(
  properties: Record<string, unknown>,
  property: NotionProperty | undefined,
  value: string,
) {
  if (!property || !value) return;

  if (property.type === "select") {
    const options = property.select?.options || [];
    if (options.some((option) => option.name === value)) {
      properties[property.name] = { select: { name: value } };
    }
  } else if (property.type === "status") {
    const options = property.status?.options || [];
    if (options.some((option) => option.name === value)) {
      properties[property.name] = { status: { name: value } };
    }
  }
}

function extractPathPart(pathname: string, marker: string) {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.indexOf(marker);
  return index >= 0 ? parts[index + 1] || "" : "";
}

function canonicalKinUrl(value: string) {
  const url = new URL(value.trim());
  const hostname = url.hostname.toLowerCase();
  if (hostname !== "kin.naver.com" && hostname !== "m.kin.naver.com") {
    throw new Error("네이버 지식iN 질문 URL만 Notion에 저장할 수 있습니다.");
  }

  const dirId =
    url.searchParams.get("dirId") || extractPathPart(url.pathname, "dirs");
  const docId =
    url.searchParams.get("docId") || extractPathPart(url.pathname, "docs");

  if (docId) {
    const canonical = new URL("https://kin.naver.com/qna/detail.naver");
    if (dirId) canonical.searchParams.set("dirId", dirId);
    canonical.searchParams.set("docId", docId);
    return canonical.toString();
  }

  url.hash = "";
  [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "query",
    "sm",
    "where",
    "from",
  ].forEach((key) => url.searchParams.delete(key));
  return url.toString();
}

async function findNotionPageByUrl(
  dataSourceId: string,
  propertyName: string,
  urls: string[],
) {
  for (const url of Array.from(new Set(urls.filter(Boolean)))) {
    const result = (await notionFetch(
      `/v1/data_sources/${encodeURIComponent(dataSourceId)}/query`,
      {
        method: "POST",
        body: {
          page_size: 1,
          filter: {
            property: propertyName,
            url: { equals: url },
          },
        },
      },
    )) as { results?: NotionPage[] } | null;

    const page = Array.isArray(result?.results) ? result.results[0] : undefined;
    if (page) return page;
  }
  return null;
}

function longestBacktickRun(value: string) {
  const matches = value.match(/`+/g) || [];
  return matches.reduce((max, item) => Math.max(max, item.length), 0);
}

function buildPromptMarkdown(prompt: string) {
  const fence = "`".repeat(Math.max(4, longestBacktickRun(prompt) + 1));
  return [
    "## ChatGPT Pro 작성 프롬프트",
    "",
    `${fence}text`,
    prompt,
    fence,
  ].join("\n");
}

async function replacePageBodyWithPrompt(pageId: string, prompt: string) {
  const markdown = buildPromptMarkdown(prompt);
  const byteLength = Buffer.byteLength(markdown, "utf8");
  if (byteLength > MAX_NOTION_MARKDOWN_BYTES) {
    throw new Error(
      `생성 프롬프트가 너무 길어 Notion에 한 번에 저장할 수 없습니다 (${Math.round(
        byteLength / 1024,
      )}KB).`,
    );
  }

  await notionFetch(`/v1/pages/${encodeURIComponent(pageId)}/markdown`, {
    method: "PATCH",
    body: {
      type: "replace_content",
      replace_content: {
        new_str: markdown,
      },
    },
  });
}

async function createOrUpdateNotionPage(
  sourceUrl: string,
  sourceQuestion: SourceQuestion,
) {
  const { dataSourceId } = notionConfig();
  const schema = (await notionFetch(
    `/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
  )) as { properties?: Record<string, NotionProperty> } | null;

  const resolved = resolveNotionProperties(schema?.properties || {});
  if (!resolved.title || !resolved.url) {
    throw new Error(
      "Notion 데이터베이스에서 제목 또는 원문 URL 속성을 찾지 못했습니다.",
    );
  }

  const canonicalUrl = canonicalKinUrl(sourceQuestion.url || sourceUrl);
  const rawUrl = sourceQuestion.url || sourceUrl;

  let page = await findNotionPageByUrl(dataSourceId, resolved.url.name, [
    canonicalUrl,
    rawUrl,
    sourceUrl,
  ]);

  const properties: Record<string, unknown> = {
    [resolved.title.name]: {
      title: richTextChunks(sourceQuestion.title, 180, 180),
    },
    [resolved.url.name]: { url: canonicalUrl },
  };

  if (resolved.summary) {
    properties[resolved.summary.name] = {
      rich_text: richTextChunks(sourceQuestion.questionText, 1800, 8000),
    };
  }

  if (!page) {
    if (resolved.foundAt) {
      properties[resolved.foundAt.name] = {
        date: { start: new Date().toISOString() },
      };
    }
    setExistingSelect(properties, resolved.category, "생활 가이드");
    setExistingSelect(properties, resolved.status, "검토 전");

    page = (await notionFetch("/v1/pages", {
      method: "POST",
      body: {
        parent: {
          type: "data_source_id",
          data_source_id: dataSourceId,
        },
        properties,
      },
    })) as NotionPage | null;
  } else {
    await notionFetch(`/v1/pages/${encodeURIComponent(page.id)}`, {
      method: "PATCH",
      body: { properties },
    });
  }

  if (!page?.id) {
    throw new Error("Notion 페이지를 만들거나 찾지 못했습니다.");
  }

  return { page, canonicalUrl };
}

export async function POST(request: NextRequest) {
  let body: SavePromptRequest = {};
  try {
    body = (await request.json()) as SavePromptRequest;
  } catch {
    body = {};
  }

  const sourceUrl = body.sourceUrl?.trim() || "";
  const reviewPrompt = body.reviewPrompt?.trim() || "";
  const sourceQuestion = body.sourceQuestion;

  if (!sourceUrl || !reviewPrompt || !sourceQuestion?.title || !sourceQuestion.questionText) {
    return NextResponse.json(
      { error: "지식iN 원문, 질문 내용, 작성 프롬프트가 모두 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const { page, canonicalUrl } = await createOrUpdateNotionPage(
      sourceUrl,
      sourceQuestion,
    );
    await replacePageBodyWithPrompt(page.id, reviewPrompt);

    return NextResponse.json({
      ok: true,
      pageId: page.id,
      pageUrl: page.url || "",
      sourceUrl: canonicalUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Notion 프롬프트 저장에 실패했습니다: ${error.message}`
            : "Notion 프롬프트 저장에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
