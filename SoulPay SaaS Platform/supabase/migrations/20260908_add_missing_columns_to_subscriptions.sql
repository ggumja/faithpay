-- ====================================================================
-- Migration: Add missing columns to subscriptions table
-- Created: 2026-09-08
-- ====================================================================

ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS item_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS next_payment_date TEXT,
  ADD COLUMN IF NOT EXISTS paused_until TEXT,
  ADD COLUMN IF NOT EXISTS recurring_interval TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS recurring_day_of_week INTEGER;
