export type MotifKind = 'cross' | 'lotus' | 'rosary' | 'heart' | 'sparkles';
export type ReligionId = 'protestant' | 'buddhist' | 'catholic' | 'charity' | 'general';

export interface FaithTheme {
  primary: string;
  primaryDark: string;
  primaryHover: string;
  primaryBg: string;
  primaryBgStrong: string;
  accent: string;
  accentBg: string;
  heroGradient: string;
  heroGradientSoft: string;
  motif: MotifKind;
  greeting: string;
  tagline: string;
  name: string;
  placeNoun: string;
  leaderTitle: string;
}

export const FAITH_THEMES: Record<ReligionId, FaithTheme> = {
  protestant: {
    name: '기독교',
    primary: '#3D47B8',
    primaryDark: '#2A338F',
    primaryHover: '#333DA8',
    primaryBg: '#EFF0FB',
    primaryBgStrong: '#DCDEF5',
    accent: '#E8B84A',
    accentBg: '#FBF3DD',
    heroGradient: 'linear-gradient(135deg, #3D47B8 0%, #2A338F 60%, #1A2068 100%)',
    heroGradientSoft: 'linear-gradient(135deg, #EFF0FB 0%, #DCDEF5 100%)',
    motif: 'cross',
    greeting: '샬롬',
    tagline: '감사함으로 드리는 예배',
    placeNoun: '교회',
    leaderTitle: '담임목사',
  },
  buddhist: {
    name: '불교',
    primary: '#C16314',
    primaryDark: '#8C4609',
    primaryHover: '#A85510',
    primaryBg: '#FBF1E6',
    primaryBgStrong: '#F4DEC3',
    accent: '#7A2E1F',
    accentBg: '#F7E6E2',
    heroGradient: 'linear-gradient(135deg, #C16314 0%, #8C4609 60%, #5C2D04 100%)',
    heroGradientSoft: 'linear-gradient(135deg, #FBF1E6 0%, #F4DEC3 100%)',
    motif: 'lotus',
    greeting: '성불하세요',
    tagline: '마음을 담아 드리는 공양',
    placeNoun: '사찰',
    leaderTitle: '주지스님',
  },
  catholic: {
    name: '천주교',
    primary: '#345785',
    primaryDark: '#1F3A60',
    primaryHover: '#2C4B73',
    primaryBg: '#EAF0F8',
    primaryBgStrong: '#CFDCEF',
    accent: '#7B2A3D',
    accentBg: '#F5E4E8',
    heroGradient: 'linear-gradient(135deg, #345785 0%, #1F3A60 60%, #102447 100%)',
    heroGradientSoft: 'linear-gradient(135deg, #EAF0F8 0%, #CFDCEF 100%)',
    motif: 'rosary',
    greeting: '평화를 빕니다',
    tagline: '주님께 봉헌하는 마음',
    placeNoun: '성당',
    leaderTitle: '주임신부',
  },
  charity: {
    name: '구호/기부재단',
    primary: '#E53E3E',
    primaryDark: '#C53030',
    primaryHover: '#9B2C2C',
    primaryBg: '#FFF5F5',
    primaryBgStrong: '#FED7D7',
    accent: '#DD6B20',
    accentBg: '#FEEBC8',
    heroGradient: 'linear-gradient(135deg, #E53E3E 0%, #C53030 60%, #742A2A 100%)',
    heroGradientSoft: 'linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%)',
    motif: 'heart',
    greeting: '함께하는 따뜻한 나눔',
    tagline: '세상을 바꾸는 따뜻한 후원',
    placeNoun: '재단/단체',
    leaderTitle: '이사장',
  },
  general: {
    name: '비영리/사회공헌',
    primary: '#2F855A',
    primaryDark: '#22543D',
    primaryHover: '#276749',
    primaryBg: '#F0FFF4',
    primaryBgStrong: '#C6F6D5',
    accent: '#D69E2E',
    accentBg: '#FEFCBF',
    heroGradient: 'linear-gradient(135deg, #2F855A 0%, #22543D 60%, #1A365D 100%)',
    heroGradientSoft: 'linear-gradient(135deg, #F0FFF4 0%, #C6F6D5 100%)',
    motif: 'sparkles',
    greeting: '소중한 가치 나눔',
    tagline: '더 나은 내일을 만드는 기부',
    placeNoun: '단체',
    leaderTitle: '대표',
  },
};

export function getFaithTheme(religionType: ReligionId): FaithTheme {
  return FAITH_THEMES[religionType] ?? FAITH_THEMES.protestant;
}
