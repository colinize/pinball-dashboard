-- Add health tracking columns to sources table
-- These match the content-monitor local database schema

ALTER TABLE sources
ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS circuit_breaker_until TIMESTAMPTZ;

-- Also add metadata_json to content_items if missing
ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS metadata_json JSONB;
