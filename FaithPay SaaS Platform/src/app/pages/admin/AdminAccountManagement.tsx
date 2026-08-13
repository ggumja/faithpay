import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
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
import { Menu, UserCheck, UserPlus, Shield, KeyRound, Lock, Unlock, Trash2, Mail, Phone, Save, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useTenantTerms } from '../../hooks/useTenantTerms';

export interface StaffAdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'tenant_admin' | 'finance_manager' | 'staff';
  status: 'active' | 'locked';
  createdAt: string;
  lastLoginAt?: string;
}

export type PermissionLevel = 'full' | 'read' | 'none';

export interface MenuPermissionItem {
  id: string;
  menuName: string;
  path: string;
  tenant_admin: PermissionLevel;
  finance_manager: PermissionLevel;
  staff: PermissionLevel;
}

export default function AdminAccountManagement() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();
  const terms = useTenantTerms(currentTenant?.orgType);

  const [activeTab, setActiveTab] = useState<'accounts' | 'permissions'>('accounts');
  const [staffList, setStaffList] = useState<StaffAdminUser[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'tenant_admin' | 'finance_manager' | 'staff'>('finance_manager');

  // RBAC Menu Permission Matrix State
  const [permissionMatrix, setPermissionMatrix] = useState<MenuPermissionItem[]>([]);

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
          role: 'tenant_admin',
          status: 'active',
          createdAt: tenant.appliedAt ? tenant.appliedAt.slice(0, 10) : '2026-01-15',
          lastLoginAt: '2026-08-13 11:45',
        },
        {
          id: `admin-${tenant.id}-2`,
          name: '재무/보시 실무 담당자',
          email: `finance@${tenant.slug}.or.kr`,
          phone: '010-9876-5432',
          role: 'finance_manager',
          status: 'active',
          createdAt: '2026-02-01',
          lastLoginAt: '2026-08-12 16:20',
        },
      ];
      setStaffList(initialStaff);

      // 메뉴별 권한 매트릭스 초기 데이터 설정
      const initialPermissions: MenuPermissionItem[] = [
        { id: 'dashboard', menuName: '대시보드', path: '/admin', tenant_admin: 'full', finance_manager: 'full', staff: 'read' },
        { id: 'donations', menuName: terms.donationHistory, path: '/admin/donations', tenant_admin: 'full', finance_manager: 'full', staff: 'read' },
        { id: 'recurring_pending', menuName: terms.recurringPending, path: '/admin/recurring-pending', tenant_admin: 'full', finance_manager: 'full', staff: 'none' },
        { id: 'statistics', menuName: '마감 통계', path: '/admin/statistics', tenant_admin: 'full', finance_manager: 'full', staff: 'none' },
        { id: 'prayers', menuName: terms.prayer, path: '/admin/prayers', tenant_admin: 'full', finance_manager: 'read', staff: 'full' },
        { id: 'menu', menuName: terms.donationItems, path: '/admin/menu', tenant_admin: 'full', finance_manager: 'read', staff: 'none' },
        { id: 'members', menuName: '회원 관리', path: '/admin/members', tenant_admin: 'full', finance_manager: 'read', staff: 'read' },
        { id: 'settlement', menuName: '정산', path: '/admin/settlement', tenant_admin: 'full', finance_manager: 'full', staff: 'none' },
        { id: 'banners', menuName: '배너 관리', path: '/admin/banners', tenant_admin: 'full', finance_manager: 'none', staff: 'none' },
        { id: 'accounts', menuName: '관리자 계정 관리', path: '/admin/accounts', tenant_admin: 'full', finance_manager: 'none', staff: 'none' },
        { id: 'settings', menuName: '설정', path: '/admin/settings', tenant_admin: 'full', finance_manager: 'none', staff: 'none' },
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

  const getRoleBadge = (role: StaffAdminUser['role']) => {
    switch (role) {
      case 'tenant_admin':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 font-bold">최고 관리자</Badge>;
      case 'finance_manager':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 font-bold">재정 담당자</Badge>;
      case 'staff':
        return <Badge className="bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200">일반 실무자</Badge>;
    }
  };

  const handleAddStaff = () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('성명, 이메일, 비밀번호를 모두 입력해 주세요');
      return;
    }

    const newStaff: StaffAdminUser = {
      id: `staff_${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || '미입력',
      role: newRole,
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      lastLoginAt: '방금 생성됨',
    };

    setStaffList((prev) => [...prev, newStaff]);
    setIsAddModalOpen(false);

    // Form Reset
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setNewRole('finance_manager');

    toast.success(`[${newStaff.name}] 신규 관리자 계정이 성공적으로 추가되었습니다.`);
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
  const handlePermissionChange = (menuId: string, roleKey: 'finance_manager' | 'staff', level: PermissionLevel) => {
    setPermissionMatrix((prev) =>
      prev.map((item) => (item.id === menuId ? { ...item, [roleKey]: level } : item))
    );
  };

  // 권한 저장 핸들러
  const handleSavePermissions = () => {
    toast.success('역할별 메뉴 접근 권한이 성공적으로 저장되었습니다!');
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
                관리자 계정 및 메뉴 접근 권한 센터
              </h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                {currentTenant.name}의 실무자 계정을 관리하고, 각 관리자 구분에 따른 메뉴별 접근 권한(읽기/수정/금지)을 세부 설정합니다.
              </p>
            </div>
            {activeTab === 'accounts' && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer self-start md:self-auto"
              >
                <UserPlus className="h-4 w-4" />
                신규 관리자 추가
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
            <TabsList className="grid grid-cols-2 w-full max-w-md bg-slate-200 dark:bg-zinc-800 p-1">
              <TabsTrigger value="accounts" className="gap-2 font-bold cursor-pointer">
                <UserCheck className="h-4 w-4" />
                1. 관리자 계정 목록 ({staffList.length}명)
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2 font-bold cursor-pointer">
                <Shield className="h-4 w-4" />
                2. 역할별 메뉴 접근 권한 설정 (RBAC)
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: 관리자 계정 목록 */}
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

                <Card className="border-l-4 border-l-blue-500">
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

                <Card className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      재정/실무 담당자
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                      {staffList.filter((s) => s.role !== 'tenant_admin').length}명
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
                    각 권한별로 수납 조회, 정산, 항목 등록 등 접근 가능한 기능이 구분됩니다.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>관리자 성명</TableHead>
                        <TableHead>이메일 ID</TableHead>
                        <TableHead>연락처</TableHead>
                        <TableHead>부여된 권한</TableHead>
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
                          <TableCell>{getRoleBadge(staff.role)}</TableCell>
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

            {/* TAB 2: 역할별 메뉴 접근 권한 설정 (RBAC Permission Matrix) */}
            <TabsContent value="permissions" className="space-y-6 mt-6">
              <Card className="border-indigo-100 dark:border-indigo-950">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-indigo-600" />
                      관리자 구분별 메뉴 접근 권한 매트릭스 (RBAC Matrix)
                    </CardTitle>
                    <CardDescription className="mt-1">
                      각 역할별로 특정 메뉴의 접근 권한 (전체 권한 / 읽기 전용 / 접근 불가)을 설정합니다.
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

                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100 dark:bg-zinc-900">
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">메뉴명 (기능)</TableHead>
                        <TableHead className="font-bold text-slate-900 dark:text-zinc-100">경로 (URL)</TableHead>
                        <TableHead className="text-center font-bold text-purple-700 dark:text-purple-300">
                          👑 최고 관리자<br />(tenant_admin)
                        </TableHead>
                        <TableHead className="text-center font-bold text-blue-700 dark:text-blue-300">
                          💳 재정/보시 담당자<br />(finance_manager)
                        </TableHead>
                        <TableHead className="text-center font-bold text-slate-700 dark:text-zinc-300">
                          📝 일반 실무자<br />(staff)
                        </TableHead>
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
                          <TableCell className="text-center bg-purple-50/50 dark:bg-purple-950/20">
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300 font-bold">
                              FULL (전체 권한)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center bg-blue-50/30 dark:bg-blue-950/10">
                            <Select
                              value={item.finance_manager}
                              onValueChange={(val) => handlePermissionChange(item.id, 'finance_manager', val as PermissionLevel)}
                            >
                              <SelectTrigger className="w-[140px] mx-auto bg-white text-xs font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">🟢 전체 (읽기/수정)</SelectItem>
                                <SelectItem value="read">🟡 읽기 전용 (조회만)</SelectItem>
                                <SelectItem value="none">🔴 접근 불가 (차단)</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <Select
                              value={item.staff}
                              onValueChange={(val) => handlePermissionChange(item.id, 'staff', val as PermissionLevel)}
                            >
                              <SelectTrigger className="w-[140px] mx-auto bg-white text-xs font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">🟢 전체 (읽기/수정)</SelectItem>
                                <SelectItem value="read">🟡 읽기 전용 (조회만)</SelectItem>
                                <SelectItem value="none">🔴 접근 불가 (차단)</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
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

      {/* 신규 관리자 계정 추가 모달 */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              신규 관리자 계정 등록
            </DialogTitle>
            <DialogDescription>
              단체 실무자에게 부여할 계정 정보를 입력하세요. 등록 즉시 지정된 이메일로 접속 권한이 발급됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold">성명 (이름)</Label>
              <Input
                placeholder="예: 홍길동 실무관"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">이메일 (로그인 ID)</Label>
              <Input
                type="email"
                placeholder="example@organization.or.kr"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">휴대폰 번호</Label>
              <Input
                placeholder="010-0000-0000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">초기 임시 비밀번호</Label>
              <Input
                type="password"
                placeholder="초기 비밀번호 입력"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">부여 권한 (역할)</Label>
              <Select value={newRole} onValueChange={(val) => setNewRole(val as any)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_admin">👑 최고 관리자 (모든 설정 및 정산 권한)</SelectItem>
                  <SelectItem value="finance_manager">💳 재정/보시 담당자 (수납 및 마감 통계)</SelectItem>
                  <SelectItem value="staff">📝 일반 실무자 (지향 및 후원 내역 조회)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddStaff} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              계정 생성 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
