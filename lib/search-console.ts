import { JWT } from "google-auth-library";

export type SearchConsoleMetric = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function privateKey() {
  const plain = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.trim();
  if (plain) return plain.replace(/\\n/g, "\n");

  const encoded =
    process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY_BASE64?.trim();
  if (!encoded) return "";
  return Buffer.from(encoded, "base64")
    .toString("utf8")
    .replace(/\\n/g, "\n");
}

export function hasSearchConsoleCredentials() {
  return Boolean(
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?.trim()
      && privateKey()
      && process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim(),
  );
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rolling30Days() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return {
    startDate: dateString(start),
    endDate: dateString(end),
  };
}

async function accessToken() {
  const email =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?.trim();
  const key = privateKey();
  if (!email || !key) {
    throw new Error(
      "Google Search Console 서비스 계정 자격증명이 없습니다.",
    );
  }

  const auth = new JWT({
    email,
    key,
    scopes: [SCOPE],
  });
  const token = await auth.getAccessToken();
  const value =
    typeof token === "string" ? token : token?.token;
  if (!value) {
    throw new Error(
      "Google Search Console access token을 발급받지 못했습니다.",
    );
  }
  return value;
}

async function querySearchConsole(
  body: Record<string, unknown>,
) {
  const siteUrl =
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim();
  if (!siteUrl) {
    throw new Error("GOOGLE_SEARCH_CONSOLE_SITE_URL이 없습니다.");
  }

  const token = await accessToken();
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Search Console ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  return JSON.parse(text) as {
    rows?: Array<{
      keys?: string[];
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    }>;
  };
}

export async function fetchSearchConsoleQueryPerformance(
  rowLimit = 500,
): Promise<SearchConsoleMetric[]> {
  if (!hasSearchConsoleCredentials()) return [];

  const range = rolling30Days();
  const data = await querySearchConsole({
    ...range,
    dimensions: ["query"],
    rowLimit: Math.max(1, Math.min(1000, rowLimit)),
    dataState: "final",
  });

  return (data.rows || []).flatMap((row) => {
    const query = row.keys?.[0]?.trim();
    if (!query) return [];
    return [{
      query,
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    }];
  });
}
