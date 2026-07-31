-- ====================================================================
-- Migration: Create Subscriptions & SMS OTPs tables
-- Description: 나노페이 빌링키 정기결제 대장 및 1초 SMS 인증용 테이블
-- ====================================================================

-- 1. 정기결제 (빌링키) 대장 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  donor_name TEXT NOT NULL,
  donor_phone TEXT NOT NULL,
  donor_email TEXT,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  user_id TEXT NOT NULL,
  bill_key TEXT NOT NULL,
  card_no TEXT,
  card_name TEXT,
  recurring_day INT NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'cancelled'
  next_payment_date DATE,
  paused_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_phone ON subscriptions(tenant_id, donor_phone);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 2. 1초 SMS OTP 무비밀번호 인증 테이블
CREATE TABLE IF NOT EXISTS sms_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_otps_phone ON sms_otps(phone);

COMMENT ON TABLE subscriptions IS '사찰/교회 테넌트별 신도 정기결제(빌링키) 구독 대장';
COMMENT ON TABLE sms_otps IS '비회원 헌금내역 및 정기결제 관리를 위한 1초 SMS OTP 대장';
