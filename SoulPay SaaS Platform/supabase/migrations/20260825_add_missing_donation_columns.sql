-- donations 테이블에 누락된 컬럼 추가 (마이그레이션 충돌 우회용)
-- 20260825_kv_to_db.sql이 적용 안 된 DB에 개별 컬럼만 추가
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS item_id       TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS item_name     TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS approve_no    TEXT,
  ADD COLUMN IF NOT EXISTS device_type   TEXT,
  ADD COLUMN IF NOT EXISTS pg_provider   TEXT;

-- 인덱스도 추가
CREATE INDEX IF NOT EXISTS donations_phone_idx ON donations(donor_phone);

SELECT 'donations columns patched' AS status;
