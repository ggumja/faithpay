-- tenants 테이블에 사이드 광고/프로모션 배너 JSONB 컬럼 추가
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sidebar_banners JSONB DEFAULT '[]';
