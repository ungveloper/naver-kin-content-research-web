const KST_MS = 9 * 60 * 60 * 1000;
const pad = (v: number) => String(v).padStart(2, "0");

function toKstIso(date: Date) {
  const d = new Date(date.getTime() + KST_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+09:00`;
}

function normalizeStructured(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : toKstIso(date);
}

function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m?.[1] || m?.[2] || m?.[3] || "";
}

function questionSection(html: string) {
  const answer = [html.search(/id=["']answerArea["']/i), html.search(/class=["'][^"']*\banswer-content\b/i)].filter((v) => v >= 0);
  const head = html.slice(0, answer.length ? Math.min(...answer) : html.length);
  const starts = [head.search(/class=["'][^"']*\bquestion-content\b/i), head.search(/class=["'][^"']*\b_questionContentsArea\b/i)].filter((v) => v >= 0);
  return head.slice(starts.length ? Math.min(...starts) : 0);
}

function jsonLdDate(html: string) {
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  const visit = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return null;
    if (Array.isArray(value)) {
      for (const item of value) { const found = visit(item); if (found) return found; }
      return null;
    }
    const obj = value as Record<string, unknown>;
    const raw = obj["@type"];
    const types = Array.isArray(raw) ? raw : [raw];
    if (types.some((v) => typeof v === "string" && v.toLowerCase() === "question")) {
      for (const key of ["dateCreated", "datePublished", "uploadDate"]) {
        const found = normalizeStructured(obj[key]);
        if (found) return found;
      }
    }
    for (const child of Object.values(obj)) { const found = visit(child); if (found) return found; }
    return null;
  };
  for (const script of scripts) {
    try {
      const raw = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
      const found = visit(JSON.parse(raw));
      if (found) return found;
    } catch {}
  }
  return null;
}

function metaDate(html: string) {
  const accepted = new Set(["article:published_time", "datecreated", "datepublished", "publishdate", "pubdate"]);
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = (attr(tag, "property") || attr(tag, "name") || attr(tag, "itemprop")).toLowerCase();
    if (!accepted.has(key)) continue;
    const found = normalizeStructured(attr(tag, "content"));
    if (found) return found;
  }
  return null;
}

function visibleDate(html: string, fetchedAt: Date) {
  const section = questionSection(html);
  const patterns = [
    /<span\b[^>]*class=["'][^"']*c-userinfo__info[^"']*["'][^>]*>\s*<span\b[^>]*class=["']blind["'][^>]*>\s*작성일\s*<\/span>\s*([^<]{1,60})<\/span>/i,
    /<span\b[^>]*class=["']blind["'][^>]*>\s*작성일\s*<\/span>\s*([^<]{1,60})/i,
  ];
  let text = "";
  for (const p of patterns) { const m = section.match(p); if (m?.[1]) { text = m[1].replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim(); break; } }
  if (!text) return null;
  if (/^(방금|조금 전)$/.test(text)) return toKstIso(fetchedAt);
  let m = text.match(/^(\d+)\s*분\s*전$/); if (m) return toKstIso(new Date(fetchedAt.getTime() - Number(m[1]) * 60000));
  m = text.match(/^(\d+)\s*시간\s*전$/); if (m) return toKstIso(new Date(fetchedAt.getTime() - Number(m[1]) * 3600000));
  m = text.match(/^(\d+)\s*일\s*전$/); if (m) return toKstIso(new Date(fetchedAt.getTime() - Number(m[1]) * 86400000));
  if (text === "어제") return toKstIso(new Date(fetchedAt.getTime() - 86400000));
  m = text.match(/^(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})(?:일)?(?:[.\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss] = m;
  if (hh == null) return `${y}-${pad(Number(mo))}-${pad(Number(d))}`;
  const utc = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh) - 9, Number(mm), Number(ss || 0)));
  return toKstIso(utc);
}

export function extractKinQuestionCreatedAt(html: string, fetchedAt = new Date()) {
  return jsonLdDate(html) || metaDate(questionSection(html)) || visibleDate(html, fetchedAt) || null;
}
