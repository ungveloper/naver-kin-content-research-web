import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

export const CONTENT_REGISTRY_COLLECTIONS = {
  questions: "kinQuestions",
  articles: "contentArticles",
  relations: "questionArticleRelations",
};

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
  if (!isContentRegistryConfigured()) return null;

  if (!getApps().length) {
    initializeApp({ credential: cert(parseServiceAccount()) });
  }

  return getFirestore();
}

function mapQuestion(doc) {
  const data = doc.data() || {};

  return {
    questionId: doc.id,
    kinDocId: String(data.kinDocId || doc.id),
    kinUrl: String(data.kinUrl || ""),
    questionTitle: String(data.title || ""),
    wordpressUrl: String(data.wordpressUrl || "") || undefined,
    articleTitle: String(data.articleTitle || "") || undefined,
    articleSlug: String(data.canonicalArticleSlug || "") || undefined,
    relationType: String(data.relationType || "") || undefined,
  };
}

export async function findContentRegistryExactMatch(input) {
  const db = getContentRegistryDb();
  if (!db) return null;

  const docId = extractKinDocId(input?.url || "");
  const url = String(input?.url || "").trim();
  const title = String(input?.title || "").trim();

  if (docId) {
    const direct = await db
      .collection(CONTENT_REGISTRY_COLLECTIONS.questions)
      .doc(docId)
      .get();

    if (direct.exists) return mapQuestion(direct);
  }

  if (url) {
    const byUrl = await db
      .collection(CONTENT_REGISTRY_COLLECTIONS.questions)
      .where("kinUrl", "==", url)
      .limit(1)
      .get();

    if (!byUrl.empty) return mapQuestion(byUrl.docs[0]);
  }

  if (title) {
    const byTitle = await db
      .collection(CONTENT_REGISTRY_COLLECTIONS.questions)
      .where("title", "==", title)
      .limit(1)
      .get();

    if (!byTitle.empty) return mapQuestion(byTitle.docs[0]);
  }

  return null;
}

export async function seedRegistryEntry(item) {
  const db = getContentRegistryDb();

  if (!db) {
    throw new Error("Firestore 콘텐츠 레지스트리가 설정되지 않았습니다.");
  }

  const questionRef = db
    .collection(CONTENT_REGISTRY_COLLECTIONS.questions)
    .doc(item.kin_doc_id);

  const articleRef = db
    .collection(CONTENT_REGISTRY_COLLECTIONS.articles)
    .doc(item.slug);

  const relationRef = db
    .collection(CONTENT_REGISTRY_COLLECTIONS.relations)
    .doc(`${item.kin_doc_id}__${item.slug}`);

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.set(
    articleRef,
    {
      wordpressUrl: item.wordpress_url,
      slug: item.slug,
      title: item.question_title,
      status: "published",
      notes: "2026-09-15 기존 발행 콘텐츠 초기 seed",
      updatedAt: now,
    },
    { merge: true },
  );

  batch.set(
    questionRef,
    {
      kinDocId: item.kin_doc_id,
      kinUrl: item.kin_url,
      title: item.question_title.trim(),
      normalizedTitle: normalizeRegistryTitle(item.question_title),
      body: item.question_body,
      relationType: "origin",
      canonicalArticleSlug: item.slug,
      wordpressUrl: item.wordpress_url,
      articleTitle: item.question_title,
      lastSeenAt: now,
      updatedAt: now,
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
      notes: "사용자 제공 기존 발행 글",
      updatedAt: now,
    },
    { merge: true },
  );

  await batch.commit();
}
