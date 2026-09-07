import { NextRequest, NextResponse } from "next/server";
import type { EditorialPreflight } from "@/lib/types";
import {
  editorialDispositionLabel,
  NOTION_EDITORIAL_TRACKING_SCHEMA,
} from "@/lib/notion-editorial-schema";

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
  promptVersion?: string;
  preflight?: EditorialPreflight[];
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

class NotionApiError extends Error {
  status: number;
  path: string;
  code?: string;

  constructor(status: number, path: string, message: string, code?: string) {
    super(`Notion ${status}: ${message}`);
    this.name = "NotionApiError";
    this.status = status;
    this.path = path;
    this.code = code;
  }
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

  const responseText = await response.text();
  if (!response.ok) {
    let message = responseText.slice(0, 700);
    let code: string | undefined;
    try {
      const parsed = JSON.parse(responseText) as {
        message?: string;
        code?: string;
      };
      if (parsed.message) message = parsed.message;
      if (parsed.code) code = parsed.code;
    } catch {
      // 원문 오류를 그대로 사용합니다.
    }
    throw new NotionApiError(response.status, path, message, code);
  }

  if (!responseText) return null;
  try {
    return JSON.parse(responseText) as unknown;
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
    question: findProperty(
      entries,
      ["질문", "질문 요약", "요약", "Summary"],
      "rich_text",
    ),
    category: findProperty(entries, ["카테고리", "Category"], "select"),
    status: findProperty(entries, ["상태", "Status"], ["select", "status"]),
    promptVersion: findProperty(entries, ["프롬프트 버전"], "rich_text"),
    draftType: findProperty(entries, ["초안 유형"], "select"),
    qualityScore: findProperty(entries, ["사전 품질 점수"], "number"),
    officialEvidence: findProperty(entries, ["공식 근거 후보 수"], "number"),
    duplicateSimilarity: findProperty(entries, ["중복도"], "number"),
    finalDecision: findProperty(entries, ["최종 판정"], "select"),
    questionSatisfied: findProperty(entries, ["질문 충족"], "checkbox"),
    holdReason: findProperty(entries, ["게시 보류 사유"], "rich_text"),
    pipelineStatus: findProperty(entries, ["파이프라인 상태"], "select"),
    lastError: findProperty(entries, ["마지막 오류"], "rich_text"),
    retryCount: findProperty(entries, ["재시도 횟수"], "number"),
    lastValidatedAt: findProperty(entries, ["마지막 검증일"], "date"),
  };
}


async function ensureEditorialTrackingSchema(
  dataSourceId: string,
  properties: Record<string, NotionProperty>,
) {
  const missing = Object.fromEntries(
    Object.entries(NOTION_EDITORIAL_TRACKING_SCHEMA).filter(
      ([name]) => !properties[name],
    ),
  );

  if (!Object.keys(missing).length) {
    return {
      properties,
      warning: "",
    };
  }

  try {
    await notionFetch(
      `/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
      {
        method: "PATCH",
        body: { properties: missing },
      },
    );

    const refreshed = (await notionFetch(
      `/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
    )) as {
      properties?: Record<string, NotionProperty>;
    } | null;

    return {
      properties: refreshed?.properties || properties,
      warning: "",
    };
  } catch (error) {
    const warning =
      error instanceof NotionApiError && error.status === 403
        ? "Notion Integration에 데이터 소스 구조 변경 권한이 없어 품질 추적 속성 자동 생성은 생략했습니다. 프롬프트 본문 저장은 계속 진행합니다."
        : `Notion 품질 추적 속성 자동 생성 실패: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`;
    return { properties, warning };
  }
}

