-- tenant_admins 테이블 컬럼 보완 (kv_store 완전 제거를 위한 추가 필드)
ALTER TABLE tenant_admins ADD COLUMN IF NOT EXISTS phone        TEXT;
ALTER TABLE tenant_admins ADD COLUMN IF NOT EXISTS group_id     TEXT NOT NULL DEFAULT 'tenant_admin';
ALTER TABLE tenant_admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- phone 인덱스
CREATE INDEX IF NOT EXISTS tenant_admins_phone_idx ON tenant_admins(phone);

SELECT 'tenant_admins fields added' AS status;
