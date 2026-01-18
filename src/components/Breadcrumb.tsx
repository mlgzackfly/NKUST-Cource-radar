import Link from "next/link";
import { BreadcrumbJsonLd } from "./JsonLd";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  baseUrl?: string;
}

export function Breadcrumb({ items, baseUrl = "https://nkust.zeabur.app" }: BreadcrumbProps) {
  // 準備 JSON-LD 資料
  const jsonLdItems = items
    .filter((item) => item.href)
    .map((item) => ({
      name: item.label,
      url: item.href!.startsWith("http") ? item.href! : `${baseUrl}${item.href}`,
    }));

  return (
    <>
      {/* JSON-LD 結構化資料 */}
      {jsonLdItems.length > 0 && <BreadcrumbJsonLd items={jsonLdItems} />}

      {/* 可視化麵包屑導航 */}
      <nav aria-label="breadcrumb" style={{ marginBottom: "1rem" }}>
        <ol
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.25rem",
            listStyle: "none",
            margin: 0,
            padding: 0,
            fontSize: "0.875rem",
          }}
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                {index > 0 && (
                  <span
                    style={{
                      color: "var(--ts-gray-400)",
                      margin: "0 0.25rem",
                    }}
                    aria-hidden="true"
                  >
                    /
                  </span>
                )}
                {isLast || !item.href ? (
                  <span
                    style={{
                      color: isLast ? "var(--ts-gray-700)" : "var(--ts-gray-500)",
                      fontWeight: isLast ? 500 : 400,
                    }}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    style={{
                      color: "var(--ts-gray-500)",
                      textDecoration: "none",
                    }}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
