export type MotifKind = 'cross' | 'lotus' | 'rosary';
export type ReligionId = 'protestant' | 'buddhist' | 'catholic';

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
};

export function getFaithTheme(religionType: ReligionId): FaithTheme {
  return FAITH_THEMES[religionType] ?? FAITH_THEMES.protestant;
}
