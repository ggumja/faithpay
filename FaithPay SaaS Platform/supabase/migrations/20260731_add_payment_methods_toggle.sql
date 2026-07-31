-- ====================================================================
-- Migration: Add Payment Method Toggle Columns to payment_configs table
-- Description: 간편결제(easy_payment), 가상계좌(vbank), 신용카드(card) 활성화 여부 토글 컬럼 추가
-- ====================================================================

-- 1. payment_configs 테이블에 결제 수단별 사용여부 컬럼 추가 (기본값 true)
ALTER TABLE IF EXISTS payment_configs
  ADD COLUMN IF NOT EXISTS enable_card BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_easy_payment BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_vbank BOOLEAN NOT NULL DEFAULT true;

-- 2. 설명 코멘트 추가
COMMENT ON COLUMN payment_configs.enable_card IS '신용/체크카드 결제 수단 활성화 여부';
COMMENT ON COLUMN payment_configs.enable_easy_payment IS '간편결제 (카카오페이/네이버페이/토스페이 등) 활성화 여부';
COMMENT ON COLUMN payment_configs.enable_vbank IS '가상계좌 (무통장 입금) 활성화 여부';
