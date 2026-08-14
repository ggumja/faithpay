import { useApp } from '../context/AppContext';

export type PermissionLevel = 'full' | 'read' | 'none';

export function useAdminPermissions() {
  const { currentAdmin, currentTenant } = useApp();

  /**
   * 메뉴 ID별 접근 권한 수준을 반환합니다. ('full' | 'read' | 'none')
   */
  const getMenuPermission = (menuId: string): PermissionLevel => {
    if (!currentAdmin) return 'none';

    // 👑 최고 관리자 (tenant_admin) 및 시스템 관리자 (system_admin)는 모든 메뉴 FULL 권한
    if (currentAdmin.role === 'tenant_admin' || currentAdmin.role === 'system_admin') {
      return 'full';
    }

    if (!currentTenant) return 'full';

    // 해당 단체의 저장된 RBAC 매트릭스 로드
    const tenantId = currentTenant.id;
    const savedPermissionsStr = localStorage.getItem(`faithpay_permissions_${tenantId}`);

    // 사용자 그룹 ID 확인 (개별 스태프에 지정된 groupId 또는 기본 role)
    const userGroupId = (currentAdmin as any).groupId || currentAdmin.role || 'staff';

    if (!savedPermissionsStr) {
      // 저장된 권한 설정이 없는 경우 역할별 표준 기본 권한 적용
      if (userGroupId === 'finance_manager' || currentAdmin.role === 'finance_manager') {
        if (['dashboard', 'donations', 'recurring_pending', 'statistics', 'settlement'].includes(menuId)) {
          return 'full';
        }
        return 'read';
      }
      // 일반 스태프 기본값
      if (['dashboard', 'donations', 'prayers'].includes(menuId)) return 'read';
      if (['accounts', 'settings'].includes(menuId)) return 'none';
      return 'read';
    }

    try {
      const matrix = JSON.parse(savedPermissionsStr);
      if (Array.isArray(matrix)) {
        const menuItem = matrix.find((m: any) => m.id === menuId);
        if (menuItem && menuItem.groupPermissions) {
          const perm = menuItem.groupPermissions[userGroupId];
          if (perm) return perm as PermissionLevel;
        }
      }
    } catch (e) {
      console.error('Failed to parse RBAC permissions matrix', e);
    }

    return 'read';
  };

  /**
   * 메뉴 접근 가능 여부 (read 또는 full 권한 보유)
   */
  const canAccessMenu = (menuId: string): boolean => {
    return getMenuPermission(menuId) !== 'none';
  };

  /**
   * 메뉴 쓰기/수정 권한 보유 여부 (full 권한 보유)
   */
  const canWriteMenu = (menuId: string): boolean => {
    return getMenuPermission(menuId) === 'full';
  };

  return {
    getMenuPermission,
    canAccessMenu,
    canWriteMenu,
    currentAdmin,
  };
}
