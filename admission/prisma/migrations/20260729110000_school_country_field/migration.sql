-- AlterTable
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'US';
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "field" TEXT NOT NULL DEFAULT 'cs';
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "gpa_scale" DOUBLE PRECISION NOT NULL DEFAULT 4.0;

-- Backfill slugs for existing rows (US CS seed)
UPDATE "schools"
SET
  "slug" = lower(regexp_replace(regexp_replace(name || '-' || program || '-' || degree, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')),
  "country" = COALESCE(NULLIF("country", ''), 'US'),
  "field" = CASE
    WHEN program ILIKE '%data%' OR program ILIKE '%computational%' THEN 'data_ai'
    WHEN program ILIKE '%EECS%' OR program ILIKE '%computer%' OR program ILIKE '%software%' THEN 'cs'
    ELSE 'cs'
  END
WHERE "slug" IS NULL OR "slug" = '';

-- Ensure uniqueness if collisions
WITH ranked AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS rn
  FROM schools
)
UPDATE schools s
SET slug = s.slug || '-' || ranked.rn
FROM ranked
WHERE s.id = ranked.id AND ranked.rn > 1;

ALTER TABLE "schools" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "schools_slug_key" ON "schools"("slug");
CREATE INDEX IF NOT EXISTS "schools_country_field_tier_idx" ON "schools"("country", "field", "tier");
