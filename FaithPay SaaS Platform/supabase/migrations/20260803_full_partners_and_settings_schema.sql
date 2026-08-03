-- ====================================================================
-- FaithPay Multi-tier Sales Partner & Commission System Migration
-- Created: 2026-08-03
-- Description: Complete production schema for Partners, Agent Rates, Commissions, and System Settings.
-- ====================================================================

-- 1. 영업 파트너 (총판/대리점/영업자) 테이블
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales_agent', -- 'master_agency' (대리점) | 'sales_agent' (영업자)
  parent_id UUID REFERENCES partners(id) ON DELETE SET NULL, -- 상위 대리점 ID
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.50, -- 수수료율 (%)
  agency_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.50, -- 대리점 수수료율 (내 수수료 %)
  referral_code TEXT NOT NULL UNIQUE, -- 영업자 고유 추천 코드
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'pending' | 'suspended'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 영업자별 설정 대리점 수수료율 테이블 (개별 지정 시)
CREATE TABLE IF NOT EXISTS partner_agent_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  agency_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.30, -- 해당 영업자에게 지정한 대리점 수수료율 (%)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agency_id, agent_id)
);

-- 3. 수수료 발생 & 정산 대장 테이블
CREATE TABLE IF NOT EXISTS partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  partner_role TEXT NOT NULL DEFAULT 'sales_agent', -- 'master_agency' | 'sales_agent'
  tenant_id TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  donation_id TEXT NOT NULL,
  donation_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  contract_rate NUMERIC(5, 2) NOT NULL DEFAULT 3.00,
  agency_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.50,
  agent_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.50,
  settlement_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid'
  settlement_month TEXT NOT NULL, -- YYYY-MM
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 글로벌 플랫폼 및 PG 원가 설정 테이블
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_partners_parent_id ON partners(parent_id);
CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON partners(referral_code);
CREATE INDEX IF NOT EXISTS idx_partner_agent_rates_agency ON partner_agent_rates(agency_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_id ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_settlement_month ON partner_commissions(settlement_month);

-- 6. 초기 글로벌 시스템 설정 기본값 (PG 원가 & 플랫폼 마진)
INSERT INTO system_settings (key, value, description)
VALUES 
  ('pg_rates', '[{"provider": "toss", "name": "토스페이먼츠", "rate": 1.5, "payMethods": ["card"]}]'::jsonb, 'PG사별 결제 원가 수수료율'),
  ('platform_margin', '0.5'::jsonb, '플랫폼 기본 수익 마진율 (%)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- 7. Row Level Security (RLS) 활성화 및 기본 정책
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_agent_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to system_settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read/write access to partners" ON partners FOR ALL USING (true);
CREATE POLICY "Allow authenticated read/write access to partner_agent_rates" ON partner_agent_rates FOR ALL USING (true);
CREATE POLICY "Allow authenticated read/write access to partner_commissions" ON partner_commissions FOR ALL USING (true);
