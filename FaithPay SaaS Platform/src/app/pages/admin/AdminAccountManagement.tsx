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
}

export type PermissionLevel = 'full' | 'read' | 'none';

export interface MenuPermissionItem {
  id: string;
  menuName: string;
  path: string;
  groupPermissions: Record<string, PermissionLevel>; // groupId -> PermissionLevel
}

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

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);

      // 모의 스태프 관리자 초기 데이터
      const initialStaff: StaffAdminUser[] = [
        {
          id: `admin-${tenant.id}-1`,
          name: tenant.contact?.name || '담임목사 / 주지스님',
          email: tenant.contact?.email || `admin@${tenant.slug}.or.kr`,
          phone: tenant.contact?.phone || '010-1234-5678',
          groupId: 'tenant_admin',
          status: 'active',
          createdAt: tenant.appliedAt ? tenant.appliedAt.slice(0, 10) : '2026-01-15',
          lastLoginAt: '2026-08-13 11:45',
        },
        {
          id: `admin-${tenant.id}-2`,
          name: '재무/보시 실무 담당자',
          email: `finance@${tenant.slug}.or.kr`,
          phone: '010-9876-5432',
          groupId: 'finance_manager',
          status: 'active',
          createdAt: '2026-02-01',
          lastLoginAt: '2026-08-12 16:20',
        },
      ];
      setStaffList(initialStaff);

      // 메뉴별 권한 매트릭스 초기화
      const initialPermissions: MenuPermissionItem[] = [
        { id: 'dashboard', menuName: '대시보드', path: '/admin', groupPermissions: { tenant_admin: 'full', finance_manager: 'full', staff: 'read' } },
        { id: 'donations', menuName: terms.donationHistory, path: '/admin/donations', groupPermissions: { tenant_admin: 'full', finance_manager: 'full', staff: 'read' } },
        { id: 'recurring_pending', menuName: terms.recurringPending, path: '/admin/recurring-pending', groupPermissions: { tenant_admin: 'full', finance_manager: 'full', staff: 'none' } },
        { id: 'statistics', menuName: '마감 통계', path: '/admin/statistics', groupPermissions: { tenant_admin: 'full', finance_manager: 'full', staff: 'none' } },
        { id: 'prayers', menuName: terms.prayer, path: '/admin/prayers', groupPermissions: { tenant_admin: 'full', finance_manager: 'read', staff: 'full' } },
        { id: 'menu', menuName: terms.donationItems, path: '/admin/menu', groupPermissions: { tenant_admin: 'full', finance_manager: 'read', staff: 'none' } },
        { id: 'members', menuName: '회원 관리', path: '/admin/members', groupPermissions: { tenant_admin: 'full', finance_manager: 'read', staff: 'read' } },
        { id: 'settlement', menuName: '정산', path: '/admin/settlement', groupPermissions: { tenant_admin: 'full', finance_manager: 'full', staff: 'none' } },
        { id: 'banners', menuName: '배너 관리', path: '/admin/banners', groupPermissions: { tenant_admin: 'full', finance_manager: 'none', staff: 'none' } },
        { id: 'accounts', menuName: '관리자 계정 관리', path: '/admin/accounts', groupPermissions: { tenant_admin: 'full', finance_manager: 'none', staff: 'none' } },
        { id: 'settings', menuName: '설정', path: '/admin/settings', groupPermissions: { tenant_admin: 'full', finance_manager: 'none', staff: 'none' } },
      ];
      setPermissionMatrix(initialPermissions);
    }
  }, [tenantSlug, tenants, setCurrentTenant, terms]);

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

  // 👥 그룹 추가/수정 처리 핸들러
  const handleOpenGroupModal = (groupToEdit?: AdminGroup) => {
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

    if (editingGroup) {
      setAdminGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroup.id
            ? { ...g, name: groupName.trim(), description: groupDesc.trim(), badgeColor: groupColor }
            : g
        )
      );
      toast.success(`[${groupName.trim()}] 그룹 정보가 수정되었습니다.`);
    } else {
      const newGroupId = `group_${Date.now()}`;
      const newGroup: AdminGroup = {
        id: newGroupId,
        name: groupName.trim(),
        description: groupDesc.trim() || '커스텀 관리자 그룹',
        isSystemGroup: false,
        badgeColor: groupColor,
      };

      setAdminGroups((prev) => [...prev, newGroup]);

      setPermissionMatrix((prev) =>
        prev.map((item) => ({
          ...item,
          groupPermissions: {
            ...item.groupPermissions,
            [newGroupId]: 'read',
          },
        }))
      );

      toast.success(`[${newGroup.name}] 신규 관리자 그룹이 추가되었습니다.`);
    }

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
      phone: newPhone.trim() || '미입력',
      groupId: selectedGroupId,
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
    setEditPhone(staff.phone);
    setEditGroupId(staff.groupId);
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
              phone: editPhone.trim() || '미입력',
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

  const handleResetPassword = (name: string) => {
    toast.success(`[${name}] 계정의 비밀번호 재설정 링크가 이메일로 발송되었습니다.`);
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

            {activeTab === 'accounts' && (
              <Button
                onClick={() => setIsAddStaffModalOpen(true)}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer self-start md:self-auto"
              >
                <UserPlus className="h-4 w-4" />
                신규 관리자 추가
              </Button>
            )}

            {activeTab === 'groups' && (
              <Button
                onClick={() => handleOpenGroupModal()}
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer self-start md:self-auto"
              >
                <Plus className="h-4 w-4" />
                신규 관리자 그룹 추가
              </Button>
            )}

            {activeTab === 'permissions' && (
              <Button
                onClick={handleSavePermissions}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer self-start md:self-auto"
              >
                <Save className="h-4 w-4" />
                권한 설정 저장
              </Button>
            )}
          </div>

          {/* Sub Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-2xl bg-slate-200 dark:bg-zinc-800 p-1">
              <TabsTrigger value="accounts" className="gap-2 font-bold cursor-pointer text-xs sm:text-sm">
                <UserCheck className="h-4 w-4" />
                1. 관리자 계정 목록 ({staffList.length}명)
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2 font-bold cursor-pointer text-xs sm:text-sm">
                <Layers className="h-4 w-4" />
                2. 관리자 그룹 관리 ({adminGroups.length}개)
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2 font-bold cursor-pointer text-xs sm:text-sm">
                <Shield className="h-4 w-4" />
                3. 메뉴 접근 권한 (RBAC)
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
                              {staff.phone}
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
                                onClick={() => handleResetPassword(staff.name)}
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
                  <Button
                    onClick={() => handleOpenGroupModal()}
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    신규 관리자 그룹 추가
                  </Button>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100 dark:bg-zinc-900">
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">그룹 배지 표시</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">그룹명</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">그룹 설명 및 역할</TableHead>
                        <TableHead className="text-center font-bold text-slate-900 dark:text-zinc-100">소속 인원</TableHead>
                        <TableHead className="text-center font-bold text-slate-900 dark:text-zinc-100">구분</TableHead>
                        <TableHead className="text-right font-bold text-slate-900 dark:text-zinc-100">그룹 작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminGroups.map((group) => {
                        const assignedCount = staffList.filter((s) => s.groupId === group.id).length;
                        return (
                          <TableRow key={group.id}>
                            <TableCell>{renderGroupBadge(group.id)}</TableCell>
                            <TableCell className="font-bold text-slate-900 dark:text-zinc-100">
                              {group.name}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-zinc-400">
                              {group.description}
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
                                  className="h-7 px-2 text-xs gap-1 cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  수정
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

            {/* 🛡️ TAB 3: 역할별 메뉴 접근 권한 설정 (RBAC Matrix) */}
            <TabsContent value="permissions" className="space-y-6 mt-6">
              <Card className="border-indigo-100 dark:border-indigo-950">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-indigo-600" />
                      관리자 그룹별 메뉴 접근 권한 매트릭스 (RBAC Matrix)
                    </CardTitle>
                    <CardDescription className="mt-1">
                      생성된 모든 관리자 그룹별로 11개 메뉴의 상세 접근 권한 (전체 / 읽기 전용 / 차단)을 설정합니다.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleSavePermissions}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer self-start sm:self-auto"
                  >
                    <Save className="h-4 w-4" />
                    권한 설정 저장
                  </Button>
                </CardHeader>

                <CardContent className="overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow className="bg-slate-100 dark:bg-zinc-900">
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">메뉴명 (기능)</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">경로 (URL)</TableHead>
                        {adminGroups.map((group) => (
                          <TableHead key={group.id} className="text-center font-bold text-slate-900 dark:text-zinc-100 min-w-[140px]">
                            {group.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissionMatrix.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-bold text-slate-900 dark:text-zinc-100">
                            {item.menuName}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-slate-500">
                            {item.path}
                          </TableCell>

                          {adminGroups.map((group) => {
                            if (group.id === 'tenant_admin') {
                              return (
                                <TableCell key={group.id} className="text-center bg-purple-50/50 dark:bg-purple-950/20">
                                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300 font-bold">
                                    FULL (전체)
                                  </Badge>
                                </TableCell>
                              );
                            }

                            const currentLevel = item.groupPermissions[group.id] || 'read';

                            return (
                              <TableCell key={group.id} className="text-center">
                                <Select
                                  value={currentLevel}
                                  onValueChange={(val) => handlePermissionChange(item.id, group.id, val as PermissionLevel)}
                                >
                                  <SelectTrigger className="w-[130px] mx-auto bg-white text-xs font-bold">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="full">🟢 전체 (읽기/수정)</SelectItem>
                                    <SelectItem value="read">🟡 읽기 전용 (조회)</SelectItem>
                                    <SelectItem value="none">🔴 접근 불가 (차단)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
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

            <div className="space-y-2">
              <Label className="text-xs font-bold">성명 (이름)</Label>
              <Input
                placeholder="예: 홍길동 실무관"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoComplete="off"
                name="staff_name_no_fill"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">이메일 (로그인 ID)</Label>
              <Input
                type="email"
                placeholder="example@organization.or.kr"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="off"
                aria-autocomplete="none"
                name="staff_email_no_fill"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">휴대폰 번호</Label>
              <Input
                type="tel"
                placeholder="010-0000-0000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                autoComplete="off"
                aria-autocomplete="none"
                name="staff_phone_no_fill"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">초기 임시 비밀번호</Label>
              <Input
                type="password"
                placeholder="초기 비밀번호 입력"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                aria-autocomplete="none"
                name="staff_pwd_no_fill"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">소속 관리자 그룹</Label>
              <Select value={selectedGroupId} onValueChange={(val) => setSelectedGroupId(val)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adminGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} - {group.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="space-y-2">
              <Label className="text-xs font-bold">성명 (이름)</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="성명 입력"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">이메일 (로그인 ID)</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="이메일 주소 입력"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">휴대폰 번호</Label>
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="연락처 입력"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">소속 관리자 그룹 변경</Label>
              <Select value={editGroupId} onValueChange={(val) => setEditGroupId(val)}>
                <SelectTrigger className="bg-white font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adminGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} - {group.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* 3. 관리자 그룹 추가/수정 모달 */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-600" />
              {editingGroup ? '관리자 그룹 정보 수정' : '신규 관리자 그룹 생성'}
            </DialogTitle>
            <DialogDescription>
              단체의 직책이나 실무 업무에 맞춘 관리자 그룹명과 배지 색상을 설정하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold">관리자 그룹명</Label>
              <Input
                placeholder="예: 축원 전담팀 / 부목사 그룹 / 감사팀"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">그룹 역할 설명</Label>
              <Input
                placeholder="예: 사찰 발원문 및 성당 지향문 전담 관리 그룹"
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">그룹 대표 배지 색상</Label>
              <Select value={groupColor} onValueChange={(val) => setGroupColor(val)}>
                <SelectTrigger className="bg-white">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveGroup} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
              {editingGroup ? '수정 완료' : '그룹 생성 완료'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
