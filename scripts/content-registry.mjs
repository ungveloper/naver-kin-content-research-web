export function isContentRegistryConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim()
      && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function extractKinDocId(url) {
  try {
    return new URL(url).searchParams.get("docId")?.trim() || "";
  } catch {
    return String(url || "").match(/[?&]docId=(\d+)/i)?.[1] || "";
  }
}

export function normalizeRegistryTitle(value) {
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

async function registryFetch(path, options = {}) {
  const base = process.env.SUPABASE_URL?.trim()?.replace(/\/$/, "");
  if (!base || !isContentRegistryConfigured()) return null;

  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...supabaseHeaders(),
      Prefer: options.prefer || "",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `Supabase registry ${response.status}: ${await response.text()}`,
    );
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function mapRow(row) {
  return {
    questionId: String(row.question_id || "") || undefined,
    kinDocId: String(row.kin_doc_id || ""),
    kinUrl: String(row.kin_url || ""),
    questionTitle: String(row.question_title || ""),
    wordpressUrl: String(row.wordpress_url || "") || undefined,
    articleTitle: String(row.article_title || "") || undefined,
    relationType: String(row.relation_type || "") || undefined,
  };
}

export async function findContentRegistryExactMatch(input) {
  if (!isContentRegistryConfigured()) return null;

  const docId = extractKinDocId(input?.url || "");
  const title = String(input?.title || "").trim();
  const url = String(input?.url || "").trim();

  const checks = [];

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

export async function upsertRegistryArticle(article) {
  return registryFetch(
    "content_articles?on_conflict=wordpress_url",
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify([article]),
    },
  );
}

export async function upsertRegistryQuestion(question) {
  return registryFetch(
    "kin_questions?on_conflict=kin_doc_id",
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify([question]),
    },
  );
}

export async function upsertRegistryRelation(relation) {
  return registryFetch(
    "question_article_relations?on_conflict=question_id,article_id",
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify([relation]),
    },
  );
}
