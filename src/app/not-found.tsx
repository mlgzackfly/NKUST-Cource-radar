import Link from "next/link";

export default function NotFound() {
  return (
    <div className="app-container">
      <div className="ts-grid is-relaxed is-vertical is-center-aligned" style={{minHeight: "50vh"}}>
        <div className="column is-fluid">
          <div className="ts-header is-huge is-heavy has-text-centered">404</div>
          <div className="ts-header is-large has-text-centered">找不到頁面</div>
          <div className="app-muted has-text-centered" style={{ marginTop: 8 }}>
            你要找的頁面不存在，或連結已經失效。
          </div>
          <div className="ts-space is-large" />
          <div className="ts-wrap is-compact is-center-aligned">
            <Link className="ts-button is-primary is-large" href="/">
              回首頁
            </Link>
            <Link className="ts-button is-outlined is-large" href="/courses">
              去課程列表
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

