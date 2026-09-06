-- ====================================================================
-- Migration: Expand partner_commissions table for transaction ledger details
-- Added: Billing Key vs Card Auth payment distinction (is_recurring, payment_type)
-- Created: 2026-08-11
-- ====================================================================

ALTER TABLE partner_commissions
  ADD COLUMN IF NOT EXISTS payment_method      TEXT DEFAULT '신용카드',
  ADD COLUMN IF NOT EXISTS pg_provider         TEXT DEFAULT 'toss',
  ADD COLUMN IF NOT EXISTS pg_tid              TEXT,
  ADD COLUMN IF NOT EXISTS item_name           TEXT,
  ADD COLUMN IF NOT EXISTS donor_name          TEXT,
  ADD COLUMN IF NOT EXISTS donor_phone         TEXT,
  ADD COLUMN IF NOT EXISTS baptism_name        TEXT,
  ADD COLUMN IF NOT EXISTS agency_name         TEXT,
  ADD COLUMN IF NOT EXISTS agent_name          TEXT,
  ADD COLUMN IF NOT EXISTS pg_fee_amount       NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_recurring        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_type        TEXT DEFAULT 'AUTH', -- 'BILLING' (빌링키 정기) | 'AUTH' (인증/일회성)
  ADD COLUMN IF NOT EXISTS device_type         TEXT DEFAULT 'WEB_MOBILE'; -- 'KIOSK' (현장 키오스크) | 'WEB_MOBILE' (온라인 웹/모바일)

CREATE INDEX IF NOT EXISTS idx_partner_commissions_payment_method ON partner_commissions(payment_method);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_is_recurring  ON partner_commissions(is_recurring);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_device_type   ON partner_commissions(device_type);
