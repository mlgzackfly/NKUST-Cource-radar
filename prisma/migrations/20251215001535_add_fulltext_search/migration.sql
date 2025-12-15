-- Add searchVector column for full-text search
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Create function to update search vector
-- Using 'simple' configuration for better CJK (Chinese) support
CREATE OR REPLACE FUNCTION course_search_trigger() RETURNS trigger AS $$
BEGIN
  -- Build search vector with weighted terms:
  -- A = highest priority (course name)
  -- B = high priority (course code, select code)
  -- C = medium priority (department)
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."courseName", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."courseCode", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."selectCode", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."department", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update searchVector on insert/update
DROP TRIGGER IF EXISTS course_search_update ON "Course";
CREATE TRIGGER course_search_update
  BEFORE INSERT OR UPDATE ON "Course"
  FOR EACH ROW
  EXECUTE FUNCTION course_search_trigger();

-- Update existing rows to populate searchVector
UPDATE "Course" SET "updatedAt" = "updatedAt";

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "Course_searchVector_idx" ON "Course" USING GIN ("searchVector");

-- Create additional composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS "Course_year_term_department_idx" ON "Course"("year", "term", "department");
CREATE INDEX IF NOT EXISTS "Course_year_term_campus_idx" ON "Course"("year", "term", "campus");

-- Add comment for documentation
COMMENT ON COLUMN "Course"."searchVector" IS 'Full-text search vector for courseName, courseCode, selectCode, and department';
