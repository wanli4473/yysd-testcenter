-- Program detail fields for AI Advisor
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "program_zh" TEXT;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "official_url" TEXT;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "duration" TEXT;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "tuition_note" TEXT;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "is_stem" BOOLEAN;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "gre_required" BOOLEAN;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "application_deadline" TEXT;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "blurb" TEXT;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "summary_official" TEXT;
CREATE INDEX IF NOT EXISTS "schools_name_idx" ON "schools"("name");
