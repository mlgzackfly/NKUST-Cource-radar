export function GET() {
  // Silence default browser requests without committing a binary PNG.
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  });
}
