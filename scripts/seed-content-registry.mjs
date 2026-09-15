import fs from "node:fs/promises";
import process from "node:process";
import {
  isContentRegistryConfigured,
  seedRegistryEntry,
} from "./content-registry.mjs";

try {
  process.loadEnvFile(".env.local");
} catch {
  // GitHub Actions처럼 env가 이미 주입된 경우는 그대로 진행합니다.
}

if (!isContentRegistryConfigured()) {
  console.error("[오류] FIREBASE_SERVICE_ACCOUNT_JSON이 필요합니다.");
  process.exit(1);
}

const seedUrl = new URL(
  "../data/content-registry-seed-20260914.json",
  import.meta.url,
);

const items = JSON.parse(await fs.readFile(seedUrl, "utf8"));

for (const item of items) {
  await seedRegistryEntry(item);
  console.log(`[seed] ${item.kin_doc_id} -> ${item.wordpress_url}`);
}

console.log(
  `[완료] Firestore 콘텐츠 레지스트리 ${items.length}개 seed 완료`,
);
