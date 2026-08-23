import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useApp, DonationItem } from '../context/AppContext';
import { donationItemsAPI } from '../api/client';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { useTenantPWA } from '../hooks/useTenantPWA';
import { ClassicTemplate } from '../components/templates/ClassicTemplate';
import { ElectricDarkTemplate } from '../components/templates/ElectricDarkTemplate';
import { MinimalHeroTemplate } from '../components/templates/MinimalHeroTemplate';

export default function TenantHome() {
  const { tenantSlug } = useParams();
  const { tenants, currentTenant, setCurrentTenant, getTenantDonationItems } = useApp();

  // URL 파라미터(tenantSlug)에 기반하여 타겟 단체를 동기적으로 즉시 도출
  const targetTenant = (tenants && tenants.length > 0)
    ? (tenants.find(t => t.slug === tenantSlug || t.id === tenantSlug) || (currentTenant?.slug === tenantSlug ? currentTenant : tenants[0]))
    : currentTenant;

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

  if (!targetTenant) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, border: `3px solid #E2E8F0`, borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'monospace' }}>로딩 중...</span>
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
