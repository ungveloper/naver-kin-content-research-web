import { NextResponse } from "next/server";
import {
  fetchSearchConsoleQueryPerformance,
  hasSearchConsoleCredentials,
} from "@/lib/search-console";

export async function GET() {
  if (!hasSearchConsoleCredentials()) {
    return NextResponse.json(
      {
        setupRequired: true,
        error:
          "Search Console 자동 동기화를 사용하려면 GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL / GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY / GOOGLE_SEARCH_CONSOLE_SITE_URL 환경변수가 필요합니다.",
      },
      { status: 503 },
    );
  }

  try {
    const rows =
      await fetchSearchConsoleQueryPerformance(500);
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      days: 30,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Search Console 성과를 가져오지 못했습니다: ${error.message}`
            : "Search Console 성과를 가져오지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
