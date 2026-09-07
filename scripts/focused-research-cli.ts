import { NextRequest } from "next/server";
import { POST as siteContentPost } from "../app/api/site-content/route";
import { POST as researchPost } from "../app/api/research/auto/route";
import { POST as notionPromptPost } from "../app/api/notion/prompt/route";
import { fetchSearchConsoleQueryPerformance } from "../lib/search-console";

async function callRoute(
  handler: (request: NextRequest) => Promise<Response>,
  path: string,
  body: Record<string, unknown>,
) {
  const request = new NextRequest(`http://internal.local${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await handler(request);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `${path} failed with ${response.status}`,
    );
  }
  return data;
}

async function main() {
  const sourceUrl = process.argv[2]?.trim();
  if (!sourceUrl) {
    throw new Error(
      "focused-research-cli.ts에 지식iN 원문 URL이 필요합니다.",
    );
  }

  const siteUrl = (
    process.env.WORDPRESS_SITE_URL || "https://3minago.com"
  ).replace(/\/$/, "");

  const site = await callRoute(
    siteContentPost,
    "/api/site-content",
    {
      siteUrl,
      maxPosts: 500,
    },
  );

  let searchPerformance: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }> = [];

  try {
    searchPerformance =
      await fetchSearchConsoleQueryPerformance(500);
  } catch (error) {
    process.stderr.write(
      `[Focused CLI] Search Console 자동 피드백 생략: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
  }

  const research = await callRoute(
    researchPost,
    "/api/research/auto",
    {
      offset: 0,
      sourceUrl,
      usedTopics: [],
      siteUrl: site.siteUrl || siteUrl,
      siteContents: Array.isArray(site.contents)
        ? site.contents
        : [],
      searchPerformance,
    },
  );

  const bundles = Array.isArray(research.evidenceBundles)
    ? research.evidenceBundles
    : [];
  if (
    !research.reviewPrompt
    || !research.sourceQuestion
    || bundles.length !== 1
  ) {
    const reason =
      Array.isArray(research.errors) && research.errors[0]
        ? research.errors[0]
        : "Focused Research 최종 프롬프트가 생성되지 않았습니다.";
    throw new Error(reason);
  }

  const notion = await callRoute(
    notionPromptPost,
    "/api/notion/prompt",
    {
      sourceUrl,
      reviewPrompt: research.reviewPrompt,
      sourceQuestion: research.sourceQuestion,
      promptVersion: research.promptVersion,
      preflight: research.preflight,
    },
  );

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      sourceUrl,
      promptVersion: research.promptVersion,
      preflight: research.preflight,
      pageUrl: notion.pageUrl || "",
      saveMode: notion.saveMode || "",
      warning: notion.warning || "",
      searchConsoleQueryCount: searchPerformance.length,
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
