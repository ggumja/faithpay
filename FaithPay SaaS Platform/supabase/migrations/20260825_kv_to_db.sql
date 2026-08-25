-- ======================================================
-- KV → DB 마이그레이션: 신규 테이블 생성
-- 실행 위치: Supabase Dashboard > SQL Editor
-- ======================================================

-- 1. 헌금 항목 테이블 (donation-items:tenantId KV 키 대체)
CREATE TABLE IF NOT EXISTS donation_items (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  amount_type         TEXT NOT NULL DEFAULT 'flexible' CHECK (amount_type IN ('fixed','flexible')),
  fixed_amount        INTEGER,
  allow_recurring     BOOLEAN NOT NULL DEFAULT true,
  allow_one_time      BOOLEAN NOT NULL DEFAULT true,
  enable_prayer_field BOOLEAN NOT NULL DEFAULT false,
  enabled             BOOLEAN NOT NULL DEFAULT true,
  order_index         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS donation_items_tenant_idx ON donation_items(tenant_id);

-- 2. 단체 관리자 계정 테이블 (admin:email KV 키 대체)
CREATE TABLE IF NOT EXISTS tenant_admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  email       TEXT NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'tenant_admin' CHECK (role IN ('tenant_admin','finance_manager')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);
CREATE INDEX IF NOT EXISTS tenant_admins_tenant_idx ON tenant_admins(tenant_id);
CREATE INDEX IF NOT EXISTS tenant_admins_email_idx  ON tenant_admins(email);

-- 3. tenants 테이블 컬럼 보완
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS religion_type   TEXT DEFAULT 'protestant';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color   TEXT DEFAULT '#4F46E5';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url        TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS banner_images   JSONB DEFAULT '[]';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS unique_number   TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_info   JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact         JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS schedule        JSONB DEFAULT '[]';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS terminology     JSONB DEFAULT '{"donation":"헌금","member":"성도","prayer":"기도제목"}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS applied_at      TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contract_rate   NUMERIC(5,2) DEFAULT 3.0;

-- 4. subscriptions 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  donor_name        TEXT NOT NULL,
  donor_phone       TEXT NOT NULL,
  donor_email       TEXT,
  item_id           TEXT NOT NULL,
  item_name         TEXT NOT NULL,
  amount            INTEGER NOT NULL,
  user_id           TEXT NOT NULL DEFAULT '',
  bill_key          TEXT NOT NULL DEFAULT '',
  card_no           TEXT,
  card_name         TEXT,
  recurring_day     INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  next_payment_date TEXT,
  paused_until      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscriptions_tenant_idx ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS subscriptions_phone_idx  ON subscriptions(donor_phone);

-- 5. donations 테이블
CREATE TABLE IF NOT EXISTS donations (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  item_id         TEXT NOT NULL DEFAULT '',
  item_name       TEXT NOT NULL DEFAULT '',
  amount          INTEGER NOT NULL,
  donor_name      TEXT NOT NULL DEFAULT '',
  donor_phone     TEXT NOT NULL DEFAULT '',
  prayer_text     TEXT,
  family_members  JSONB,
  baptism_name    TEXT,
  is_recurring    BOOLEAN NOT NULL DEFAULT false,
  recurring_day   INTEGER,
  payment_status  TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','completed','failed','cancelled')),
  payment_method  TEXT,
  transaction_id  TEXT,
  approve_no      TEXT,
  device_type     TEXT,
  pg_provider     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS donations_tenant_idx ON donations(tenant_id);
CREATE INDEX IF NOT EXISTS donations_phone_idx  ON donations(donor_phone);

SELECT 'migration complete' AS status;
