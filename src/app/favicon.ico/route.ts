export function GET(request: Request) {
  // Browsers often request /favicon.ico by default.
  // Return 204 to avoid noisy 404s without committing a binary .ico file.
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  });
}
