import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { normalizePhoneNumber } from '../../utils/phoneUtils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  TrendingUp,
  ArrowUpRight,
  DollarSign,
  UserPlus,
  AlertCircle,
  Menu,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { AdminSidebar } from '../../components/AdminSidebar';

import { donationAPI } from '../../api/client';
import { assignSequentialDonationIds } from './DonationHistory';

const normalizeDonation = (d: any) => {
  const rawDate = d.createdAt ?? d.created_at ?? d.date;
  let validCreatedAt = new Date().toISOString();
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      validCreatedAt = parsed.toISOString();
    }
  }

  const rawName = d.donorName ?? d.donor_name ?? d.name;
  const nameStr = rawName ? String(rawName).trim() : '';
  const isAnon = !nameStr || nameStr === '무기명' || nameStr.includes('무명') || nameStr.includes('익명');
  const donorName = isAnon ? '무기명' : nameStr;

  const rawMethod = d.paymentMethod ?? d.payment_method ?? d.method;
  const paymentMethod = rawMethod ? (String(rawMethod).includes('카드') ? '신용카드' : String(rawMethod)) : '신용카드';

  const rawStatus = d.paymentStatus ?? d.payment_status ?? d.status;
  let paymentStatus = (rawStatus && String(rawStatus).trim().length > 0) ? String(rawStatus).trim() : 'completed';

  if (paymentStatus === 'pending') {
    const isInstantPayment = paymentMethod === '신용카드' || paymentMethod === '카카오페이' || paymentMethod === '네이버페이' || paymentMethod.includes('카드');
    if (isInstantPayment) {
      const createdTime = new Date(validCreatedAt).getTime();
      const nowTime = Date.now();
      const elapsedMinutes = (nowTime - createdTime) / (1000 * 60);
      if (elapsedMinutes > 30) {
        paymentStatus = 'failed';
      }
    }
  }

  return {
    ...d,
    createdAt: validCreatedAt,
    donorName,
    paymentMethod,
    paymentStatus,
    amount: Number(d.amount) || 0,
  };
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-semibold">결제완료</Badge>;
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-semibold">결제대기</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 font-semibold">결제실패</Badge>;
    case 'cancelled':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 font-semibold">결제취소</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function AdminDashboard() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();

  const [dbDonations, setDbDonations] = useState<any[]>([]);
  const [totalMonthlyAmount, setTotalMonthlyAmount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [pendingPrayerCount, setPendingPrayerCount] = useState<number>(0);

  // 현재 시스템 시계 기준 최근 3개월 동적 라벨 및 YYYY-MM 키 생성
  const now = new Date();
  const d3 = new Date(now.getFullYear(), now.getMonth(), 1);
  const d2 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const d1 = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const ymKey3 = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, '0')}`;
  const ymKey2 = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}`;
  const ymKey1 = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}`;

  const mLabel3 = `${d3.getMonth() + 1}월(당월)`;
  const mLabel2 = `${d2.getMonth() + 1}월`;
  const mLabel1 = `${d1.getMonth() + 1}월`;

  const [chartData, setChartData] = useState<{ month: string; amount: number }[]>([
    { month: mLabel1, amount: 0 },
    { month: mLabel2, amount: 0 },
    { month: mLabel3, amount: 0 },
  ]);
  const [cumulativeChartData, setCumulativeChartData] = useState<{ month: string; cumulativeAmount: number }[]>([
    { month: mLabel1, cumulativeAmount: 0 },
    { month: mLabel2, cumulativeAmount: 0 },
    { month: mLabel3, cumulativeAmount: 0 },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);

      // Supabase DB 비동기 수납 실데이터 조율
      donationAPI.getByTenant(tenant.id).then((res) => {
        if (res.success && res.data) {
          const list = assignSequentialDonationIds(res.data);
          setDbDonations(list);

          // 1. 정상 결제완료(completed) 건만 수납 총액 및 건수 집계에 포함
          const completedDonations = list.filter((d) => d.paymentStatus === 'completed');
          const totalSum = completedDonations.reduce((acc, d) => acc + (d.amount || 0), 0);
          setTotalMonthlyAmount(totalSum);
          setTotalCount(completedDonations.length);

          // 2. 신도 수 & 기도문 미인쇄 건수 실제 DB 계산
          const prayers = list.filter(d => d.prayerText && d.prayerText.trim().length > 0);
          setPendingPrayerCount(prayers.length);

          const uniqueDonors = new Set(
            list.filter(d => d.donorPhone).map(d => normalizePhoneNumber(d.donorPhone))
          );
          setMemberCount(uniqueDonors.size);

          // 3. 최근 3개월 YYYY-MM 키 기반 정밀 수납액 집계 (completed 기준)
          const monthlySums: Record<string, number> = {
            [ymKey1]: 0,
            [ymKey2]: 0,
            [ymKey3]: 0,
          };

          completedDonations.forEach(item => {
            if (item.createdAt) {
              const itemDate = new Date(item.createdAt);
              if (!isNaN(itemDate.getTime())) {
                const itemYm = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
                if (monthlySums[itemYm] !== undefined) {
                  monthlySums[itemYm] += item.amount || 0;
                }
              }
            }
          });

          const amt1 = monthlySums[ymKey1];
          const amt2 = monthlySums[ymKey2];
          const amt3 = monthlySums[ymKey3];

          setChartData([
            { month: mLabel1, amount: amt1 },
            { month: mLabel2, amount: amt2 },
            { month: mLabel3, amount: amt3 },
          ]);

          // 4. 누적 수납액 계산 (Cumulative Summation)
          const cum1 = amt1;
          const cum2 = cum1 + amt2;
          const cum3 = cum2 + amt3;

          setCumulativeChartData([
            { month: mLabel1, cumulativeAmount: cum1 },
            { month: mLabel2, cumulativeAmount: cum2 },
            { month: mLabel3, cumulativeAmount: cum3 },
          ]);
        }
      }).catch((err) => {
        console.warn('DB load notice in AdminDashboard:', err);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

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

  if (!currentAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>관리자 로그인이 필요합니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end pt-4">
            <Button onClick={() => navigate('/admin/login')}>
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPath = `/${tenantSlug}/admin`;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
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
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">대시보드</h1>
                <p className="text-muted-foreground">{currentTenant.name}</p>
              </div>
              <Button variant="outline" onClick={() => navigate(`/${tenantSlug}`)}>
                신도 페이지 보기
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">이번 달 총 봉헌액</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMonthlyAmount.toLocaleString()}원</div>
                <p className="text-xs text-muted-foreground mt-1">
                  총 <span className="text-green-600 font-semibold">{totalCount}건</span> 결제 접수
                </p>
                <div className="mt-2">
                  <TrendingUp className="h-4 w-4 inline text-green-600 mr-1" />
                  <span className="text-sm text-green-600 font-medium">DB 실시간 동기화 완료</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">신규 {currentTenant.terminology.member}</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{memberCount}명</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600 font-semibold">DB 데이터 동기화</span>
                </p>
                <Button variant="link" className="mt-2 p-0 h-auto" asChild>
                  <Link to={`/${tenantSlug}/admin/members`}>
                    회원 목록 보기
                    <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">대기중인 {currentTenant.terminology.prayer}</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingPrayerCount}건</div>
                <p className="text-xs text-muted-foreground mt-1">
                  미인쇄 항목
                </p>
                <Button variant="link" className="mt-2 p-0 h-auto" asChild>
                  <Link to={`/${tenantSlug}/admin/prayers`}>
                    바로가기
                    <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>월별 봉헌액 추이</CardTitle>
                <CardDescription>DB 수납 데이터 실시간 반영</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                    <Bar dataKey="amount" fill={currentTenant.primaryColor} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>월별 봉헌액 추이 (꺾은선)</CardTitle>
                <CardDescription>월별 수납 금액 변동 추이 (결제완료 기준)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={currentTenant.primaryColor}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Donations */}
          <Card>
            <CardHeader>
              <CardTitle>실시간 봉헌 내역</CardTitle>
              <CardDescription>오늘 접수된 최근 봉헌</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>접수번호</TableHead>
                    <TableHead>성명</TableHead>
                    <TableHead>항목</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>시간</TableHead>
                    <TableHead>결제상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dbDonations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        접수된 봉헌 내역이 없습니다. (신도 페이지에서 테스트 결제를 진행해보세요)
                      </TableCell>
                    </TableRow>
                  ) : (
                    dbDonations.slice(0, 10).map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell className="font-mono text-xs">{donation.id}</TableCell>
                        <TableCell className="font-medium">{donation.donorName}</TableCell>
                        <TableCell>{donation.itemName}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                          {donation.amount.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {donation.createdAt ? new Date(donation.createdAt).toLocaleString('ko-KR') : '방금 전'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(donation.paymentStatus)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}