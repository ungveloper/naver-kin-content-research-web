import { cert, getApps, initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
} from "firebase-admin/firestore";

export const CONTENT_REGISTRY_COLLECTIONS = {
  questions: "kinQuestions",
  articles: "contentArticles",
  relations: "questionArticleRelations",
};

const STOPWORDS = new Set([
  "그리고",
  "그런데",
  "그래서",
  "제가",
  "저는",
  "이거",
  "그냥",
  "정말",
  "제발",
  "질문",
  "관련",
  "방법",
  "문제",
  "알려주세요",
  "해주세요",
  "어떻게",
  "있나요",
  "있어요",
]);

const TERM_ALIASES = new Map([
  ["비번", "비밀번호"],
  ["암호", "비밀번호"],
  ["패스워드", "비밀번호"],
  ["리셋", "초기화"],
  ["복원", "복구"],
  ["카카오톡", "카톡"],
  ["에러", "오류"],
  ["세척", "청소"],
  ["용량", "저장공간"],
  ["접속", "연결"],
  ["페어링", "연결"],
]);

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

export function normalizeRegistrySimilarityText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/아이\s*클라우드/g, "아이클라우드")
    .replace(/갤럭시\s*워치/g, "갤럭시워치")
    .replace(/에어팟\s*프로\s*2/g, "에어팟프로2")
    .replace(/one\s*ui/gi, "oneui")
    .replace(/[^0-9a-z가-힣]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasToken(token) {
  return TERM_ALIASES.get(token) || token;
}

function wordTokens(value) {
  return normalizeRegistrySimilarityText(value)
    .split(" ")
    .map((token) => aliasToken(token.trim()))
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function ngrams(value, size = 2) {
  const compact = normalizeRegistrySimilarityText(value).replace(/\s+/g, "");

  if (compact.length < size) {
    return compact ? [compact] : [];
  }

  const result = [];

  for (let index = 0; index <= compact.length - size; index += 1) {
    result.push(compact.slice(index, index + size));
  }

  return result;
}

function diceCoefficient(left, right, size = 2) {
  const leftSet = new Set(ngrams(left, size));
  const rightSet = new Set(ngrams(right, size));

  if (!leftSet.size || !rightSet.size) {
    return 0;
  }

  let intersection = 0;

  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  return (2 * intersection) / (leftSet.size + rightSet.size);
}

function overlapCoefficient(left, right) {
  const leftSet = new Set(wordTokens(left));
  const rightSet = new Set(wordTokens(right));

  if (!leftSet.size || !rightSet.size) {
    return 0;
  }

  let intersection = 0;

  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  return intersection / Math.min(leftSet.size, rightSet.size);
}

export function buildRegistrySearchTokens(title, body = "") {
  const tokens = [];
  const seen = new Set();

  const push = (value) => {
    const normalized = String(value || "").trim();

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    tokens.push(normalized);
  };

  for (const token of wordTokens(title)) {
    push(`w:${token}`);
  }

  for (const gram of ngrams(title, 3)) {
    push(`g:${gram}`);
  }

  for (const token of wordTokens(body).slice(0, 12)) {
    push(`w:${token}`);
  }

  return tokens.slice(0, 30);
}

export const REGISTRY_SIMILARITY_POLICY = {
  excludeScore: 0.44,
  warningScore: 0.3,
};

export function scoreRegistrySimilarity(left, right) {
  const leftTitle = String(left?.title || "");
  const rightTitle = String(right?.title || "");
  const leftBody = String(left?.body || "");
  const rightBody = String(right?.body || "");

  const titleDice = diceCoefficient(leftTitle, rightTitle, 2);
  const bodyDice = diceCoefficient(
    leftBody.slice(0, 800),
    rightBody.slice(0, 800),
    2,
  );
  const tokenOverlap = overlapCoefficient(
    `${leftTitle} ${leftBody.slice(0, 800)}`,
    `${rightTitle} ${rightBody.slice(0, 800)}`,
  );

  const weighted = Math.max(
    (titleDice * 0.68) + (bodyDice * 0.32),
    (titleDice * 0.55) + (tokenOverlap * 0.45),
    (titleDice * 0.35)
      + (bodyDice * 0.35)
      + (tokenOverlap * 0.3),
  );

  const exclude = (
    weighted >= REGISTRY_SIMILARITY_POLICY.excludeScore
    || (titleDice >= 0.58 && tokenOverlap >= 0.28)
    || (
      titleDice >= 0.32
      && bodyDice >= 0.2
      && tokenOverlap >= 0.28
    )
  );

  const warning = (
    !exclude
    && (
      weighted >= REGISTRY_SIMILARITY_POLICY.warningScore
      || (titleDice >= 0.34 && tokenOverlap >= 0.18)
      || tokenOverlap >= 0.3
    )
  );

  const decision = exclude
    ? "exclude"
    : warning
      ? "warning"
      : "new";

  return {
    score: Number(weighted.toFixed(4)),
    titleDice: Number(titleDice.toFixed(4)),
    bodyDice: Number(bodyDice.toFixed(4)),
    tokenOverlap: Number(tokenOverlap.toFixed(4)),
    decision,
    similar: decision === "exclude",
  };
}

export function isContentRegistryConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
}

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON이 설정되지 않았습니다.");
  }

  const parsed = JSON.parse(raw);

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error(
      "Firebase service account JSON에 project_id/client_email/private_key가 필요합니다.",
    );
  }

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

