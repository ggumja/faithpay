-- partners 테이블 사업자 유형 컬럼 추가
ALTER TABLE partners ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'CORPORATE'
  CHECK (business_type IN ('INDIVIDUAL', 'freelancer', 'individual_business', 'CORPORATE'));

-- 기존 파트너 전체 기본값 설정
UPDATE partners SET business_type = 'CORPORATE' WHERE business_type IS NULL;

SELECT 'business_type column added' AS status;
