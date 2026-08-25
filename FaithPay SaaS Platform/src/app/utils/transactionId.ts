/**
 * 거래번호 생성 유틸리티
 *
 * 포맷: YYYYMMDDHHMM-NNNNNNN
 * 예시: 202608260923-0000001
 *
 * - 앞 12자리: 한국 시간(KST) 연도+월+일+시+분
 * - 뒤 7자리: 일자별 로컬 일련번호 (localStorage 기반)
 *
 * 특징:
 * - 같은 기기에서 같은 분에 발급한 번호는 일련번호로 구분
 * - localStorage 미지원 환경에서는 ms 기반 fallback 사용
 * - Toss orderId 제약 준수: 영문+숫자+특수문자(-_) 64자 이내
 */

const COUNTER_KEY_PREFIX = 'sp_txn_seq_';  // SoulPay transaction sequence

/**
 * KST 기준 날짜+시간 스탬프 반환 (YYYYMMDDHHMM)
 */
function getKSTTimestamp(): string {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y  = kst.getUTCFullYear();
  const mo = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d  = String(kst.getUTCDate()).padStart(2, '0');
  const h  = String(kst.getUTCHours()).padStart(2, '0');
  const mi = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${y}${mo}${d}${h}${mi}`;         // 202608260923
}


/**
 * 분 단위 일련번호를 localStorage에서 가져오고 +1 증가
 * - 키: YYYYMMDDHHMM (분이 바뀌면 새 키 → 자동으로 0000001 재시작)
 * - 같은 분 안에서는 1, 2, 3 ... 증가
 */
function nextMinuteSequence(minuteKey: string): number {
  try {
    const storageKey = `${COUNTER_KEY_PREFIX}${minuteKey}`;

    // 2분 이상 지난 키 정리
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(COUNTER_KEY_PREFIX) && k !== storageKey) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}

    const current = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const next = current + 1;
    localStorage.setItem(storageKey, String(next));
    return next;
  } catch (_) {
    // localStorage 미지원 or 시크릿 모드 제한
    return Date.now() % 9999999;
  }
}

/**
 * 새 거래번호 생성
 * 포맷: YYYYMMDDHHMM-NNNNNNN
 * 예: 202608260923-0000001
 */
export function generateTransactionId(): string {
  const ts  = getKSTTimestamp();              // 202608260923 (YYYYMMDDHHMM)
  const seq = nextMinuteSequence(ts);         // 분이 바뀌면 0000001 재시작
  const seqStr = String(seq).padStart(7, '0');
  return `${ts}-${seqStr}`;
}

/**
 * 기존 rawId를 새 포맷으로 변환 (표시 전용)
 * - 이미 새 포맷이면 그대로 반환
 * - 구형 don_XXXXX / FP-YYYYMMDD-XXXXXXXX 형식은 변환
 * - createdAtStr이 있으면 그 날짜/시간 사용
 */
export function formatTransactionId(rawId?: string, createdAtStr?: string): string {
  if (!rawId) return generateTransactionId();

  const str = rawId.trim();

  // 이미 새 포맷 YYYYMMDDHHMM-NNNNNNN
  if (/^\d{12}-\d{7}$/.test(str)) return str;

  // 날짜+시간 추출
  let timestamp = '';
  if (createdAtStr) {
    const parsed = new Date(createdAtStr);
    if (!isNaN(parsed.getTime())) {
      const kst = new Date(parsed.getTime() + 9 * 60 * 60 * 1000);
      const y  = kst.getUTCFullYear();
      const mo = String(kst.getUTCMonth() + 1).padStart(2, '0');
      const d  = String(kst.getUTCDate()).padStart(2, '0');
      const h  = String(kst.getUTCHours()).padStart(2, '0');
      const mi = String(kst.getUTCMinutes()).padStart(2, '0');
      timestamp = `${y}${mo}${d}${h}${mi}`;
    }
  }
  if (!timestamp) timestamp = getKSTTimestamp();

  // 숫자만 추출해서 7자리 일련번호로
  const digits = str.replace(/[^0-9]/g, '');
  const seqStr = digits.length >= 7
    ? digits.slice(-7)
    : digits.padStart(7, '0');

  return `${timestamp}-${seqStr}`;
}
