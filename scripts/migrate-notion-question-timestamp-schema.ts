const NOTION_VERSION = "2026-03-11";

type NotionProperty = {
  id?: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
};

type NotionDataSource = {
  properties?: Record<string, NotionProperty>;
};

async function notionGet(path: string) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error("NOTION_API_KEY가 없습니다.");
  }

  const response = await fetch(`https://api.notion.com${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Notion ${response.status}: ${raw}`);
  }

  return raw ? JSON.parse(raw) as unknown : null;
}

function propertyMap(dataSource: NotionDataSource | null) {
  const entries = Object.entries(dataSource?.properties ?? {}).map(
    ([key, value]) => ({
      key,
      name: value.name || key,
      type: value.type || "",
    }),
  );

  return new Map(entries.map((property) => [property.name, property]));
}

async function inspectTimestampSchema() {
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  if (!dataSourceId) {
    throw new Error("NOTION_DATA_SOURCE_ID가 없습니다.");
  }

  const dataSource = await notionGet(
    `/v1/data_sources/${encodeURIComponent(dataSourceId)}`,
  ) as NotionDataSource | null;

  const byName = propertyMap(dataSource);

  const createdAt = byName.get("생성일시");
  const questionCreatedAt = byName.get("질문 작성 일시");
  const legacyFoundAt = byName.get("발견일시");

  if (createdAt?.type === "created_time") {
    console.log("[Notion schema] 생성일시(created_time) 확인");
  } else if (createdAt) {
    console.warn(
      `[Notion schema] 생성일시가 있지만 created_time 타입이 아닙니다: ${createdAt.type}`,
    );
  } else {
    console.warn(
      "[Notion schema] 생성일시(created_time)가 없습니다. "
      + "Notion UI에서 Created time 속성을 추가하면 페이지 생성 시각을 자동으로 볼 수 있습니다.",
    );
  }

  if (questionCreatedAt?.type === "date") {
    console.log("[Notion schema] 질문 작성 일시(date) 확인");
  } else if (questionCreatedAt) {
    console.warn(
      `[Notion schema] 질문 작성 일시가 있지만 date 타입이 아닙니다: ${questionCreatedAt.type}`,
    );
  } else if (legacyFoundAt?.type === "date") {
    console.warn(
      "[Notion schema] 질문 작성 일시가 없고 기존 발견일시(date)가 있습니다. "
      + "런타임은 기존 발견일시를 질문 작성 일시 저장용 fallback으로 사용합니다. "
      + "Notion UI에서 속성 이름만 '질문 작성 일시'로 바꾸면 됩니다.",
    );
  } else {
    console.warn(
      "[Notion schema] 질문 작성 일시/date 속성을 찾지 못했습니다. "
      + "질문 수집과 프롬프트 생성은 계속하며 timestamp property 저장만 생략될 수 있습니다.",
    );
  }
}

inspectTimestampSchema().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  console.warn(
    `[Notion schema] timestamp schema 검사를 건너뜁니다: ${message}`,
  );
  console.warn(
    "[Notion schema] 이 검사는 비치명적입니다. KIN 질문 수집은 계속 실행합니다.",
  );

  process.exit(0);
});
