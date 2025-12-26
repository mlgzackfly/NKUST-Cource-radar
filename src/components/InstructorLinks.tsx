"use client";

import Link from "next/link";

type InstructorLinksProps = {
  instructors: Array<{ instructor: { id: string; name: string } }>;
  separator?: string;
};

export function InstructorLinks({ instructors, separator = "、" }: InstructorLinksProps) {
  if (!instructors || instructors.length === 0) {
    return <span>—</span>;
  }

  return (
    <span>
      {instructors.map((item, index) => (
        <span key={item.instructor.id}>
          <Link
            href={`/instructors/${item.instructor.id}`}
            style={{
              color: "var(--ts-primary-500)",
              textDecoration: "none",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            {item.instructor.name}
          </Link>
          {index < instructors.length - 1 && separator}
        </span>
      ))}
    </span>
  );
}
