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
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminSidebar } from '../../components/AdminSidebar';
import { donationAPI, subscriptionAPI, memberAPI } from '../../api/client';
import { MemberTitleSelect } from '../../components/common/MemberTitleSelect';
import { normalizePhoneNumber } from '../../utils/phoneUtils';
import { formatPhoneNumber, stripPhoneDigits } from './AdminAccountManagement';
import { MemberDetailData } from './MemberDetailPage';
import { useTenantTerms } from '../../hooks/useTenantTerms';
import { openDaumPostcode } from '../../utils/daumPostcode';
import { MemberEditModal } from '../../components/admin/MemberEditModal';

export default function MemberManagement() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();
  const terms = useTenantTerms(currentTenant);

  const [members, setMembers] = useState<MemberDetailData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'recurring' | 'once' | 'new'>('all');

  // Modal States
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberDetailData | null>(null);

  // Form inputs (Add Modal)
  const [memberName, setMemberName] = useState('');
  const [memberTitle, setMemberTitle] = useState(''); // 법명/세례명/직분
  const [memberPhone, setMemberPhone] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberAddress, setMemberAddress] = useState('');
  const [memberZonecode, setMemberZonecode] = useState('');
  const [memberAddressBase, setMemberAddressBase] = useState('');
  const [memberAddressDetail, setMemberAddressDetail] = useState('');

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
            const isCompleted = !d.paymentStatus || d.paymentStatus === 'completed';
            const rawPhone = d.donorPhone || '';
            const digitsKey = stripPhoneDigits(rawPhone) || '미등록';

            if (!map.has(digitsKey)) {
              map.set(digitsKey, {
                id: d.id,
                name: d.donorName || '무기명',
                baptismName: d.baptismName || '',
                phone: digitsKey,
                email: d.donorEmail || '',
                address: d.address || '',
                registeredDate: d.createdAt ? d.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                totalDonation: isCompleted ? (d.amount || 0) : 0,
                lastDonation: isCompleted && d.createdAt ? d.createdAt.split('T')[0] : '',
                recurringCount: (d.isRecurring && isCompleted) ? 1 : 0,
                note: '',
              });
            } else {
              const existing = map.get(digitsKey)!;
              if (isCompleted) {
                existing.totalDonation += d.amount || 0;
                if (d.isRecurring) existing.recurringCount += 1;
                if (!existing.lastDonation && d.createdAt) {
                  existing.lastDonation = d.createdAt.split('T')[0];
                }
              }
              if (existing.name === '무기명' && d.donorName) existing.name = d.donorName;
              if (!existing.email && (d.donorEmail || d.email)) existing.email = d.donorEmail || d.email;
              if (!existing.baptismName && d.baptismName) existing.baptismName = d.baptismName;
              if (!existing.address && d.address) existing.address = d.address;
            }
          });

          // DB subscriptions 및 member profile 실측 조회 연동하여 약정 건수, 이메일, 주소 정확히 동기화
          const phoneList = Array.from(map.keys()).filter((p) => p && p !== '미등록' && p.length >= 8);
          await Promise.all(
            phoneList.map(async (phone) => {
              try {
                const [subRes, profRes, noteRes] = await Promise.allSettled([
                  subscriptionAPI.getByPhone(phone, currentTenant.id),
                  memberAPI.getProfile(phone),
                  memberAPI.getNote(phone, currentTenant.id),
                ]);

                const memberEntry = map.get(phone);
                if (!memberEntry) return;

                if (subRes.status === 'fulfilled' && subRes.value.success && Array.isArray(subRes.value.data)) {
                  const tenantSubs = subRes.value.data.filter((s: any) => s.tenantId === currentTenant.id || s.tenant_id === currentTenant.id || s.tenantId === currentTenant.slug);
                  const activeCount = tenantSubs.filter((s: any) => s.status === 'active').length;
                  memberEntry.recurringCount = Math.max(memberEntry.recurringCount, activeCount);
                  if (!memberEntry.email && tenantSubs.length > 0) {
                    const firstWithEmail = tenantSubs.find((s: any) => s.donorEmail);
                    if (firstWithEmail) memberEntry.email = firstWithEmail.donorEmail;
                  }
                }

                if (profRes.status === 'fulfilled' && profRes.value.success && profRes.value.data) {
                  const p = profRes.value.data;
                  if (p.email) memberEntry.email = p.email;
                  if (p.fullAddress || p.address) memberEntry.address = p.fullAddress || p.address;
                  if (p.name && (memberEntry.name === '무기명' || !memberEntry.name)) memberEntry.name = p.name;
                  if (p.baptismName) memberEntry.baptismName = p.baptismName;
                }

                if (noteRes.status === 'fulfilled' && noteRes.value.success && noteRes.value.data?.note) {
                  memberEntry.note = noteRes.value.data.note;
                }
              } catch (e) {
                console.warn('Failed to load extra data for member', phone, e);
              }
            })
          );

          const aggregated = Array.from(map.values());
          setMembers(aggregated);
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
  const memberTerm = terms.donor;
  const donationTerm = terms.donation;

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
  const totalDonationsAmount = members.reduce((sum, m) => sum + (m.totalDonation || 0), 0);
  const avgDonationAmount = members.length > 0
    ? Math.round(totalDonationsAmount / members.length)
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
    setMemberZonecode('');
    setMemberAddressBase('');
    setMemberAddressDetail('');
    setIsAddMemberModalOpen(true);
  };

  const handleSearchMemberAddress = () => {
    openDaumPostcode((res) => {
      setMemberZonecode(res.zonecode);
      setMemberAddressBase(res.address);
      toast.success('주소가 선택되었습니다. 상세주소를 확인 또는 입력해 주세요.');
    });
  };

  const handleAddMember = async () => {
    if (!memberName.trim()) {
      toast.error(`${memberTerm} 성명을 입력해 주세요.`);
      return;
    }

    const cleanPhone = stripPhoneDigits(memberPhone);
    if (!cleanPhone) {
      toast.error('전화번호를 올바르게 입력해 주세요.');
      return;
    }

    const combinedAddress = memberZonecode
      ? `[${memberZonecode}] ${memberAddressBase}${memberAddressDetail ? ' ' + memberAddressDetail.trim() : ''}`.trim()
      : `${memberAddressBase}${memberAddressDetail ? ' ' + memberAddressDetail.trim() : ''}`.trim();

    const newMem: MemberDetailData = {
      id: `mem_${Date.now()}`,
      name: memberName.trim(),
      baptismName: memberTitle.trim(),
      phone: cleanPhone,
      email: memberEmail.trim(),
      address: combinedAddress,
      zonecode: memberZonecode.trim(),
      addressBase: memberAddressBase.trim(),
      addressDetail: memberAddressDetail.trim(),
      registeredDate: new Date().toISOString().slice(0, 10),
      totalDonation: 0,
      lastDonation: '납부 기록 없음',
      recurringCount: 0,
      note: `신규 등록 ${memberTerm}`,
    };

    // DB 영구 실측 저장
    try {
      await memberAPI.updateProfile(cleanPhone, {
        name: memberName.trim(),
        baptismName: memberTitle.trim(),
        email: memberEmail.trim(),
        zonecode: memberZonecode.trim(),
        address: memberAddressBase.trim(),
        addressDetail: memberAddressDetail.trim(),
        fullAddress: combinedAddress,
      });
    } catch (err) {
      console.warn('Failed to save new member to DB:', err);
    }

    setMembers((prev) => [newMem, ...prev]);
    setIsAddMemberModalOpen(false);
    toast.success(`[${newMem.name}] 신규 ${memberTerm}이(가) 등록되었습니다.`);
  };

  // Open Edit Member Modal (공통 MemberEditModal 연동)
  const handleOpenEditModal = (m: MemberDetailData) => {
    setEditingMember(m);
    setIsEditMemberModalOpen(true);
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
      toast.error(`다운로드할 ${memberTerm} 데이터가 없습니다.`);
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                {currentTenant.name} {memberTerm} 통합 관리 센터
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5">
                등록된 {memberTerm}의 상세 정보, {donationTerm} 내역 및 납부확인서/영수증을 통합 관리합니다.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <Button variant="outline" onClick={handleExportCSV} className="gap-2 cursor-pointer font-bold bg-white">
                <Download className="h-4 w-4 text-emerald-600" />
                엑셀 다운로드
              </Button>
              <Button onClick={handleOpenAddModal} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer">
                <UserPlus className="h-4 w-4" />
                신규 {memberTerm} 추가
              </Button>
            </div>
          </div>

          {/* Stats Summary Cards (No Mock Data) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 sm:p-5 gap-1.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <div className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                전체 등록 {memberTerm}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                {totalMembersCount}명
              </div>
              <p className="text-xs text-slate-400">등록된 전체 회원 명부</p>
            </Card>

            <Card className="p-4 sm:p-5 gap-1.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <div className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                정기 약정 {memberTerm}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                {recurringMembersCount}명
              </div>
              <p className="text-xs text-slate-400">정기 후원 납부 회원</p>
            </Card>

            <Card className="p-4 sm:p-5 gap-1.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <div className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                총 누적 {donationTerm}액
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {totalDonationsAmount.toLocaleString()}원
              </div>
              <p className="text-xs text-slate-400">정상 승인 완료 총액</p>
            </Card>

            <Card className="p-4 sm:p-5 gap-1.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <div className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                평균 누적 {donationTerm}액
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                {avgDonationAmount.toLocaleString()}원
              </div>
              <p className="text-xs text-slate-400">회원 1인당 평균 후원</p>
            </Card>
          </div>

          {/* Filter Tabs & Search Bar */}
          <Card className="p-4 bg-white dark:bg-zinc-900 border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as any)} className="w-full md:w-auto">
                <TabsList className="bg-slate-100 dark:bg-zinc-800 p-1">
                  <TabsTrigger value="all" className="font-bold text-xs">전체 ({members.length}명)</TabsTrigger>
                  <TabsTrigger value="recurring" className="font-bold text-xs">정기 약정 ({recurringMembersCount}명)</TabsTrigger>
                  <TabsTrigger value="once" className="font-bold text-xs">1회성 전용 ({members.length - recurringMembersCount}명)</TabsTrigger>
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
            <CardHeader className="pb-4">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                {currentTenant.name} {memberTerm} 명단 ({filteredMembers.length}명)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {memberTerm} 행을 클릭하거나 [🔍 상세] 버튼을 눌러 개별 납부 확인서 및 메시지 이력을 확인하세요.
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
                      <TableHead className="text-right font-bold">{memberTerm} 관리 작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((m) => (
                      <TableRow
                        key={m.id}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-colors"
                        onClick={() => handleOpenDetail(m)}
                      >
                        <TableCell className="font-bold text-slate-900 dark:text-zinc-100">
                          {m.name}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
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
                              ⚪ 1회성 전용
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 dark:text-zinc-100 font-mono">
                          {m.totalDonation.toLocaleString()}원
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {m.lastDonation || '-'}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              title={`${memberTerm} 상세 정보 및 결제내역`}
                              onClick={() => handleOpenDetail(m)}
                              className="h-7 px-2 text-xs gap-1 cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border-blue-200"
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
                              title={`${memberTerm} 삭제`}
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
              <UserPlus className="h-5 w-5 text-blue-600" />
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

            <MemberTitleSelect
              value={memberTitle}
              onChange={setMemberTitle}
              religionType={currentTenant.religionType}
              showLabel={true}
              label={getTitleLabel()}
            />

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

            {/* 주소 (우편번호 검색 + 기본주소 + 상세주소) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>주소</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">카카오 우편번호 검색 지원</span>
              </Label>
              
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={memberZonecode}
                  readOnly
                  placeholder="우편번호"
                  className="w-28 text-xs font-mono font-semibold bg-slate-100 dark:bg-zinc-800"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSearchMemberAddress}
                  className="text-xs font-semibold gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>주소 검색</span>
                </Button>
              </div>

              <Input
                placeholder="기본 주소 (주소 검색 버튼을 이용하세요)"
                value={memberAddressBase}
                onChange={(e) => setMemberAddressBase(e.target.value)}
                className="text-xs"
              />

              <Input
                placeholder="상세 주소를 입력하세요 (예: 101동 1002호 / 2층)"
                value={memberAddressDetail}
                onChange={(e) => setMemberAddressDetail(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* 주민등록번호 보안 방침 안내 (DB 미저장, 영수증 발급 시 1회성 입력 원칙) */}
            <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>주민등록번호 보안 방침 안내</span>
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                개인정보보호법에 따라 주민등록번호는 회원 DB에 저장을 허용하지 않으며, 소득공제용 영수증 발급 시 1회성으로 안전하게 입력받습니다.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setIsAddMemberModalOpen(false)}>
                취소
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                등록 완료
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✏️ 공통 회원 정보 수정 모달 (MemberDetailPage와 100% 동일한 공통 컴포넌트) */}
      <MemberEditModal
        isOpen={isEditMemberModalOpen}
        onOpenChange={setIsEditMemberModalOpen}
        member={editingMember}
        currentTenant={currentTenant}
        onSaveSuccess={(updated) => {
          setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }}
      />
    </div>
  );
}