-- ====================================================================
-- Migration: Add payment failure reason and cancellation audit columns to donations
-- Created: 2026-09-07
-- ====================================================================

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS failure_reason        TEXT,
  ADD COLUMN IF NOT EXISTS cancel_reason         TEXT,
  ADD COLUMN IF NOT EXISTS cancel_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS cancel_approved_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_failure_reason TEXT;

-- 빠른 결제 상태 및 실패/취소 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_donations_payment_status ON donations(payment_status);
CREATE INDEX IF NOT EXISTS idx_donations_tenant_status ON donations(tenant_id, payment_status);
