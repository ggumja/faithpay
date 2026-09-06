import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp, DonationItem, Tenant } from '../context/AppContext';
import { donationItemsAPI, tenantAPI } from '../api/client';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { useTenantPWA } from '../hooks/useTenantPWA';
import { ClassicTemplate } from '../components/templates/ClassicTemplate';
import { ElectricDarkTemplate } from '../components/templates/ElectricDarkTemplate';
import { MinimalHeroTemplate } from '../components/templates/MinimalHeroTemplate';
import { AlertCircle, Home, UserPlus, Clock } from 'lucide-react';

export default function TenantHome() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, isTenantsLoaded, currentTenant, setCurrentTenant } = useApp();

  const [directTenant, setDirectTenant] = useState<Tenant | null>(null);
  const [isDirectLoading, setIsDirectLoading] = useState<boolean>(false);
  const [hasDirectSearched, setHasDirectSearched] = useState<boolean>(false);

  // 1. Context에 로드된 tenants에서 검색
  const matchedFromList = (tenants && tenants.length > 0 && tenantSlug)
    ? tenants.find(t => t.slug === tenantSlug || t.id === tenantSlug)
    : null;

  // 2. 만약 tenants 리스트에 없고 아직 단일 조회를 안 했다면 서버 API 직접 조회
  useEffect(() => {
    let isMounted = true;
    if (isTenantsLoaded && !matchedFromList && tenantSlug && !hasDirectSearched) {
      setIsDirectLoading(true);
      tenantAPI.getBySlug(tenantSlug).then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setDirectTenant(res.data);
        } else {
          // id로도 1회 시도
          tenantAPI.getById(tenantSlug).then((resId) => {
            if (!isMounted) return;
            if (resId.success && resId.data) {
              setDirectTenant(resId.data);
            }
            setIsDirectLoading(false);
            setHasDirectSearched(true);
          }).catch(() => {
            if (isMounted) {
              setIsDirectLoading(false);
              setHasDirectSearched(true);
            }
          });
          return;
        }
        setIsDirectLoading(false);
        setHasDirectSearched(true);
      }).catch(() => {
        if (isMounted) {
          setIsDirectLoading(false);
          setHasDirectSearched(true);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isTenantsLoaded, matchedFromList, tenantSlug, hasDirectSearched]);

  const targetTenant = matchedFromList || directTenant;

  useEffect(() => {
    if (targetTenant && targetTenant.id !== currentTenant?.id) {
      setCurrentTenant(targetTenant);
    }
  }, [targetTenant, currentTenant, setCurrentTenant]);

  const { canInstall, install } = useTenantPWA(targetTenant || undefined);
  const [dbItems, setDbItems] = useState<DonationItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (targetTenant) {
      donationItemsAPI.getItems(targetTenant.id).then(async (res) => {
        if (!isMounted) return;
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setDbItems(res.data);
        } else {
          const resSlug = await donationItemsAPI.getItems(targetTenant.slug);
          if (!isMounted) return;
          if (resSlug.success && Array.isArray(resSlug.data) && resSlug.data.length > 0) {
            setDbItems(resSlug.data);
          } else {
            setDbItems([]);
          }
        }
      }).catch(() => {
        if (isMounted) setDbItems([]);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [targetTenant]);

  // 로딩 상태: 전체 테넌트 목록이 아직 로드 중이거나 직접 조회가 진행 중일 때
  if (!isTenantsLoaded || (isDirectLoading && !targetTenant)) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, border: `3px solid #E2E8F0`, borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'monospace' }}>로딩 중...</span>
        </div>
      </div>
    );
  }

  // 테넌트를 찾을 수 없는 경우 (404 UI)
  if (!targetTenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-5">
            <AlertCircle size={32} strokeWidth={2.2} />
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            존재하지 않는 URL입니다
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            요청하신 주소 <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">/{tenantSlug}</span> 에 해당하는 단체 공간을 찾을 수 없습니다. 주소를 다시 확인해 주시거나 새로운 단체 가입을 신청해 주세요.
          </p>

          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={() => navigate('/')}
              className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
            >
              <Home size={15} />
              <span>SoulPay 메인으로 이동</span>
            </button>
            <button
              onClick={() => navigate('/onboarding')}
              className="w-full h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <UserPlus size={15} />
              <span>새 단체 가입신청 하기</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 테넌트가 승인 대기(pending) 상태인 경우 안내
  if (targetTenant.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-5">
            <Clock size={32} strokeWidth={2.2} />
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            개설 심사가 진행 중인 단체입니다
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            <strong className="text-slate-700">{targetTenant.name}</strong> 공간은 현재 관리자 서류 검토 및 개설 승인 대기 중입니다. 승인이 완료되면 정상적으로 헌금함을 이용하실 수 있습니다.
          </p>

          <button
            onClick={() => navigate('/')}
            className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
          >
            <Home size={15} />
            <span>메인으로 이동</span>
          </button>
        </div>
      </div>
    );
  }

  const ft = FAITH_THEMES[targetTenant.religionType as ReligionId] ?? FAITH_THEMES.protestant;
  const allItems: DonationItem[] = dbItems;

  // 템플릿 ID에 따른 분기 렌더링 ('electric-dark' | 'minimal-hero' | 'classic')
  const templateId = targetTenant.templateId || 'classic';

  switch (templateId) {
    case 'electric-dark':
      return (
        <ElectricDarkTemplate
          currentTenant={targetTenant}
          allItems={allItems}
          ft={ft}
          canInstall={canInstall}
          install={install}
        />
      );
    case 'minimal-hero':
      return (
        <MinimalHeroTemplate
          currentTenant={targetTenant}
          allItems={allItems}
          ft={ft}
          canInstall={canInstall}
          install={install}
        />
      );
    case 'classic':
    default:
      return (
        <ClassicTemplate
          currentTenant={targetTenant}
          allItems={allItems}
          ft={ft}
          canInstall={canInstall}
          install={install}
        />
      );
  }
}
