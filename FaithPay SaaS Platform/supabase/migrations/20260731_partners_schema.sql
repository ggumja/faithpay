-- ====================================================================
-- FaithPay Multi-tier Sales Partner & Commission System Migration
-- Created: 2026-07-31
-- ====================================================================

-- 1. 영업 파트너 (총판/대리점/영업자) 테이블
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales_agent', -- 'master_agency' (Tier-1 총판) | 'sales_agent' (Tier-2 영업자)
  parent_id UUID REFERENCES partners(id) ON DELETE SET NULL, -- 상위 총판 ID
  commission_rate NUMERIC(4, 2) NOT NULL DEFAULT 0.40, -- 수수료율 (%)
  referral_code TEXT NOT NULL UNIQUE, -- 영업자 고유 추천 코드
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'pending' | 'suspended'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 다계층 수수료 발생 & 정산 대장 테이블
CREATE TABLE IF NOT EXISTS partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  donation_id TEXT NOT NULL,
  donation_amount NUMERIC(12, 2) NOT NULL,
  commission_amount NUMERIC(12, 2) NOT NULL,
  settlement_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid'
  settlement_month TEXT NOT NULL, -- YYYY-MM
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_partners_parent_id ON partners(parent_id);
CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON partners(referral_code);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_id ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_settlement_month ON partner_commissions(settlement_month);

-- 4. 초기 샘플 데이터 시딩
INSERT INTO partners (id, name, email, phone, role, commission_rate, referral_code, bank_name, account_number, account_holder, status)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '주식회사 파이프라인 (김영업 대표)', 'master@pipeline.co.kr', '010-9876-5432', 'master_agency', 0.70, 'PIPELINE_KIM', '신한은행', '110-123-456789', '주식회사 파이프라인', 'active'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '이영업 파트너 (경기남부 총판)', 'agent_lee@gmail.com', '010-2345-6789', 'sales_agent', 0.40, 'AGENT_LEE', '국민은행', '400401-04-123456', '이영업', 'active')
ON CONFLICT (email) DO NOTHING;
