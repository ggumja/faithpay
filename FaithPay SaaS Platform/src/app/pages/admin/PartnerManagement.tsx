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
import { Partner } from '../../api/client';

const mockPartners: Partner[] = [
  {
    id: 'partner-001',
    name: '주식회사 파이프라인 (김영업 대표)',
    email: 'master@pipeline.co.kr',
    phone: '010-9876-5432',
    role: 'master_agency',
    commissionRate: 0.7,
    referralCode: 'PIPELINE_KIM',
    bankName: '신한은행',
    accountNumber: '110-123-456789',
    accountHolder: '주식회사 파이프라인',
    status: 'active',
    createdAt: '2026-01-15',
  },
  {
    id: 'partner-002',
    name: '이영업 파트너 (경기남부 총판)',
    email: 'agent_lee@gmail.com',
    phone: '010-2345-6789',
    role: 'sales_agent',
    parentId: 'partner-001',
    commissionRate: 0.4,
    referralCode: 'AGENT_LEE',
    bankName: '국민은행',
    accountNumber: '400401-04-123456',
    accountHolder: '이영업',
    status: 'active',
    createdAt: '2026-02-01',
  },
  {
    id: 'partner-003',
    name: '박영업 파트너 (충청불교 대리점)',
    email: 'park_buddha@naver.com',
    phone: '010-3456-7890',
    role: 'sales_agent',
    parentId: 'partner-001',
    commissionRate: 0.4,
    referralCode: 'AGENT_PARK',
    bankName: '농협',
    accountNumber: '302-0123-4567-89',
    accountHolder: '박영업',
    status: 'pending',
    createdAt: '2026-03-20',
  },
];

export default function PartnerManagement() {
  const [partners, setPartners] = useState<Partner[]>(mockPartners);
  const [searchTerm, setSearchTerm] = useState('');

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

        <Button className="bg-purple-600 hover:bg-purple-700 font-bold">
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

    </div>
  );
}
