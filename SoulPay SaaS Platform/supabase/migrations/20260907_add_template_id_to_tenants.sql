-- ====================================================================
-- Migration: Add template_id column to tenants table
-- Description: 단체별 메인 홈 디자인 템플릿 ID (classic | electric-dark | minimal-hero) 저장 컬럼 추가
-- ====================================================================

-- 1. tenants 테이블에 template_id 컬럼 추가 (기본값: classic)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS template_id TEXT DEFAULT 'classic';

COMMENT ON COLUMN tenants.template_id IS '메인 홈 디자인 템플릿 식별자 (classic: 클래식 코발트, electric-dark: 일렉트릭 다크, minimal-hero: 미니멀 히어로)';

-- 2. dream 테넌트 템플릿을 minimal-hero(미니멀 히어로)로 지정
UPDATE tenants
  SET template_id = 'minimal-hero'
  WHERE slug = 'dream';
