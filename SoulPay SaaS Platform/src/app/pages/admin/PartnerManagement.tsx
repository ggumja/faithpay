import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

import {
  Briefcase, Users, Plus, CheckCircle, FileText, Search,
  Building2, UserCheck, Ban, Copy, ChevronDown, ChevronUp, Eye, ExternalLink,
  Clock, Trash2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Partner, partnerAPI } from '../../api/client';

type TabKey = 'agency' | 'agent' | 'pending';

export default function PartnerManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // URL 경로에 따른 현재 서브페이지 뷰
  const view: TabKey = location.pathname.includes('/partners/agents')
    ? 'agent'
    : location.pathname.includes('/partners/pending')
    ? 'pending'
    : 'agency';

  // 등록 모달이 열릴 때 탭에 따라 역할 자동 설정
  const openModal = (forRole: 'master_agency' | 'sales_agent') => {
    setRole(forRole);
    if (forRole === 'sales_agent') {
      const first = partners.find(p => p.role === 'master_agency');
      if (first) setParentId(first.id);
      setCommissionRate(0.4);
    } else {
      setParentId('');
      setCommissionRate(0.7);
    }
    setIsModalOpen(true);
  };

  const loadPartners = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await partnerAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        setPartners(res.data);
      } else {
        setPartners([]);
      }
    } catch {
      setPartners([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);


  // 등록 폼 상태
  const [role, setRole] = useState<'master_agency' | 'sales_agent'>('master_agency');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [parentId, setParentId] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(0.7);
  const [referralCode, setReferralCode] = useState('');
  const [bankName, setBankName] = useState(''); // SA-A: 하드코딩 기본값 제거
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  // 사업자 유형 및 세무 관련
  const [businessType, setBusinessType] = useState<'corporation' | 'individual_business' | 'freelancer'>('corporation');
  const [businessNumber, setBusinessNumber] = useState('');
  const [taxEmail, setTaxEmail] = useState('');
  const [representativeName, setRepresentativeName] = useState('');

  // 파생 목록
  const agencies = partners.filter(p => p.role === 'master_agency');
  const agents   = partners.filter(p => p.role === 'sales_agent');
  const pendingPartners = partners.filter(p => p.status === 'pending');

  const filteredAgencies = agencies.filter(p =>
    p.name.includes(searchTerm) || p.referralCode.includes(searchTerm) || (p.email && p.email.includes(searchTerm)) || (p.phone && p.phone.includes(searchTerm))
  );
  const filteredAgents = agents.filter(p =>
    p.name.includes(searchTerm) || p.referralCode.includes(searchTerm) || (p.email && p.email.includes(searchTerm)) || (p.phone && p.phone.includes(searchTerm))
  );
  const filteredPending = pendingPartners.filter(p =>
    p.name.includes(searchTerm) || p.referralCode.includes(searchTerm) || (p.email && p.email.includes(searchTerm)) || (p.phone && p.phone.includes(searchTerm)) || (p.region && p.region.includes(searchTerm)) || (p.memo && p.memo.includes(searchTerm))
  );

  // 승인 / 정지 confirmation 팝업 상태
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    partnerId: string;
    partnerName: string;
    targetStatus: 'active' | 'suspended';
  }>({ open: false, partnerId: '', partnerName: '', targetStatus: 'active' });

  // 신청 반려 / 파트너 삭제 팝업 상태
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    partnerId: string;
    partnerName: string;
  }>({ open: false, partnerId: '', partnerName: '' });

  const requestApprove = (partner: Partner) => {
    setConfirmDialog({
      open: true,
      partnerId: partner.id,
      partnerName: partner.name,
      targetStatus: 'active',
    });
  };

  const requestSuspend = (partner: Partner) => {
    setConfirmDialog({
      open: true,
      partnerId: partner.id,
      partnerName: partner.name,
      targetStatus: 'suspended',
    });
  };

  const requestDelete = (partner: Partner) => {
    setDeleteDialog({
      open: true,
      partnerId: partner.id,
      partnerName: partner.name,
    });
  };

  const handleConfirmStatusChange = async () => {
    const { partnerId, partnerName, targetStatus } = confirmDialog;
    if (!partnerId) return;

    try {
      const res = await partnerAPI.updateStatus(partnerId, targetStatus);
      if (res.success && res.data) {
        setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, status: targetStatus } : p));
        toast.success(targetStatus === 'active' ? `${partnerName} 파트너 승인이 완료되었습니다.` : `${partnerName} 계정이 정지 처리되었습니다.`);
      } else {
        toast.error(res.error || '파트너 상태 DB 변경에 실패했습니다.');
      }
    } catch (e: any) {
      toast.error(e?.message || '파트너 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setConfirmDialog({ open: false, partnerId: '', partnerName: '', targetStatus: 'active' });
    }
  };

  const handleConfirmDelete = async () => {
    const { partnerId, partnerName } = deleteDialog;
    if (!partnerId) return;

    try {
      const res = await partnerAPI.delete(partnerId);
      if (res.success) {
        setPartners(prev => prev.filter(p => p.id !== partnerId));
        toast.success(`${partnerName} 신청 내역이 삭제(반려)되었습니다.`);
      } else {
        toast.error(res.error || '삭제 처리에 실패했습니다.');
      }
    } catch (e: any) {
      toast.error(e?.message || '삭제 처리 중 오류가 발생했습니다.');
    } finally {
      setDeleteDialog({ open: false, partnerId: '', partnerName: '' });
    }
  };

  const handleUpdateRate = async (id: string, newRate: number) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, commissionRate: newRate, agencyRate: newRate } : p));
    try {
      const res = await partnerAPI.update(id, { commissionRate: newRate, agencyRate: newRate });
      if (res.success) {
        toast.success('수수료율이 DB에 저장되었습니다.');
      } else {
        toast.error(res.error || '수수료율 수정에 실패했습니다.');
      }
    } catch {
      toast.error('수수료율 수정 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) { toast.error('필수 정보를 입력해 주세요.'); return; }
    if (!businessNumber.trim()) { toast.error('사업자등록번호(또는 주민번호 앞 6자리)를 입력해 주세요.'); return; }

    const newPartnerData = {
      name, email, phone, role,
      parentId: role === 'sales_agent' ? parentId || undefined : undefined,
      commissionRate,
      agencyRate: role === 'master_agency' ? commissionRate : undefined,
      referralCode: referralCode || `${role === 'master_agency' ? 'AGENCY' : 'AGENT'}_${Math.floor(100 + Math.random() * 900)}`,
      bankName,
      accountNumber: accountNumber || '',
      accountHolder: accountHolder || name,
      status: 'active' as const,
      businessType: businessType === 'corporation' ? 'CORPORATE' : businessType,
      businessNumber,
      corpRegNo: businessType !== 'freelancer' ? businessNumber : undefined,
      resNo: businessType === 'freelancer' ? businessNumber : undefined,
      corpName: businessType === 'corporation' ? name : undefined,
      realName: businessType === 'freelancer' ? name : undefined,
      taxEmail: businessType !== 'freelancer' ? taxEmail : undefined,
      representativeName: businessType === 'corporation' ? representativeName : undefined,
      ceoName: businessType === 'corporation' ? representativeName : undefined,
    };

    try {
      const res = await partnerAPI.create(newPartnerData as any);
      if (res.success && res.data) {
        // DB에서 받은 ID로 목록 갱신
        const freshRes = await partnerAPI.getAll();
        if (freshRes.success && Array.isArray(freshRes.data)) {
          setPartners(freshRes.data);
        } else {
          setPartners(prev => [res.data as Partner, ...prev]);
        }
        setIsModalOpen(false);
        toast.success(`[${name}] ${role === 'master_agency' ? '영업 대리점' : '영업자'} DB 등록 완료!`);
        setName(''); setEmail(''); setPhone(''); setReferralCode(''); setAccountNumber(''); setAccountHolder('');
        setBusinessNumber(''); setTaxEmail(''); setRepresentativeName(''); setBusinessType('corporation');
      } else {
        toast.error(res.error || '파트너 등록에 실패했습니다.');
      }
    } catch (err: any) {
      toast.error(err?.message || '파트너 등록 중 오류가 발생했습니다.');
    }
  };


  const statusBadge = (status: string) => {
    if (status === 'active')    return <Badge className="bg-emerald-100 text-emerald-700 text-[10px] hover:bg-emerald-100">활성</Badge>;
    if (status === 'pending')   return <Badge className="bg-amber-100 text-amber-700 text-[10px] hover:bg-amber-100">대기</Badge>;
    if (status === 'suspended') return <Badge className="bg-red-100 text-red-600 text-[10px] hover:bg-red-100">정지</Badge>;
    return null;
  };

  /* ══════════════════════════════════════════════ */
  return (
    <div className="space-y-5">
      {/* ── 1. 영업 대리점 (Tier-1) 페이지 ── */}
      {view === 'agency' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                영업 대리점 (Tier-1) 목록
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                플랫폼 직속 영업 대리점 목록을 관리하고 산하 소속 영업자 및 대리점 수수료율을 설정합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="대리점명·코드·연락처 검색"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs w-48"
                />
              </div>
              <Button
                size="sm"
                className="text-xs font-bold cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => openModal('master_agency')}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> 대리점 등록
              </Button>
            </div>
          </div>

          {/* KPI 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-slate-200">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Building2 className="h-4.5 w-4.5 text-purple-600" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">전체 영업 대리점</div>
                  <div className="text-[19px] font-bold text-purple-700 leading-none mt-0.5">{agencies.length}개</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">정상 운영 (활성)</div>
                  <div className="text-[19px] font-bold text-emerald-600 leading-none mt-0.5">
                    {agencies.filter(p => p.status === 'active').length}개
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Users className="h-4.5 w-4.5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">산하 총 영업자 수</div>
                  <div className="text-[19px] font-bold text-indigo-600 leading-none mt-0.5">{agents.length}명</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── 2. 영업자 (Tier-2) 페이지 ── */}
      {view === 'agent' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                영업자 (Tier-2) 목록
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                각 대리점 산하 영업자 목록 및 관리 단체, 수수료 구조를 관리합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="영업자명·코드·연락처 검색"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs w-48"
                />
              </div>
              <Button
                size="sm"
                className="text-xs font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => openModal('sales_agent')}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> 영업자 등록
              </Button>
            </div>
          </div>

          {/* KPI 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-slate-200">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Users className="h-4.5 w-4.5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">전체 영업자</div>
                  <div className="text-[19px] font-bold text-indigo-700 leading-none mt-0.5">{agents.length}명</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">정상 활동 (활성)</div>
                  <div className="text-[19px] font-bold text-emerald-600 leading-none mt-0.5">
                    {agents.filter(p => p.status === 'active').length}명
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Building2 className="h-4.5 w-4.5 text-purple-600" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">소속 대리점 수</div>
                  <div className="text-[19px] font-bold text-purple-600 leading-none mt-0.5">{agencies.length}개</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── 3. 파트너 승인요청 목록 페이지 ── */}
      {view === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                파트너 승인요청 목록
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                웹 제휴 신청서를 검토하여 영업 대리점 또는 영업자로 승인하거나 반려합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="신청자·코드·연락처·지역 검색"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs w-48"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadPartners}
                className="h-8 text-xs text-slate-600 font-medium cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> 새로고침
              </Button>
            </div>
          </div>

          {/* 승인 대기 현황 배너 */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/60">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <div className="text-[11px] text-amber-800 font-medium">심사 대기 중인 파트너 신청</div>
              <div className="text-[19px] font-bold text-amber-600 leading-none mt-0.5">
                {pendingPartners.length}건
              </div>
            </div>
            <p className="ml-4 text-[12px] text-amber-800/70 hidden sm:block">
              새로 접수된 파트너 정보를 검토한 후 승인 또는 반려를 진행하세요.
            </p>
          </div>
        </div>
      )}

      {/* ══ 대리점 목록 테이블 ══ */}
      {view === 'agency' && (
        <Card className="border-purple-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" /> 영업 대리점 (Tier-1) 관리
            </CardTitle>
            <CardDescription className="text-[11.5px]">
              대리점은 하위 영업자를 모집하고 오버라이딩 방식으로 수수료를 수령합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px]">
                  <TableHead className="text-[11px]">대리점명</TableHead>
                  <TableHead className="text-[11px]">추천 코드</TableHead>
                  <TableHead className="text-[11px]">소속 영업자</TableHead>
                  <TableHead className="text-right text-[11px]">대리점 수수료율</TableHead>
                  <TableHead className="text-[11px]">정산 계좌</TableHead>
                  <TableHead className="text-[11px]">상태</TableHead>
                  <TableHead className="text-center text-[11px]">조치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                      등록된 영업 대리점이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : filteredAgencies.map(p => {
                  const subCount = agents.filter(a => a.parentId === p.id).length;
                  return (
                    <TableRow key={p.id} className="hover:bg-purple-50/30">
                      <TableCell>
                        <button
                          onClick={() => navigate(`/system/admin/partners/${p.id}`)}
                          className="font-bold text-[12.5px] text-purple-900 hover:text-purple-600 hover:underline bg-transparent border-0 p-0 text-left cursor-pointer"
                        >
                          {p.name}
                        </button>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">{p.email} · {p.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11.5px] font-bold text-purple-700">{p.referralCode}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(p.referralCode); toast.success('코드 복사 완료'); }}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent p-0"
                          ><Copy className="h-3 w-3" /></button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[12px] font-bold ${subCount > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {subCount}명
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* SA-C: onChange 즉시 API 호출 → onBlur로 변경 (입력 완료 후에만 API 호출) */}
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number" step="0.1" min="0" max="3"
                            defaultValue={p.commissionRate ?? (p as any).agencyRate ?? 0}
                            onBlur={e => handleUpdateRate(p.id, parseFloat(e.target.value) || 0)}
                            className="w-16 h-7 text-right font-bold text-xs"
                          />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px]">
                        <div>{p.bankName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.accountNumber}</div>
                        <div className="text-[10px] text-slate-400">예금주: {p.accountHolder}</div>
                      </TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] px-2 text-purple-700 border-purple-200 hover:bg-purple-50 font-bold"
                            onClick={() => navigate(`/system/admin/partners/${p.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> 상세보기
                          </Button>
                          {p.status === 'pending' ? (
                            <Button size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 px-2"
                              onClick={() => requestApprove(p)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> 승인
                            </Button>
                          ) : p.status === 'active' ? (
                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 border-red-200 text-red-500 hover:bg-red-50"
                              onClick={() => requestSuspend(p)}>
                              <Ban className="h-3 w-3 mr-1" /> 정지
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => requestApprove(p)}>
                              활성화
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
      )}

      {/* ══ 영업자 목록 테이블 ══ */}
      {view === 'agent' && (
        <Card className="border-indigo-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" /> 영업자 (Tier-2) 관리
            </CardTitle>
            <CardDescription className="text-[11.5px]">
              영업자는 사찰·교회를 현장 개설하고 결제액에 대한 수수료를 수령합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-[11px]">영업자명</TableHead>
                  <TableHead className="text-[11px]">추천 코드</TableHead>
                  <TableHead className="text-[11px]">소속 대리점</TableHead>
                  <TableHead className="text-[11px]">관리 단체</TableHead>
                  <TableHead className="text-right text-[11px]">수수료 구조</TableHead>
                  <TableHead className="text-[11px]">정산 계좌</TableHead>
                  <TableHead className="text-[11px]">상태</TableHead>
                  <TableHead className="text-center text-[11px]">조치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                      등록된 영업자가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : filteredAgents.map(p => {
                  const parentAgency = agencies.find(a => a.id === p.parentId);
                  return (
                    <TableRow key={p.id} className="hover:bg-indigo-50/30">
                      <TableCell>
                        <button
                          onClick={() => navigate(`/system/admin/partners/${p.id}`)}
                          className="font-bold text-[12.5px] text-indigo-900 hover:text-indigo-600 hover:underline bg-transparent border-0 p-0 text-left cursor-pointer"
                        >
                          {p.name}
                        </button>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">{p.email} · {p.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11.5px] font-bold text-indigo-700">{p.referralCode}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(p.referralCode); toast.success('코드 복사 완료'); }}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent p-0"
                          ><Copy className="h-3 w-3" /></button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {parentAgency ? (
                          <button
                            onClick={() => navigate(`/system/admin/partners/${parentAgency.id}`)}
                            className="text-left bg-transparent border-0 p-0 cursor-pointer hover:underline"
                          >
                            <div className="text-[12px] font-semibold text-purple-700">{parentAgency.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{parentAgency.referralCode}</div>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">플랫폼 직접</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <span className="text-[12.5px] font-bold text-indigo-700">{p.commissionRate}%</span>
                          <div className="text-[10px] text-slate-400 mt-0.5">지급 확정율</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-[11px]">
                          <div className="font-mono text-slate-500">계약별 변동</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            고객율 − PG 1.5% − 플랫폼 0.5%
                            {parentAgency ? ` − 대리점 ${(parentAgency as any).agencyRate ?? parentAgency.commissionRate}%` : ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px]">
                        <div>{p.bankName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.accountNumber}</div>
                        <div className="text-[10px] text-slate-400">예금주: {p.accountHolder}</div>
                      </TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold"
                            onClick={() => navigate(`/system/admin/partners/${p.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> 상세보기
                          </Button>
                          {p.status === 'pending' ? (
                            <Button size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 px-2"
                              onClick={() => requestApprove(p)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> 승인
                            </Button>
                          ) : p.status === 'active' ? (
                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 border-red-200 text-red-500 hover:bg-red-50"
                              onClick={() => requestSuspend(p)}>
                              <Ban className="h-3 w-3 mr-1" /> 정지
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => requestApprove(p)}>
                              활성화
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
      )}

      {/* ══ 파트너 승인요청 목록 심사 테이블 ══ */}
      {view === 'pending' && (
        <Card className="border-amber-200 shadow-sm">
          <CardHeader className="pb-3 bg-amber-50/40 rounded-t-xl border-b border-amber-100">
            <CardTitle className="text-[14px] font-bold text-amber-950 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" /> 파트너 승인요청 목록
              </span>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs px-2.5 py-0.5 font-bold">
                총 {filteredPending.length}건 대기 중
              </Badge>
            </CardTitle>
            <CardDescription className="text-[11.5px] text-amber-800/80">
              공개 웹 신청서(/partner/apply)를 통해 접수된 영업 파트너 제휴 신청 목록입니다. 검토 후 [승인]하시면 파트너 계정이 활성화됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 text-[11px]">
                  <TableHead className="text-[11px]">신청자 / 법인명</TableHead>
                  <TableHead className="text-[11px]">희망 구분</TableHead>
                  <TableHead className="text-[11px]">연락처 / 이메일</TableHead>
                  <TableHead className="text-[11px]">희망 영업 지역</TableHead>
                  <TableHead className="text-[11px]">추천인 코드</TableHead>
                  <TableHead className="text-[11px]">신청 메모 / 보유 경험</TableHead>
                  <TableHead className="text-[11px]">신청일시</TableHead>
                  <TableHead className="text-center text-[11px]">심사 및 조치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                      현재 승인 대기 중인 신규 제휴 신청이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : filteredPending.map(p => {
                  const parentAgency = agencies.find(a => a.id === p.parentId);
                  return (
                    <TableRow key={p.id} className="hover:bg-amber-50/30">
                      <TableCell>
                        <button
                          onClick={() => navigate(`/system/admin/partners/${p.id}`)}
                          className="font-bold text-[13px] text-slate-900 hover:text-purple-700 hover:underline bg-transparent border-0 p-0 text-left cursor-pointer"
                        >
                          {p.name}
                        </button>
                        <div className="font-mono text-[10.5px] text-amber-700 font-semibold">{p.referralCode}</div>
                      </TableCell>
                      <TableCell>
                        {p.role === 'master_agency' ? (
                          <Badge className="bg-purple-100 text-purple-700 text-[10.5px] border-purple-200">
                            🏢 Tier-1 대리점
                          </Badge>
                        ) : (
                          <Badge className="bg-indigo-100 text-indigo-700 text-[10.5px] border-indigo-200">
                            💼 Tier-2 영업자
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px]">
                        <div className="font-medium text-slate-800">{p.phone}</div>
                        <div className="text-slate-400 text-[10.5px]">{p.email}</div>
                      </TableCell>
                      <TableCell className="text-[11.5px] text-slate-700">
                        {p.region || <span className="text-slate-400">전국 / 미지정</span>}
                      </TableCell>
                      <TableCell className="text-[11px]">
                        {parentAgency ? (
                          <button
                            onClick={() => navigate(`/system/admin/partners/${parentAgency.id}`)}
                            className="text-left bg-transparent border-0 p-0 cursor-pointer hover:underline"
                          >
                            <span className="font-semibold text-purple-700">{parentAgency.name}</span>
                            <div className="font-mono text-[10px] text-slate-400">{parentAgency.referralCode}</div>
                          </button>
                        ) : (
                          <span className="text-slate-400">직속 (없음)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11.5px] text-slate-600 max-w-xs">
                        <div className="line-clamp-2" title={p.memo || ''}>
                          {p.memo || <span className="text-slate-400">작성 내용 없음</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-400 whitespace-nowrap">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 cursor-pointer shadow-xs"
                            onClick={() => requestApprove(p)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> 승인
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] px-2 text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer"
                            onClick={() => navigate(`/system/admin/partners/${p.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> 상세
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] px-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 cursor-pointer"
                            onClick={() => requestDelete(p)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> 반려
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ══ 등록 모달 ══ */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px] font-bold">
              {role === 'master_agency'
                ? <><Building2 className="h-4 w-4 text-purple-600" /> 영업 대리점 직접 등록</>
                : <><Users className="h-4 w-4 text-indigo-600" /> 영업자 직접 등록</>}
            </DialogTitle>
            <DialogDescription className="text-[11.5px]">
              {role === 'master_agency'
                ? '영업 대리점(Tier-1)을 등록합니다. 하위 영업자 모집 및 오버라이딩 수수료가 적용됩니다.'
                : '영업자(Tier-2)를 등록합니다. 소속 대리점을 반드시 선택하세요.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* 역할 전환 (모달 내에서도 가능) */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'master_agency', label: '🏢 Tier-1 대리점', color: 'border-purple-500 bg-purple-50 text-purple-900' },
                { key: 'sales_agent',   label: '💼 Tier-2 영업자',  color: 'border-indigo-500 bg-indigo-50 text-indigo-900' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setRole(key as any);
                    if (key === 'sales_agent') {
                      const first = partners.find(p => p.role === 'master_agency');
                      if (first) setParentId(first.id);
                    } else {
                      setParentId('');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all
                    ${role === key ? color : 'bg-white border-slate-200 text-slate-500'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 소속 대리점 (영업자 전용) */}
            {role === 'sales_agent' && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1.5">
                <Label className="text-xs font-bold text-indigo-900">소속 대리점 *</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger className="h-8 text-xs bg-white border-indigo-200">
                    <SelectValue placeholder="소속 대리점을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.name} ({m.referralCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">이름 / 법인명 *</Label>
                <Input placeholder="홍길동 / (주)파트너스" value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">연락처 *</Label>
                <Input placeholder="010-1234-5678" value={phone} onChange={e => setPhone(e.target.value)} className="h-8 text-xs" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">이메일 *</Label>
                <Input type="email" placeholder="partner@soulpay.kr" value={email} onChange={e => setEmail(e.target.value)} className="h-8 text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">추천 코드 (미입력 시 자동)</Label>
                <Input placeholder="AGENCY_001" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} className="h-8 text-xs font-mono uppercase" />
              </div>
            </div>

            {/* 사업자 유형 및 세무 정보 */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                🧾 사업자 유형 &amp; 세무 증빙 정보
              </div>
              {/* 사업자 유형 선택 */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'corporation',         label: '🏢 법인사업자',   desc: '전자세금계산서', color: 'border-blue-500 bg-blue-50 text-blue-900' },
                  { key: 'individual_business', label: '🏬 일반과세자',   desc: '전자세금계산서', color: 'border-green-500 bg-green-50 text-green-900' },
                  { key: 'freelancer',          label: '👤 프리랜서',     desc: '3.3% 원천징수',  color: 'border-orange-500 bg-orange-50 text-orange-900' },
                ].map(({ key, label, desc, color }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBusinessType(key as any)}
                    className={`py-2 px-2 rounded-lg border text-[10.5px] font-bold text-center cursor-pointer transition-all flex flex-col items-center gap-0.5
                      ${businessType === key ? color : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    {label}
                    <span className="font-normal text-[9px] opacity-70">{desc}</span>
                  </button>
                ))}
              </div>

              {/* 사업자등록번호 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10.5px] font-bold">
                    {businessType === 'freelancer' ? '주민등록번호 앞 6자리 *' : '사업자등록번호 *'}
                  </Label>
                  <Input
                    placeholder={businessType === 'freelancer' ? '920110' : '107-88-39201'}
                    value={businessNumber}
                    onChange={e => setBusinessNumber(e.target.value)}
                    className="h-7 text-xs bg-white font-mono"
                  />
                </div>
                {businessType === 'corporation' && (
                  <div className="space-y-1">
                    <Label className="text-[10.5px] font-bold">대표자명</Label>
                    <Input
                      placeholder="홍길동"
                      value={representativeName}
                      onChange={e => setRepresentativeName(e.target.value)}
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                )}
              </div>

              {/* 세금계산서 이메일 (법인/일반과세자) */}
              {businessType !== 'freelancer' && (
                <div className="space-y-1">
                  <Label className="text-[10.5px] font-bold">전자세금계산서 수신 이메일</Label>
                  <Input
                    type="email"
                    placeholder="tax@partner.co.kr"
                    value={taxEmail}
                    onChange={e => setTaxEmail(e.target.value)}
                    className="h-7 text-xs bg-white"
                  />
                </div>
              )}

              <div className={`text-[10px] px-2 py-1 rounded-md font-medium ${
                businessType === 'freelancer'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {businessType === 'freelancer'
                  ? '⚡ 3.3% 사업소득세 원천징수 후 지급 → 원천징수 영수증 발행'
                  : '⚡ 부가가치세 포함 전자세금계산서 발행 → 세금계산서 합계액 지급'}
              </div>
            </div>

            {/* 수수료율 + 계좌 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">
                  {role === 'master_agency' ? '대리점 수수료율 (%)' : '지급 기준 수수료율 (%)'}
                </Label>
                <div className="flex items-center gap-1">
                  <Input type="number" step="0.1" value={commissionRate}
                    onChange={e => setCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-20 h-7 text-right font-bold text-xs bg-white" />
                  <span className="text-xs font-bold">%</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '은행명', value: bankName, setter: setBankName, placeholder: '신한은행' },
                  { label: '계좌번호', value: accountNumber, setter: setAccountNumber, placeholder: '110-000-000000' },
                  { label: '예금주', value: accountHolder, setter: setAccountHolder, placeholder: '홍길동' },
                ].map(({ label, value, setter, placeholder }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-[10.5px]">{label}</Label>
                    <Input placeholder={placeholder} value={value} onChange={e => setter(e.target.value)} className="h-7 text-xs bg-white" />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>취소</Button>
              <Button type="submit" size="sm"
                className={role === 'master_agency' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}>
                {role === 'master_agency' ? '대리점 등록' : '영업자 등록'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══ 파트너 승인 / 정지 확인 AlertDialog ══ */}
      <AlertDialog open={confirmDialog.open} onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2">
              {confirmDialog.targetStatus === 'active' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <Ban className="h-5 w-5 text-red-500" />
              )}
              {confirmDialog.targetStatus === 'active' ? '영업 파트너 승인 확인' : '영업 파트너 계정 정지 확인'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 mt-2 leading-relaxed">
              {confirmDialog.targetStatus === 'active' ? (
                <>
                  <span className="font-bold text-slate-900">{confirmDialog.partnerName}</span> 영업 파트너 계정을 승인하시겠습니까?
                  <br />
                  승인 시 해당 파트너는 SoulPay 대시보드 로그인 및 가맹점 유치 활동이 정상적으로 가능해집니다.
                </>
              ) : (
                <>
                  <span className="font-bold text-slate-900">{confirmDialog.partnerName}</span> 영업 파트너 계정을 정지하시겠습니까?
                  <br />
                  정지 시 해당 계정의 접속 권한이 제한됩니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="text-xs h-8">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStatusChange}
              className={confirmDialog.targetStatus === 'active' ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-bold' : 'bg-red-600 hover:bg-red-700 text-white text-xs h-8 font-bold'}
            >
              {confirmDialog.targetStatus === 'active' ? '승인 완료' : '정지 처리'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ══ 파트너 신청 반려 / 삭제 확인 AlertDialog ══ */}
      <AlertDialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5 text-red-600" />
              영업 파트너 신청 반려 / 삭제
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 mt-2 leading-relaxed">
              <span className="font-bold text-slate-900">{deleteDialog.partnerName}</span> 님의 제휴 신청(또는 파트너 정보)을 완전히 삭제하시겠습니까?
              <br />
              삭제 시 해당 신청 내역은 데이터베이스에서 영구적으로 제거됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="text-xs h-8 cursor-pointer">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 font-bold cursor-pointer"
            >
              삭제 및 반려
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

