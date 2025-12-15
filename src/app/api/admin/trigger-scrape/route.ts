import { NextRequest, NextResponse } from "next/server";

/**
 * Admin API endpoint to trigger GitHub Actions workflow for scraping
 *
 * Usage:
 * POST /api/admin/trigger-scrape
 * Headers: Authorization: Bearer YOUR_ADMIN_SECRET
 * Body: { "year": "114", "term": "1" }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check admin authorization
    const authHeader = request.headers.get("authorization");
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      return NextResponse.json(
        { error: "Admin functionality not configured" },
        { status: 503 }
      );
    }

    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { year, term } = body;

    if (!year || !term) {
      return NextResponse.json(
        { error: "Missing year or term parameter" },
        { status: 400 }
      );
    }

    // 3. Trigger GitHub Actions workflow
    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER || "your-username";
    const repoName = process.env.GITHUB_REPO_NAME || "nkust";

    if (!githubToken) {
      return NextResponse.json(
        { error: "GitHub token not configured" },
        { status: 503 }
      );
    }

    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/scrape-and-import.yml/dispatches`,
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            year: year.toString(),
            term: term.toString(),
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub API error:", errorText);
      return NextResponse.json(
        { error: "Failed to trigger workflow", details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Scraping workflow triggered for ${year}-${term}`,
      year,
      term,
    });
  } catch (error) {
    console.error("Error triggering scrape:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