function buildTrackingProperties(
  resolved: ReturnType<typeof resolveNotionProperties>,
  promptVersion: string,
  preflight?: EditorialPreflight[],
) {
  const properties: Record<string, unknown> = {};
  const item = preflight?.[0];

  if (resolved.promptVersion && promptVersion) {
    properties[resolved.promptVersion.name] = {
      rich_text: richTextChunks(
        promptVersion,
        100,
        200,
      ),
    };
  }

  if (resolved.draftType && item) {
    setExistingSelect(
      properties,
      resolved.draftType,
      editorialDispositionLabel(
        item.recommendedDisposition,
      ),
    );
  }

  if (resolved.qualityScore && item) {
    properties[resolved.qualityScore.name] = {
      number: item.qualityScore,
    };
  }
  if (resolved.officialEvidence && item) {
    properties[resolved.officialEvidence.name] = {
      number: item.officialEvidenceCount,
    };
  }
  if (resolved.duplicateSimilarity && item) {
    properties[resolved.duplicateSimilarity.name] = {
      number: Math.round(
        item.duplicateSimilarity * 100,
      ),
    };
  }

  if (resolved.pipelineStatus) {
    setExistingSelect(
      properties,
      resolved.pipelineStatus,
      "프롬프트 준비",
    );
  }
  if (resolved.lastError) {
    properties[resolved.lastError.name] = {
      rich_text: [],
    };
  }
  if (resolved.lastValidatedAt) {
    properties[resolved.lastValidatedAt.name] = {
      date: { start: new Date().toISOString() },
    };
  }

  if (
    resolved.holdReason
    && item
    && [
      "existing-post-update",
      "reject",
    ].includes(item.recommendedDisposition)
  ) {
    properties[resolved.holdReason.name] = {
      rich_text: richTextChunks(
        item.rationale,
        500,
        1000,
      ),
    };
  }

  return properties;
}

async function updateTrackingPropertiesBestEffort(
  pageId: string,
  properties: Record<string, unknown>,
) {
  if (!Object.keys(properties).length) {
    return "";
  }

  try {
    await notionFetch(
      `/v1/pages/${encodeURIComponent(pageId)}`,
      {
        method: "PATCH",
        body: { properties },
      },
    );
    return "";
  } catch (error) {
    if (
      error instanceof NotionApiError
      && error.status === 403
    ) {
      return "Notion Update content 권한이 없어 품질 추적 속성 값 업데이트는 생략했습니다.";
    }
    return `Notion 품질 추적 속성 업데이트 실패: ${
      error instanceof Error
        ? error.message
        : String(error)
    }`;
  }
}

function fullQuestionRichText(content: string) {
  const value = String(content || "");
  const chunkSize = 1800;
  const maxItems = 100;
  const chunks: Array<{ type: "text"; text: { content: string } }> = [];

  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push({
      type: "text",
      text: { content: value.slice(index, index + chunkSize) },
    });
  }

  if (chunks.length > maxItems) {
    throw new Error(
      `질문 본문이 Notion rich_text 한도를 넘습니다 (${value.length}자). 일부만 저장하지 않고 중단했습니다.`,
    );
  }

  return chunks;
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

function promptRichText(content: string, chunkSize = 1800) {
  const chunks: Array<{
    type: "text";
    text: { content: string };
  }> = [];

  for (let index = 0; index < content.length; index += chunkSize) {
    chunks.push({
      type: "text",
      text: { content: content.slice(index, index + chunkSize) },
    });
  }
  return chunks;
}

function buildPromptBlocks(prompt: string) {
  const byteLength = Buffer.byteLength(prompt, "utf8");
  if (byteLength > 400_000) {
    throw new Error(
      `생성 프롬프트가 너무 길어 Notion 블록 fallback으로 저장할 수 없습니다 (${Math.round(
        byteLength / 1024,
      )}KB).`,
    );
  }

  const richText = promptRichText(prompt);
  const codeBlocks: Array<Record<string, unknown>> = [];
  const richTextPerCodeBlock = 80;

  for (let index = 0; index < richText.length; index += richTextPerCodeBlock) {
    codeBlocks.push({
      object: "block",
      type: "code",
      code: {
        rich_text: richText.slice(index, index + richTextPerCodeBlock),
        language: "plain text",
        caption: [],
      },
    });
  }

  return codeBlocks;
}

async function prependPromptBlocks(pageId: string, prompt: string) {
  const children = buildPromptBlocks(prompt);
  const batchSize = 50;
  let position:
    | { type: "start" }
    | { type: "after_block"; after_block: { id: string } } = {
    type: "start",
  };

  for (let index = 0; index < children.length; index += batchSize) {
    const batch = children.slice(index, index + batchSize);
    const result = (await notionFetch(
      `/v1/blocks/${encodeURIComponent(pageId)}/children`,
      {
        method: "PATCH",
        body: {
          children: batch,
          position,
        },
      },
    )) as { results?: Array<{ id?: string }> } | null;

    const inserted = Array.isArray(result?.results) ? result.results : [];
    const lastId = inserted[inserted.length - 1]?.id;
    if (lastId) {
      position = {
        type: "after_block",
        after_block: { id: lastId },
      };
    }
  }
}

