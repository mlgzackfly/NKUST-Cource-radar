"use client";

import Link from "next/link";

type InstructorLinksProps = {
  instructors: Array<{ instructor: { name: string } }>;
  separator?: string;
};

export function InstructorLinks({ instructors, separator = "、" }: InstructorLinksProps) {
  if (!instructors || instructors.length === 0) {
    return <span>—</span>;
  }

  const names = instructors.map((x) => x.instructor.name);

  return (
    <span>
      {names.map((name, index) => (
        <span key={name}>
          <Link
            href={`/instructors/${encodeURIComponent(name)}`}
            style={{
              color: "var(--ts-primary-500)",
              textDecoration: "none",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            {name}
          </Link>
          {index < names.length - 1 && separator}
        </span>
      ))}
    </span>
  );
}
