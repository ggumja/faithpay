-- ======================================================================
-- system_admins 테이블 생성 + 초기 수퍼관리자 시딩
-- 실행 위치: Supabase Dashboard > SQL Editor
-- ======================================================================

CREATE TABLE IF NOT EXISTS system_admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL DEFAULT 'soulpay1234!',
  role        TEXT NOT NULL DEFAULT 'system_admin'
                CHECK (role IN ('system_admin', 'system_viewer')),
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended')),
  memo        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 초기 최고관리자 계정 시딩
INSERT INTO system_admins (name, email, password, role, status)
VALUES
  ('SoulPay 최고관리자', 'admin@soulpay.kr',  'soulpay1234!', 'system_admin', 'active'),
  ('시스템 관리자',      'system@soulpay.kr', 'soulpay1234!', 'system_admin', 'active')
ON CONFLICT (email) DO NOTHING;

SELECT id, name, email, role, status, created_at FROM system_admins;
