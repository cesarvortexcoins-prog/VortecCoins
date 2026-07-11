-- Add note column to special_offers to fix the schema cache error
ALTER TABLE special_offers ADD COLUMN IF NOT EXISTS note TEXT;
