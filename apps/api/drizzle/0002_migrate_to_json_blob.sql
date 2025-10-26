-- Migration: Consolidate user_data columns into single JSON blob
-- Since we can truncate data (no production users yet)

-- Drop old user_data table
DROP TABLE IF EXISTS "user_data";

-- Create new user_data table with single JSON column
CREATE TABLE IF NOT EXISTS "user_data" (
	"user_id" text PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
