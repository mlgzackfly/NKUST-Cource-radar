"use client";

import { useEffect, useState } from "react";

type FilterOptions = {
  years: string[];
  terms: string[];
  campuses: string[];
  divisions: string[];
  departments: string[];
};

type Props = {
  initial: {
    q?: string;
    year?: string;
    term?: string;
    campus?: string;
    division?: string;
    department?: string;
  };
};

export function CoursesFilters({ initial }: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnyFilter = Boolean(
    initial.q || initial.year || initial.term || initial.campus || initial.division || initial.department,
  );

  useEffect(() => {
    if (hasAnyFilter) setOpen(true);
  }, [hasAnyFilter]);

  useEffect(() => {
    if (!open || options || loading) return;
    setLoading(true);
    setError(null);

    fetch("/api/courses/filters", { cache: "force-cache" })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        return (await res.json()) as FilterOptions;
      })
      .then((data) => setOptions(data))
      .catch((e: any) => setError(e?.message || "Failed to load filters"))
      .finally(() => setLoading(false));
  }, [open, options, loading]);

  return (
    <>
      <form method="get" action="/courses" aria-label="課程搜尋與篩選">
        <div className="ts-grid is-relaxed">
          <div className="column is-fluid">
            <div className="ts-input is-solid is-fluid">
              <input
                name="q"
                defaultValue={initial.q}
                placeholder="搜尋：課名 / 永久課號 / 選課代號 / 系所"
              />
            </div>
          </div>
          <div className="column">
            <button type="submit" className="ts-button is-primary is-fluid">
              搜尋
            </button>
          </div>
        </div>

        <div style={{ height: "1.5rem" }} />

        <details
          className="app-filter-details"
          open={open}
          onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="ts-button is-outlined" style={{ padding: "0.75rem 1.25rem" }}>
            進階篩選
          </summary>
          <div style={{ height: "1.25rem" }} />

          {error ? (
            <div className="ts-notice is-negative">
              <div className="title">篩選載入失敗</div>
              <div className="content">{error}</div>
            </div>
          ) : null}

          {loading && !options ? <div className="app-muted">載入篩選選項中…</div> : null}

          {options ? (
            <fieldset className="ts-fieldset">
              <legend>進階篩選</legend>
              <div className="app-filter-grid">
                <div className="ts-control is-stacked is-fluid">
                  <div className="label">學年</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="year" defaultValue={initial.year ?? ""}>
                        <option value="">全部</option>
                        {options.years.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">學期</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="term" defaultValue={initial.term ?? ""}>
                        <option value="">全部</option>
                        {options.terms.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">校區</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="campus" defaultValue={initial.campus ?? ""}>
                        <option value="">全部</option>
                        {options.campuses.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">學制</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="division" defaultValue={initial.division ?? ""}>
                        <option value="">全部</option>                      
                        {options.divisions.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ts-control is-stacked is-fluid">
                  <div className="label">系所</div>
                  <div className="content">
                    <div className="ts-select is-solid is-fluid">
                      <select name="department" defaultValue={initial.department ?? ""}>
                        <option value="">全部</option>
                        {options.departments.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ height: "1.5rem" }} />
              <div className="ts-wrap is-compact">
                <button type="submit" className="ts-button is-primary" style={{ padding: "0.75rem 1.5rem" }}>
                  套用篩選
                </button>
                {hasAnyFilter ? (
                  <a className="ts-button is-ghost" href="/courses" style={{ padding: "0.75rem 1.5rem" }}>
                    清除全部
                  </a>
                ) : null}
              </div>
            </fieldset>
          ) : null}
        </details>
      </form>
    </>
  );
}

