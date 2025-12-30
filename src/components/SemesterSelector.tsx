"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type SemesterOption = {
  value: string;
  label: string;
};

export function SemesterSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Only show on courses pages
  const shouldShow = pathname?.startsWith("/courses") ?? false;

  useEffect(() => {
    if (!shouldShow) return;

    setLoading(true);
    fetch("/api/courses/filters", { cache: "force-cache" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      })
      .then((data) => {
        // Combine year and term into semester options
        const years = data.years || [];
        const terms = data.terms || [];

        const semesterSet = new Set<string>();
        // Get unique year-term combinations from current data
        years.forEach((year: string) => {
          terms.forEach((term: string) => {
            semesterSet.add(`${year}-${term}`);
          });
        });

        const semesterOptions = Array.from(semesterSet)
          .sort((a, b) => b.localeCompare(a)) // Sort descending (newest first)
          .map((semester) => {
            const [year, term] = semester.split("-");
            return {
              value: semester,
              label: `${year}學年度第${term}學期`,
            };
          });

        setSemesters(semesterOptions);
      })
      .catch(() => {
        setSemesters([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [shouldShow]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const semester = e.target.value;
    const params = new URLSearchParams(searchParams.toString());

    if (semester) {
      params.set("semester", semester);
    } else {
      params.delete("semester");
    }

    // Keep current page if on courses listing
    if (pathname === "/courses") {
      router.push(`/courses?${params.toString()}`);
    } else {
      // If on a course detail page, navigate to courses with the semester filter
      router.push(`/courses?${params.toString()}`);
    }
  };

  if (!shouldShow || loading || semesters.length === 0) {
    return null;
  }

  const currentSemester = searchParams.get("semester") || "";

  return (
    <div className="ts-select is-solid" style={{ minWidth: "160px" }}>
      <select value={currentSemester} onChange={handleChange}>
        <option value="">所有學期</option>
        {semesters.map((sem) => (
          <option key={sem.value} value={sem.value}>
            {sem.label}
          </option>
        ))}
      </select>
    </div>
  );
}