export function getContentRegistryDb() {
  if (!isContentRegistryConfigured()) {
    return null;
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(parseServiceAccount()),
    });
  }

  return getFirestore();
}

function mapQuestion(doc, matchType, similarity = null) {
  const data = doc.data() || {};

  return {
    questionId: doc.id,
    kinDocId: String(data.kinDocId || doc.id),
    kinUrl: String(data.kinUrl || ""),
    questionTitle: String(data.title || ""),
    questionBody: String(data.body || ""),
    wordpressUrl: String(data.wordpressUrl || "") || undefined,
    articleTitle: String(data.articleTitle || "") || undefined,
    articleSlug: String(data.canonicalArticleSlug || "") || undefined,
    matchType,
    similarity,
  };
}

export async function findContentRegistryHistoryMatch(input) {
  const db = getContentRegistryDb();

  if (!db) {
    return null;
  }

  const docId = extractKinDocId(input?.url || "");
  const url = String(input?.url || "").trim();
  const title = String(input?.title || "").trim();
  const body = String(input?.body || "").trim();
  const normalizedTitle = normalizeRegistryTitle(title);

  if (docId) {
    const direct = await db
      .collection(CONTENT_REGISTRY_COLLECTIONS.questions)
      .doc(docId)
      .get();

    if (direct.exists) {
      return mapQuestion(direct, "exact_doc_id");
    }
  }

  if (url) {
    const byUrl = await db
      .collection(CONTENT_REGISTRY_COLLECTIONS.questions)
      .where("kinUrl", "==", url)
      .limit(1)
      .get();

    if (!byUrl.empty) {
      return mapQuestion(byUrl.docs[0], "exact_url");
    }
  }

  if (normalizedTitle) {
    const byTitle = await db
      .collection(CONTENT_REGISTRY_COLLECTIONS.questions)
      .where("normalizedTitle", "==", normalizedTitle)
      .limit(1)
      .get();

    if (!byTitle.empty) {
      return mapQuestion(byTitle.docs[0], "exact_title");
    }
  }

  const searchTokens = buildRegistrySearchTokens(title, body);

  if (!searchTokens.length) {
    return null;
  }

  const candidates = await db
    .collection(CONTENT_REGISTRY_COLLECTIONS.questions)
    .where("searchTokens", "array-contains-any", searchTokens)
    .limit(40)
    .get();

  let bestExclude = null;
  let bestWarning = null;

  for (const doc of candidates.docs) {
    if (docId && doc.id === docId) {
      continue;
    }

    const data = doc.data() || {};
    const similarity = scoreRegistrySimilarity(
      { title, body },
      {
        title: String(data.title || ""),
        body: String(data.body || ""),
      },
    );

    if (similarity.decision === "new") {
      continue;
    }

    const mapped = mapQuestion(doc, "similar", similarity);

    if (similarity.decision === "exclude") {
      if (
        !bestExclude
        || similarity.score > bestExclude.similarity.score
      ) {
        bestExclude = mapped;
      }

      continue;
    }

    if (
      !bestWarning
      || similarity.score > bestWarning.similarity.score
    ) {
      bestWarning = mapped;
    }
  }

  return bestExclude || bestWarning;
}

