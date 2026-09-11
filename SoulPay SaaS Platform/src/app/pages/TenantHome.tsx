import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useApp, DonationItem, Tenant } from '../context/AppContext';
import { donationItemsAPI, tenantAPI, settingsAPI } from '../api/client';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { useTenantPWA } from '../hooks/useTenantPWA';
import { ClassicTemplate } from '../components/templates/ClassicTemplate';
import { ElectricDarkTemplate } from '../components/templates/ElectricDarkTemplate';
import { MinimalHeroTemplate } from '../components/templates/MinimalHeroTemplate';
import { AlertCircle, Home, UserPlus, Clock } from 'lucide-react';

export default function TenantHome() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetItemParam = searchParams.get('item') || searchParams.get('itemId');
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

  const { canInstall, hasNativePrompt, install } = useTenantPWA(targetTenant || undefined);
  const [dbItems, setDbItems] = useState<DonationItem[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState<boolean>(Boolean(targetItemParam));

  // 전체 공지 & 결제 점검 모드 상태 (실제 DB system_settings 연동)
  const [broadcastNotice, setBroadcastNotice] = useState<{
    id: string;
    title: string;
    content: string;
    noticeType: 'info' | 'warning' | 'urgent';
    isMaintenanceMode: boolean;
    isActive: boolean;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    settingsAPI.get('global_broadcast_notice')
      .then((res: any) => {
        if (!isMounted) return;
        const raw = res?.data ?? res?.value ?? res;
        const notice = (raw && typeof raw === 'object' && raw.value && typeof raw.value === 'object') ? raw.value : raw;
        if (notice && notice.isActive) {
          setBroadcastNotice(notice);
        } else {
          setBroadcastNotice(null);
        }
      })
      .catch((err) => {
        console.warn('Failed to load global broadcast notice:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const isMaintenance = Boolean(broadcastNotice?.isActive && broadcastNotice?.isMaintenanceMode);

  useEffect(() => {
    let isMounted = true;
    if (targetTenant) {
      if (targetItemParam) setIsItemsLoading(true);
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
        if (isMounted) setIsItemsLoading(false);
      }).catch(() => {
        if (isMounted) {
          setDbItems([]);
          setIsItemsLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [targetTenant, targetItemParam]);

  // 특정 항목 바로가기 (QR 코드 또는 ?item= / ?itemId= 쿼리 파라미터 진입 시 해당 헌금/보시 입력창으로 직행)
  useEffect(() => {
    if (!targetItemParam || !targetTenant || dbItems.length === 0) return;

    const trimmedParam = targetItemParam.trim();
    const matchedItem = dbItems.find(
      (i) =>
        i.id === trimmedParam ||
        i.id.toLowerCase() === trimmedParam.toLowerCase() ||
        i.name === trimmedParam ||
        i.name.trim() === decodeURIComponent(trimmedParam).trim()
    );

    if (matchedItem) {
      navigate(`/${targetTenant.slug}/donate?item=${encodeURIComponent(matchedItem.id)}`, {
        state: { selectedItem: matchedItem },
        replace: true,
      });
    }
  }, [targetItemParam, targetTenant, dbItems, navigate]);

  // 로딩 상태: 전체 테넌트 목록이 아직 로드 중이거나 직접 조회가 진행 중일 때, 또는 특정 항목 바로가기 파라미터가 있어 항목 매칭 대기 중일 때
  if (!isTenantsLoaded || (isDirectLoading && !targetTenant) || (targetItemParam && isItemsLoading)) {
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
            요청하신 단체를 찾을 수 없습니다
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            주소가 잘못되었거나 등록되지 않은 단체 공간입니다.<br />
            영문 식별자(Slug) 또는 링크를 다시 한번 확인해 주세요.
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

  const renderTemplateContent = () => {
    switch (templateId) {
      case 'electric-dark':
        return (
          <ElectricDarkTemplate
            currentTenant={targetTenant}
            allItems={allItems}
            ft={ft}
            canInstall={canInstall}
            hasNativePrompt={hasNativePrompt}
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
            hasNativePrompt={hasNativePrompt}
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
            hasNativePrompt={hasNativePrompt}
            install={install}
          />
        );
    }
  };

  return (
    <>
      {isMaintenance && (
        <div className="bg-rose-600 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <AlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
          <span>[시스템 점검 안내] {broadcastNotice?.title || '결제 시스템 정기 점검이 진행 중입니다.'} (전자결제가 일시 중단됩니다)</span>
        </div>
      )}
      {renderTemplateContent()}
    </>
  );

}
