-- Worker status table for heartbeat tracking
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS worker_status (
    id SERIAL PRIMARY KEY,
    worker_id TEXT UNIQUE NOT NULL,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'running',
    hostname TEXT,
    version TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick heartbeat lookups
CREATE INDEX IF NOT EXISTS idx_worker_status_heartbeat ON worker_status(last_heartbeat DESC);

-- Enable RLS
ALTER TABLE worker_status ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (dashboard needs to read status)
CREATE POLICY "Allow anonymous read" ON worker_status
    FOR SELECT USING (true);

-- Allow anonymous insert/update (worker needs to write heartbeats)
CREATE POLICY "Allow anonymous write" ON worker_status
    FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_worker_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS worker_status_updated_at ON worker_status;
CREATE TRIGGER worker_status_updated_at
    BEFORE UPDATE ON worker_status
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_status_timestamp();
