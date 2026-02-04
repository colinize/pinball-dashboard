-- Add RLS policies to allow content-monitor worker to write data
-- Run this in Supabase SQL Editor

-- Sources table: Allow anonymous updates (for last_checked_at sync)
CREATE POLICY "Allow anonymous update sources" ON sources
    FOR UPDATE USING (true);

-- Content items table: Allow anonymous insert and update
CREATE POLICY "Allow anonymous insert content_items" ON content_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update content_items" ON content_items
    FOR UPDATE USING (true);
