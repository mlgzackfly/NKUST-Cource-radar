export default function CourseNotFound() {
  return (
    <div className="ts-grid is-relaxed">
      <div className="ts-box is-raised">
        <div className="ts-content">
          <a className="ts-button is-ghost is-short" href="/courses">
            ← 回課程列表
          </a>
          <div className="ts-space" />
          <div className="ts-header is-large">找不到課程</div>
          <div className="ts-space" />
          <div className="ts-notice is-negative">
            <div className="title">不存在或未匯入</div>
            <div className="content">這個課程 ID 不存在，或資料尚未匯入。</div>
          </div>
          <div className="ts-space is-large" />
          <a className="ts-button is-outlined" href="/courses">
            回課程列表
          </a>
        </div>
      </div>
    </div>
  );
}


