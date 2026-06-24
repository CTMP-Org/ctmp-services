-- Migration script to add accumulated state duration columns to the ec2_instances table.
-- Run this against your PostgreSQL instance before deploying the service updates.

ALTER TABLE ec2_instances ADD COLUMN IF NOT EXISTS accumulated_running_hours DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE ec2_instances ADD COLUMN IF NOT EXISTS accumulated_stopped_hours DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE ec2_instances ADD COLUMN IF NOT EXISTS last_state_change_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
