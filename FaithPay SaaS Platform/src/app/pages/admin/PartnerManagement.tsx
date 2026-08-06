import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Briefcase, Users, Plus, CheckCircle, FileText, Search,
  Building2, UserCheck, Ban, Copy, ChevronDown, ChevronUp, Eye, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Partner, partnerAPI } from '../../api/client';

type TabKey = 'agency' | 'agent';

export default function PartnerManagement() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<TabKey>('agency');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 등록 모달이 열릴 때 탭에 따라 역할 자동 설정
  const openModal = (forRole: 'master_agency' | 'sales_agent') => {
    setRole(forRole);
    if (forRole === 'sales_agent') {
      const first = partners.find(p => p.role === 'master_agency');
      if (first) setParentId(first.id);
    } else {
      setParentId('');
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await partnerAPI.getAll();
        setPartners(res.success && Array.isArray(res.data) ? res.data : []);
      } catch {
        setPartners([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // 등록 폼 상태
  const [role, setRole] = useState<'master_agency' | 'sales_agent'>('master_agency');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [parentId, setParentId] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(0.7);
  const [referralCode, setReferralCode] = useState('');
  const [bankName, setBankName] = useState('신한은행');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  // 파생 목록
  const agencies = partners.filter(p => p.role === 'master_agency');
  const agents   = partners.filter(p => p.role === 'sales_agent');

  const filteredAgencies = agencies.filter(p =>
    p.name.includes(searchTerm) || p.referralCode.includes(searchTerm)
  );
  const filteredAgents = agents.filter(p =>
    p.name.includes(searchTerm) || p.referralCode.includes(searchTerm)
  );

  const handleApprove = (id: string) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p));
    toast.success('파트너 승인이 완료되었습니다.');
  };

  const handleSuspend = (id: string, name: string) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, status: 'suspended' } : p));
    toast.success(`${name} 계정이 정지되었습니다.`);
  };

  const handleUpdateRate = (id: string, newRate: number) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, commissionRate: newRate } : p));
    toast.success('수수료율이 수정되었습니다.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) { toast.error('필수 정보를 입력해 주세요.'); return; }

    const newPartner: Partner = {
      id: `partner-${Date.now()}`,
      name, email, phone, role,
      parentId: role === 'sales_agent' ? parentId || undefined : undefined,
      commissionRate,
      referralCode: referralCode || `${role === 'master_agency' ? 'AGENCY' : 'AGENT'}_${Math.floor(100 + Math.random() * 900)}`,
      bankName,
      accountNumber: accountNumber || '110-000-000000',
      accountHolder: accountHolder || name,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setPartners([newPartner, ...partners]);
    setIsModalOpen(false);
    toast.success(`[${name}] ${role === 'master_agency' ? '영업 대리점' : '영업자'} 등록 완료!`);
    setName(''); setEmail(''); setPhone(''); setReferralCode(''); setAccountNumber(''); setAccountHolder('');
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

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '영업 대리점', value: `${agencies.length}개`, color: 'text-purple-600', bg: 'bg-purple-50', icon: Building2 },
          { label: '영업자',     value: `${agents.length}명`,   color: 'text-indigo-600', bg: 'bg-indigo-50',  icon: Users },
          { label: '승인 대기',  value: `${partners.filter(p => p.status === 'pending').length}건`, color: 'text-amber-600',  bg: 'bg-amber-50',  icon: UserCheck },
          { label: '당월 정산 예정', value: '903,000원', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Briefcase },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className={`text-[20px] font-bold leading-none ${color}`}>{value}</div>
              <div className="text-[10.5px] text-slate-400 mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 탭 + 검색 + 등록 버튼 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* 탭 */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('agency')}
            className={`px-4 py-1.5 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer border-0
              ${tab === 'agency' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
          >
            🏢 영업 대리점 ({agencies.length})
          </button>
          <button
            onClick={() => setTab('agent')}
            className={`px-4 py-1.5 rounded-lg text-[12.5px] font-bold transition-all cursor-pointer border-0
              ${tab === 'agent' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
          >
            💼 영업자 ({agents.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 검색 */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="이름·코드 검색"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs w-44"
            />
          </div>
          {/* 등록 */}
          <Button
            size="sm"
            className={`text-xs font-bold ${tab === 'agency' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            onClick={() => openModal(tab === 'agency' ? 'master_agency' : 'sales_agent')}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {tab === 'agency' ? '대리점 등록' : '영업자 등록'}
          </Button>
        </div>
      </div>

      {/* ══ 대리점 탭 ══ */}
      {tab === 'agency' && (
        <Card className="border-purple-100">
          <CardHeader className="pb-3 bg-purple-50/50 border-b border-purple-100">
            <CardTitle className="text-[14px] font-bold text-purple-900 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> 영업 대리점 (Tier-1) 관리
            </CardTitle>
            <CardDescription className="text-[11.5px]">
              대리점은 하위 영업자를 모집하고 오버라이딩 방식으로 수수료를 수령합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
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
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number" step="0.1" min="0" max="3"
                            value={(p as any).agencyRate ?? p.commissionRate}
                            onChange={e => handleUpdateRate(p.id, parseFloat(e.target.value) || 0)}
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
                              onClick={() => handleApprove(p.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> 승인
                            </Button>
                          ) : p.status === 'active' ? (
                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 border-red-200 text-red-500 hover:bg-red-50"
                              onClick={() => handleSuspend(p.id, p.name)}>
                              <Ban className="h-3 w-3 mr-1" /> 정지
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleApprove(p.id)}>
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

      {/* ══ 영업자 탭 ══ */}
      {tab === 'agent' && (
        <Card className="border-indigo-100">
          <CardHeader className="pb-3 bg-indigo-50/50 border-b border-indigo-100">
            <CardTitle className="text-[14px] font-bold text-indigo-900 flex items-center gap-2">
              <Users className="h-4 w-4" /> 영업자 (Tier-2) 관리
            </CardTitle>
            <CardDescription className="text-[11.5px]">
              영업자는 사찰·교회를 현장 개설하고 결제액에 대한 수수료를 수령합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
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
                        <span className="text-[12px] font-bold text-slate-600">—</span>
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
                              onClick={() => handleApprove(p.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> 승인
                            </Button>
                          ) : p.status === 'active' ? (
                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 border-red-200 text-red-500 hover:bg-red-50"
                              onClick={() => handleSuspend(p.id, p.name)}>
                              <Ban className="h-3 w-3 mr-1" /> 정지
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleApprove(p.id)}>
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
                <Input type="email" placeholder="partner@faithpay.kr" value={email} onChange={e => setEmail(e.target.value)} className="h-8 text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">추천 코드 (미입력 시 자동)</Label>
                <Input placeholder="AGENCY_001" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} className="h-8 text-xs font-mono uppercase" />
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
    </div>
  );
}
