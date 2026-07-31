-- AlterTable schools: official + gradcafe stats
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "admit_rate_official" DOUBLE PRECISION;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "admit_rate_year" INTEGER;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "admit_rate_source" TEXT;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "admit_rate_gradcafe" DOUBLE PRECISION;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "gradcafe_sample_size" INTEGER;

-- AlterTable cases: provenance
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'synthetic';
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "external_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "cases_external_id_key" ON "cases"("external_id");
CREATE INDEX IF NOT EXISTS "cases_source_idx" ON "cases"("source");
