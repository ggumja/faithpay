-- ====================================================================
-- Migration: Add billing-specific columns to payment_configs
-- Description: 일반 인증결제와 빌링키(정기) 결제 설정 완전 분리 저장 컬럼 추가
-- ====================================================================

ALTER TABLE payment_configs
  ADD COLUMN IF NOT EXISTS billing_mid TEXT,
  ADD COLUMN IF NOT EXISTS billing_api_key TEXT,
  ADD COLUMN IF NOT EXISTS billing_secret_key TEXT,
  ADD COLUMN IF NOT EXISTS billing_login_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_iv TEXT,
  ADD COLUMN IF NOT EXISTS billing_ver TEXT;

COMMENT ON COLUMN payment_configs.billing_mid IS '정기결제(빌링키) 전용 상점 식별자 (ShopCode / MID)';
COMMENT ON COLUMN payment_configs.billing_api_key IS '정기결제(빌링키) 전용 API Key';
COMMENT ON COLUMN payment_configs.billing_secret_key IS '정기결제(빌링키) 전용 암호화 Key (Secret)';
COMMENT ON COLUMN payment_configs.billing_login_id IS '정기결제(빌링키) 전용 상점 로그인 ID (loginId)';
COMMENT ON COLUMN payment_configs.billing_iv IS '정기결제(빌링키) 전용 암호화 벡터 (IV)';
COMMENT ON COLUMN payment_configs.billing_ver IS '정기결제(빌링키) 전용 API 버전 (ver)';
