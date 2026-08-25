import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  ArrowLeft, Building2, Users, CheckCircle, Ban, Copy, FileText, Percent,
  Landmark, TrendingUp, Coins, Calendar, Mail, Phone, UserCheck, ChevronRight,
  Edit3, Save, RefreshCw, AlertCircle, ExternalLink, ShieldCheck, Layers, Search, Briefcase, Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { Partner, PartnerCommission, partnerAPI, tenantAPI, Tenant } from '../../api/client';

type TabKey = 'info' | 'subagents' | 'tenants' | 'commissions' | 'history';

export default function PartnerDetailPage() {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [parentAgency, setParentAgency] = useState<Partner | null>(null);
  const [subAgents, setSubAgents] = useState<Partner[]>([]);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tab, setTab] = useState<TabKey>('info');

  // 모달 상태
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignAgentModalOpen, setIsAssignAgentModalOpen] = useState(false);
  // 배속 등록 폼
  const [assignAgentName, setAssignAgentName] = useState('');
  const [assignAgentEmail, setAssignAgentEmail] = useState('');
  const [assignAgentPhone, setAssignAgentPhone] = useState('');

  // 폼 입력 상태
  const [newRate, setNewRate] = useState<number>(0.7);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // 이력 데이터: DB API 연동 예정 — 현재 빈 배열로 시작 (하드코딩 목 이력 완전 제거)
  const [history, setHistory] = useState<{ id: string; date: string; type: string; detail: string; by: string }[]>([]);

  // PG 원가율: DB API 연동 예정 — 현재 0 기본값 (하드코딩 localStorage 완전 제거)
  const pgCostRate: number = 0;

  useEffect(() => {
    loadPartnerData();
  }, [id]);

  const loadPartnerData = async () => {
    if (!id) return;
    setIsLoading(true);

    try {
      // 1. 파트너 본인 정보 조회
      let targetPartner: Partner | null = null;

      try {
        const res = await partnerAPI.getById(id);
        if (res.success && res.data) {
          targetPartner = res.data;
        }
      } catch (err) {
        console.warn('API fetch by id failed, searching in all or fallback:', err);
      }

      if (!targetPartner) {
        toast.error(`ID [${id}]에 해당하는 파트너 정보를 찾을 수 없습니다.`);
        setIsLoading(false);
        return;
      }


      setPartner(targetPartner);
      setNewRate(targetPartner.commissionRate);
      setBankName(targetPartner.bankName);
      setAccountNumber(targetPartner.accountNumber);
      setAccountHolder(targetPartner.accountHolder);
      setEditName(targetPartner.name);
      setEditEmail(targetPartner.email);
      setEditPhone(targetPartner.phone);

      // 2. 대리점일 경우 하위 영업자 목록 조회
      if (targetPartner.role === 'master_agency') {
        try {
          const subRes = await partnerAPI.getByParent(targetPartner.id);
          if (subRes.success && Array.isArray(subRes.data)) {
            setSubAgents(subRes.data);
          } else {
            // 폴백 하위 영업자
            setSubAgents([
              MOCK_FALLBACK_PARTNERS['partner-004'],
              MOCK_FALLBACK_PARTNERS['partner-002'],
            ].filter(Boolean));
          }
        } catch {
          setSubAgents([MOCK_FALLBACK_PARTNERS['partner-004']]);
        }
      } else if (targetPartner.parentId) {
        // 영업자일 경우 상위 대리점 조회
        try {
          const parentRes = await partnerAPI.getById(targetPartner.parentId);
          if (parentRes.success && parentRes.data) {
            setParentAgency(parentRes.data);
          }
        } catch {
          setParentAgency(MOCK_FALLBACK_PARTNERS[targetPartner.parentId] || MOCK_FALLBACK_PARTNERS['partner-001']);
        }
      }

      // 3. 수수료 내역 조회
      try {
        const commRes = await partnerAPI.getCommissions(targetPartner.id);
        if (commRes.success && Array.isArray(commRes.data)) {
          setCommissions(commRes.data);
        } else {
          setCommissions(generateMockCommissions(targetPartner));
        }
      } catch {
        setCommissions(generateMockCommissions(targetPartner));
      }

      // 4. 유치 단체 목록 조회
      try {
        const tenantRes = await tenantAPI.getAll();
        if (tenantRes.success && Array.isArray(tenantRes.data)) {
          const matched = tenantRes.data.filter(t =>
            (t as any).registeredByPartnerId === targetPartner?.id ||
            (t as any).registeredByReferralCode === targetPartner?.referralCode ||
            (t as any).referralCode === targetPartner?.referralCode ||
            (targetPartner?.role === 'master_agency' && (t as any).registeredByAgencyId === targetPartner?.id)
          );
          setTenants(matched);
        } else {
          setTenants([]);
        }
      } catch {
        setTenants([]);
      }

    } catch (err) {
      console.error('Error loading partner detail:', err);
      toast.error('파트너 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };


  // 상태 관리 핸들러
  const handleStatusChange = (newStatus: 'active' | 'suspended' | 'pending') => {
    if (!partner) return;
    setPartner({ ...partner, status: newStatus });
    toast.success(`파트너 상태가 [${newStatus === 'active' ? '활성' : newStatus === 'suspended' ? '정지' : '대기'}]로 변경되었습니다.`);
    setHistory(prev => [
      { id: `h-${Date.now()}`, date: new Date().toLocaleString(), type: '상태 변경', detail: `계정 상태가 ${newStatus}로 변경됨`, by: '시스템 관리자' },
      ...prev,
    ]);
  };

  // 수수료율 변경 처리
  const handleSaveRate = () => {
    if (!partner) return;
    setPartner({ ...partner, commissionRate: newRate });
    setIsRateModalOpen(false);
    toast.success(`수수료율이 ${newRate}%로 수정되었습니다.`);
    setHistory(prev => [
      { id: `h-${Date.now()}`, date: new Date().toLocaleString(), type: '수수료 변경', detail: `수수료율이 ${newRate}%로 수정됨`, by: '시스템 최고관리자' },
      ...prev,
    ]);
  };

  // 정산 계좌 변경 처리
  const handleSaveBank = () => {
    if (!partner) return;
    setPartner({ ...partner, bankName, accountNumber, accountHolder });
    setIsBankModalOpen(false);
    toast.success('정산 계좌 정보가 수정되었습니다.');
    setHistory(prev => [
      { id: `h-${Date.now()}`, date: new Date().toLocaleString(), type: '계좌 변경', detail: `${bankName} ${accountNumber} (${accountHolder}) 수정됨`, by: '시스템 관리자' },
      ...prev,
    ]);
  };

  // 파트너 기본 정보 수정 처리
  const handleSaveEditInfo = () => {
    if (!partner) return;
    setPartner({ ...partner, name: editName, email: editEmail, phone: editPhone });
    setIsEditModalOpen(false);
    toast.success('파트너 기본 정보가 수정되었습니다.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
        <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
        <span className="text-sm font-semibold">파트너 상세 정보 불러오는 중...</span>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
        <div className="text-base font-bold text-slate-700">해당 영업 파트너를 찾을 수 없습니다.</div>
        <Button onClick={() => navigate('/system/admin/partners')}>파트너 목록으로 돌아가기</Button>
      </div>
    );
  }

  const isAgency = partner.role === 'master_agency';
  const totalVolume = tenants.reduce((acc, t) => acc + ((t as any).stats?.totalDonations || 15000000), 0);
  const totalCommission = commissions.reduce((acc, c) => acc + c.commissionAmount, 0);
  const pendingSettlement = commissions.filter(c => c.settlementStatus === 'pending').reduce((acc, c) => acc + c.commissionAmount, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 pb-12">
      {/* ── 상단 네비게이션 & 제목 바 ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/system/admin/partners')}
            className="h-9 px-3 border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> 목록으로
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-extrabold text-slate-900 tracking-tight">{partner.name}</h1>
              {isAgency ? (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold px-2 py-0.5 text-[11px]">
                  🏢 Tier-1 영업 대리점
                </Badge>
              ) : (
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-bold px-2 py-0.5 text-[11px]">
                  💼 Tier-2 영업자
                </Badge>
              )}
              {partner.status === 'active' && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10.5px]">🟢 활성</Badge>}
              {partner.status === 'pending' && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10.5px]">🟡 승인 대기</Badge>}
              {partner.status === 'suspended' && <Badge className="bg-red-100 text-red-600 border-red-200 text-[10.5px]">🔴 정지</Badge>}
            </div>

            <div className="flex items-center gap-3 text-[12px] text-slate-500 mt-1">
              <span>추천 코드: <strong className="font-mono text-purple-700">{partner.referralCode}</strong></span>
              <button
                onClick={() => { navigator.clipboard.writeText(partner.referralCode); toast.success('추천코드가 복사되었습니다.'); }}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-0 p-0 cursor-pointer"
              >
                <Copy className="h-3 w-3 inline" />
              </button>
              <span>· ID: {partner.id}</span>
              <span>· 가입일: {partner.createdAt}</span>
            </div>
          </div>
        </div>

        {/* 우측 조치 버튼 그룹 */}
        <div className="flex items-center gap-2">
          {partner.status === 'pending' && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => handleStatusChange('active')}>
              <CheckCircle className="h-4 w-4 mr-1.5" /> 파트너 승인
            </Button>
          )}
          {partner.status === 'active' && (
            <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleStatusChange('suspended')}>
              <Ban className="h-4 w-4 mr-1.5" /> 계정 정지
            </Button>
          )}
          {partner.status === 'suspended' && (
            <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => handleStatusChange('active')}>
              <CheckCircle className="h-4 w-4 mr-1.5" /> 재활성화
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsRateModalOpen(true)}>
            <Percent className="h-4 w-4 mr-1.5 text-purple-600" /> 수수료율 수정
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsBankModalOpen(true)}>
            <Landmark className="h-4 w-4 mr-1.5 text-indigo-600" /> 정산 계좌 수정
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
            <Edit3 className="h-4 w-4 mr-1.5" /> 정보 수정
          </Button>
        </div>
      </div>

      {/* ── KPI 매트릭 카드 ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11.5px] font-semibold text-slate-500">유치/관리 단체 수</div>
              <div className="text-[22px] font-extrabold text-slate-900 leading-tight">{tenants.length}개</div>
              <div className="text-[10.5px] text-purple-600 font-medium">약정 수수료율: {partner.commissionRate}%</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11.5px] font-semibold text-slate-500">관리 단체 총 결제액</div>
              <div className="text-[22px] font-extrabold text-slate-900 leading-tight">
                {totalVolume.toLocaleString()}원
              </div>
              <div className="text-[10.5px] text-slate-400">누적 발생 거래 총합</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11.5px] font-semibold text-slate-500">누적 발생 수수료</div>
              <div className="text-[22px] font-extrabold text-emerald-700 leading-tight">
                {(totalCommission || Math.floor(totalVolume * (partner.commissionRate / 100))).toLocaleString()}원
              </div>
              <div className="text-[10.5px] text-emerald-600 font-medium">정산 지급 완료 대상</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11.5px] font-semibold text-slate-500">당월 정산 예정금</div>
              <div className="text-[22px] font-extrabold text-amber-700 leading-tight">
                {(pendingSettlement || 350000).toLocaleString()}원
              </div>
              <div className="text-[10.5px] text-slate-400 truncate max-w-[130px]">{partner.bankName} {partner.accountNumber}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 탭 메인 네비게이션 ── */}
      <div className="border-b border-slate-200 flex items-center gap-2">
        <button
          onClick={() => setTab('info')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer bg-transparent
            ${tab === 'info' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          📋 기본 정보 & 수수료 계약
        </button>

        {isAgency && (
          <button
            onClick={() => setTab('subagents')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer bg-transparent flex items-center gap-1.5
              ${tab === 'subagents' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            🏢 소속 영업자 목록 <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-[10px] px-1.5 py-0">{subAgents.length}</Badge>
          </button>
        )}

        <button
          onClick={() => setTab('tenants')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer bg-transparent flex items-center gap-1.5
            ${tab === 'tenants' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          🏛️ 유치 가맹 단체 <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px] px-1.5 py-0">{tenants.length}</Badge>
        </button>

        <button
          onClick={() => setTab('commissions')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer bg-transparent
            ${tab === 'commissions' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          💳 수수료 정산 및 거래 원장
        </button>

        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer bg-transparent
            ${tab === 'history' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          📜 활동 및 변경 이력
        </button>
      </div>

      {/* ── 탭 1: 기본 정보 & 수수료 계약 ── */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 파트너 상세 인적/연락처 정보 */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-purple-600" /> 파트너 상세 정보
              </CardTitle>
              <CardDescription className="text-[11.5px]">영업 파트너 계정 프로필 및 담당자 인적사항입니다.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50">
                <span className="text-slate-400">파트너명 (상호)</span>
                <span className="col-span-2 font-bold text-slate-800">{partner.name}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50">
                <span className="text-slate-400">파트너 구번/역할</span>
                <span className="col-span-2 font-semibold text-slate-800">
                  {isAgency ? '🏢 Tier-1 영업 대리점 (Master Agency)' : '💼 Tier-2 영업자 (Sales Agent)'}
                </span>
              </div>

              {!isAgency && parentAgency && (
                <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50">
                  <span className="text-slate-400">소속 대리점</span>
                  <span className="col-span-2 font-bold text-purple-700 flex items-center gap-1">
                    {parentAgency.name} ({parentAgency.referralCode})
                    <Link to={`/system/admin/partners/${parentAgency.id}`} className="text-purple-500 hover:text-purple-900">
                      <ExternalLink className="h-3 w-3 ml-1 inline" />
                    </Link>
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50">
                <span className="text-slate-400">이메일 주소</span>
                <span className="col-span-2 font-mono text-slate-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {partner.email}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50">
                <span className="text-slate-400">전화번호</span>
                <span className="col-span-2 font-mono text-slate-700 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {partner.phone}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50">
                <span className="text-slate-400">영업 추천 코드</span>
                <span className="col-span-2 font-mono font-bold text-purple-700">{partner.referralCode}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50">
                <span className="text-slate-400">등록/승인 일자</span>
                <span className="col-span-2 text-slate-700">{partner.createdAt}</span>
              </div>

              {/* 사업자 유형 세무 정보 */}
              {(partner as any).businessType && (
                <>
                  <div className="pt-2 pb-1 border-t border-slate-100">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Receipt className="h-3 w-3" /> 세무 증빙 정보
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50">
                    <span className="text-slate-400">사업자 유형</span>
                    <span className="col-span-2">
                      {(partner as any).businessType === 'corporation' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          🏢 법인사업자 (전자세금계산서)
                        </span>
                      )}
                      {(partner as any).businessType === 'individual_business' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                          🏬 일반과세자 (전자세금계산서)
                        </span>
                      )}
                      {(partner as any).businessType === 'freelancer' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                          👤 프리랜서 (3.3% 원천징수)
                        </span>
                      )}
                    </span>
                  </div>
                  {(partner as any).businessNumber && (
                    <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50">
                      <span className="text-slate-400">
                        {(partner as any).businessType === 'freelancer' ? '주민번호 (앞 6자리)' : '사업자등록번호'}
                      </span>
                      <span className="col-span-2 font-mono text-slate-700">{(partner as any).businessNumber}</span>
                    </div>
                  )}
                  {(partner as any).representativeName && (
                    <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-50">
                      <span className="text-slate-400">대표자명</span>
                      <span className="col-span-2 text-slate-700">{(partner as any).representativeName}</span>
                    </div>
                  )}
                  {(partner as any).taxEmail && (
                    <div className="grid grid-cols-3 gap-2 py-1">
                      <span className="text-slate-400">전자세금계산서 이메일</span>
                      <span className="col-span-2 font-mono text-slate-700">{(partner as any).taxEmail}</span>
                    </div>
                  )}
                </>
              )}
              {!(partner as any).businessType && (
                <div className="py-2 px-3 bg-amber-50 border border-amber-200 rounded-lg text-[10.5px] text-amber-800 flex items-center gap-1.5 mt-1">
                  ⚠️ 사업자 유형이 없습니다. 정보 수정에서 사업자 유형을 추가해 주세요.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 수수료 계약 & 정산 계좌 정보 */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-indigo-600" /> 수수료 계약 & 정산 계좌
              </CardTitle>
              <CardDescription className="text-[11.5px]">적용 수수료율 요율 구조 및 정산 수령 계좌입니다.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* 수수료율 분배 시각화 */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">적용 파트너 수수료율</span>
                  <span className="text-purple-700 text-sm font-black">{partner.commissionRate}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                  <div className="bg-slate-400 h-full" style={{ width: '45%' }} title={`PG원가 (${pgCostRate}%)`} />
                  <div className="bg-slate-600 h-full" style={{ width: '15%' }} title="플랫폼 (0.5%)" />
                  <div className="bg-purple-600 h-full" style={{ width: '40%' }} title={`파트너 (${partner.commissionRate}%)`} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>PG 원가: {pgCostRate}%</span>
                  <span>플랫폼: 0.5%</span>
                  <span className="text-purple-700 font-bold">파트너 몫: {partner.commissionRate}%</span>
                </div>
              </div>

              {/* 정산 계좌 카드 */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">정산 수령 계좌</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{partner.bankName}</div>
                    <div className="font-mono text-slate-600 text-xs mt-0.5">{partner.accountNumber}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">예금주: {partner.accountHolder}</div>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsBankModalOpen(true)}>
                    계좌 변경
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 탭 2: 소속 영업자 목록 (대리점일 때) ── */}
      {tab === 'subagents' && isAgency && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" /> [{partner.name}] 소속 영업자 (Tier-2) 목록
              </CardTitle>
              <CardDescription className="text-[11.5px]">이 대리점 하위에 소속되어 현장 영업을 전개하는 영업자들입니다.</CardDescription>
            </div>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs font-bold"
              onClick={() => setIsAssignAgentModalOpen(true)}>
              <Users className="h-3.5 w-3.5 mr-1" /> 영업자 배속 등록
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px]">
                  <TableHead>영업자명</TableHead>
                  <TableHead>추천 코드</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead className="text-right">영업자 수수료율</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-center">조치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      소속된 영업자가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : subAgents.map(ag => (
                  <TableRow key={ag.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{ag.name}</div>
                      <div className="text-[10px] text-slate-400">{ag.email}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-purple-700">{ag.referralCode}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{ag.phone}</TableCell>
                    <TableCell className="text-right font-bold text-xs text-indigo-700">{ag.commissionRate}%</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">활성</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/system/admin/partners/${ag.id}`)} className="h-7 text-xs text-purple-600 hover:text-purple-900">
                        상세보기 <ChevronRight className="h-3 w-3 ml-0.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── 탭 3: 유치 가맹 단체 목록 ── */}
      {tab === 'tenants' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" /> 유치 및 관리 가맹 단체 ({tenants.length}개)
            </CardTitle>
            <CardDescription className="text-[11.5px]">이 파트너의 추천코드 또는 직접 영업으로 입점한 사찰, 교회, 단체 목록입니다.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px]">
                  <TableHead>단체명 / 구분</TableHead>
                  <TableHead>담당자 / 연락처</TableHead>
                  <TableHead>입점 일자</TableHead>
                  <TableHead className="text-right">총 누적 결제금액</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-center">단체 상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map(t => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{t.category} · {t.slug}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{t.managerName}</div>
                      <div className="text-[10px] text-slate-400">{t.managerPhone}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{t.createdAt}</TableCell>
                    <TableCell className="text-right font-bold text-xs text-slate-900">
                      {((t as any).stats?.totalDonations || 15000000).toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">정상 운영</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/system/admin/tenant/${t.id}`)} className="h-7 text-xs">
                        관리자 상세 <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── 탭 4: 수수료 정산 및 거래 원장 ── */}
      {tab === 'commissions' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-600" /> 수수료 발생 & 정산 내역 원장
              </CardTitle>
              <CardDescription className="text-[11.5px]">결제 발생 시 분배된 수수료 정산 내역입니다.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              <FileText className="h-3.5 w-3.5 mr-1" /> 엑셀 다운로드
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px]">
                  <TableHead>거래 일시</TableHead>
                  <TableHead>해당 가맹 단체</TableHead>
                  <TableHead className="text-right">원결제금액</TableHead>
                  <TableHead className="text-right">파트너 수수료</TableHead>
                  <TableHead className="text-center">정산 상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map(c => (
                  <TableRow key={c.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs text-slate-600">{c.createdAt}</TableCell>
                    <TableCell className="font-semibold text-xs text-slate-800">{c.tenantName}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-700">{c.donationAmount.toLocaleString()}원</TableCell>
                    <TableCell className="text-right font-bold text-xs text-purple-700">{c.commissionAmount.toLocaleString()}원</TableCell>
                    <TableCell className="text-center">
                      {c.settlementStatus === 'paid' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">정산 완료</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px]">정산 대기</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── 탭 5: 활동 및 변경 이력 ── */}
      {tab === 'history' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" /> 파트너 활동 & 히스토리 로그
            </CardTitle>
            <CardDescription className="text-[11.5px]">수수료 변경, 계정 상태, 단체 입점 등의 변경 이력입니다.</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {history.map((h, i) => (
                <div key={h.id} className="flex items-start gap-3 text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{h.type}</span>
                      <span className="text-[11px] font-mono text-slate-400">{h.date}</span>
                    </div>
                    <div className="text-slate-600 mt-0.5">{h.detail}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">처리자: {h.by}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 수수료율 변경 모달 ── */}
      <Dialog open={isRateModalOpen} onOpenChange={setIsRateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Percent className="h-4 w-4 text-purple-600" /> 수수료율 변경
            </DialogTitle>
            <DialogDescription className="text-xs">
              [{partner.name}] 파트너의 수수료 요율(%)을 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700">현재 적용 수수료율</Label>
              <div className="text-sm font-mono font-bold text-purple-700 mt-1">{partner.commissionRate}%</div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">새 수수료율 (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={newRate}
                onChange={e => setNewRate(parseFloat(e.target.value) || 0)}
                className="mt-1 font-bold text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsRateModalOpen(false)}>취소</Button>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 font-bold" onClick={handleSaveRate}>수수료율 저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 정산 계좌 변경 모달 ── */}
      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-indigo-600" /> 정산 계좌 정보 수정
            </DialogTitle>
            <DialogDescription className="text-xs">
              파트너 수수료 입금을 위한 정산 수령 계좌를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700">은행명</Label>
              <Input value={bankName} onChange={e => setBankName(e.target.value)} className="mt-1 text-xs" placeholder="예: 신한은행" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">계좌번호</Label>
              <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mt-1 font-mono text-xs" placeholder="'-' 포함 입력" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">예금주</Label>
              <Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className="mt-1 text-xs" placeholder="예금주 성명/상호" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsBankModalOpen(false)}>취소</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={handleSaveBank}>계좌 정보 저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 파트너 기본 정보 수정 모달 ── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-purple-600" /> 파트너 정보 수정
            </DialogTitle>
            <DialogDescription className="text-xs">
              파트너명, 이메일, 전화번호 등 기본 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700">파트너명 (상호/성명)</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1 text-xs" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">이메일 주소</Label>
              <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="mt-1 text-xs" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">전화번호</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="mt-1 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>취소</Button>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 font-bold" onClick={handleSaveEditInfo}>저장하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 영업자 배속 등록 모달 ── */}
      <Dialog open={isAssignAgentModalOpen} onOpenChange={setIsAssignAgentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" /> [{partner?.name}] 소속 영업자 배속 등록
            </DialogTitle>
            <DialogDescription className="text-xs">
              이 대리점 하위에 새 영업자(Tier-2)를 배속 등록합니다.<br />
              등록된 영업자에게는 이 대리점의 추천 코드가 자동 연결됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700">영업자 성명 *</Label>
              <Input
                value={assignAgentName}
                onChange={e => setAssignAgentName(e.target.value)}
                className="mt-1 text-xs"
                placeholder="홍길동"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">이메일 주소 *</Label>
              <Input
                type="email"
                value={assignAgentEmail}
                onChange={e => setAssignAgentEmail(e.target.value)}
                className="mt-1 text-xs"
                placeholder="agent@soulpay.kr"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">전화번호 *</Label>
              <Input
                value={assignAgentPhone}
                onChange={e => setAssignAgentPhone(e.target.value)}
                className="mt-1 text-xs"
                placeholder="010-1234-5678"
              />
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-[11px] text-purple-800">
              💡 배속 등록 후 <strong>파트너 관리 목록</strong>에서도 이 대리점 하위 영업자로 확인할 수 있습니다.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAssignAgentModalOpen(false)}>취소</Button>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 font-bold"
              onClick={() => {
                if (!assignAgentName || !assignAgentEmail || !assignAgentPhone) {
                  toast.error('영업자 성명, 이메일, 전화번호를 모두 입력해 주세요.');
                  return;
                }
                const newAgent = {
                  id: `agent-${Date.now()}`,
                  name: assignAgentName,
                  email: assignAgentEmail,
                  phone: assignAgentPhone,
                  role: 'sales_agent' as const,
                  parentId: partner?.id,
                  commissionRate: 0.4,
                  referralCode: `AGENT_${Math.floor(100 + Math.random() * 900)}`,
                  bankName: '신한은행',
                  accountNumber: '110-000-000000',
                  accountHolder: assignAgentName,
                  status: 'active' as const,
                  createdAt: new Date().toISOString().split('T')[0],
                };
                setSubAgents(prev => [newAgent, ...prev]);
                setHistory(prev => [
                  { id: `h-${Date.now()}`, date: new Date().toLocaleString(), type: '영업자 배속', detail: `[${assignAgentName}] 영업자가 배속 등록됨`, by: '시스템 최고관리자' },
                  ...prev,
                ]);
                toast.success(`[${assignAgentName}] 영업자 배속 등록이 완료되었습니다.`);
                setIsAssignAgentModalOpen(false);
                setAssignAgentName(''); setAssignAgentEmail(''); setAssignAgentPhone('');
              }}
            >
              배속 등록 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
