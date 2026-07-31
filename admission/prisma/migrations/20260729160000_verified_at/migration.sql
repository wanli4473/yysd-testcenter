-- Manual verification stamp for Top-school programs
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
