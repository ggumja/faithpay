import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { Menu, UserCheck, UserPlus, Shield, KeyRound, Lock, Unlock, Trash2, Mail, Phone, Save, ShieldCheck, Users, Plus, Edit2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useTenantTerms } from '../../hooks/useTenantTerms';
import { RBACRouteGuard } from '../../components/RBACRouteGuard';
import { adminAPI } from '../../api/client';

export interface AdminGroup {
  id: string;
  name: string;
  description: string;
  isSystemGroup: boolean; // System groups like 'tenant_admin' cannot be deleted
  badgeColor: string;
}

export interface StaffAdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  groupId: string; // References AdminGroup.id
  status: 'active' | 'locked';
  createdAt: string;
  lastLoginAt?: string;
  password?: string;
}

export type PermissionLevel = 'full' | 'read' | 'none';

export interface MenuPermissionItem {
  id: string;
  menuName: string;
  path: string;
  groupPermissions: Record<string, PermissionLevel>; // groupId -> PermissionLevel
}

/**
 * 숫지만 추출하여 저장용으로 반환 (예: "010-1234-5678" -> "01012345678")
 */
export const stripPhoneDigits = (phone: string): string => {
  return phone.replace(/[^0-9]/g, '');
};

/**
 * 한국 전화번호 자동 하이픈 포맷터 (입력창 및 화면 표출용)
 * 010-1234-5678, 02-1234-5678, 031-123-4567 등 대응
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone || phone === '미입력') return phone || '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return phone;

  if (digits.startsWith('02')) {
    // 서울 지역번호 (02)
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  // 대표번호 1588, 1600 등 (8자리)
  if (digits.length === 8 && (digits.startsWith('15') || digits.startsWith('16') || digits.startsWith('18'))) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  // 일반 휴대폰 (010...) 및 지역번호 (031, 042...)
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
};

export default function AdminAccountManagement() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();
  const terms = useTenantTerms(currentTenant?.orgType);

  const [activeTab, setActiveTab] = useState<'accounts' | 'groups' | 'permissions'>('accounts');
  
  // 👥 관리자 그룹 (Roles/Groups) State
  const [adminGroups, setAdminGroups] = useState<AdminGroup[]>([
    { id: 'tenant_admin', name: '👑 최고 관리자', description: '단체 모든 설정 및 결제/정산 최종 권한 보유', isSystemGroup: true, badgeColor: 'purple' },
    { id: 'finance_manager', name: '💳 재정/보시 담당자', description: '수납 내역, 정기결제 및 마감 통계 전용 관리', isSystemGroup: true, badgeColor: 'blue' },
    { id: 'staff', name: '📝 일반 실무자', description: '후원 내역 및 지향문/기도문 조회 전용', isSystemGroup: true, badgeColor: 'slate' },
  ]);

  // 👤 스태프 사용자 목록 State
  const [staffList, setStaffList] = useState<StaffAdminUser[]>([]);

  // 🛡️ RBAC 권한 매트릭스 State
  const [permissionMatrix, setPermissionMatrix] = useState<MenuPermissionItem[]>([]);

  // Modal States
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffAdminUser | null>(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null);

  // New Staff Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('finance_manager');

  // Edit Staff Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGroupId, setEditGroupId] = useState('finance_manager');

  // Group Form State
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupColor, setGroupColor] = useState('emerald');
  const [groupMenuPermissions, setGroupMenuPermissions] = useState<Record<string, PermissionLevel>>({});

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);

      // 1. 저장된 관리자 그룹 로드
      const savedGroups = localStorage.getItem(`faithpay_groups_${tenant.id}`);
      if (savedGroups) {
        try { setAdminGroups(JSON.parse(savedGroups)); } catch {}
      }

      // 2. Supabase 백엔드 DB에서 실제 관리자 계정 목록 실측 조회 (GET /admin)
      adminAPI.getAll().then((res) => {
        let dbStaff: StaffAdminUser[] = [];

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          dbStaff = res.data
            .filter((a: any) => a && (a.tenantId === tenant.id || (a.email && tenant.contact?.email && a.email.toLowerCase() === tenant.contact.email.toLowerCase())))
            .map((a: any) => ({
              id: a.id || `admin-${tenant.id}`,
              name: a.name || tenant.contact?.name || tenant.name,
              email: a.email,
              phone: a.phone || tenant.contact?.phone || '',
              groupId: a.groupId || 'tenant_admin',
              status: (a.status as any) || 'active',
              createdAt: a.createdAt ? a.createdAt.slice(0, 10) : (tenant.appliedAt ? tenant.appliedAt.slice(0, 10) : ''),
              lastLoginAt: a.lastLoginAt ? a.lastLoginAt.slice(0, 10) : '',
            }));
        }

        if (dbStaff.length > 0) {
          setStaffList(dbStaff);
          return;
        }

        // DB /tenants 테이블에 실재하는 등록 담당자 정보만 렌더링 (가상/더미 계정 0%)
        const registeredEmail = tenant.contact?.email ? tenant.contact.email.trim().toLowerCase() : '';
        const registeredName = tenant.contact?.name;

        if (registeredEmail && registeredName) {
          const primaryAccount: StaffAdminUser = {
            id: `admin-${tenant.id}`,
            name: registeredName,
            email: registeredEmail,
            phone: tenant.contact?.phone || '',
            groupId: 'tenant_admin',
            password: tenant.tempPassword || 'admin1234!',
            status: 'active',
            createdAt: tenant.appliedAt ? tenant.appliedAt.slice(0, 10) : '',
            lastLoginAt: tenant.appliedAt ? tenant.appliedAt.slice(0, 10) : '',
          };
          setStaffList([primaryAccount]);
        } else {
          setStaffList([]);
        }
      }).catch(() => {
        const registeredEmail = tenant.contact?.email ? tenant.contact.email.trim().toLowerCase() : '';
        const registeredName = tenant.contact?.name;

        if (registeredEmail && registeredName) {
          const primaryAccount: StaffAdminUser = {
            id: `admin-${tenant.id}`,
            name: registeredName,
            email: registeredEmail,
            phone: tenant.contact?.phone || '',
            groupId: 'tenant_admin',
            password: tenant.tempPassword || 'admin1234!',
            status: 'active',
            createdAt: tenant.appliedAt ? tenant.appliedAt.slice(0, 10) : '',
            lastLoginAt: tenant.appliedAt ? tenant.appliedAt.slice(0, 10) : '',
          };
          setStaffList([primaryAccount]);
        } else {
          setStaffList([]);
        }
      });

      // 3. 저장된 권한 매트릭스 로드
      const savedPerms = localStorage.getItem(`faithpay_permissions_${tenant.id}`);
      if (savedPerms) {
        try {
          const parsed = JSON.parse(savedPerms);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPermissionMatrix(parsed);
          }
        } catch {}
      } else {
        setPermissionMatrix([
          { id: 'dashboard', menuName: '대시보드', path: '/admin', groupPermissions: { tenant_admin: 'full', finance_manager: 'full', staff: 'read' } },
          { id: 'donations', menuName: '수납/보시 내역', path: '/admin/donations', groupPermissions: { tenant_admin: 'full', finance_manager: 'full', staff: 'read' } },
          { id: 'recurring_pending', menuName: '정기결제 마감', path: '/admin/recurring-pending', groupPermissions: { tenant_admin: 'full', finance_manager: 'full', staff: 'none' } },
          { id: 'statistics', menuName: '마감 통계', path: '/admin/statistics', groupPermissions: { tenant_admin: 'full', finance_manager: 'full', staff: 'none' } },
          { id: 'prayers', menuName: '지향문/축원', path: '/admin/prayers', groupPermissions: { tenant_admin: 'full', finance_manager: 'read', staff: 'full' } },
          { id: 'menu', menuName: '수납 항목 관리', path: '/admin/menu', groupPermissions: { tenant_admin: 'full', finance_manager: 'read', staff: 'none' } },
          { id: 'members', menuName: '회원 관리', path: '/admin/members', groupPermissions: { tenant_admin: 'full', finance_manager: 'read', staff: 'read' } },
          { id: 'settlement', menuName: '정산', path: '/admin/settlement', groupPermissions: { tenant_admin: 'full', finance_manager: 'full', staff: 'none' } },
          { id: 'banners', menuName: '배너 관리', path: '/admin/banners', groupPermissions: { tenant_admin: 'full', finance_manager: 'none', staff: 'none' } },
          { id: 'accounts', menuName: '관리자 계정 관리', path: '/admin/accounts', groupPermissions: { tenant_admin: 'full', finance_manager: 'none', staff: 'none' } },
          { id: 'settings', menuName: '설정', path: '/admin/settings', groupPermissions: { tenant_admin: 'full', finance_manager: 'none', staff: 'none' } },
        ]);
      }
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  // 💾 관리자 계정 정보 영구 보존 동기화
  useEffect(() => {
    if (currentTenant && staffList.length > 0) {
      localStorage.setItem(`soulpay_staff_${currentTenant.id}`, JSON.stringify(staffList));
      localStorage.setItem(`soulpay_staff_accounts_${currentTenant.id}`, JSON.stringify(staffList));
    }
  }, [staffList, currentTenant]);

  useEffect(() => {
    if (currentTenant && adminGroups.length > 0) {
      localStorage.setItem(`faithpay_groups_${currentTenant.id}`, JSON.stringify(adminGroups));
    }
  }, [adminGroups, currentTenant]);

  useEffect(() => {
    if (currentTenant && permissionMatrix.length > 0) {
      localStorage.setItem(`faithpay_permissions_${currentTenant.id}`, JSON.stringify(permissionMatrix));
    }
  }, [permissionMatrix, currentTenant]);
  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">단체 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  const isAuthorized = currentAdmin && (currentAdmin.role === 'tenant_admin' || currentAdmin.role === 'system_admin');
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>이 페이지는 단체 관리자 및 최고 관리자만 접근할 수 있습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentPath = `/${tenantSlug}/admin/accounts`;

  const renderGroupBadge = (groupId: string) => {
    const group = adminGroups.find((g) => g.id === groupId);
    if (!group) return <Badge variant="outline">미지정</Badge>;

    const colorClasses: Record<string, string> = {
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 font-bold',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 font-bold',
      slate: 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200',
      emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 font-bold',
      amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 font-bold',
      rose: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 font-bold',
    };

    return (
      <Badge className={colorClasses[group.badgeColor] || colorClasses.slate}>
        {group.name}
      </Badge>
    );
  };

  // 👥 그룹 추가/수정 처리 핸들러 (모달 내 메뉴 접근 권한 동시 설정)
  const handleOpenGroupModal = (groupToEdit?: AdminGroup) => {
    const initialPerms: Record<string, PermissionLevel> = {};

    permissionMatrix.forEach((menu) => {
      if (groupToEdit) {
        initialPerms[menu.id] = menu.groupPermissions[groupToEdit.id] || 'none';
      } else {
        // 신규 그룹 생성 시 기본 권한 설정 (대시보드는 전체, 나머지는 필요에 따라 선택)
        initialPerms[menu.id] = menu.id === 'dashboard' ? 'full' : menu.id === 'donations' ? 'read' : 'none';
      }
    });

    setGroupMenuPermissions(initialPerms);

    if (groupToEdit) {
      setEditingGroup(groupToEdit);
      setGroupName(groupToEdit.name);
      setGroupDesc(groupToEdit.description);
      setGroupColor(groupToEdit.badgeColor);
    } else {
      setEditingGroup(null);
      setGroupName('');
      setGroupDesc('');
      setGroupColor('emerald');
    }
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = () => {
    if (!groupName.trim()) {
      toast.error('관리자 그룹명을 입력해 주세요.');
      return;
    }

    const groupId = editingGroup ? editingGroup.id : `group_${Date.now()}`;

    if (editingGroup) {
      setAdminGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroup.id
            ? { ...g, name: groupName.trim(), description: groupDesc.trim(), badgeColor: groupColor }
            : g
        )
      );
    } else {
      const newGroup: AdminGroup = {
        id: groupId,
        name: groupName.trim(),
        description: groupDesc.trim() || '커스텀 관리자 그룹',
        isSystemGroup: false,
        badgeColor: groupColor,
      };
      setAdminGroups((prev) => [...prev, newGroup]);
    }

    // 🛡️ 모달에서 선택한 메뉴별 접근 권한(Checkboxes)을 매트릭스에 100% 저장
    setPermissionMatrix((prev) =>
      prev.map((item) => ({
        ...item,
        groupPermissions: {
          ...item.groupPermissions,
          [groupId]: groupMenuPermissions[item.id] || 'none',
        },
      }))
    );

    toast.success(editingGroup ? `[${groupName.trim()}] 권한 그룹 및 메뉴 설정이 수정되었습니다.` : `[${groupName.trim()}] 신규 권한 그룹 및 메뉴 접근 권한이 등록되었습니다.`);
    setIsGroupModalOpen(false);
  };

  const handleDeleteGroup = (groupId: string, name: string) => {
    const assignedCount = staffList.filter((s) => s.groupId === groupId).length;
    if (assignedCount > 0) {
      toast.error(`해당 그룹에 ${assignedCount}명의 계정이 등록되어 있어 삭제할 수 없습니다. 계정 그룹을 변경해 주세요.`);
      return;
    }

    if (confirm(`정말로 [${name}] 관리자 그룹을 삭제하시겠습니까?`)) {
      setAdminGroups((prev) => prev.filter((g) => g.id !== groupId));
      toast.success(`[${name}] 그룹이 삭제되었습니다.`);
    }
  };

  // 👤 스태프 계정 추가
  const handleAddStaff = () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('성명, 이메일, 비밀번호를 모두 입력해 주세요');
      return;
    }

    const cleanEmail = newEmail.trim().toLowerCase();
    
    // 1. 동일 단체 내 이메일 중복만 체크
    if (staffList.some((s) => s.email.toLowerCase() === cleanEmail)) {
      toast.error(`'${cleanEmail}' 이메일은 이미 본 단체에 등록된 관리자 계정입니다.`);
      return;
    }

    // 2. 다른 단체(Cross-Tenant) 등록 여부 체크 (허용 및 통합 가이드 제공)
    const otherTenantWithSameEmail = tenants.find(
      (t) => t.id !== currentTenant.id && t.contact?.email?.toLowerCase() === cleanEmail
    );

    const newStaff: StaffAdminUser = {
      id: `staff_${Date.now()}`,
      name: newName.trim(),
      email: cleanEmail,
      phone: stripPhoneDigits(newPhone) || '미입력',
      groupId: selectedGroupId,
      password: newPassword.trim() || 'admin1234!',
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      lastLoginAt: '방금 생성됨',
    };

    setStaffList((prev) => [...prev, newStaff]);
    setIsAddStaffModalOpen(false);

    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setSelectedGroupId('finance_manager');

    toast.success(`[${newStaff.name}] 신규 관리자 계정이 성공적으로 추가되었습니다.`);
  };

  // ✏️ 스태프 계정 정보 수정
  const handleOpenEditStaffModal = (staff: StaffAdminUser) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditPhone(formatPhoneNumber(staff.phone));
    setEditGroupId(staff.groupId || 'tenant_admin');
    setIsEditStaffModalOpen(true);
  };

  const handleSaveEditStaff = () => {
    if (!editingStaff) return;
    if (!editName.trim() || !editEmail.trim()) {
      toast.error('성명과 이메일을 입력해 주세요');
      return;
    }

    const cleanEmail = editEmail.trim().toLowerCase();

    // 1. 현재 단체 내 다른 관리자 이메일 중복 체크
    if (staffList.some((s) => s.id !== editingStaff.id && s.email.toLowerCase() === cleanEmail)) {
      toast.error(`'${cleanEmail}' 이메일은 이미 본 단체에 등록된 다른 관리자의 이메일입니다.`);
      return;
    }

    setStaffList((prev) =>
      prev.map((s) =>
        s.id === editingStaff.id
          ? {
              ...s,
              name: editName.trim(),
              email: cleanEmail,
              phone: stripPhoneDigits(editPhone) || '미입력',
              groupId: editGroupId,
            }
          : s
      )
    );

    setIsEditStaffModalOpen(false);
    toast.success(`[${editName.trim()}] 관리자 계정 정보가 성공적으로 수정되었습니다.`);
  };

  const handleToggleStatus = (id: string) => {
    setStaffList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'active' ? 'locked' : 'active';
          toast.info(`[${item.name}] 계정이 ${nextStatus === 'active' ? '잠금 해제' : '일시 잠금'}되었습니다.`);
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const handleResetPassword = (staff: StaffAdminUser) => {
    const defaultPw = 'admin1234!';
    setStaffList((prev) =>
      prev.map((s) => (s.id === staff.id ? { ...s, password: defaultPw } : s))
    );
    toast.success(`[${staff.name}] 계정 비밀번호가 '${defaultPw}'로 초기화되었습니다.`);
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (staffList.length <= 1) {
      toast.error('최소 1개 이상의 최고 관리자 계정이 유지되어야 합니다.');
      return;
    }
    if (confirm(`정말로 [${name}] 관리자 계정을 삭제하시겠습니까?`)) {
      setStaffList((prev) => prev.filter((item) => item.id !== id));
      toast.success(`[${name}] 계정이 삭제되었습니다.`);
    }
  };

  // RBAC 권한 토글 핸들러
  const handlePermissionChange = (menuId: string, groupId: string, level: PermissionLevel) => {
    setPermissionMatrix((prev) =>
      prev.map((item) =>
        item.id === menuId
          ? {
              ...item,
              groupPermissions: {
                ...item.groupPermissions,
                [groupId]: level,
              },
            }
          : item
      )
    );
  };

  const handleSavePermissions = () => {
    toast.success('모든 관리자 그룹의 메뉴 접근 권한 설정이 성공적으로 저장되었습니다!');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-auto">
        <RBACRouteGuard menuId="accounts">
          <div className="p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="h-7 w-7 text-indigo-600" />
                관리자 계정 및 그룹 권한 센터
              </h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                {currentTenant.name}의 관리자 계정 정보/그룹을 관리하고 메뉴별 접근 권한을 설정합니다.
              </p>
            </div>

            {activeTab === 'accounts' ? (
              <Button
                onClick={() => setIsAddStaffModalOpen(true)}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer self-start md:self-auto"
              >
                <UserPlus className="h-4 w-4" />
                신규 관리자 추가
              </Button>
            ) : (
              <Button
                onClick={() => handleOpenGroupModal()}
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer self-start md:self-auto"
              >
                <Plus className="h-4 w-4" />
                신규 관리자 그룹 추가
              </Button>
            )}
          </div>

          {/* Sub Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full max-w-xl bg-slate-200 dark:bg-zinc-800 p-1">
              <TabsTrigger value="accounts" className="gap-2 font-bold cursor-pointer text-xs sm:text-sm">
                <UserCheck className="h-4 w-4" />
                1. 관리자 계정 목록 ({staffList.length}명)
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2 font-bold cursor-pointer text-xs sm:text-sm">
                <Layers className="h-4 w-4" />
                2. 관리자 권한 그룹 및 메뉴 설정 ({adminGroups.length}개)
              </TabsTrigger>
            </TabsList>

            {/* 📌 TAB 1: 관리자 계정 목록 */}
            <TabsContent value="accounts" className="space-y-6 mt-6">
              {/* Stats Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      전체 관리자 계정
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-slate-900 dark:text-zinc-100">
                      {staffList.length}명
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      정상 활성 계정
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {staffList.filter((s) => s.status === 'active').length}명
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      등록된 관리자 그룹
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                      {adminGroups.length}개 그룹
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Staff List Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">
                    등록된 관리자 계정 목록 ({staffList.length}명)
                  </CardTitle>
                  <CardDescription>
                    소속된 관리자 그룹에 따라 수납 조회, 정산, 항목 등록 등 접근 가능한 기능이 자동 적용됩니다.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>성명</TableHead>
                        <TableHead>이메일 ID</TableHead>
                        <TableHead>연락처</TableHead>
                        <TableHead>소속 관리자 그룹</TableHead>
                        <TableHead>계정 상태</TableHead>
                        <TableHead>최근 접속일시</TableHead>
                        <TableHead className="text-right">계정 관리 작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffList.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="font-bold text-slate-900 dark:text-zinc-100">
                            {staff.name}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700 dark:text-zinc-300">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              {staff.email}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs font-mono">
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              {formatPhoneNumber(staff.phone)}
                            </div>
                          </TableCell>
                          <TableCell>{renderGroupBadge(staff.groupId)}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                staff.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px]'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[11px]'
                              }
                            >
                              {staff.status === 'active' ? '🟢 정상' : '🔴 잠금'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-mono">
                            {staff.lastLoginAt || '기록 없음'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                title="계정 정보 수정"
                                onClick={() => handleOpenEditStaffModal(staff)}
                                className="h-7 px-2 text-xs gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 font-semibold"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-indigo-600" />
                                정보수정
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                title="비밀번호 재설정"
                                onClick={() => handleResetPassword(staff)}
                                className="h-7 px-2 text-xs gap-1 cursor-pointer"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                                비번재설정
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={staff.status === 'active' ? '계정 잠금' : '잠금 해제'}
                                onClick={() => handleToggleStatus(staff.id)}
                                className="h-7 w-7 p-0 cursor-pointer"
                              >
                                {staff.status === 'active' ? (
                                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                                ) : (
                                  <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="계정 삭제"
                                onClick={() => handleDeleteStaff(staff.id, staff.name)}
                                className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 👥 TAB 2: 관리자 그룹 관리 (추가/수정/삭제) */}
            <TabsContent value="groups" className="space-y-6 mt-6">
              <Card className="border-purple-100 dark:border-purple-950">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Layers className="h-5 w-5 text-purple-600" />
                      관리자 그룹 정의 및 커스텀 관리 ({adminGroups.length}개 그룹)
                    </CardTitle>
                    <CardDescription className="mt-1">
                      단체 실무 구조에 맞춰 새로운 관리자 그룹(예: 축원 전담팀, 감사팀 등)을 자유롭게 추가 및 수정할 수 있습니다.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100 dark:bg-zinc-900">
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">그룹 배지</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">그룹명</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">그룹 설명 및 역할</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">허용 메뉴 및 권한 요약</TableHead>
                        <TableHead className="text-center font-bold text-slate-900 dark:text-zinc-100">소속 인원</TableHead>
                        <TableHead className="text-center font-bold text-slate-900 dark:text-zinc-100">구분</TableHead>
                        <TableHead className="text-right font-bold text-slate-900 dark:text-zinc-100">그룹 작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminGroups.map((group) => {
                        const assignedCount = staffList.filter((s) => s.groupId === group.id).length;
                        const allowedMenus = permissionMatrix.filter(m => (m.groupPermissions[group.id] || 'none') !== 'none');
                        return (
                          <TableRow key={group.id}>
                            <TableCell>{renderGroupBadge(group.id)}</TableCell>
                            <TableCell className="font-bold text-slate-900 dark:text-zinc-100">
                              {group.name}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-zinc-400">
                              {group.description}
                            </TableCell>
                            <TableCell className="max-w-[280px]">
                              <div className="flex flex-wrap gap-1">
                                {group.id === 'tenant_admin' ? (
                                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 text-[10px] font-bold border-purple-300">
                                    ⚡ 전체 11개 메뉴 (FULL 권한)
                                  </Badge>
                                ) : allowedMenus.length === 0 ? (
                                  <Badge variant="outline" className="text-[10px] text-slate-400">접근 허용 메뉴 없음</Badge>
                                ) : (
                                  allowedMenus.map(m => (
                                    <Badge key={m.id} variant="outline" className="text-[10px] bg-slate-50 dark:bg-zinc-800 font-medium">
                                      {m.menuName} ({(m.groupPermissions[group.id] === 'full' ? '전체' : '조회')})
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold text-slate-800 dark:text-zinc-200">
                              {assignedCount}명
                            </TableCell>
                            <TableCell className="text-center">
                              {group.isSystemGroup ? (
                                <Badge variant="secondary" className="text-[10px]">기본 그룹</Badge>
                              ) : (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">커스텀 그룹</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenGroupModal(group)}
                                  className="h-7 px-2 text-xs gap-1 cursor-pointer font-bold"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  그룹 및 권한 수정
                                </Button>
                                {!group.isSystemGroup && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteGroup(group.id, group.name)}
                                    className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </RBACRouteGuard>
    </div>

      {/* 1. 신규 관리자 계정 추가 모달 */}
      <Dialog open={isAddStaffModalOpen} onOpenChange={setIsAddStaffModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              신규 관리자 계정 등록
            </DialogTitle>
            <DialogDescription>
              단체 실무자에게 부여할 계정 정보와 소속 관리자 그룹을 선택하세요.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleAddStaff(); }} autoComplete="off" className="space-y-4 py-3">
            <input type="text" name="prevent_autofill_email" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
            <input type="password" name="prevent_autofill_pwd" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">성명 (이름) *</Label>
              <Input
                placeholder="예: 홍길동 실무관"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoComplete="off"
                name="staff_name_no_fill"
                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl h-10 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">이메일 (로그인 ID) *</Label>
              <Input
                type="email"
                placeholder="example@organization.or.kr"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="off"
                aria-autocomplete="none"
                name="staff_email_no_fill"
                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl h-10 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">휴대폰 번호</Label>
              <Input
                type="tel"
                placeholder="010-0000-0000"
                value={newPhone}
                onChange={(e) => setNewPhone(formatPhoneNumber(e.target.value))}
                autoComplete="off"
                aria-autocomplete="none"
                name="staff_phone_no_fill"
                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl h-10 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">초기 임시 비밀번호 *</Label>
              <Input
                type="password"
                placeholder="초기 비밀번호 입력"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                aria-autocomplete="none"
                name="staff_pwd_no_fill"
                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl h-10 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">소속 관리자 그룹 *</Label>
              <Select value={selectedGroupId} onValueChange={(val) => setSelectedGroupId(val)}>
                <SelectTrigger className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl h-10 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adminGroups.map((group) => {
                    const allowedCount = permissionMatrix.filter(m => (m.groupPermissions[group.id] || 'none') !== 'none').length;
                    return (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} - {group.description}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedGroupId && (
                <div className="p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] text-slate-600 dark:text-zinc-400">
                  <span className="font-bold text-slate-800 dark:text-zinc-200 block mb-1">
                    🛡️ 선택된 그룹 허용 메뉴 ({permissionMatrix.filter(m => (m.groupPermissions[selectedGroupId] || 'none') !== 'none').length}개):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {permissionMatrix.filter(m => (m.groupPermissions[selectedGroupId] || 'none') !== 'none').map(m => (
                      <Badge key={m.id} variant="outline" className="text-[10px] bg-white dark:bg-zinc-800 font-semibold">
                        {m.menuName} ({(m.groupPermissions[selectedGroupId] === 'full' ? '전체' : '조회')})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStaffModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddStaff} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              계정 생성 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. 관리자 계정 정보 수정 모달 */}
      <Dialog open={isEditStaffModalOpen} onOpenChange={setIsEditStaffModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-indigo-600" />
              관리자 계정 정보 수정
            </DialogTitle>
            <DialogDescription>
              선택한 관리자 계정의 이름, 이메일, 연락처 및 소속 그룹을 변경합니다.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveEditStaff(); }} autoComplete="off" className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">성명 (이름) *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="성명 입력"
                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl h-10 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">이메일 (로그인 ID) *</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="이메일 주소 입력"
                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl h-10 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">휴대폰 번호</Label>
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
                placeholder="010-0000-0000"
                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl h-10 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">소속 관리자 그룹 변경 *</Label>
              <Select value={editGroupId} onValueChange={(val) => setEditGroupId(val)}>
                <SelectTrigger className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl h-10 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adminGroups.map((group) => {
                    const allowedCount = permissionMatrix.filter(m => (m.groupPermissions[group.id] || 'none') !== 'none').length;
                    return (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} - {group.description}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {editGroupId && (
                <div className="p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] text-slate-600 dark:text-zinc-400">
                  <span className="font-bold text-slate-800 dark:text-zinc-200 block mb-1">
                    🛡️ 변경된 그룹 허용 메뉴 ({permissionMatrix.filter(m => (m.groupPermissions[editGroupId] || 'none') !== 'none').length}개):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {permissionMatrix.filter(m => (m.groupPermissions[editGroupId] || 'none') !== 'none').map(m => (
                      <Badge key={m.id} variant="outline" className="text-[10px] bg-white dark:bg-zinc-800 font-semibold">
                        {m.menuName} ({(m.groupPermissions[editGroupId] === 'full' ? '전체' : '조회')})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStaffModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveEditStaff} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              수정 사항 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. 관리자 그룹 추가/수정 모달 (메뉴 접근 권한 체크박스 동시 설정) */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-zinc-100">
              <Layers className="h-5 w-5 text-purple-600" />
              {editingGroup ? '관리자 그룹 및 메뉴 권한 수정' : '신규 관리자 권한 그룹 생성'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              그룹명과 설명을 입력하고 아래에서 접근을 허용할 메뉴 권한을 직접 체크하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">관리자 그룹명 *</Label>
                <Input
                  placeholder="예: 축원 전담팀 / 부목사 그룹"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="bg-white dark:bg-zinc-900 font-semibold text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">그룹 배지 색상</Label>
                <Select value={groupColor} onValueChange={(val) => setGroupColor(val)}>
                  <SelectTrigger className="bg-white dark:bg-zinc-900 text-xs font-semibold h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emerald">🟢 에메랄드 그린</SelectItem>
                    <SelectItem value="blue">🔵 블루</SelectItem>
                    <SelectItem value="purple">🟣 퍼플</SelectItem>
                    <SelectItem value="amber">🟠 앰버 주황</SelectItem>
                    <SelectItem value="rose">🔴 로즈 핑크</SelectItem>
                    <SelectItem value="slate">⚪ 슬레이트 그레이</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">그룹 역할 설명</Label>
              <Input
                placeholder="예: 사찰 발원문 및 성당 지향문 전담 관리 그룹"
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                className="bg-white dark:bg-zinc-900 text-xs h-10"
              />
            </div>

            {/* 🛡️ 메뉴 접근 권한 체크박스 설정 */}
            <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-purple-600" />
                  메뉴 접근 권한 체크박스 설정 ({permissionMatrix.length}개 메뉴)
                </Label>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-purple-700 hover:text-purple-900 p-1 cursor-pointer font-bold"
                    onClick={() => {
                      const allFull: Record<string, PermissionLevel> = {};
                      permissionMatrix.forEach(m => allFull[m.id] = 'full');
                      setGroupMenuPermissions(allFull);
                    }}
                  >
                    ⚡ 전체 허용
                  </Button>
                  <span>|</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-slate-500 hover:text-slate-700 p-1 cursor-pointer font-bold"
                    onClick={() => {
                      const allNone: Record<string, PermissionLevel> = {};
                      permissionMatrix.forEach(m => allNone[m.id] = 'none');
                      setGroupMenuPermissions(allNone);
                    }}
                  >
                    🚫 전체 차단
                  </Button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900 text-xs">
                {permissionMatrix.map((menu) => {
                  const currentLevel = groupMenuPermissions[menu.id] || 'none';
                  return (
                    <div key={menu.id} className="p-2.5 sm:p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">{menu.menuName}</span>
                        <span className="text-[11px] text-slate-400 font-mono ml-2">({menu.path})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="radio"
                            name={`perm_${menu.id}`}
                            checked={currentLevel === 'full'}
                            onChange={() => setGroupMenuPermissions(prev => ({ ...prev, [menu.id]: 'full' }))}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-purple-700 dark:text-purple-300 font-bold text-[11px]">🟢 전체</span>
                        </label>

                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="radio"
                            name={`perm_${menu.id}`}
                            checked={currentLevel === 'read'}
                            onChange={() => setGroupMenuPermissions(prev => ({ ...prev, [menu.id]: 'read' }))}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-amber-700 dark:text-amber-300 font-medium text-[11px]">🟡 읽기</span>
                        </label>

                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="radio"
                            name={`perm_${menu.id}`}
                            checked={currentLevel === 'none'}
                            onChange={() => setGroupMenuPermissions(prev => ({ ...prev, [menu.id]: 'none' }))}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-slate-400 dark:text-zinc-500 font-medium text-[11px]">🔴 차단</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveGroup} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
              {editingGroup ? '권한 수정 완료' : '그룹 및 권한 등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
