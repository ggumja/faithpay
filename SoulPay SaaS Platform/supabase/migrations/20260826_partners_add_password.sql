-- 파트너 로그인 비밀번호 컬럼 추가
-- partners 테이블에 password 필드 추가 (기존 계정은 임시 비밀번호 부여)

ALTER TABLE partners ADD COLUMN IF NOT EXISTS password TEXT;

-- 기존 파트너 계정에 임시 비밀번호 설정 (영업자: 초기 비밀번호 = referral_code + '!')
-- 관리자가 최초 로그인 후 비밀번호를 변경하도록 안내 필요
UPDATE partners
SET password = referral_code || '!'
WHERE password IS NULL;

-- 비밀번호 필수 컬럼으로 변경 (임시 비밀번호 세팅 완료 후)
ALTER TABLE partners ALTER COLUMN password SET NOT NULL;
ALTER TABLE partners ALTER COLUMN password SET DEFAULT 'changeme123!';
