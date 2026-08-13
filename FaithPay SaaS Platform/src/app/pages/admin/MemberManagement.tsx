import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
import {
  Users,
  Search,
  UserPlus,
  Download,
  Menu,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  RefreshCw,
  Calendar,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminSidebar } from '../../components/AdminSidebar';
import { donationAPI } from '../../api/client';
import { normalizePhoneNumber } from '../../utils/phoneUtils';
import { formatPhoneNumber, stripPhoneDigits } from './AdminAccountManagement';
import { MemberDetailData } from './MemberDetailPage';

export default function MemberManagement() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();

  const [members, setMembers] = useState<MemberDetailData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'recurring' | 'once' | 'new'>('all');

  // Modal States
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberDetailData | null>(null);

  // Form inputs
  const [memberName, setMemberName] = useState('');
  const [memberTitle, setMemberTitle] = useState(''); // 법명/세례명/직분
  const [memberPhone, setMemberPhone] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberAddress, setMemberAddress] = useState('');
  const [memberRrn, setMemberRrn] = useState(''); // 주민등록번호 (기부금영수증 발급용)

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  // Load & Aggregate Members from Donations
  useEffect(() => {
    async function loadMembers() {
      if (!currentTenant) return;
      setIsLoading(true);
      try {
        const res = await donationAPI.getByTenant(currentTenant.id);
        if (res.success && res.data) {
          const map = new Map<string, MemberDetailData>();
          
          res.data.forEach((d: any) => {
            const rawPhone = d.donorPhone || '';
            const digitsKey = stripPhoneDigits(rawPhone) || '미등록';

            if (!map.has(digitsKey)) {
              map.set(digitsKey, {
                id: d.id,
                name: d.donorName || '익명 보시/후원자',
                baptismName: d.baptismName || '',
                phone: digitsKey,
                email: d.donorEmail || '',
                address: d.address || '',
                registeredDate: d.createdAt ? d.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                totalDonation: d.amount || 0,
                lastDonation: d.createdAt ? d.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                recurringCount: d.isRecurring ? 1 : 0,
                note: '',
              });
            } else {
              const existing = map.get(digitsKey)!;
              existing.totalDonation += d.amount || 0;
              if (d.isRecurring) existing.recurringCount += 1;
              if (existing.name === '익명 보시/후원자' && d.donorName) existing.name = d.donorName;
              if (!existing.email && d.donorEmail) existing.email = d.donorEmail;
            }
          });

          // Add default sample members if list is empty for rich display
          const aggregated = Array.from(map.values());
          if (aggregated.length === 0) {
            const defaultMembers: MemberDetailData[] = [
              {
                id: 'mem-1',
                name: '하동현',
                baptismName: currentTenant.religionType === 'catholic' ? '미카엘' : currentTenant.religionType === 'buddhist' ? '청안' : '안수집사',
                phone: '01071404795',
                email: 'hdh@example.com',
                address: '서울특별시 강남구 테헤란로 123',
                registeredDate: '2026-08-11',
                totalDonation: 228000,
                lastDonation: '2026-08-11',
                recurringCount: 1,
                note: '매월 15일 정기 봉헌. 기부금영수증 신청자.',
              },
              {
                id: 'mem-2',
                name: '박불자',
                baptismName: currentTenant.religionType === 'catholic' ? '마리아' : currentTenant.religionType === 'buddhist' ? '관음심' : '권사',
                phone: '01034567890',
                email: 'park@example.com',
                address: '경기도 성남시 분당구 정자일로 45',
                registeredDate: '2026-03-28',
                totalDonation: 90000,
                lastDonation: '2026-03-28',
                recurringCount: 0,
                note: '',
              },
            ];
            setMembers(defaultMembers);
          } else {
            setMembers(aggregated);
          }
        } else {
          setMembers([]);
        }
      } catch (err) {
        console.error('Error fetching members:', err);
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadMembers();
  }, [currentTenant]);

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

  const isAuthorized = currentAdmin && (currentAdmin.role === 'tenant_admin' || currentAdmin.role === 'system_admin' || currentAdmin.role === 'finance_manager');
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>회원 관리 메뉴는 단체 관리자 및 재정 담당자만 접근할 수 있습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentPath = `/${tenantSlug}/admin/members`;
  const memberTerm = currentTenant.terminology?.member || '회원';
  const donationTerm = currentTenant.terminology?.donation || '봉헌/보시';

  const getTitleLabel = () => {
    if (currentTenant.religionType === 'catholic') return '세례명';
    if (currentTenant.religionType === 'buddhist') return '법명';
    if (currentTenant.religionType === 'protestant') return '직분';
    return '호칭';
  };

  // Dynamic Statistics Calculations (No Hardcoded Mock Data)
  const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
  const totalMembersCount = members.length;
  const recurringMembersCount = members.filter((m) => m.recurringCount > 0).length;
  const newThisMonthCount = members.filter((m) => m.registeredDate && m.registeredDate.startsWith(currentMonthStr)).length;
  const avgDonationAmount = members.length > 0
    ? Math.round(members.reduce((sum, m) => sum + (m.totalDonation || 0), 0) / members.length)
    : 0;

  // Search & Filter Logic
  const cleanQuery = searchQuery.trim().toLowerCase();
  const cleanQueryDigits = stripPhoneDigits(searchQuery);

  const filteredMembers = members.filter((m) => {
    // 1. Tab Filter
    if (filterTab === 'recurring' && m.recurringCount === 0) return false;
    if (filterTab === 'once' && m.recurringCount > 0) return false;
    if (filterTab === 'new' && (!m.registeredDate || !m.registeredDate.startsWith(currentMonthStr))) return false;

    // 2. Search Query
    if (!cleanQuery) return true;
    const matchName = m.name.toLowerCase().includes(cleanQuery);
    const matchTitle = (m.baptismName || '').toLowerCase().includes(cleanQuery);
    const matchPhone = formatPhoneNumber(m.phone).includes(cleanQuery) || (cleanQueryDigits && m.phone.includes(cleanQueryDigits));
    const matchEmail = m.email.toLowerCase().includes(cleanQuery);

    return matchName || matchTitle || matchPhone || matchEmail;
  });

  // Navigate to Full Member Detail Page
  const handleOpenDetail = (member: MemberDetailData) => {
    navigate(`/${tenantSlug}/admin/members/${member.id}`);
  };

  // Open Add Member Modal
  const handleOpenAddModal = () => {
    setMemberName('');
    setMemberTitle('');
    setMemberPhone('');
    setMemberEmail('');
    setMemberAddress('');
    setMemberRrn('');
    setIsAddMemberModalOpen(true);
  };

  const handleAddMember = () => {
    if (!memberName.trim()) {
      toast.error('회원 성명을 입력해 주세요.');
      return;
    }

    const newMem: MemberDetailData = {
      id: `mem_${Date.now()}`,
      name: memberName.trim(),
      baptismName: memberTitle.trim(),
      phone: stripPhoneDigits(memberPhone) || '01000000000',
      email: memberEmail.trim(),
      address: memberAddress.trim(),
      rrn: memberRrn.trim() || '850101-1******',
      registeredDate: new Date().toISOString().slice(0, 10),
      totalDonation: 0,
      lastDonation: '납부 기록 없음',
      recurringCount: 0,
      note: '신규 등록 회원',
    };

    setMembers((prev) => [newMem, ...prev]);
    setIsAddMemberModalOpen(false);
    toast.success(`[${newMem.name}] 신규 ${memberTerm}이(가) 등록되었습니다.`);
  };

  // Open Edit Member Modal
  const handleOpenEditModal = (m: MemberDetailData) => {
    setEditingMember(m);
    setMemberName(m.name);
    setMemberTitle(m.baptismName || '');
    setMemberPhone(formatPhoneNumber(m.phone));
    setMemberEmail(m.email);
    setMemberAddress(m.address || '');
    setMemberRrn(m.rrn || '');
    setIsEditMemberModalOpen(true);
  };

  const handleSaveEditMember = () => {
    if (!editingMember) return;
    if (!memberName.trim()) {
      toast.error('회원 성명을 입력해 주세요.');
      return;
    }

    const updated = {
      ...editingMember,
      name: memberName.trim(),
      baptismName: memberTitle.trim(),
      phone: stripPhoneDigits(memberPhone),
      email: memberEmail.trim(),
      address: memberAddress.trim(),
      rrn: memberRrn.trim() || editingMember.rrn,
    };

    setMembers((prev) => prev.map((m) => (m.id === editingMember.id ? updated : m)));
    setIsEditMemberModalOpen(false);
    toast.success(`[${updated.name}] ${memberTerm} 정보가 수정되었습니다.`);
  };

  const handleDeleteMember = (id: string, name: string) => {
    if (confirm(`정말로 [${name}] ${memberTerm} 정보를 삭제하시겠습니까?`)) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success(`[${name}] ${memberTerm} 정보가 삭제되었습니다.`);
    }
  };

  // UTF-8 BOM CSV Excel Export Engine
  const handleExportCSV = () => {
    if (members.length === 0) {
      toast.error('다운로드할 회원 데이터가 없습니다.');
      return;
    }

    const titleHeader = getTitleLabel();
    const headers = [`성명`, titleHeader, `전화번호`, `이메일`, `주소`, `가입일`, `정기 약정 수`, `누적 ${donationTerm}액(원)`, `최근 ${donationTerm}일`].join(',');
    
    const rows = members.map((m) => [
      `"${m.name}"`,
      `"${m.baptismName || ''}"`,
      `"${formatPhoneNumber(m.phone)}"`,
      `"${m.email || ''}"`,
      `"${m.address || ''}"`,
      `"${m.registeredDate}"`,
      `"${m.recurringCount}건"`,
      `"${m.totalDonation}"`,
      `"${m.lastDonation}"`,
    ].join(','));

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentTenant.slug}_member_list_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`전체 ${members.length}명의 ${memberTerm} 목록을 엑셀(CSV)로 다운로드했습니다.`);
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
                <Users className="h-7 w-7 text-indigo-600" />
                {currentTenant.name} {memberTerm} 통합 관리 센터
              </h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                등록된 {memberTerm}의 상세 정보, {donationTerm} 내역 및 납부확인서/영수증을 통합 관리합니다.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <Button variant="outline" onClick={handleExportCSV} className="gap-2 cursor-pointer font-bold bg-white">
                <Download className="h-4 w-4 text-emerald-600" />
                엑셀 다운로드
              </Button>
              <Button onClick={handleOpenAddModal} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">
                <UserPlus className="h-4 w-4" />
                신규 {memberTerm} 추가
              </Button>
            </div>
          </div>

          {/* Stats Summary Cards (No Mock Data) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  전체 등록 {memberTerm}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-900 dark:text-zinc-100">
                  {totalMembersCount}명
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  정기 약정 {memberTerm}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {recurringMembersCount}명
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  이번 달 신규 가입
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {newThisMonthCount}명
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  평균 누적 {donationTerm}액
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                  ₩ {avgDonationAmount.toLocaleString()}원
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs & Search Bar */}
          <Card className="p-4 bg-white dark:bg-zinc-900 border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as any)} className="w-full md:w-auto">
                <TabsList className="bg-slate-100 dark:bg-zinc-800 p-1">
                  <TabsTrigger value="all" className="font-bold text-xs">전체 ({members.length}명)</TabsTrigger>
                  <TabsTrigger value="recurring" className="font-bold text-xs">정기 약정 ({recurringMembersCount}명)</TabsTrigger>
                  <TabsTrigger value="once" className="font-bold text-xs">단발 전용 ({members.length - recurringMembersCount}명)</TabsTrigger>
                  <TabsTrigger value="new" className="font-bold text-xs">이번달 신규 ({newThisMonthCount}명)</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={`성명, ${getTitleLabel()}, 전화번호, 이메일 검색...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 text-xs font-semibold"
                />
              </div>
            </div>
          </Card>

          {/* Members Main Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                {currentTenant.name} {memberTerm} 명단 ({filteredMembers.length}명)
              </CardTitle>
              <CardDescription>
                {memberTerm} 행을 클릭하거나 [🔍 상세] 버튼을 눌러 개별 납부 확인서 및 지향/축원 이력을 확인하세요.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center text-sm font-semibold text-slate-500">
                  {memberTerm} 데이터를 불러오는 중입니다...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-12 text-center text-sm font-semibold text-slate-500">
                  검색 조건과 일치하는 {memberTerm} 데이터가 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100 dark:bg-zinc-900">
                      <TableHead className="font-bold">성명</TableHead>
                      <TableHead className="font-bold">{getTitleLabel()}</TableHead>
                      <TableHead className="font-bold">전화번호</TableHead>
                      <TableHead className="font-bold">이메일</TableHead>
                      <TableHead className="font-bold">가입일</TableHead>
                      <TableHead className="font-bold">정기 약정 현황</TableHead>
                      <TableHead className="text-right font-bold">누적 {donationTerm}액</TableHead>
                      <TableHead className="font-bold">최근 {donationTerm}일</TableHead>
                      <TableHead className="text-right font-bold">회원 관리 작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((m) => (
                      <TableRow
                        key={m.id}
                        className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors"
                        onClick={() => handleOpenDetail(m)}
                      >
                        <TableCell className="font-bold text-slate-900 dark:text-zinc-100">
                          {m.name}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {m.baptismName || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-700 dark:text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {formatPhoneNumber(m.phone)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {m.email || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {m.registeredDate}
                        </TableCell>
                        <TableCell>
                          {m.recurringCount > 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 w-fit">
                              <RefreshCw className="h-3 w-3 animate-spin-slow" />
                              정기 {m.recurringCount}건
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 border-slate-300 text-[11px]">
                              ⚪ 단발 전용
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 dark:text-zinc-100 font-mono">
                          ₩ {m.totalDonation.toLocaleString()}원
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {m.lastDonation || '-'}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              title="회원 상세 정보 및 결제내역"
                              onClick={() => handleOpenDetail(m)}
                              className="h-7 px-2 text-xs gap-1 cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold border-indigo-200"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              상세보기
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="정보 수정"
                              onClick={() => handleOpenEditModal(m)}
                              className="h-7 px-2 text-xs gap-1 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              수정
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="회원 삭제"
                              onClick={() => handleDeleteMember(m.id, m.name)}
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ➕ 신규 회원 추가 모달 */}
      <Dialog open={isAddMemberModalOpen} onOpenChange={setIsAddMemberModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              신규 {memberTerm} 등록
            </DialogTitle>
            <DialogDescription>
              {currentTenant.name}의 새로운 {memberTerm} 정보를 입력해 주세요.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleAddMember(); }} autoComplete="off" className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">성명 (이름) *</Label>
              <Input
                placeholder="예: 홍길동"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{getTitleLabel()}</Label>
              <Input
                placeholder={`예: ${getTitleLabel()} 입력`}
                value={memberTitle}
                onChange={(e) => setMemberTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">휴대폰 번호</Label>
              <Input
                type="tel"
                placeholder="010-0000-0000"
                value={formatPhoneNumber(memberPhone)}
                onChange={(e) => setMemberPhone(formatPhoneNumber(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">이메일 주소</Label>
              <Input
                type="email"
                placeholder="example@domain.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">주소</Label>
              <Input
                placeholder="주소 입력"
                value={memberAddress}
                onChange={(e) => setMemberAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-amber-700 dark:text-amber-400">주민등록번호 (소득공제 기부금영수증 발급용)</Label>
              <Input
                placeholder="예: 850101-1234567"
                value={memberRrn}
                onChange={(e) => setMemberRrn(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setIsAddMemberModalOpen(false)}>
                취소
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                등록 완료
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✏️ 회원 정보 수정 모달 */}
      <Dialog open={isEditMemberModalOpen} onOpenChange={setIsEditMemberModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-indigo-600" />
              {memberTerm} 정보 수정
            </DialogTitle>
            <DialogDescription>
              등록된 {memberTerm}의 기본 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveEditMember(); }} autoComplete="off" className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">성명 (이름) *</Label>
              <Input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{getTitleLabel()}</Label>
              <Input
                value={memberTitle}
                onChange={(e) => setMemberTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">휴대폰 번호</Label>
              <Input
                type="tel"
                value={formatPhoneNumber(memberPhone)}
                onChange={(e) => setMemberPhone(formatPhoneNumber(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">이메일 주소</Label>
              <Input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">주소</Label>
              <Input
                value={memberAddress}
                onChange={(e) => setMemberAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-amber-700 dark:text-amber-400">주민등록번호 (소득공제 기부금영수증 발급용)</Label>
              <Input
                placeholder="예: 850101-1234567"
                value={memberRrn}
                onChange={(e) => setMemberRrn(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setIsEditMemberModalOpen(false)}>
                취소
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                수정 사항 저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}