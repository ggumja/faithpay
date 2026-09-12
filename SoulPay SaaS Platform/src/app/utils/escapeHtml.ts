/**
 * HTML 특수문자 이스케이프 유틸리티
 *
 * 인쇄 창(printWindow.document.write) 또는 innerHTML에 사용자 입력값을 삽입할 때
 * XSS(Cross-Site Scripting) 공격을 방지하기 위해 반드시 이 함수를 사용합니다.
 *
 * 대상 문자:
 *  & → &amp;   < → &lt;   > → &gt;   " → &quot;   ' → &#x27;   / → &#x2F;
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
