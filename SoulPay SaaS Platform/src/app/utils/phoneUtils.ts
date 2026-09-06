/**
 * 대한민국 전화번호 정규화 및 하이픈 포맷팅 유틸리티
 */

/**
 * 전화번호에서 숫자만 추출 (하이픈, 공백 제거)
 * 예: "010-7140-4795" -> "01071404795"
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * 전화번호를 하이픈이 포함된 표준 표준 형태로 포맷팅
 * 예: "01071404795" -> "010-7140-4795"
 * 예: "0212345678" -> "02-1234-5678"
 * 예: "0311234567" -> "031-123-4567"
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  const digits = normalizePhoneNumber(phone);
  if (!digits) return '';

  // 11자리 (휴대폰 010-XXXX-XXXX, 지역번호 031-XXXX-XXXX)
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }

  // 10자리 (서울 02-XXXX-XXXX, 구형휴대폰 011-XXX-XXXX, 지역번호 031-XXX-XXXX)
  if (digits.length === 10) {
    if (digits.startsWith('02')) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }

  // 9자리 (서울 02-XXX-XXXX)
  if (digits.length === 9 && digits.startsWith('02')) {
    return digits.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
  }

  // 8자리 (대표번호 1588-XXXX 등)
  if (digits.length === 8) {
    return digits.replace(/(\d{4})(\d{4})/, '$1-$2');
  }

  // 기타 길이는 기본 분할 반환
  if (digits.length > 7) {
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, digits.length - 4);
    const p3 = digits.slice(digits.length - 4);
    return `${p1}-${p2}-${p3}`;
  }

  return digits;
}

/**
 * 하이픈 유무와 관계없이 두 전화번호가 동일한지 비교
 */
export function isSamePhoneNumber(phoneA: string | null | undefined, phoneB: string | null | undefined): boolean {
  const normA = normalizePhoneNumber(phoneA);
  const normB = normalizePhoneNumber(phoneB);
  if (!normA || !normB) return false;
  return normA === normB;
}
