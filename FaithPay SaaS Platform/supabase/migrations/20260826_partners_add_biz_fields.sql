-- partners 테이블 사업 정보 필드 보강
ALTER TABLE partners ADD COLUMN IF NOT EXISTS corp_reg_no  TEXT;          -- 사업자등록번호 (법인·개인사업자)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS corp_name    TEXT;          -- 법인명 / 상호
ALTER TABLE partners ADD COLUMN IF NOT EXISTS ceo_name     TEXT;          -- 대표자명
ALTER TABLE partners ADD COLUMN IF NOT EXISTS tax_email    TEXT;          -- 세금계산서 수신 이메일
ALTER TABLE partners ADD COLUMN IF NOT EXISTS real_name    TEXT;          -- 실명 (프리랜서 원천징수)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS res_no       TEXT;          -- 주민등록번호 (프리랜서, 마스킹 저장)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS region       TEXT;          -- 담당 지역
ALTER TABLE partners ADD COLUMN IF NOT EXISTS memo         TEXT;          -- 관리자 메모

SELECT 'partners biz fields added' AS status;
