export type TemplateId = 'classic' | 'electric-dark' | 'minimal-hero';

export interface PageTemplateInfo {
  id: TemplateId;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  previewColors: {
    primary: string;
    background: string;
    cardBg: string;
    text: string;
  };
  features: string[];
}

export const PAGE_TEMPLATES: Record<TemplateId, PageTemplateInfo> = {
  'classic': {
    id: 'classic',
    name: '클래식 코발트',
    subtitle: 'Classic Standard Light',
    description: '정달하고 신뢰감을 주는 전통적인 카드 목록형 라이트 테마입니다. 모티프 아이콘과 기독교/불교/천주교 브랜드 커스텀이 조화롭게 적용됩니다.',
    badge: '기본 제공',
    previewColors: {
      primary: '#3D47B8',
      background: 'oklch(0.985 0.003 250)',
      cardBg: '#ffffff',
      text: '#111827',
    },
    features: ['정갈한 카드 목록', '종교 모티프 강조', '우측 사이드바 세부정보'],
  },
  'electric-dark': {
    id: 'electric-dark',
    name: '네오 모던 (Electric Dark)',
    subtitle: 'High-Contrast Neo Dark & Electric Green',
    description: '일렉트릭 네온 그린(#C7FF2E)과 필로 블랙(#0F0F0F)의 강렬한 고대비 현대적 UI 스타일입니다. 대시보드 스탯 카드와 둥근 캡슐 뱃지, 플로팅 액션 바가 특징입니다.',
    badge: '인기 템플릿',
    previewColors: {
      primary: '#C7FF2E',
      background: '#0F0F0F',
      cardBg: '#2E2E2E',
      text: '#FFFFFF',
    },
    features: ['네온 그린 & 다크 고대비 UI', '실시간 봉헌 스탯 대시보드', '하단 플로팅 둥근 캡슐 바'],
  },
  'minimal-hero': {
    id: 'minimal-hero',
    name: '미니멀 히어로',
    subtitle: 'Clean Minimalist & Large Hero Banner',
    description: '여백의 미와 배너 비주얼을 최대로 살린 여유로운 카드 그리드 테마입니다.',
    badge: '모던 스튜디오',
    previewColors: {
      primary: '#10B981',
      background: '#F9FAFB',
      cardBg: '#FFFFFF',
      text: '#1F2937',
    },
    features: ['와이드 히어로 비주얼', '깔끔한 2열 카테고리 그리드', '터치 친화적 인터페이스'],
  },
};

export function getPageTemplate(templateId?: string): PageTemplateInfo {
  if (templateId && templateId in PAGE_TEMPLATES) {
    return PAGE_TEMPLATES[templateId as TemplateId];
  }
  return PAGE_TEMPLATES['classic'];
}
