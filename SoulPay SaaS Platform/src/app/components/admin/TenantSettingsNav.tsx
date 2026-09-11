import { Link } from 'react-router';
import { Building2, Palette, FileText, Image as ImageIcon } from 'lucide-react';
import { isAdminPortalDomain } from '../../utils/domainUtils';

interface TenantSettingsNavProps {
  tenantSlug?: string;
  activeTab: 'basic' | 'design' | 'banners' | 'documents';
  currentPath: string;
}

export function TenantSettingsNav({ tenantSlug, activeTab, currentPath }: TenantSettingsNavProps) {
  const isDedicatedAdmin = isAdminPortalDomain() || !currentPath.includes('/admin');
  const prefix = isDedicatedAdmin ? '' : '/admin';

  const getPath = (sub: string) => {
    const basePath = sub ? `${prefix}/settings/${sub}` : `${prefix}/settings`;
    return tenantSlug ? `/${tenantSlug}${basePath}` : basePath;
  };

  const tabs = [
    {
      id: 'basic',
      label: '기본정보',
      desc: '단체유형, 기본정보, 연락처, 일정',
      icon: Building2,
      path: getPath(''),
    },
    {
      id: 'design',
      label: '디자인',
      desc: '로고, 템플릿, QR생성기',
      icon: Palette,
      path: getPath('design'),
    },
    {
      id: 'banners',
      label: '배너 관리',
      desc: '상단 히어로 배너, 사이드 광고 배너',
      icon: ImageIcon,
      path: getPath('banners'),
    },
    {
      id: 'documents',
      label: '단체서류',
      desc: '고유번호증, 통장사본, 정관, 인증서류',
      icon: FileText,
      path: getPath('documents'),
    },
  ];

  return (
    <div className="mb-8">
      {/* Page Title & Subtitle */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          설정 및 환경 관리
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5">
          단체의 기본 정보, 모바일 랜딩 디자인, 홍보 배너 및 인증 서류를 체계적으로 관리하세요
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 rounded-t-lg'
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:border-slate-300'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
