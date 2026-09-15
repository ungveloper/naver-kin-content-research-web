import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export type ContentRegistryMatch = {
  questionId?: string;
  kinDocId: string;
  kinUrl: string;
  questionTitle: string;
  wordpressUrl?: string;
  articleTitle?: string;
  articleSlug?: string;
  relationType?: "origin" | "reuse" | "expand" | "duplicate" | "hold";
};

type FirebaseServiceAccountInput = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

const COLLECTIONS = {
  questions: "kinQuestions",
  articles: "contentArticles",
  relations: "questionArticleRelations",
} as const;

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

export function isContentRegistryConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
}

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON이 설정되지 않았습니다.");
  }

  const parsed = JSON.parse(raw) as FirebaseServiceAccountInput;

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

function registryDb() {
  if (!isContentRegistryConfigured()) return null;

  if (!getApps().length) {
    initializeApp({
      credential: cert(parseServiceAccount()),
    });
  }

  return getFirestore();
}

function mapQuestion(
  id: string,
  data: Record<string, unknown>,
): ContentRegistryMatch {
  return {
    questionId: id,
    kinDocId: String(data.kinDocId || id),
    kinUrl: String(data.kinUrl || ""),
    questionTitle: String(data.title || ""),
    wordpressUrl: String(data.wordpressUrl || "") || undefined,
    articleTitle: String(data.articleTitle || "") || undefined,
    articleSlug: String(data.canonicalArticleSlug || "") || undefined,
    relationType:
      (String(data.relationType || "") as ContentRegistryMatch["relationType"])
      || undefined,
  };
}

export async function findContentRegistryExactMatch(input: {
  title?: string;
  url?: string;
}): Promise<ContentRegistryMatch | null> {
  const db = registryDb();
  if (!db) return null;

  const docId = extractKinDocId(input.url || "");
  const url = String(input.url || "").trim();
  const title = String(input.title || "").trim();

  if (docId) {
    const direct = await db.collection(COLLECTIONS.questions).doc(docId).get();
    if (direct.exists) return mapQuestion(direct.id, direct.data() || {});
  }

  if (url) {
    const byUrl = await db
      .collection(COLLECTIONS.questions)
      .where("kinUrl", "==", url)
      .limit(1)
      .get();

    if (!byUrl.empty) {
      const doc = byUrl.docs[0];
      return mapQuestion(doc.id, doc.data());
    }
  }

  if (title) {
    const byTitle = await db
      .collection(COLLECTIONS.questions)
      .where("title", "==", title)
      .limit(1)
      .get();

    if (!byTitle.empty) {
      const doc = byTitle.docs[0];
      return mapQuestion(doc.id, doc.data());
    }
  }

  return null;
}
