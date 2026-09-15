import "server-only";

export type ContentRegistryMatch = {
  questionId?: string;
  kinDocId: string;
  kinUrl: string;
  questionTitle: string;
  wordpressUrl?: string;
  articleTitle?: string;
  relationType?: "origin" | "reuse" | "expand" | "duplicate";
};

export function isContentRegistryConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim()
      && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function extractKinDocId(url: string) {
  try {
    return new URL(url).searchParams.get("docId")?.trim() || "";
  } catch {
    return String(url || "").match(/[?&]docId=(\d+)/i)?.[1] || "";
  }
}

export function normalizeRegistryTitle(value: string) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ko-KR");
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function registryFetch(path: string) {
  const base = process.env.SUPABASE_URL?.trim()?.replace(/\/$/, "");
  if (!base || !isContentRegistryConfigured()) return null;

  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Supabase registry ${response.status}: ${await response.text()}`,
    );
  }

  return response.json();
}

function mapRow(row: Record<string, unknown>): ContentRegistryMatch {
  return {
    questionId: String(row.question_id || "") || undefined,
    kinDocId: String(row.kin_doc_id || ""),
    kinUrl: String(row.kin_url || ""),
    questionTitle: String(row.question_title || ""),
    wordpressUrl: String(row.wordpress_url || "") || undefined,
    articleTitle: String(row.article_title || "") || undefined,
    relationType:
      (String(row.relation_type || "") as ContentRegistryMatch["relationType"])
      || undefined,
  };
}

export async function findContentRegistryExactMatch(input: {
  title?: string;
  url?: string;
}): Promise<ContentRegistryMatch | null> {
  if (!isContentRegistryConfigured()) return null;

  const docId = extractKinDocId(input.url || "");
  const title = String(input.title || "").trim();
  const url = String(input.url || "").trim();

  const checks: Array<[string, string]> = [];

  if (docId) checks.push(["kin_doc_id", docId]);
  if (url) checks.push(["kin_url", url]);
  if (title) checks.push(["question_title", title]);

  for (const [column, value] of checks) {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set(column, `eq.${value}`);
    params.set("limit", "1");

    const rows = await registryFetch(
      `content_registry_entries?${params.toString()}`,
    );

    if (Array.isArray(rows) && rows[0]) {
      return mapRow(rows[0]);
    }
  }

  return null;
}
