"use client";

type TagBadgeProps = {
  name: string;
  category: string;
  color?: string | null;
  onClick?: () => void;
};

export function TagBadge({ name, category, color, onClick }: TagBadgeProps) {
  const getCategoryColor = (cat: string): string => {
    switch (cat) {
      case "CONTENT":
        return "var(--ts-primary-500)";
      case "DIFFICULTY":
        return "var(--ts-warning-500)";
      case "TEACHING":
        return "var(--ts-info-500)";
      case "WORKLOAD":
        return "var(--ts-negative-500)";
      case "GRADING":
        return "var(--ts-positive-500)";
      case "SPECIALTY":
        return "var(--ts-purple-500)";
      default:
        return "var(--ts-gray-500)";
    }
  };

  const badgeColor = color || getCategoryColor(category);

  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.375rem 0.75rem",
        borderRadius: "6px",
        fontSize: "0.875rem",
        fontWeight: 600,
        backgroundColor: `color-mix(in srgb, ${badgeColor} 15%, transparent)`,
        color: badgeColor,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${badgeColor} 25%, transparent)`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${badgeColor} 15%, transparent)`;
        }
      }}
    >
      {name}
    </span>
  );
}
