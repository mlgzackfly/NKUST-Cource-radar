# Gemini Context: NKUST Course Review

This is the `GEMINI.md` context file for the **NKUST Course Review (高科選課雷達)** project. It provides an overview of the system architecture, development conventions, and operational procedures.

## 1. Project Overview

**NKUST Course Review** is a platform for students of National Kaohsiung University of Science and Technology (NKUST) to query course information and share anonymous reviews. It aims to make course selection more transparent and informed.

### Core Features
- **Course Query:** Comprehensive search across all campuses and departments.
- **Anonymous Reviews:** Secure and anonymous course evaluations.
- **Data Visualization:** Radar charts for course ratings (Coolness, Usefulness, Workload, etc.).
- **Authentication:** NKUST email verification (@nkust.edu.tw).

## 2. Technical Architecture

### Stack
- **Framework:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript
- **Styling:** Tocas UI + CSS Modules
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth.js (Email Provider)
- **Charts:** ECharts (via `echarts-for-react`)
- **Email Service:** Resend
- **Deployment:** Zeabur

### Data Flow
1.  **Data Acquisition:**
    -   Course data is scraped from NKUST AG202 system using `scripts/scrape/nkust-ag202.mjs`.
    -   Raw JSON data is stored in `data/nkust/`.
    -   GitHub Actions (`.github/workflows/`) automate the scraping and data commit process.
2.  **Data Ingestion:**
    -   Data is imported into PostgreSQL using `scripts/db/import-nkust-ag202.mjs`.
    -   This process normalizes the data and updates the `Course` and `Instructor` tables.
3.  **User Interaction:**
    -   Users interact with the Next.js frontend.
    -   Course queries hit the PostgreSQL database (optimized with `tsvector` for full-text search).
    -   Reviews and interactions are stored in `Review`, `Comment`, and `HelpfulVote` tables.

## 3. Development Workflow

### Key Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the development server at `http://localhost:3000`. |
| `npx prisma migrate dev` | Apply database schema changes (dev mode). |
| `npx prisma studio` | Open Prisma Studio to view/edit database records. |
| `npm run scrape:nkust-ag202` | Scrape course data (controlled by env vars). |
| `npm run db:import:nkust-ag202` | Import scraped JSON data into the database. |
| `node scripts/import-all-semesters.mjs` | Batch import multiple semesters. |

### Environment Variables (.env)
*   `DATABASE_URL`: PostgreSQL connection string.
*   `NEXTAUTH_SECRET`: Secret for NextAuth.
*   `NEXTAUTH_URL`: Canonical URL (e.g., `http://localhost:3000`).
*   `RESEND_API_KEY`: API key for email service.
*   `NKUST_IMPORT_YEAR` / `NKUST_IMPORT_TERM`: Control which semester to scrape/import.

### Directory Structure

-   `src/app/`: Next.js App Router pages and layouts.
-   `src/components/`: Reusable React components.
-   `src/lib/`: Utility functions (DB connection, formatters).
-   `src/types/`: TypeScript type definitions.
-   `prisma/`: Database schema (`schema.prisma`) and migrations.
-   `scripts/`: Node.js scripts for scraping, maintenance, and data import.
-   `data/`: Storage for raw scraped JSON files.
-   `docs/`: Detailed project documentation (`architecture.md`, `env.md`, etc.).

## 4. Coding Conventions

-   **Type Safety:** Strict TypeScript usage. Avoid `any`.
-   **Styling:** Use CSS Modules for component-specific styles. Global styles are in `globals.css`.
-   **Database:** Always update `schema.prisma` and run migrations for DB changes. Do not modify the DB schema manually.
-   **Asynchronous Operations:** Use `async/await` for all DB and API calls.
-   **API Routes:** Use Next.js App Router Route Handlers (`route.ts`) or Server Actions.

## 5. Deployment (Zeabur)

-   The project is deployed on Zeabur.
-   Database migrations are handled via CI/CD or post-deploy hooks.
-   Data imports are idempotent and can be re-run safely.

## 6. Important Notes

-   **Data Consistency:** The `Course` table uses a `sourceKey` to identify unique course offerings across imports, preventing duplicates.
-   **Search:** The database uses PostgreSQL's native full-text search (`tsvector`). If search behaves unexpectedly, ensure the `searchVector` column is populated correctly (there is a trigger for this).
-   **Authentication:** Currently uses email magic links. Ensure `RESEND_API_KEY` is valid for emails to work.
