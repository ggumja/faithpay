-- ====================================================================
-- Migration: Create tenant_payment_providers table & Extend payment_configs
-- Description: 단체(가맹점)별 PG, 카카오페이, 네이버페이 등 수납도구별 독립 설정값 저장 DB 구조 구축
-- ====================================================================

-- 1. 수납 도구(PG / 카카오페이 / 네이버페이 / 토스페이 등) 1:N 독립 저장 대장 테이블 생성
CREATE TABLE IF NOT EXISTS tenant_payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  provider_code TEXT NOT NULL, -- 'tosspayments', 'nanopay', 'kakaopay', 'naverpay', 'tosspay', 'applepay'
  provider_name TEXT NOT NULL, -- '토스페이먼츠', '나노페이', '카카오페이', '네이버페이' 등
  provider_type TEXT NOT NULL DEFAULT 'easypay', -- 'pg', 'easypay', 'vbank'
  merchant_id TEXT, -- CID, MID, Partner ID
  client_key TEXT, -- API Key, Client ID
  secret_key TEXT, -- Secret Key, Signing Key
  mode TEXT NOT NULL DEFAULT 'test', -- 'test', 'live'
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config_metadata JSONB DEFAULT '{}'::jsonb, -- IV, Ver, Webhook Secret, 추가 설정 JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_tenant_provider UNIQUE (tenant_id, provider_code)
);

-- 2. 기존 payment_configs 테이블에 카카오페이, 네이버페이 및 JSONB 확장 컬럼 보강
ALTER TABLE payment_configs
  ADD COLUMN IF NOT EXISTS kakao_cid TEXT DEFAULT 'TC0ONETIME',
  ADD COLUMN IF NOT EXISTS kakao_secret_key TEXT DEFAULT 'DEV_SECRET_KEY',
  ADD COLUMN IF NOT EXISTS kakao_mode TEXT DEFAULT 'test',
  ADD COLUMN IF NOT EXISTS enable_kakao_pay BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS naver_partner_id TEXT,
  ADD COLUMN IF NOT EXISTS naver_client_id TEXT,
  ADD COLUMN IF NOT EXISTS naver_client_secret TEXT,
  ADD COLUMN IF NOT EXISTS naver_mode TEXT DEFAULT 'test',
  ADD COLUMN IF NOT EXISTS enable_naver_pay BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS toss_pay_mid TEXT,
  ADD COLUMN IF NOT EXISTS toss_pay_api_key TEXT,
  ADD COLUMN IF NOT EXISTS toss_pay_secret_key TEXT,
  ADD COLUMN IF NOT EXISTS toss_pay_mode TEXT DEFAULT 'test',
  ADD COLUMN IF NOT EXISTS enable_toss_pay BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS provider_configs JSONB DEFAULT '{}'::jsonb;

-- 3. 컬럼 및 테이블 코멘트
COMMENT ON TABLE tenant_payment_providers IS '단체(가맹점)별 수납도구(PG, 카카오페이, 네이버페이 등) 개별 설정값 통합 대장';
COMMENT ON COLUMN tenant_payment_providers.provider_code IS '수납도구 고유 식별코드 (kakaopay, naverpay, tosspayments 등)';
COMMENT ON COLUMN tenant_payment_providers.merchant_id IS '가맹점 식별 ID (카카오페이 CID, PG MID, 네이버 파트너 ID)';
COMMENT ON COLUMN tenant_payment_providers.config_metadata IS '수납도구별 추가 확장 파라미터 (JSONB)';
