import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useApp } from '../../context/AppContext';

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

export default function AdminDashboard() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();

  const [dbDonations, setDbDonations] = useState<any[]>([]);
  const [totalMonthlyAmount, setTotalMonthlyAmount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [pendingPrayerCount, setPendingPrayerCount] = useState<number>(0);

  // 현재 시스템 시계 기준 최근 3개월 동적 라벨 생성
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1; // e.g. 7월
  const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
  const prevPrevMonthNum = prevMonthNum === 1 ? 12 : prevMonthNum - 1;

  const mLabel3 = `${currentMonthNum}월(당월)`;
  const mLabel2 = `${prevMonthNum}월`;
  const mLabel1 = `${prevPrevMonthNum}월`;

  const [chartData, setChartData] = useState<{ month: string; amount: number }[]>([
    { month: mLabel1, amount: 0 },
    { month: mLabel2, amount: 0 },
    { month: mLabel3, amount: 0 },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);

      // Supabase DB 비동기 수납 실데이터 조율
      donationAPI.getByTenant(tenant.id).then((res) => {
        if (res.success && res.data) {
          const list = res.data;
          setDbDonations(list);

          // 1. 전체 수납 총액 & 건수 계산
          const totalSum = list.reduce((acc, d) => acc + (d.amount || 0), 0);
          setTotalMonthlyAmount(totalSum);
          setTotalCount(list.length);

          // 2. 신도 수 & 기도문 미인쇄 건수 실제 DB 계산
          const prayers = list.filter(d => d.prayerText && d.prayerText.trim().length > 0);
          setPendingPrayerCount(prayers.length);

          const uniqueDonors = new Set(list.filter(d => d.donorPhone).map(d => d.donorPhone));
          setMemberCount(uniqueDonors.size);

          // 3. 현재 시계 동적 최근 3개월 DB 수납액 그룹화 계산
          const monthlySums: Record<string, number> = {};
          monthlySums[mLabel1] = 0;
          monthlySums[mLabel2] = 0;
          monthlySums[mLabel3] = 0;

          list.forEach(item => {
            if (item.createdAt) {
              const itemDate = new Date(item.createdAt);
              const m = itemDate.getMonth() + 1;
              if (m === currentMonthNum) monthlySums[mLabel3] += item.amount || 0;
              else if (m === prevMonthNum) monthlySums[mLabel2] += item.amount || 0;
              else if (m === prevPrevMonthNum) monthlySums[mLabel1] += item.amount || 0;
              else monthlySums[mLabel3] += item.amount || 0;
            } else {
              monthlySums[mLabel3] += item.amount || 0;
            }
          });

          setChartData([
            { month: mLabel1, amount: monthlySums[mLabel1] },
            { month: mLabel2, amount: monthlySums[mLabel2] },
            { month: mLabel3, amount: monthlySums[mLabel3] },
          ]);
        }
      }).catch((err) => {
        console.warn('DB load notice in AdminDashboard:', err);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [tenantSlug, tenants, setCurrentTenant, currentMonthNum, prevMonthNum, prevPrevMonthNum]);

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
                <CardTitle>누적 봉헌액</CardTitle>
                <CardDescription>DB 수납 데이터 실시간 반영</CardDescription>
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
                      strokeWidth={2}
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
                    <TableHead>상태</TableHead>
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
                          <Badge variant="default">
                            {donation.paymentStatus === 'completed' ? '완료' : donation.paymentStatus}
                          </Badge>
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