async function savePromptBody(pageId: string, prompt: string) {
  try {
    await replacePageBodyWithPrompt(pageId, prompt);
    return {
      mode: "replace_content" as const,
      warning: "",
    };
  } catch (error) {
    if (!(error instanceof NotionApiError) || error.status !== 403) {
      throw error;
    }

    try {
      await prependPromptBlocks(pageId, prompt);
      return {
        mode: "prepend_blocks" as const,
        warning:
          "현재 Notion 연결에 Update content 권한이 없어 본문 전체 교체 대신 같은 페이지 맨 위에 최신 프롬프트를 저장했습니다. Notion Integration에서 Update content 권한을 켜면 이후부터 본문 전체 교체 방식으로 저장됩니다.",
      };
    } catch (fallbackError) {
      if (fallbackError instanceof NotionApiError && fallbackError.status === 403) {
        throw new Error(
          "Notion 연결에 프롬프트 본문을 쓸 권한이 없습니다. Integration의 Content capabilities에서 Insert content를 허용하고, 본 데이터베이스가 해당 Integration에 연결되어 있는지 확인해주세요.",
        );
      }
      throw fallbackError;
    }
  }
}

async function createOrUpdateNotionPage(
  sourceUrl: string,
  sourceQuestion: SourceQuestion,
) {
  const { dataSourceId } = notionConfig();
  const schema = (await notionFetch(
    `/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
  )) as { properties?: Record<string, NotionProperty> } | null;

  const trackingSchema =
    await ensureEditorialTrackingSchema(
      dataSourceId,
      schema?.properties || {},
    );
  const resolved =
    resolveNotionProperties(
      trackingSchema.properties,
    );
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

  if (resolved.question) {
    properties[resolved.question.name] = {
      rich_text: fullQuestionRichText(sourceQuestion.questionText),
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
    // 기존 후보의 상단 속성은 GitHub Actions 수집 단계에서 이미 채워집니다.
    // Focused Research는 같은 페이지의 프롬프트 본문 저장만 담당합니다.
    // 여기서 properties를 다시 PATCH하면 Update content 권한이 없는
    // Insert-only Integration에서 불필요한 403이 발생하므로 건드리지 않습니다.
  }

  if (!page?.id) {
    throw new Error("Notion 페이지를 만들거나 찾지 못했습니다.");
  }

  return { page, canonicalUrl, resolved, trackingWarning: trackingSchema.warning };
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
    const {
      page,
      canonicalUrl,
      resolved,
      trackingWarning,
    } = await createOrUpdateNotionPage(
      sourceUrl,
      sourceQuestion,
    );
    const savedBody =
      await savePromptBody(
        page.id,
        reviewPrompt,
      );
    const trackingProperties =
      buildTrackingProperties(
        resolved,
        body.promptVersion?.trim() || "",
        Array.isArray(body.preflight)
          ? body.preflight
          : [],
      );
    const trackingValueWarning =
      await updateTrackingPropertiesBestEffort(
        page.id,
        trackingProperties,
      );
    const warning = [
      savedBody.warning,
      trackingWarning,
      trackingValueWarning,
    ].filter(Boolean).join(" ");

    return NextResponse.json({
      ok: true,
      pageId: page.id,
      pageUrl: page.url || "",
      sourceUrl: canonicalUrl,
      saveMode: savedBody.mode,
      warning,
    });
  } catch (error) {
    const permissionHint =
      error instanceof NotionApiError && error.status === 403
        ? ` 권한이 거부된 endpoint: ${error.path}. Notion Integration의 Content capabilities와 데이터베이스 연결 권한을 확인해주세요.`
        : "";

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Notion 프롬프트 저장에 실패했습니다: ${error.message}${permissionHint}`
            : "Notion 프롬프트 저장에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
