const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, "0");
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, decimal) => {
      const code = Number.parseInt(decimal, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&([a-z]+);/gi, (full, name) => named[name.toLowerCase()] ?? full);
}

function htmlToText(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(?:div|p|li|section|article|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\u00a0/g, " ")
    .replace(/[\t\r ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractHtmlByClass(html, className) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = String(html || "");
  const openPattern = new RegExp(
    `<([a-z0-9]+)\\b[^>]*class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>`,
    "i",
  );
  const openMatch = openPattern.exec(source);
  if (!openMatch) return "";

  const tagName = openMatch[1].toLowerCase();
  const contentStart = openMatch.index + openMatch[0].length;
  const tokenPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tokenPattern.lastIndex = contentStart;

  let depth = 1;
  let token;

  while ((token = tokenPattern.exec(source))) {
    if (token[0].startsWith("</")) {
      depth -= 1;
    } else if (!/\/\s*>$/.test(token[0])) {
      depth += 1;
    }

    if (depth === 0) {
      return source.slice(contentStart, token.index);
    }
  }

  return "";
}

function normalizeForCompare(value) {
  return htmlToText(value)
    .toLowerCase()
    .replace(/(?:\.\.\.|…)+$/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function valuesAgree(left, right) {
  const a = normalizeForCompare(left);
  const b = normalizeForCompare(right);

  if (!a || !b) return false;
  if (a === b) return true;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;

  return shorter.length >= 8 && longer.includes(shorter);
}

function genericServiceTitle(value) {
  const normalized = htmlToText(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return new Set([
    "네이버 지식in",
    "네이버 지식인",
    "naver 지식in",
    "naver 지식인",
    "지식in",
    "지식인",
  ]).has(normalized);
}

function genericServiceQuestion(value) {
  const normalized = htmlToText(value)
    .toLowerCase()
    .replace(/[.!?。！？]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return [
    "지식나눔과 기부로 함께 성장하는 지식in을 만나보세요",
    "지식나눔과 기부로 함께 성장하는 지식인을 만나보세요",
    "네이버 지식in을 만나보세요",
    "네이버 지식인을 만나보세요",
  ].some((phrase) => normalized.includes(phrase));
}

function cleanApiTitle(value) {
  const cleaned = htmlToText(value)
    .replace(/^질문\s*/i, "")
    .replace(/\s*[:|\-–—]\s*(?:네이버\s*)?지식iN.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return genericServiceTitle(cleaned) ? "" : cleaned;
}

function cleanApiQuestion(value) {
  const cleaned = htmlToText(value)
    .replace(/\s*(?:\.\.\.|…)+\s*$/g, "")
    .trim();

  if (cleaned.length < 2 || genericServiceQuestion(cleaned)) return "";
  return cleaned;
}

function cleanDomTitle(value) {
  return cleanApiTitle(value);
}

function cleanDomQuestion(value) {
  const cleaned = htmlToText(value).trim();
  if (cleaned.length < 2 || genericServiceQuestion(cleaned)) return "";
  return cleaned;
}

function findQuestionNode(value) {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findQuestionNode(item);
      if (found) return found;
    }
    return null;
  }

  const rawType = value["@type"];
  const types = Array.isArray(rawType) ? rawType : [rawType];

  if (
    types.some(
      (item) => typeof item === "string" && item.toLowerCase() === "question",
    )
  ) {
    return value;
  }

  for (const child of Object.values(value)) {
    const found = findQuestionNode(child);
    if (found) return found;
  }

  return null;
}

function normalizeStructuredDate(value) {
  if (typeof value !== "string") return undefined;

  const text = value.trim();
  if (!text) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return toKstIso(parsed);
}

function questionJsonLd(html) {
  const scripts = [
    ...String(html || "").matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  for (const match of scripts) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(match[1]).trim());
      const node = findQuestionNode(parsed);
      if (!node) continue;

      const title = cleanDomTitle(String(node.name || node.headline || ""));
      const questionText = cleanDomQuestion(
        String(node.text || node.description || ""),
      );
      const questionCreatedAt = normalizeStructuredDate(
        node.dateCreated || node.datePublished || node.uploadDate,
      );

      if (title || questionText || questionCreatedAt) {
        return { title, questionText, questionCreatedAt };
      }
    } catch {
      // 다음 JSON-LD 후보를 확인합니다.
    }
  }

  return {
    title: "",
    questionText: "",
    questionCreatedAt: undefined,
  };
}

function extractDomTitle(html) {
  const section = extractHtmlByClass(html, "endTitleSection");
  if (!section) return "";

  const badgeStart = section.search(
    /<[^>]*class=["'][^"']*\bendTitleBadgeArea\b[^"']*["'][^>]*>/i,
  );

  let titleHtml = badgeStart >= 0 ? section.slice(0, badgeStart) : section;

  titleHtml = titleHtml
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(
      /<span\b[^>]*class=["'][^"']*\bblind\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
      " ",
    );

  return cleanDomTitle(titleHtml);
}

function extractDomQuestion(html) {
  for (const className of [
    "questionDetail",
    "question-content",
    "_questionContentsArea",
    "c-heading__content",
  ]) {
    const value = extractHtmlByClass(html, className);
    const cleaned = cleanDomQuestion(value);
    if (cleaned) return cleaned;
  }

  return "";
}

function toKstIso(date) {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);

  return [
    shifted.getUTCFullYear(),
    "-",
    pad(shifted.getUTCMonth() + 1),
    "-",
    pad(shifted.getUTCDate()),
    "T",
    pad(shifted.getUTCHours()),
    ":",
    pad(shifted.getUTCMinutes()),
    ":",
    pad(shifted.getUTCSeconds()),
    "+09:00",
  ].join("");
}

function fromKstParts(
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
) {
  return new Date(
    Date.UTC(year, month - 1, day, hour - 9, minute, second),
  );
}

function parseVisibleDate(value, fetchedAt) {
  const text = htmlToText(value).replace(/\s+/g, " ").trim();
  if (!text) return undefined;

  if (/^(방금|조금 전)$/.test(text)) return toKstIso(fetchedAt);

  let match = text.match(/^(\d+)\s*분\s*전$/);
  if (match) {
    return toKstIso(
      new Date(fetchedAt.getTime() - Number(match[1]) * 60 * 1000),
    );
  }

  match = text.match(/^(\d+)\s*시간\s*전$/);
  if (match) {
    return toKstIso(
      new Date(fetchedAt.getTime() - Number(match[1]) * 60 * 60 * 1000),
    );
  }

  match = text.match(/^(\d+)\s*일\s*전$/);
  if (match) {
    return toKstIso(
      new Date(fetchedAt.getTime() - Number(match[1]) * 24 * 60 * 60 * 1000),
    );
  }

  if (text === "어제") {
    return toKstIso(
      new Date(fetchedAt.getTime() - 24 * 60 * 60 * 1000),
    );
  }

  match = text.match(
    /^(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})(?:일)?(?:[.\s]+(\d{1,2})[:시]\s*(\d{1,2})?(?:[:분]\s*(\d{1,2}))?)?/,
  );

  if (!match) return undefined;

  const [, year, month, day, hour, minute, second] = match;

  if (hour == null) {
    return `${year}-${pad(Number(month))}-${pad(Number(day))}`;
  }

  return toKstIso(
    fromKstParts(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute || 0),
      Number(second || 0),
    ),
  );
}

function extractDomQuestionCreatedAt(html, fetchedAt) {
  const userInfo = extractHtmlByClass(html, "userInfo");
  const searchArea = userInfo || html;

  const patterns = [
    /<span\b[^>]*class=["'][^"']*\binfoItem\b[^"']*["'][^>]*>\s*<span\b[^>]*class=["'][^"']*\bblind\b[^"']*["'][^>]*>\s*작성일\s*<\/span>\s*([^<]{1,60})<\/span>/i,
    /<span\b[^>]*class=["'][^"']*\bblind\b[^"']*["'][^>]*>\s*작성일\s*<\/span>\s*([^<]{1,60})/i,
    /작성일\s*[:：]?\s*([^<\n\r]{1,40})/i,
  ];

  for (const pattern of patterns) {
    const match = searchArea.match(pattern);
    if (!match?.[1]) continue;

    const parsed = parseVisibleDate(match[1], fetchedAt);
    if (parsed) return parsed;
  }

  return undefined;
}

export function reconcileKinQuestion(input) {
  const fetchedAt = input.fetchedAt || new Date();

  const apiTitle = cleanApiTitle(input.apiTitle || "");
  const apiQuestion = cleanApiQuestion(input.apiDescription || "");

  const domTitle = extractDomTitle(input.html);
  const domQuestion = extractDomQuestion(input.html);
  const domCreatedAt = extractDomQuestionCreatedAt(input.html, fetchedAt);

  const structured = questionJsonLd(input.html);

  const pageTitle = domTitle || structured.title;
  const pageQuestion = domQuestion || structured.questionText;
  const questionCreatedAt = structured.questionCreatedAt || domCreatedAt;

  if (!pageTitle || !pageQuestion) {
    return {
      title: "",
      questionText: "",
      questionCreatedAt,
      verified: false,
      titleSource: "unavailable",
      questionSource: "unavailable",
      apiTitleAgreement: false,
      apiQuestionAgreement: false,
      failureReason:
        !pageTitle && !pageQuestion
          ? "실제 질문 페이지에서 제목과 질문 본문을 모두 확인하지 못했습니다."
          : !pageTitle
            ? "실제 질문 페이지에서 제목을 확인하지 못했습니다."
            : "실제 질문 페이지에서 질문 본문을 확인하지 못했습니다.",
    };
  }

  const apiTitleAgreement = Boolean(apiTitle && valuesAgree(apiTitle, pageTitle));
  const apiQuestionAgreement = Boolean(
    apiQuestion && valuesAgree(apiQuestion, pageQuestion),
  );

  const title = apiTitleAgreement ? apiTitle : pageTitle;
  const titleSource = apiTitleAgreement
    ? "naver-api"
    : domTitle
      ? "page-dom"
      : "question-jsonld";

  let questionText = pageQuestion;
  let questionSource = domQuestion ? "page-dom" : "question-jsonld";

  if (apiQuestionAgreement) {
    const apiNormalized = normalizeForCompare(apiQuestion);
    const pageNormalized = normalizeForCompare(pageQuestion);

    if (apiNormalized === pageNormalized) {
      questionText = apiQuestion;
      questionSource = "naver-api";
    } else {
      questionText = pageQuestion;
      questionSource = "page-dom-expanded";
    }
  }

  return {
    title,
    questionText,
    questionCreatedAt,
    verified: true,
    titleSource,
    questionSource,
    apiTitleAgreement,
    apiQuestionAgreement,
  };
}

function visiblePageText(html) {
  return htmlToText(
    String(html || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " "),
  );
}

export function inspectKinAnswerability(html) {
  const source = String(html || "");
  const visible = visiblePageText(source);

  const hasAcceptedAnswer =
    /질문자\s*[·⋅ㆍ]?\s*지식인이\s*채택한\s*답변입니다/i.test(visible)
    || /질문자가\s*채택한\s*답변입니다/i.test(visible)
    || /지식인이\s*채택한\s*답변입니다/i.test(visible)
    || /채택답변/i.test(visible);

  const isClosed =
    /답변\s*마감/i.test(visible)
    || /마감된\s*질문/i.test(visible)
    || /질문이\s*마감/i.test(visible)
    || /답변을\s*(?:더\s*)?등록할\s*수\s*없/i.test(visible)
    || /답변\s*등록이\s*불가능/i.test(visible)
    || /삭제된\s*질문/i.test(visible)
    || /질문이\s*삭제/i.test(visible);

  const answerActionPatterns = [
    /<(?:a|button)\b[^>]*>\s*(?:<[^>]+>\s*)*답변하기(?:\s*<[^>]+>)*\s*<\/(?:a|button)>/i,
    /<(?:a|button)\b[^>]*(?:href|onclick|class)=["'][^"']*(?:answerWrite|answerForm|answerRegister|qna\/answer|_answer)[^"']*["'][^>]*>/i,
    /href=["'][^"']*\/qna\/answer[^"']*["']/i,
  ];

  const hasAnswerAction = answerActionPatterns.some(
    (pattern) => pattern.test(source),
  );

  if (hasAcceptedAnswer) {
    return {
      answerable: false,
      hasAcceptedAnswer,
      isClosed,
      hasAnswerAction,
      reason: "이미 채택된 답변이 있는 질문",
    };
  }

  if (isClosed) {
    return {
      answerable: false,
      hasAcceptedAnswer,
      isClosed,
      hasAnswerAction,
      reason: "답변 마감·삭제 등으로 답변할 수 없는 질문",
    };
  }

  if (!hasAnswerAction) {
    return {
      answerable: false,
      hasAcceptedAnswer,
      isClosed,
      hasAnswerAction,
      reason: "실제 질문 페이지에서 답변하기 동작을 확인하지 못한 질문",
    };
  }

  return {
    answerable: true,
    hasAcceptedAnswer,
    isClosed,
    hasAnswerAction,
    reason: "미채택이며 답변하기 동작을 확인한 질문",
  };
}
