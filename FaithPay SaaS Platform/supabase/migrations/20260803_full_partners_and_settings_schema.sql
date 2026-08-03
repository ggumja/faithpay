-- ====================================================================
-- FaithPay Multi-tier Sales Partner & Commission System Migration
-- Created: 2026-08-03
-- Description: Full Production Database Schema & Seed Data (Partners, Tenants, Agent Rates, Commissions, System Settings)
-- ====================================================================

-- 1. 파트너 (대리점 / 영업자) 테이블 생성
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales_agent', -- 'master_agency' (대리점) | 'sales_agent' (영업자)
  parent_id UUID REFERENCES partners(id) ON DELETE SET NULL, -- 상위 대리점 ID
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.50, -- 영업 수수료율 (%)
  agency_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.50, -- 대리점 지정 수수료율 (내 수수료 %)
  referral_code TEXT NOT NULL UNIQUE, -- 영업자 고유 추천 코드
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'pending' | 'suspended'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1-1. 기존 partners 테이블 컬럼 보강 (이미 테이블이 존재하는 경우)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS agency_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.50;


-- 2. 가맹점 단체 (Tenants) 테이블 생성
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  religion_type TEXT NOT NULL DEFAULT 'protestant', -- 'protestant' | 'buddhist' | 'catholic'
  primary_color TEXT DEFAULT '#1976d2',
  logo_url TEXT,
  description TEXT,
  address TEXT,
  contact JSONB,
  schedule JSONB,
  terminology JSONB,
  status TEXT NOT NULL DEFAULT 'active', -- 'pending' | 'active' | 'suspended'
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  registration_source TEXT DEFAULT 'self', -- 'self' | 'agency' | 'agent'
  registered_by_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  registered_by_referral_code TEXT,
  contract_rate NUMERIC(5, 2) NOT NULL DEFAULT 3.00, -- 가맹점 계약 수수료율 (%)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2-1. 기존 tenants 테이블 컬럼 보강 (이미 테이블이 존재하는 경우)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS registration_source TEXT DEFAULT 'self';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS registered_by_partner_id UUID;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS registered_by_referral_code TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contract_rate NUMERIC(5, 2) NOT NULL DEFAULT 3.00;


-- 3. 영업자별 개별 지정 대리점 수수료율 테이블 생성
CREATE TABLE IF NOT EXISTS partner_agent_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  agency_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.30, -- 해당 영업자에게 지정한 대리점 수수료율 (%)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agency_id, agent_id)
);


-- 4. 수수료 발생 & 정산 대장 테이블 생성
CREATE TABLE IF NOT EXISTS partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  partner_role TEXT NOT NULL DEFAULT 'sales_agent', -- 'master_agency' | 'sales_agent'
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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


-- 5. 글로벌 플랫폼 및 PG 원가 설정 테이블 생성
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_partners_parent_id ON partners(parent_id);
CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON partners(referral_code);
CREATE INDEX IF NOT EXISTS idx_tenants_registered_by_partner ON tenants(registered_by_partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_id ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_tenant_id ON partner_commissions(tenant_id);

-- 7. 글로벌 시스템 설정 기본값 (PG 원가 & 플랫폼 마진)
INSERT INTO system_settings (key, value, description)
VALUES 
  ('pg_rates', '[{"provider": "toss", "name": "토스페이먼츠", "rate": 1.5, "payMethods": ["card"]}]'::jsonb, 'PG사별 결제 원가 수수료율'),
  ('platform_margin', '0.5'::jsonb, '플랫폼 기본 수익 마진율 (%)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();


-- ====================================================================
-- DB 시드 데이터 (대리점 1개, 소속 영업자 1명, 대리점 직접 2개, 이수진 영업자 3개 단체)
-- ====================================================================

-- A. 파트너 데이터 시딩
INSERT INTO partners (id, name, email, phone, role, parent_id, commission_rate, agency_rate, referral_code, bank_name, account_number, account_holder, status)
VALUES 
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '한국불교문화원',
    'sjlee@temple-pay.kr',
    '02-567-8901',
    'master_agency',
    NULL,
    0.50,
    0.50,
    'BIT2024',
    '국민은행',
    '620-21-0123456',
    '불교정보화협의회',
    'active'
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    '이수진',
    'agent.lee@temple-pay.kr',
    '010-9876-5432',
    'sales_agent',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    0.30,
    0.30,
    'LSJ002',
    '신한은행',
    '110-123-456789',
    '이수진',
    'active'
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  referral_code = EXCLUDED.referral_code,
  agency_rate = EXCLUDED.agency_rate;

-- B. 대리점 지정 영업자별 수수료율 시딩 (이수진 영업자: 0.3%)
INSERT INTO partner_agent_rates (agency_id, agent_id, agency_rate)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  0.30
)
ON CONFLICT (agency_id, agent_id) DO UPDATE SET agency_rate = EXCLUDED.agency_rate;


-- C. 단체 (Tenants) 데이터 시딩: 대리점 직접 2개소 + 이수진 영업자 3개소

-- 1) 대리점 본사 직접 유치 단체 1: 불국사 (3.0%)
INSERT INTO tenants (id, slug, name, religion_type, primary_color, description, address, contact, schedule, terminology, status, registration_source, registered_by_partner_id, registered_by_referral_code, contract_rate)
VALUES (
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11',
  'bulguksa',
  '대한불교조계종 불국사',
  'buddhist',
  '#ff6f00',
  '세계문화유산 불국사입니다. 부처님의 자비와 지혜로 마음의 평화를 전합니다.',
  '경상북도 경주시 불국로 385',
  '{"phone": "054-746-9913", "email": "info@bulguksa.or.kr", "name": "이정각 스님"}'::jsonb,
  '[{"label": "새벽예불", "time": "오전 5:00"}, {"label": "사시마지", "time": "오전 10:00"}]'::jsonb,
  '{"donation": "보시", "member": "불자", "prayer": "발원문"}'::jsonb,
  'active',
  'agency',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'BIT2024',
  3.00
) ON CONFLICT (slug) DO UPDATE SET contract_rate = EXCLUDED.contract_rate;

