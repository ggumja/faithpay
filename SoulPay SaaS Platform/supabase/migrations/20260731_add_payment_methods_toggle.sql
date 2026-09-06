-- ====================================================================
-- Migration: Create payment_configs table & Add Payment Method Toggles
-- Description: 결제 설정 테이블(payment_configs) 생성 및 결제 수단 사용 여부 컬럼 구성
-- ====================================================================

-- 1. payment_configs 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL UNIQUE,
  pg_provider TEXT NOT NULL DEFAULT 'nanopay',
  api_key TEXT,
  secret_key TEXT,
  mid TEXT NOT NULL DEFAULT '240000006',
  login_id TEXT DEFAULT 'smbtestshop',
  iv TEXT,
  ver TEXT DEFAULT 'smbtest',
  enable_card BOOLEAN NOT NULL DEFAULT true,
  enable_easy_payment BOOLEAN NOT NULL DEFAULT true,
  enable_vbank BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 기존 테이블이 이미 존재하는 경우 컬럼 보강 (ALTER TABLE SAFE ADD)
ALTER TABLE payment_configs
  ADD COLUMN IF NOT EXISTS enable_card BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_easy_payment BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_vbank BOOLEAN NOT NULL DEFAULT true;

-- 3. 컬럼 코멘트 추가
COMMENT ON TABLE payment_configs IS '사찰/교회 테넌트별 PG 결제 설정 및 수단 활성화 대장';
COMMENT ON COLUMN payment_configs.enable_card IS '신용/체크카드 결제 수단 활성화 여부';
COMMENT ON COLUMN payment_configs.enable_easy_payment IS '간편결제 (카카오페이/네이버페이/토스페이 등) 활성화 여부';
COMMENT ON COLUMN payment_configs.enable_vbank IS '가상계좌 (무통장 입금) 활성화 여부';
