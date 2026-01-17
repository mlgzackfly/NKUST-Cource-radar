import { ImageResponse } from "next/og";

// Twitter 圖片尺寸 (2:1 比例)
export const size = {
  width: 1200,
  height: 600,
};

export const contentType = "image/png";

// 首頁 Twitter 圖片
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* 背景裝飾 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(74, 144, 226, 0.3) 0%, transparent 50%)",
            display: "flex",
          }}
        />

        {/* Logo 區域 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              marginRight: 16,
            }}
          >
            📡
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            高科選課雷達
          </div>
        </div>

        {/* 主標題 */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: 16,
            letterSpacing: "-0.03em",
            display: "flex",
          }}
        >
          選課，不只是憑感覺
        </div>

        {/* 副標題 */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
            display: "flex",
          }}
        >
          高雄科技大學課程查詢與匿名評價平台
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
