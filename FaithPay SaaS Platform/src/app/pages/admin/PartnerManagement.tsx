import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Briefcase,
  Users,
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  CheckCircle,
  FileText,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Partner, partnerAPI } from '../../api/client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

export default function PartnerManagement() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadPartners() {
      setIsLoading(true);
      try {
        const res = await partnerAPI.getAll();
        if (res.success && res.data) {
          setPartners(res.data);
        } else {
          setPartners([]);
        }
      } catch (err) {
        console.error('Error loading partners:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPartners();
  }, []);

  // New Partner Form state
  const [role, setRole] = useState<'master_agency' | 'sales_agent'>('sales_agent');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [parentId, setParentId] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(0.4);
  const [referralCode, setReferralCode] = useState('');
  const [bankName, setBankName] = useState('신한은행');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  const filteredPartners = partners.filter(p => 
    p.name.includes(searchTerm) || p.referralCode.includes(searchTerm)
  );

  const handleApprovePartner = (id: string) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p));
    toast.success('파트너 승인이 완료되었습니다.');
  };

  const handleUpdateCommissionRate = (id: string, newRate: number) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, commissionRate: newRate } : p));
    toast.success('수수료율이 수정되었습니다.');
  };

  const handleCreatePartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      toast.error('파트너 기본 정보를 입력해 주세요.');
      return;
    }

    const newPartner: Partner = {
      id: `partner-${Date.now()}`,
      name,
      email,
      phone,
      role,
      parentId: role === 'sales_agent' ? parentId || 'partner-001' : undefined,
      commissionRate,
      referralCode: referralCode || `AGENT_${Math.floor(100 + Math.random() * 900)}`,
      bankName,
      accountNumber: accountNumber || '110-000-000000',
      accountHolder: accountHolder || name,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setPartners([newPartner, ...partners]);
    setIsModalOpen(false);
    toast.success(`[${name}] 신규 파트너가 성공적으로 등록되었습니다!`);

    // Reset Form
    setName('');
    setEmail('');
    setPhone('');
    setReferralCode('');
    setAccountNumber('');
    setAccountHolder('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-purple-600" />
            영업 파트너 & 다계층 수수료 관리
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            총판/대리점/영업자별 수수료 수율(%)을 설정하고 월별 수수료 정산 명세서를 관리합니다.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 font-bold">
          <Plus className="h-4 w-4 mr-2" /> 신규 총판/영업자 직접 등록
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">등록된 영업 파트너</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{partners.length}명</div>
            <p className="text-xs text-muted-foreground mt-1">총판 1개 / 대리점 2개</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">당월 지급 예정 총 수수료</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">903,000원</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">익월 10일 일괄 정산 예정</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">승인 대기 영업자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {partners.filter(p => p.status === 'pending').length}명
            </div>
            <p className="text-xs text-muted-foreground mt-1">신규 파트너 심사 필요</p>
          </CardContent>
        </Card>
      </div>

      {/* Partners List Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold">영업 파트너 대장</CardTitle>
              <CardDescription>플랫폼 내 활성화된 영업 총판 및 에이전트 목록입니다.</CardDescription>
            </div>
            <div className="w-full sm:w-64 relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="파트너명 또는 추천코드 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>구분</TableHead>
                <TableHead>파트너명 / 대표자</TableHead>
                <TableHead>추천 코드</TableHead>
                <TableHead className="text-right">설정 수수료율 (%)</TableHead>
                <TableHead>정산 계좌</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-center">조치</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge variant={p.role === 'master_agency' ? 'default' : 'outline'} className="text-[11px]">
                      {p.role === 'master_agency' ? 'Tier-1 총판' : 'Tier-2 영업자'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.email} | {p.phone}</div>
                    {p.role === 'sales_agent' && p.parentId && (
                      <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                        ↳ 소속 총판: {partners.find(m => m.id === p.parentId)?.name || '주식회사 파이프라인'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">{p.referralCode}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={p.commissionRate}
                        onChange={(e) => handleUpdateCommissionRate(p.id, parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-right font-bold text-xs"
                      />
                      <span>%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{p.bankName} {p.accountNumber}</div>
                    <div className="text-slate-400">예금주: {p.accountHolder}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                      {p.status === 'active' ? '승인' : '대기'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.status === 'pending' ? (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold" onClick={() => handleApprovePartner(p.id)}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> 승인
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="text-xs">
                        <FileText className="h-3.5 w-3.5 mr-1" /> 정산서
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 신규 총판/영업자 직접 등록 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              신규 총판 / 영업자 직접 등록
            </DialogTitle>
            <DialogDescription className="text-xs">
              FaithPay 영업 파트너를 등록하고 계층별 분배 수수료율(%)을 지정합니다.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePartnerSubmit} className="space-y-4 py-2">
            
            {/* 파트너 구분 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">파트너 구분 *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setRole('master_agency'); setCommissionRate(0.7); setParentId(''); }}
                  className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                    role === 'master_agency'
                      ? 'bg-purple-50 border-purple-600 text-purple-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Tier-1 총판 / 대리점 (0.7%)
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    setRole('sales_agent'); 
                    setCommissionRate(0.4);
                    const masterAgencies = partners.filter(p => p.role === 'master_agency');
                    if (masterAgencies.length > 0) setParentId(masterAgencies[0].id);
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                    role === 'sales_agent'
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Tier-2 영업자 / 에이전트 (0.4%)
                </button>
              </div>
            </div>

            {/* Tier-2 영업자일 경우 소속 상위 총판 선택 */}
            {role === 'sales_agent' && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
                <Label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  🏢 소속 상위 총판 (Tier-1 Master Partner) 선택 *
                </Label>
                <Select value={parentId} onValueChange={(v) => setParentId(v)}>
                  <SelectTrigger className="h-9 bg-white border-indigo-200 text-xs font-bold text-indigo-900 rounded-lg">
                    <SelectValue placeholder="소속 총판을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.filter(p => p.role === 'master_agency').map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs font-bold">
                        {m.name} ({m.referralCode} - {m.commissionRate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-indigo-700">
                  * 선택한 총판의 하위 영업자로 자동 귀속되어 다계층 정산이 연동됩니다.
                </p>
              </div>
            )}

            {/* 기본 정보 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">파트너명 / 대표자 성함 *</Label>
                <Input
                  placeholder="예: 김영업 파트너 (서울강남)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">연락처 *</Label>
                <Input
                  placeholder="010-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">이메일 주소 *</Label>
                <Input
                  type="email"
                  placeholder="partner@faithpay.kr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">영업자 추천 코드</Label>
                <Input
                  placeholder="AGENT_KIM77 (미입력 시 자동)"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="font-mono text-xs uppercase"
                />
              </div>
            </div>

            {/* 수수료율 및 정산 계좌 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">지급 수수료율 (%) *</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-20 h-8 text-right font-bold text-xs bg-white"
                  />
                  <span className="text-xs font-bold">%</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">은행명</Label>
                  <Input
                    placeholder="신한은행"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">계좌번호</Label>
                  <Input
                    placeholder="110-123-456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">예금주</Label>
                  <Input
                    placeholder="홍길동"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                취소
              </Button>
              <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 font-bold">
                신규 파트너 즉시 등록
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
