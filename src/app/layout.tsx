import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import "./globals.css";
import { SemesterSelector } from "@/components/SemesterSelector";
import { UserMenu } from "@/components/UserMenu";
import { SessionProvider } from "@/components/SessionProvider";
import { BottomNavbar } from "@/components/BottomNavbar";

const baseUrl = process.env.NEXTAUTH_URL || "https://nkust-course.zeabur.app";

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "高科選課雷達 | 選課，不只是憑感覺",
    template: "%s | 高科選課雷達",
  },
  description:
    "提供 NKUST 課程查詢與匿名評價，讓你選課不再憑感覺。查看課程評分、教師評價、涼度指數等資訊，做出更明智的選課決定。",
  keywords: [
    "高雄科技大學",
    "NKUST",
    "選課",
    "課程評價",
    "教師評價",
    "課程查詢",
    "選課雷達",
    "涼度指數",
  ],
  authors: [{ name: "高科選課雷達" }],
  creator: "高科選課雷達",
  publisher: "高科選課雷達",
  icons: {
    icon: "/icon.svg",
    apple: "/icons/icon-192.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "選課雷達",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "高科選課雷達 | 選課，不只是憑感覺",
    description:
      "提供 NKUST 課程查詢與匿名評價，讓你選課不再憑感覺。查看課程評分、教師評價、涼度指數等資訊。",
    url: baseUrl,
    siteName: "高科選課雷達",
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "高科選課雷達 | 選課，不只是憑感覺",
    description:
      "提供 NKUST 課程查詢與匿名評價，讓你選課不再憑感覺。查看課程評分、教師評價、涼度指數等資訊。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const, // 支援 iPhone X 以上的 Safe Area
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <script
          // Apply theme ASAP to reduce flash (based on localStorage).
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var mode = localStorage.getItem('nkust-theme') || 'light';
    var root = document.documentElement;
    root.classList.remove('is-dark', 'is-light');
    var effectiveMode = mode;
    if (mode === 'auto') {
      effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (effectiveMode === 'dark') root.classList.add('is-dark');
    if (effectiveMode === 'light') root.classList.add('is-light');
  } catch (e) {}
})();`,
          }}
        />
        {/* Core: Tocas UI (for built-in light/dark palette & components) */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/tocas-ui/5.0.2/tocas.min.css"
        />
        {/* Override Tocas UI icon fonts with absolute CDN URLs */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @font-face {
              font-family: tocas-icons-fixed;
              src: url(https://cdnjs.cloudflare.com/ajax/libs/tocas-ui/5.0.2/fonts/icons/fa-solid-900.woff2) format("woff2"),
                   url(https://cdnjs.cloudflare.com/ajax/libs/tocas-ui/5.0.2/fonts/icons/fa-solid-900.ttf) format("truetype");
              font-style: normal;
              font-weight: 400;
              font-display: swap;
            }

            @font-face {
              font-family: tocas-icons-brands-fixed;
              src: url(https://cdnjs.cloudflare.com/ajax/libs/tocas-ui/5.0.2/fonts/icons/fa-brands-400.woff2) format("woff2"),
                   url(https://cdnjs.cloudflare.com/ajax/libs/tocas-ui/5.0.2/fonts/icons/fa-brands-400.ttf) format("truetype");
              font-style: normal;
              font-weight: 400;
              font-display: swap;
            }

            @font-face {
              font-family: tocas-icons-regular-fixed;
              src: url(https://cdnjs.cloudflare.com/ajax/libs/tocas-ui/5.0.2/fonts/icons/fa-regular-400.woff2) format("woff2"),
                   url(https://cdnjs.cloudflare.com/ajax/libs/tocas-ui/5.0.2/fonts/icons/fa-regular-400.ttf) format("truetype");
              font-style: normal;
              font-weight: 400;
              font-display: swap;
            }

            /* Force Tocas UI components to use our fixed icon fonts */
            .ts-select::after,
            .ts-icon,
            [class*="ts-icon-"] {
              font-family: tocas-icons-fixed !important;
            }
          `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>
          <div className="app-shell">
            <header className="app-header">
              <div className="app-container">
                <div className="app-header-inner">
                  <div className="app-header-left">
                    <Link
                      href="/"
                      className="app-brand"
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                    >
                      <Image src="/icon.svg" alt="Logo" width={28} height={28} />
                      高科選課雷達
                    </Link>
                    <nav className="app-nav" aria-label="主導覽">
                      <Link className="ts-button is-ghost is-short" href="/">
                        首頁
                      </Link>
                      <Link className="ts-button is-ghost is-short" href="/courses">
                        課程
                      </Link>
                      <Link className="ts-button is-ghost is-short" href="/mock-schedule">
                        模擬選課
                      </Link>
                    </nav>
                  </div>
                  <div className="app-header-right">
                    <Suspense fallback={null}>
                      <SemesterSelector />
                    </Suspense>
                    <div className="desktop-only-user-menu">
                      <UserMenu />
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="app-main">{children}</main>

            <div className="app-container">
              <footer className="app-footer" style={{ marginTop: 24, paddingBottom: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 24,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div className="app-muted" style={{ marginBottom: "0.75rem" }}>
                      高科選課雷達 | 選課，不只是憑感覺
                      <br />
                      此為非官方專案，資訊僅供參考。
                    </div>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      <Link
                        href="/privacy"
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--ts-gray-600)",
                          textDecoration: "underline",
                          textUnderlineOffset: "3px",
                        }}
                      >
                        隱私權政策
                      </Link>
                      <Link
                        href="/cookies"
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--ts-gray-600)",
                          textDecoration: "underline",
                          textUnderlineOffset: "3px",
                        }}
                      >
                        Cookie 使用說明
                      </Link>
                    </div>
                  </div>
                  <a
                    href="https://github.com/mlgzackfly/NKUST-Cource-radar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ts-button is-ghost is-small"
                  >
                    GitHub
                  </a>
                </div>
              </footer>
            </div>

            {/* Bottom Navigation for Mobile */}
            <BottomNavbar />
          </div>
        </SessionProvider>
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('[SW] Registration successful:', registration.scope);
                  }).catch(function(error) {
                    console.log('[SW] Registration failed:', error);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
