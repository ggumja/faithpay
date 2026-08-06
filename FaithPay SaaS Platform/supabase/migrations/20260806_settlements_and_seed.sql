-- ====================================================================
-- FaithPay 정산 테이블 신설 + 수수료/정산 원장 샘플 시드
-- Created: 2026-08-06
-- ====================================================================

-- 0. partner_commissions 누락 컬럼 보강 (실제 DB 현황 기준)
ALTER TABLE partner_commissions
  ADD COLUMN IF NOT EXISTS partner_role      TEXT NOT NULL DEFAULT 'sales_agent',
  ADD COLUMN IF NOT EXISTS tenant_name       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contract_rate     NUMERIC(5,2) NOT NULL DEFAULT 3.00,
  ADD COLUMN IF NOT EXISTS agency_rate       NUMERIC(5,2) NOT NULL DEFAULT 0.50,
  ADD COLUMN IF NOT EXISTS agent_rate        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS settlement_month  TEXT;

-- tenant_id 타입이 text → uuid 참조로 전환이 필요하나, 기존 데이터 호환을 위해 유지

-- 1. partner_settlements 테이블
CREATE TABLE IF NOT EXISTS partner_settlements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  total_commission NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_type         TEXT NOT NULL DEFAULT 'withholding',
  tax_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'scheduled',
  settled_at       TIMESTAMPTZ,
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_settlements_partner_id ON partner_settlements(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_settlements_status     ON partner_settlements(status);

-- 2. partner_settlement_commissions 연결
CREATE TABLE IF NOT EXISTS partner_settlement_commissions (
  settlement_id UUID NOT NULL REFERENCES partner_settlements(id) ON DELETE CASCADE,
  commission_id UUID NOT NULL REFERENCES partner_commissions(id) ON DELETE CASCADE,
  PRIMARY KEY (settlement_id, commission_id)
);

-- 3. partner_settlement_agent_payouts (대리점→영업자 지급 명세)
CREATE TABLE IF NOT EXISTS partner_settlement_agent_payouts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id      UUID NOT NULL REFERENCES partner_settlements(id) ON DELETE CASCADE,
  agent_id           UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  business_type      TEXT NOT NULL DEFAULT 'individual',
  commission_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  agency_margin      NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_agent_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_type           TEXT NOT NULL DEFAULT 'withholding',
  tax_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_agent_received NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_payouts_settlement ON partner_settlement_agent_payouts(settlement_id);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_agent      ON partner_settlement_agent_payouts(agent_id);

-- RLS
ALTER TABLE partner_settlements              ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_settlement_commissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_settlement_agent_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settlements_all"            ON partner_settlements;
DROP POLICY IF EXISTS "settlement_commissions_all" ON partner_settlement_commissions;
DROP POLICY IF EXISTS "agent_payouts_all"          ON partner_settlement_agent_payouts;

CREATE POLICY "settlements_all"            ON partner_settlements              FOR ALL USING (true);
CREATE POLICY "settlement_commissions_all" ON partner_settlement_commissions   FOR ALL USING (true);
CREATE POLICY "agent_payouts_all"          ON partner_settlement_agent_payouts FOR ALL USING (true);


-- ====================================================================
-- SEED DATA
-- ====================================================================

-- A. 수수료 원장 (대리점 직접 유치: 불국사, 여의도순복음)
INSERT INTO partner_commissions
  (id, partner_id, partner_role, tenant_id, tenant_name, donation_id, donation_amount, commission_amount, contract_rate, agency_rate, agent_rate, settlement_status, settlement_month, created_at)
VALUES
  ('e0000001-0000-0000-0000-000000000001','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','master_agency','c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11','대한불교조계종 불국사',  'DON-20260716-0001',500000,15000,3.00,0.50,0.00,'paid','2026-07','2026-07-16 09:12:00+09'),
  ('e0000001-0000-0000-0000-000000000002','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','master_agency','c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11','대한불교조계종 불국사',  'DON-20260718-0012',300000, 9000,3.00,0.50,0.00,'paid','2026-07','2026-07-18 14:30:00+09'),
  ('e0000001-0000-0000-0000-000000000003','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','master_agency','c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11','대한불교조계종 불국사',  'DON-20260723-0008',200000, 6000,3.00,0.50,0.00,'paid','2026-07','2026-07-23 11:05:00+09'),
  ('e0000001-0000-0000-0000-000000000004','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','master_agency','c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11','대한불교조계종 불국사',  'DON-20260801-0003',450000,13500,3.00,0.50,0.00,'pending','2026-08','2026-08-01 10:20:00+09'),
  ('e0000001-0000-0000-0000-000000000005','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','master_agency','c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11','대한불교조계종 불국사',  'DON-20260805-0011',100000, 3000,3.00,0.50,0.00,'pending','2026-08','2026-08-05 15:45:00+09'),
  ('e0000001-0000-0000-0000-000000000006','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','master_agency','c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22','여의도순복음교회',       'DON-20260717-0005',800000,22400,2.80,0.50,0.00,'paid','2026-07','2026-07-17 08:00:00+09'),
  ('e0000001-0000-0000-0000-000000000007','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','master_agency','c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22','여의도순복음교회',       'DON-20260724-0019',600000,16800,2.80,0.50,0.00,'paid','2026-07','2026-07-24 12:15:00+09'),
  ('e0000001-0000-0000-0000-000000000008','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','master_agency','c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22','여의도순복음교회',       'DON-20260803-0002',700000,19600,2.80,0.50,0.00,'pending','2026-08','2026-08-03 09:30:00+09')
ON CONFLICT (id) DO NOTHING;

-- A. 수수료 원장 (영업자 이수진: 봉원사, 명성교회, 명동대성당)
INSERT INTO partner_commissions
  (id, partner_id, partner_role, tenant_id, tenant_name, donation_id, donation_amount, commission_amount, contract_rate, agency_rate, agent_rate, settlement_status, settlement_month, created_at)
VALUES
  ('e0000002-0000-0000-0000-000000000001','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','sales_agent','d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11','한국불교태고종 봉원사','DON-20260719-0007',400000,12000,3.20,0.30,0.30,'paid','2026-07','2026-07-19 10:00:00+09'),
  ('e0000002-0000-0000-0000-000000000002','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','sales_agent','d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11','한국불교태고종 봉원사','DON-20260725-0003',250000, 7500,3.20,0.30,0.30,'paid','2026-07','2026-07-25 16:20:00+09'),
  ('e0000002-0000-0000-0000-000000000003','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','sales_agent','d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d22','명성교회',           'DON-20260720-0015',500000,15000,3.00,0.30,0.30,'paid','2026-07','2026-07-20 11:30:00+09'),
  ('e0000002-0000-0000-0000-000000000004','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','sales_agent','d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d33','천주교 명동대성당',  'DON-20260722-0009',350000,10150,2.90,0.30,0.30,'paid','2026-07','2026-07-22 14:00:00+09'),
  ('e0000002-0000-0000-0000-000000000005','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','sales_agent','d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11','한국불교태고종 봉원사','DON-20260802-0006',300000, 9000,3.20,0.30,0.30,'pending','2026-08','2026-08-02 09:00:00+09'),
  ('e0000002-0000-0000-0000-000000000006','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','sales_agent','d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d22','명성교회',           'DON-20260804-0021',450000,13500,3.00,0.30,0.30,'pending','2026-08','2026-08-04 13:15:00+09'),
  ('e0000002-0000-0000-0000-000000000007','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','sales_agent','d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d33','천주교 명동대성당',  'DON-20260806-0004',200000, 5800,2.90,0.30,0.30,'pending','2026-08','2026-08-06 10:00:00+09')
ON CONFLICT (id) DO NOTHING;


-- B-1. 대리점 7월 하반기 정산 (paid, VAT 10%)
INSERT INTO partner_settlements (id,partner_id,period_start,period_end,total_commission,tax_type,tax_amount,net_amount,status,settled_at,note,created_at)
VALUES ('f0000001-0000-0000-0000-000000000001','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','2026-07-16','2026-07-31',69200,'vat',6920,76120,'paid','2026-08-01 09:00:00+09','7월 하반기 정산 (대리점 직접 유치 단체)','2026-08-01 09:00:00+09')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_settlement_commissions (settlement_id,commission_id) VALUES
  ('f0000001-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000001'),
  ('f0000001-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000002'),
  ('f0000001-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000003'),
  ('f0000001-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000006'),
  ('f0000001-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000007')
ON CONFLICT DO NOTHING;

-- B-2. 대리점 8월 상반기 정산 (scheduled, VAT 10%)
INSERT INTO partner_settlements (id,partner_id,period_start,period_end,total_commission,tax_type,tax_amount,net_amount,status,settled_at,note,created_at)
VALUES ('f0000001-0000-0000-0000-000000000002','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','2026-08-01','2026-08-15',36100,'vat',3610,39710,'scheduled',NULL,'8월 상반기 정산 예정 (2026-08-16 입금)',NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_settlement_commissions (settlement_id,commission_id) VALUES
  ('f0000001-0000-0000-0000-000000000002','e0000001-0000-0000-0000-000000000004'),
  ('f0000001-0000-0000-0000-000000000002','e0000001-0000-0000-0000-000000000005'),
  ('f0000001-0000-0000-0000-000000000002','e0000001-0000-0000-0000-000000000008')
ON CONFLICT DO NOTHING;

-- C-1. 이수진 7월 하반기 정산 (paid, 원천징수 3.3%)
INSERT INTO partner_settlements (id,partner_id,period_start,period_end,total_commission,tax_type,tax_amount,net_amount,status,settled_at,note,created_at)
VALUES ('f0000002-0000-0000-0000-000000000001','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','2026-07-16','2026-07-31',40185,'withholding',1326,38859,'paid','2026-08-01 10:00:00+09','7월 하반기 정산 (대리점 지급)','2026-08-01 10:00:00+09')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_settlement_agent_payouts (id,settlement_id,agent_id,business_type,commission_amount,agency_margin,gross_agent_amount,tax_type,tax_amount,net_agent_received,paid_at)
VALUES ('a1000001-0000-0000-0000-000000000001','f0000002-0000-0000-0000-000000000001','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','individual',44650,4465,40185,'withholding',1326,38859,'2026-08-01 10:00:00+09')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_settlement_commissions (settlement_id,commission_id) VALUES
  ('f0000002-0000-0000-0000-000000000001','e0000002-0000-0000-0000-000000000001'),
  ('f0000002-0000-0000-0000-000000000001','e0000002-0000-0000-0000-000000000002'),
  ('f0000002-0000-0000-0000-000000000001','e0000002-0000-0000-0000-000000000003'),
  ('f0000002-0000-0000-0000-000000000001','e0000002-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- C-2. 이수진 8월 상반기 정산 (scheduled, 원천징수 3.3%)
INSERT INTO partner_settlements (id,partner_id,period_start,period_end,total_commission,tax_type,tax_amount,net_amount,status,settled_at,note,created_at)
VALUES ('f0000002-0000-0000-0000-000000000002','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','2026-08-01','2026-08-15',25470,'withholding',840,24630,'scheduled',NULL,'8월 상반기 정산 예정',NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_settlement_agent_payouts (id,settlement_id,agent_id,business_type,commission_amount,agency_margin,gross_agent_amount,tax_type,tax_amount,net_agent_received,paid_at)
VALUES ('a1000001-0000-0000-0000-000000000002','f0000002-0000-0000-0000-000000000002','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','individual',28300,2830,25470,'withholding',840,24630,NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_settlement_commissions (settlement_id,commission_id) VALUES
  ('f0000002-0000-0000-0000-000000000002','e0000002-0000-0000-0000-000000000005'),
  ('f0000002-0000-0000-0000-000000000002','e0000002-0000-0000-0000-000000000006'),
  ('f0000002-0000-0000-0000-000000000002','e0000002-0000-0000-0000-000000000007')
ON CONFLICT DO NOTHING;
