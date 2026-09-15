import fs from "node:fs/promises";
import {
  isContentRegistryConfigured,
  normalizeRegistryTitle,
  upsertRegistryArticle,
  upsertRegistryQuestion,
  upsertRegistryRelation,
} from "./content-registry.mjs";

if (!isContentRegistryConfigured()) {
  console.error(
    "[오류] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
  );
  process.exit(1);
}

const seedUrl = new URL(
  "../data/content-registry-seed-20260914.json",
  import.meta.url,
);

const items = JSON.parse(await fs.readFile(seedUrl, "utf8"));

for (const item of items) {
  const articles = await upsertRegistryArticle({
    wordpress_url: item.wordpress_url,
    slug: item.slug,
    title: item.question_title,
    status: "published",
    notes: "2026-09-14 기존 발행 콘텐츠 초기 seed",
  });

  const questions = await upsertRegistryQuestion({
    kin_doc_id: item.kin_doc_id,
    kin_url: item.kin_url,
    title: item.question_title,
    normalized_title: normalizeRegistryTitle(item.question_title),
    body: item.question_body,
  });

  const article = Array.isArray(articles) ? articles[0] : null;
  const question = Array.isArray(questions) ? questions[0] : null;

  if (!article?.id || !question?.id) {
    throw new Error(
      `seed upsert 결과에 id가 없습니다: ${item.kin_doc_id}`,
    );
  }

  await upsertRegistryRelation({
    question_id: question.id,
    article_id: article.id,
    relation_type: "origin",
    confidence: 1,
    notes: "사용자 제공 기존 발행 글",
  });

  console.log(
    `[seed] ${item.kin_doc_id} -> ${item.wordpress_url}`,
  );
}

console.log(`[완료] Supabase 콘텐츠 레지스트리 ${items.length}개 seed 완료`);
