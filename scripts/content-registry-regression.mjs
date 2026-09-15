import assert from "node:assert/strict";
import fs from "node:fs";
import {
  extractKinDocId,
  normalizeRegistryTitle,
} from "./content-registry.mjs";

assert.equal(
  extractKinDocId(
    "https://kin.naver.com/qna/detail.naver?dirId=50203&docId=494695482",
  ),
  "494695482",
);

assert.equal(
  normalizeRegistryTitle("  에어팟프로2   페어링  "),
  "에어팟프로2 페어링",
);

const seed = JSON.parse(
  fs.readFileSync(
    new URL("../data/content-registry-seed-20260914.json", import.meta.url),
    "utf8",
  ),
);

assert.equal(seed.length, 11);
assert.equal(new Set(seed.map((item) => item.kin_doc_id)).size, 11);
assert.equal(new Set(seed.map((item) => item.wordpress_url)).size, 11);

const migration = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260914190000_content_registry.sql",
    import.meta.url,
  ),
  "utf8",
);

assert.match(migration, /create table if not exists public\.content_articles/);
assert.match(migration, /create table if not exists public\.kin_questions/);
assert.match(
  migration,
  /create table if not exists public\.question_article_relations/,
);
assert.match(migration, /enable row level security/);

const monitor = fs.readFileSync(
  new URL("./kin-life-guide-monitor.mjs", import.meta.url),
  "utf8",
);

assert.match(
  monitor,
  /Supabase 콘텐츠 레지스트리에 이미 있어 제외/,
);

console.log(
  "Supabase 콘텐츠 레지스트리 회귀 테스트 통과: schema + 11 seeds + monitor exact gate",
);
