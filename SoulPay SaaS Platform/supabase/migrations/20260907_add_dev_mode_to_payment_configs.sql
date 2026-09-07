-- ====================================================================
-- Migration: Add dev_mode column to payment_configs
-- Description: PG 연동 운영 모드(Dev Mode / Prod Mode) 구분 컬럼 추가
-- ====================================================================

ALTER TABLE payment_configs
  ADD COLUMN IF NOT EXISTS dev_mode BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN payment_configs.dev_mode IS 'PG 연동 운영 환경 구분 (true: 개발/테스트 샌드박스 망, false: 실운영 라이브 망)';
