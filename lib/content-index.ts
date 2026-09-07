import type { SiteContentRecord } from "@/lib/types";

type IndexedDocument = {
  item: SiteContentRecord;
  frequencies: Map<string, number>;
  length: number;
  titleTokens: Set<string>;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^0-9a-z가-힣]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenPieces(value: string) {
  const normalized = normalize(value);
  if (!normalized) return [];

  const base = normalized
    .split(" ")
    .filter((token) => token.length >= 2);

  const grams: string[] = [];
  for (const token of base) {
    if (/^[가-힣]{4,}$/.test(token)) {
      for (let index = 0; index < token.length - 1; index += 1) {
        grams.push(token.slice(index, index + 2));
      }
    }
  }

  return [...base, ...grams];
}

function frequencies(tokens: string[]) {
  const map = new Map<string, number>();
  for (const token of tokens) {
    map.set(token, (map.get(token) || 0) + 1);
  }
  return map;
}

export function shortlistSiteContents(
  query: string,
  items: SiteContentRecord[],
  limit = 48,
) {
  const safeLimit = Math.max(8, Math.min(100, Math.floor(limit)));
  if (!items.length) return [];

  const queryTokens = tokenPieces(query);
  if (!queryTokens.length) return items.slice(0, safeLimit);

  const documents: IndexedDocument[] = items.map((item) => {
    const titleTokens = tokenPieces(item.title);
    const bodyTokens = tokenPieces(
      `${item.title} ${item.excerpt || ""} ${item.slug || ""}`,
    );
    return {
      item,
      frequencies: frequencies(bodyTokens),
      length: Math.max(1, bodyTokens.length),
      titleTokens: new Set(titleTokens),
    };
  });

  const documentCount = documents.length;
  const averageLength =
    documents.reduce((sum, document) => sum + document.length, 0)
    / Math.max(1, documentCount);

  const uniqueQueryTokens = [...new Set(queryTokens)];
  const documentFrequency = new Map<string, number>();

  for (const token of uniqueQueryTokens) {
    let count = 0;
    for (const document of documents) {
      if (document.frequencies.has(token)) count += 1;
    }
    documentFrequency.set(token, count);
  }

  const k1 = 1.2;
  const b = 0.75;

  const ranked = documents.map((document, index) => {
    let score = 0;

    for (const token of uniqueQueryTokens) {
      const tf = document.frequencies.get(token) || 0;
      if (!tf) continue;

      const df = documentFrequency.get(token) || 0;
      const idf = Math.log(
        1 + (documentCount - df + 0.5) / (df + 0.5),
      );
      const denominator =
        tf + k1 * (
          1 - b + b * (document.length / Math.max(1, averageLength))
        );

      score += idf * ((tf * (k1 + 1)) / denominator);

      if (document.titleTokens.has(token)) {
        score += idf * 0.45;
      }
    }

    return { item: document.item, score, index };
  });

  const positive = ranked
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, safeLimit)
    .map((entry) => entry.item);

  if (positive.length >= Math.min(8, safeLimit)) return positive;

  const seen = new Set(positive.map((item) => item.url));
  return [
    ...positive,
    ...items.filter((item) => !seen.has(item.url)),
  ].slice(0, safeLimit);
}
