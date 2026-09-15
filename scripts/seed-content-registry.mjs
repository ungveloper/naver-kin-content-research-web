import fs from "node:fs/promises";
import process from "node:process";
import {
  isContentRegistryConfigured,
  seedRegistryEntry,
} from "./content-registry.mjs";

try {
  process.loadEnvFile(".env.local");
} catch {
  // GitHub Actions처럼 env가 이미 주입된 경우 그대로 진행합니다.
}

if (!isContentRegistryConfigured()) {
  console.error("[오류] FIREBASE_SERVICE_ACCOUNT_JSON이 필요합니다.");
  process.exit(1);
}

const seedUrl = new URL(
  "../data/content-registry-seed-20260915.json",
  import.meta.url,
);

const items = JSON.parse(await fs.readFile(seedUrl, "utf8"));

let publishedCount = 0;
let holdCount = 0;

for (const item of items) {
  const result = await seedRegistryEntry(item);

  if (result.status === "published") {
    publishedCount += 1;
    console.log(
      `[seed:published] ${item.kin_doc_id} -> ${item.wordpress_url}`,
    );
  } else {
    holdCount += 1;
    console.log(
      `[seed:hold] ${item.kin_doc_id} -> ${item.question_title}`,
    );
  }
}

console.log(
  `[완료] Firestore 최신 seed: 질문 ${items.length}개 `
  + `(정상 발행 ${publishedCount}, 보류 ${holdCount})`,
);
