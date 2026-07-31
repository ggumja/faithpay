import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
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
  Building2,
  DollarSign,
  TrendingUp,
  Plus,
  Copy,
  CheckCircle,
  ExternalLink,
  Users,
  Calendar,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { Partner, PartnerCommission } from '../../api/client';

// Mock Partner data for demo
const mockCurrentPartner: Partner = {
  id: 'partner-001',
  name: '김영업 총판 (주식회사 파이프라인)',
  email: 'sales@pipeline.co.kr',
  phone: '010-9876-5432',
  role: 'master_agency',
  commissionRate: 0.7, // 0.7%
  referralCode: 'PIPELINE_KIM',
  bankName: '신한은행',
  accountNumber: '110-123-456789',
  accountHolder: '주식회사 파이프라인',
  status: 'active',
  createdAt: '2026-01-15',
};

const mockPartnerTenants = [
  { id: '1', name: '각원사', slug: 'gakwonsa', religion: '불교', monthlyDonation: 36000000, commission: 252000, createdAt: '2026-02-01' },
  { id: '2', name: '기쁨의교회', slug: 'joyful-church', religion: '기독교', monthlyDonation: 52000000, commission: 364000, createdAt: '2026-02-15' },
  { id: '3', name: '명동성당', slug: 'myeongdong', religion: '천주교', monthlyDonation: 41000000, commission: 287000, createdAt: '2026-03-01' },
];

const mockCommissionsHistory: PartnerCommission[] = [
  { id: 'pc-1', partnerId: 'partner-001', tenantId: '1', tenantName: '각원사', donationId: 'FP2026010', donationAmount: 500000, commissionAmount: 3500, settlementStatus: 'paid', createdAt: '2026-03-28 14:20' },
  { id: 'pc-2', partnerId: 'partner-001', tenantId: '2', tenantName: '기쁨의교회', donationId: 'FP2026011', donationAmount: 1000000, commissionAmount: 7000, settlementStatus: 'paid', createdAt: '2026-03-28 15:40' },
  { id: 'pc-3', partnerId: 'partner-001', tenantId: '1', tenantName: '각원사', donationId: 'FP2026012', donationAmount: 100000, commissionAmount: 700, settlementStatus: 'pending', createdAt: '2026-03-29 10:15' },
];

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const { tenants } = useApp();
  const [partner] = useState<Partner>(mockCurrentPartner);
  const [myTenants, setMyTenants] = useState(mockPartnerTenants);
  const [commissions] = useState<PartnerCommission[]>(mockCommissionsHistory);

  const inviteUrl = `${window.location.origin}/onboarding?ref=${partner.referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast.success('영업자 전용 개설 초대 링크가 복사되었습니다!');
  };

  const totalMonthlyVolume = myTenants.reduce((acc, t) => acc + t.monthlyDonation, 0);
  const totalMonthlyCommission = myTenants.reduce((acc, t) => acc + t.commission, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-emerald-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">FaithPay 영업 파트너 포털</h1>
              <p className="text-xs text-slate-400">대리점 & 영업자 통합 정산 대시보드</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold">{partner.name}</p>
              <Badge className="bg-emerald-600 text-white text-[11px] hover:bg-emerald-600">
                {partner.role === 'master_agency' ? 'Tier-1 총판/대리점' : 'Tier-2 영업자'} ({partner.commissionRate}%)
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" onClick={() => navigate('/partner/login')}>
              <LogOut className="h-4 w-4 mr-1" /> 로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Referral Link & Quick Tenant Create Banner */}
        <Card className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-lg overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60">
                  ⚡ 1초 현장 개설 지원
                </span>
                <h2 className="text-2xl font-black tracking-tight">
                  사찰 / 교회 계정 신규 개설
                </h2>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  영업자 전용 폼을 통해 사찰 주지스님 및 교회 담임목사님 대신 현장에서 즉시 계정을 생성해 주실 수 있습니다.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  size="lg" 
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold shadow-md"
                  onClick={() => navigate('/partner/tenants/new')}
                >
                  <Plus className="h-5 w-5 mr-1.5" /> 현장 단체 계정 바로 생성
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4 mr-1.5" /> 초대 링크 복사
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview KPI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">관리 사찰/교회 수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                <Building2 className="h-6 w-6" /> {myTenants.length}개소
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">본인 귀속 영업 단체</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">당월 하위 수납 결제 총액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {totalMonthlyVolume.toLocaleString()}원
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">실시간 집계 완료</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">금월 정산 예정 수수료 ({partner.commissionRate}%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 flex items-center gap-1.5">
                <DollarSign className="h-6 w-6" /> {totalMonthlyCommission.toLocaleString()}원
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">익월 10일 통장 입금 예정</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">정산 계좌 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-slate-800">{partner.bankName}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{partner.accountNumber}</div>
              <div className="text-[11px] text-slate-400 mt-1">예금주: {partner.accountHolder}</div>
            </CardContent>
          </Card>
        </div>

        {/* Managed Tenants List Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold">내 영업 관리 사찰 & 교회 목록</CardTitle>
                <CardDescription>본인이 개설하여 다계층 수수료가 발생 중인 종교 단체 목록입니다.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>종교</TableHead>
                  <TableHead>단체명</TableHead>
                  <TableHead>개설일</TableHead>
                  <TableHead className="text-right">월 수납 총액</TableHead>
                  <TableHead className="text-right">내 월 수수료 ({partner.commissionRate}%)</TableHead>
                  <TableHead className="text-center">이동</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-bold">
                        {t.religion}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">{t.name}</TableCell>
                    <TableCell className="text-xs text-slate-500">{t.createdAt}</TableCell>
                    <TableCell className="text-right font-semibold">{t.monthlyDonation.toLocaleString()}원</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      +{t.commission.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/${t.slug}`)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Real-time Commission Stream Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">실시간 수수료 발생 기록 (Commission Log)</CardTitle>
            <CardDescription>신도들의 보시/헌금 결제가 완료될 때마다 분배 분이 실시간으로 적립됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableRow key="head">
                    <TableHead>발생일시</TableHead>
                    <TableHead>단체명</TableHead>
                    <TableHead>결제번호</TableHead>
                    <TableHead className="text-right">신도 결제액</TableHead>
                    <TableHead className="text-right">영업 수수료 적립</TableHead>
                    <TableHead className="text-center">정산상태</TableHead>
                  </TableRow>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs text-slate-500">{c.createdAt}</TableCell>
                    <TableCell className="font-bold">{c.tenantName}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{c.donationId}</TableCell>
                    <TableCell className="text-right font-semibold">{c.donationAmount.toLocaleString()}원</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">+{c.commissionAmount.toLocaleString()}원</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.settlementStatus === 'paid' ? 'default' : 'secondary'}>
                        {c.settlementStatus === 'paid' ? '입금완료' : '정산대기'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