export async function findContentRegistryExactMatch(input) {
  return findContentRegistryHistoryMatch(input);
}

export async function claimContentRegistryQuestion(item) {
  const db = getContentRegistryDb();

  if (!db) {
    throw new Error(
      "Firestore 콘텐츠 레지스트리가 설정되지 않았습니다.",
    );
  }

  const kinUrl = String(item?.url || item?.kinUrl || "").trim();
  const kinDocId = String(
    item?.kinDocId || extractKinDocId(kinUrl),
  ).trim();

  if (!kinDocId) {
    throw new Error(
      "KIN docId가 없어 Firestore history를 claim할 수 없습니다.",
    );
  }

  const title = String(item?.title || "").trim();
  const body = String(item?.body || "").trim();

  const ref = db
    .collection(CONTENT_REGISTRY_COLLECTIONS.questions)
    .doc(kinDocId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (snapshot.exists) {
      return {
        claimed: false,
        kinDocId,
        existing: mapQuestion(snapshot, "exact_doc_id"),
      };
    }

    const now = FieldValue.serverTimestamp();

    transaction.set(
      ref,
      {
        kinDocId,
        kinUrl,
        title,
        normalizedTitle: normalizeRegistryTitle(title),
        body,
        historyState: "seen",
        searchTokens: buildRegistrySearchTokens(title, body),
        firstSeenAt: now,
        lastSeenAt: now,
        updatedAt: now,
        registryStatus: FieldValue.delete(),
        relationType: FieldValue.delete(),
      },
      { merge: true },
    );

    return {
      claimed: true,
      kinDocId,
      existing: null,
    };
  });
}

export async function recordContentRegistryQuestion(item) {
  return claimContentRegistryQuestion(item);
}

export async function seedRegistryEntry(item) {
  const db = getContentRegistryDb();

  if (!db) {
    throw new Error("Firestore 콘텐츠 레지스트리가 설정되지 않았습니다.");
  }

  const questionRef = db
    .collection(CONTENT_REGISTRY_COLLECTIONS.questions)
    .doc(item.kin_doc_id);

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  const hasArticle = Boolean(item.wordpress_url && item.slug);

  const questionData = {
    kinDocId: item.kin_doc_id,
    kinUrl: item.kin_url,
    title: item.question_title.trim(),
    normalizedTitle: normalizeRegistryTitle(item.question_title),
    body: item.question_body,
    historyState: "seen",
    searchTokens: buildRegistrySearchTokens(
      item.question_title,
      item.question_body,
    ),
    lastSeenAt: now,
    updatedAt: now,
    registryStatus: FieldValue.delete(),
    relationType: FieldValue.delete(),
  };

  if (!hasArticle) {
    batch.set(
      questionRef,
      {
        ...questionData,
        canonicalArticleSlug: FieldValue.delete(),
        wordpressUrl: FieldValue.delete(),
        articleTitle: FieldValue.delete(),
      },
      { merge: true },
    );

    await batch.commit();

    return {
      historyState: "seen",
      questionId: item.kin_doc_id,
      hasArticle: false,
    };
  }

  const articleRef = db
    .collection(CONTENT_REGISTRY_COLLECTIONS.articles)
    .doc(item.slug);

  const relationRef = db
    .collection(CONTENT_REGISTRY_COLLECTIONS.relations)
    .doc(`${item.kin_doc_id}__${item.slug}`);

  batch.set(
    articleRef,
    {
      wordpressUrl: item.wordpress_url,
      slug: item.slug,
      title: item.question_title,
      status: "published",
      notes: "기존 발행 콘텐츠 history seed",
      updatedAt: now,
    },
    { merge: true },
  );

  batch.set(
    questionRef,
    {
      ...questionData,
      canonicalArticleSlug: item.slug,
      wordpressUrl: item.wordpress_url,
      articleTitle: item.question_title,
    },
    { merge: true },
  );

  batch.set(
    relationRef,
    {
      questionId: item.kin_doc_id,
      articleId: item.slug,
      questionRef,
      articleRef,
      relationType: "origin",
      confidence: 1,
      notes: "기존 발행 글 연결",
      updatedAt: now,
    },
    { merge: true },
  );

  await batch.commit();

  return {
    historyState: "seen",
    questionId: item.kin_doc_id,
    articleId: item.slug,
    hasArticle: true,
  };
}
