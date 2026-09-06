/**
 * 2벌식 한글 자모 및 완성형 한글 ➔ 영문 QWERTY 키보드 자동 변환 헬퍼
 */
export function convertKoreanToQwerty(text: string): { converted: string; hasKorean: boolean } {
  let hasKorean = false;

  const KOREAN_KEY_MAP: Record<string, string> = {
    'ㄱ': 'r', 'ㄲ': 'R', 'ㄴ': 's', 'ㄷ': 'e', 'ㄸ': 'E',
    'ㄹ': 'f', 'ㅁ': 'a', 'ㅂ': 'q', 'ㅃ': 'Q', 'ㅅ': 't',
    'ㅆ': 'T', 'ㅇ': 'd', 'ㅈ': 'w', 'ㅉ': 'W', 'ㅊ': 'c',
    'ㅋ': 'z', 'ㅌ': 'x', 'ㅍ': 'v', 'ㅎ': 'g',
    'ㅏ': 'k', 'ㅐ': 'o', 'ㅑ': 'i', 'ㅒ': 'O', 'ㅓ': 'j',
    'ㅔ': 'p', 'ㅕ': 'u', 'ㅖ': 'P', 'ㅗ': 'h', 'ㅘ': 'hk',
    'ㅙ': 'ho', 'ㅚ': 'hl', 'ㅛ': 'y', 'ㅜ': 'n', 'ㅝ': 'nj',
    'ㅞ': 'np', 'ㅟ': 'nl', 'ㅠ': 'b', 'ㅡ': 'm', 'ㅢ': 'ml', 'ㅣ': 'l',
  };

  const CHOSUNG = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
    'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ];
  const JUNGSUNG = [
    'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
    'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
  ];
  const JONGSUNG = [
    '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
    'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ];

  const DOUBLE_JONGSUNG_MAP: Record<string, string> = {
    'ㄳ': 'rt', 'ㄵ': 'sw', 'ㄶ': 'sg', 'ㄺ': 'fr', 'ㄻ': 'fa',
    'ㄼ': 'fq', 'ㄽ': 'ft', 'ㄾ': 'fx', 'ㄿ': 'fv', 'ㅀ': 'fg', 'ㅄ': 'qt'
  };

  let result = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    // 1. 완성형 한글 (AC00 ~ D7A3)
    if (code >= 0xAC00 && code <= 0xD7A3) {
      hasKorean = true;
      const index = code - 0xAC00;
      const cho = Math.floor(index / (21 * 28));
      const jung = Math.floor((index % (21 * 28)) / 28);
      const jong = index % 28;

      const choChar = CHOSUNG[cho];
      const jungChar = JUNGSUNG[jung];
      const jongChar = JONGSUNG[jong];

      result += KOREAN_KEY_MAP[choChar] || '';
      result += KOREAN_KEY_MAP[jungChar] || '';
      if (jongChar) {
        if (DOUBLE_JONGSUNG_MAP[jongChar]) {
          result += DOUBLE_JONGSUNG_MAP[jongChar];
        } else {
          result += KOREAN_KEY_MAP[jongChar] || '';
        }
      }
    }
    // 2. 자모 단일 문자 (3131 ~ 318E)
    else if (code >= 0x3131 && code <= 0x318E) {
      hasKorean = true;
      result += KOREAN_KEY_MAP[char] || '';
    } else {
      result += char;
    }
  }

  const converted = result.toLowerCase().replace(/[^a-z0-9-]/g, '');

  return {
    converted,
    hasKorean,
  };
}
