export default function robots() {
  const baseUrl = process.env.NEXTAUTH_URL || "https://nkust.zeabur.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/auth/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
