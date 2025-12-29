export function GET() {
  // Some browsers request this legacy path.
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  });
}