-- 2) 대리점 본사 직접 유치 단체 2: 여의도순복음교회 (2.8%)
INSERT INTO tenants (id, slug, name, religion_type, primary_color, description, address, contact, schedule, terminology, status, registration_source, registered_by_partner_id, registered_by_referral_code, contract_rate)
VALUES (
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22',
  'yoido-fullgospel',
  '여의도순복음교회',
  'protestant',
  '#1976d2',
  '하나님의 은혜와 사랑이 충만한 순복음 공동체입니다.',
  '서울특별시 영등포구 국회대로 76길 15',
  '{"phone": "02-6181-7000", "email": "info@fgtv.com", "name": "김사무 장로"}'::jsonb,
  '[{"label": "주일 1부 예배", "time": "오전 7:00"}, {"label": "주일 2부 예배", "time": "오전 9:00"}]'::jsonb,
  '{"donation": "헌금", "member": "성도", "prayer": "기도제목"}'::jsonb,
  'active',
  'agency',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'BIT2024',
  2.80
) ON CONFLICT (slug) DO UPDATE SET contract_rate = EXCLUDED.contract_rate;

-- 3) 이수진 영업자 유치 단체 1: 한국불교태고종 봉원사 (3.2%)
INSERT INTO tenants (id, slug, name, religion_type, primary_color, description, address, contact, schedule, terminology, status, registration_source, registered_by_partner_id, registered_by_referral_code, contract_rate)
VALUES (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11',
  'bongwonsa',
  '한국불교태고종 봉원사',
  'buddhist',
  '#ff6f00',
  '서울 신촌 안산 자락의 천년고찰 봉원사입니다.',
  '서울특별시 서대문구 봉원사길 120',
  '{"phone": "02-392-3007", "email": "info@bongwonsa.or.kr", "name": "김봉원 보살"}'::jsonb,
  '[{"label": "초하루 법회", "time": "오전 10:00"}, {"label": "일요 예불", "time": "오전 10:30"}]'::jsonb,
  '{"donation": "보시", "member": "불자", "prayer": "발원문"}'::jsonb,
  'active',
  'agent',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'LSJ002',
  3.20
) ON CONFLICT (slug) DO UPDATE SET contract_rate = EXCLUDED.contract_rate;

-- 4) 이수진 영업자 유치 단체 2: 명성교회 (3.0%)
INSERT INTO tenants (id, slug, name, religion_type, primary_color, description, address, contact, schedule, terminology, status, registration_source, registered_by_partner_id, registered_by_referral_code, contract_rate)
VALUES (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d22',
  'myungsung-church',
  '명성교회',
  'protestant',
  '#1976d2',
  '새벽기도와 선교에 힘쓰는 명성교회입니다.',
  '서울특별시 강동구 구천면로 452',
  '{"phone": "02-440-9000", "email": "info@msch.or.kr", "name": "박집사"}'::jsonb,
  '[{"label": "새벽기도회", "time": "오전 5:00"}, {"label": "주일 3부 예배", "time": "오전 11:30"}]'::jsonb,
  '{"donation": "헌금", "member": "성도", "prayer": "기도제목"}'::jsonb,
  'active',
  'agent',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'LSJ002',
  3.00
) ON CONFLICT (slug) DO UPDATE SET contract_rate = EXCLUDED.contract_rate;

-- 5) 이수진 영업자 유치 단체 3: 천주교 명동대성당 (2.9%)
INSERT INTO tenants (id, slug, name, religion_type, primary_color, description, address, contact, schedule, terminology, status, registration_source, registered_by_partner_id, registered_by_referral_code, contract_rate)
VALUES (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d33',
  'myeongdong-cathedral',
  '천주교 명동대성당',
  'catholic',
  '#7b1fa2',
  '한국 천주교 주교좌 명동대성당입니다.',
  '서울특별시 중구 명동길 74',
  '{"phone": "02-774-1784", "email": "info@mdsd.or.kr", "name": "최수녀"}'::jsonb,
  '[{"label": "주일 미사", "time": "오전 9:00, 11:00"}, {"label": "평일 미사", "time": "오후 6:30"}]'::jsonb,
  '{"donation": "봉헌", "member": "교우", "prayer": "미사지향"}'::jsonb,
  'active',
  'agent',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'LSJ002',
  2.90
) ON CONFLICT (slug) DO UPDATE SET contract_rate = EXCLUDED.contract_rate;


-- D. Row Level Security (RLS) 활성화 및 정책 적용
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_agent_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to system_settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read access to tenants" ON tenants FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read/write access to partners" ON partners FOR ALL USING (true);
CREATE POLICY "Allow authenticated read/write access to partner_agent_rates" ON partner_agent_rates FOR ALL USING (true);
CREATE POLICY "Allow authenticated read/write access to partner_commissions" ON partner_commissions FOR ALL USING (true);
