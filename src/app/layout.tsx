import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "高科選課雷達 | 選課,不只是憑感覺",
  description: "提供 NKUST 課程查詢與匿名評價,讓你選課不再憑感覺。查看課程評分、教師評價、涼度指數等資訊,做出更明智的選課決定。",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
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
    var mode = localStorage.getItem('nkust-theme') || 'auto';
    var root = document.documentElement;
    root.classList.remove('is-dark', 'is-light');
    if (mode === 'dark') root.classList.add('is-dark');
    if (mode === 'light') root.classList.add('is-light');
  } catch (e) {}
})();`,
          }}
        />
        {/* Core: Tocas UI (for built-in light/dark palette & components) */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tocas-ui/5.0.2/tocas.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="app-container">
              <div className="app-header-inner">
                <div className="app-header-left">
                  <Link href="/" className="app-brand">
                    高科選課雷達
                  </Link>
                  <nav className="app-nav" aria-label="主導覽">
                    <Link className="ts-button is-ghost is-short" href="/">
                      首頁
                    </Link>
                    <Link className="ts-button is-ghost is-short" href="/courses">
                      課程
                    </Link>
                  </nav>
                </div>
                <div className="app-header-right">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>

          <main className="app-main">
            {children}
          </main>

          <div className="app-container">
            <footer className="app-footer" style={{ marginTop: 24, paddingBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div className="app-muted">
                  高科選課雷達 | 選課,不只是憑感覺
                  <br />
                  此為非官方專案,資訊僅供參考。
                </div>
                <a href="https://github.com/mlgzack/nkust-course-review" target="_blank" rel="noopener noreferrer" className="ts-button is-ghost is-small">
                  GitHub
                </a>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}


