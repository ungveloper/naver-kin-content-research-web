const VERSION = "2026-03-11";

type NotionProperty = {
  id?: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
};

type NotionDataSource = {
  properties?: Record<string, NotionProperty>;
};

async function notion(path: string, init: RequestInit = {}) {
  const key = process.env.NOTION_API_KEY;
  if (!key) throw new Error("NOTION_API_KEY가 없습니다.");

  const res = await fetch(`https://api.notion.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Notion-Version": VERSION,
      ...(init.headers || {}),
    },
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`Notion ${res.status}: ${raw}`);
  return raw ? JSON.parse(raw) as unknown : null;
}

async function main() {
  const id = process.env.NOTION_DATA_SOURCE_ID;
  if (!id) throw new Error("NOTION_DATA_SOURCE_ID가 없습니다.");

  const ds = await notion(
    `/v1/data_sources/${encodeURIComponent(id)}`,
  ) as NotionDataSource | null;

  const props = Object.entries(ds?.properties ?? {}).map(
    ([key, value]) => ({ key, ...value }),
  );
  const byName = new Map(props.map((p) => [p.name || p.key, p]));
  const patch: Record<string, unknown> = {};
  const created = byName.get("생성일시");
  if (!created) patch["생성일시"] = { created_time: {} };
  else if (created.type !== "created_time") throw new Error(`'생성일시' 타입이 created_time이 아닙니다: ${created.type}`);
  const written = byName.get("질문 작성 일시");
  if (!written) patch["질문 작성 일시"] = { date: {} };
  else if (written.type !== "date") throw new Error(`'질문 작성 일시' 타입이 date가 아닙니다: ${written.type}`);
  const old = byName.get("발견일시");
  if (old) {
    if (old.type !== "date") throw new Error(`'발견일시' 타입이 date가 아닙니다: ${old.type}`);
    patch[old.id || old.key] = null;
  }
  if (Object.keys(patch).length) {
    await notion(`/v1/data_sources/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ properties: patch }) });
  }
  console.log("[Notion schema] 생성일시(created_time) + 질문 작성 일시(date) 적용, 발견일시 제거 완료");
}
main().catch((e) => { console.error(`[Notion schema] Error: ${e instanceof Error ? e.message : String(e)}`); process.exit(1); });
