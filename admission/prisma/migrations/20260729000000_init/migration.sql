-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "avg_gpa" DOUBLE PRECISION NOT NULL,
    "min_gpa" DOUBLE PRECISION NOT NULL,
    "min_toefl" INTEGER,
    "min_ielts" DOUBLE PRECISION,
    "website" TEXT,
    "admission_requirements" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "gpa" DOUBLE PRECISION NOT NULL,
    "toefl" INTEGER,
    "ielts" DOUBLE PRECISION,
    "gre" INTEGER,
    "undergrad_school" TEXT NOT NULL,
    "undergrad_major" TEXT NOT NULL,
    "background_tags" JSONB NOT NULL,
    "admission_result" BOOLEAN NOT NULL,
    "year" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "embedding" vector(1024),

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_queries" (
    "id" TEXT NOT NULL,
    "user_background" JSONB NOT NULL,
    "target_school_id" TEXT NOT NULL,
    "result_probability" INTEGER,
    "analysis_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cases_school_id_year_idx" ON "cases"("school_id", "year");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_queries" ADD CONSTRAINT "user_queries_target_school_id_fkey" FOREIGN KEY ("target_school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
