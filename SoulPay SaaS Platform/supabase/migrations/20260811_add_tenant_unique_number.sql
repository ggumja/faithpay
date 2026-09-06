-- ====================================================================
-- Migration: Add unique_number & business_registration_number to tenants table
-- Description: 종교/비영리 단체 고유번호증 번호와 수익사업용 사업자등록번호 필드 DB 구체화
-- ====================================================================

-- 1. tenants 테이블에 고유번호증 및 수익사업용 사업자등록번호 컬럼 추가
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS unique_number TEXT,
  ADD COLUMN IF NOT EXISTS business_registration_number TEXT;

-- 2. 컬럼 주석 명시
COMMENT ON COLUMN tenants.unique_number IS '종교/비영리 단체 국세청 고유번호증 번호 (비영리 헌금/보시 수납용 10자리)';
COMMENT ON COLUMN tenants.business_registration_number IS '수익사업용 사업자등록번호 (바자회/물품 판매 겸업 시 세무서 발급 번호)';

-- 3. 각원사(gakwonsa) 기본 데이터 업데이트
UPDATE tenants
SET 
  unique_number = '240-82-12345',
  business_registration_number = NULL
WHERE slug = 'gakwonsa';
