import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useApp, mockTenants } from '../../context/AppContext';
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

// Mock data
const monthlyData = [
  { month: '1월', amount: 42500000, key: 'jan' },
  { month: '2월', amount: 53200000, key: 'feb' },
  { month: '3월', amount: 84215000, key: 'mar' },
];

const recentDonations = [
  { id: 'FP1205', name: '홍길동', item: '십일조', amount: 50000, time: '20:10', status: '완료' },
  { id: 'FP1204', name: '김철수', item: '건축헌금', amount: 1000000, time: '19:45', status: '가상계좌' },
  { id: 'FP1203', name: '이영희', item: '감사헌금', amount: 100000, time: '18:30', status: '완료' },
  { id: 'FP1202', name: '박민수', item: '십일조', amount: 300000, time: '17:15', status: '완료' },
  { id: 'FP1201', name: '정수진', item: '건축헌금', amount: 500000, time: '16:00', status: '완료' },
];

export default function AdminDashboard() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant } = useApp();

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, setCurrentTenant]);

  if (!currentTenant) {
    return null;
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
                <div className="text-2xl font-bold">84,215,000원</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600 font-semibold">+15%</span> vs 전월
                </p>
                <div className="mt-2">
                  <TrendingUp className="h-4 w-4 inline text-green-600 mr-1" />
                  <span className="text-sm text-green-600 font-medium">증가 추세</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">신규 {currentTenant.terminology.member}</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42명</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600 font-semibold">+5%</span> vs 전월
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
                <div className="text-2xl font-bold">12건</div>
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
                <CardDescription>최근 3개월</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
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
                <CardDescription>최근 3개월</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
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
                  {recentDonations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell className="font-mono">{donation.id}</TableCell>
                      <TableCell className="font-medium">{donation.name}</TableCell>
                      <TableCell>{donation.item}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {donation.amount.toLocaleString()}원
                      </TableCell>
                      <TableCell>{donation.time}</TableCell>
                      <TableCell>
                        <Badge
                          variant={donation.status === '완료' ? 'default' : 'secondary'}
                        >
                          {donation.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}