import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useApp, mockTenants } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import {
  LayoutDashboard,
  Heart,
  Users,
  MessageSquare,
  FileText,
  Settings,
  DollarSign,
  Menu,
  Download,
  FileText as FileTextIcon,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';

// Mock data
const monthlySettlement = [
  {
    month: '2026-01',
    totalDonations: 42500000,
    pgFees: 637500,
    platformFees: 212500,
    netAmount: 41650000,
    settlementDate: '2026-02-05',
    status: '완료',
  },
  {
    month: '2026-02',
    totalDonations: 53200000,
    pgFees: 798000,
    platformFees: 266000,
    netAmount: 52136000,
    settlementDate: '2026-03-05',
    status: '완료',
  },
  {
    month: '2026-03',
    totalDonations: 84215000,
    pgFees: 1263225,
    platformFees: 421075,
    netAmount: 82530700,
    settlementDate: '2026-04-05',
    status: '예정',
  },
];

const categoryData = [
  { name: '십일조', value: 45000000, color: '#3b82f6' },
  { name: '감사헌금', value: 18000000, color: '#10b981' },
  { name: '건축헌금', value: 21215000, color: '#f59e0b' },
];

const paymentMethodData = [
  { name: '신용카드', value: 52000000, color: '#8b5cf6' },
  { name: '간편결제', value: 28000000, color: '#ec4899' },
  { name: '가상계좌', value: 4215000, color: '#6366f1' },
];

interface SidebarProps {
  tenantSlug?: string;
  currentPath: string;
}

function Sidebar({ tenantSlug, currentPath }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '대시보드', path: `/admin` },
    { id: 'donations', icon: Heart, label: '봉헌 내역', path: `/admin/donations` },
    { id: 'prayers', icon: MessageSquare, label: '기도문 관리', path: `/admin/prayers` },
    { id: 'menu', icon: FileText, label: '봉헌 메뉴', path: `/admin/menu` },
    { id: 'members', icon: Users, label: '회원 관리', path: `/admin/members` },
    { id: 'settlement', icon: DollarSign, label: '정산', path: `/admin/settlement` },
    { id: 'settings', icon: Settings, label: '설정', path: `/admin/settings` },
  ];

  return (
    <div className="w-64 bg-white border-r min-h-screen p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          FaithPay
        </h2>
        <p className="text-sm text-muted-foreground">관리자 대시보드</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const fullPath = `/${tenantSlug}${item.path}`;
          const isActive = currentPath === fullPath;
          return (
            <Link key={item.id} to={fullPath}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-start"
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function SettlementReports() {
  const { tenantSlug } = useParams();
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

  const currentPath = `/${tenantSlug}/admin/settlement`;

  const handleDownloadReport = (month: string) => {
    toast.success(`${month} 정산 리포트를 다운로드합니다`);
  };

  const handleDownloadReceipt = (month: string) => {
    toast.success(`${month} 세금계산서를 다운로드합니다`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar tenantSlug={tenantSlug} currentPath={currentPath} />
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
            <Sidebar tenantSlug={tenantSlug} currentPath={currentPath} />
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
                <h1 className="text-3xl font-bold mb-2">정산 리포트</h1>
                <p className="text-muted-foreground">
                  월별 봉헌액 정산 내역과 수수료를 확인할 수 있습니다
                </p>
              </div>
              <Button onClick={() => handleDownloadReport('전체')}>
                <Download className="h-4 w-4 mr-2" />
                전체 리포트 다운로드
              </Button>
            </div>
          </div>

          {/* Current Month Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">이번 달 총 봉헌액</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">84,215,000원</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <TrendingUp className="h-3 w-3 inline text-green-600 mr-1" />
                  <span className="text-green-600">+58.3%</span> vs 전월
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">PG 수수료</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">1,263,225원</div>
                <p className="text-xs text-muted-foreground mt-1">1.5%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">플랫폼 수수료</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">421,075원</div>
                <p className="text-xs text-muted-foreground mt-1">0.5%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">실 정산액</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">82,530,700원</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  정산일: 2026-04-05
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="monthly" className="space-y-6">
            <TabsList>
              <TabsTrigger value="monthly">월별 정산</TabsTrigger>
              <TabsTrigger value="category">항목별 분석</TabsTrigger>
              <TabsTrigger value="payment">결제 수단별</TabsTrigger>
            </TabsList>

            {/* Monthly Settlement */}
            <TabsContent value="monthly" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>월별 정산 내역</CardTitle>
                  <CardDescription>최근 3개월 정산 현황</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>월</TableHead>
                        <TableHead className="text-right">총 봉헌액</TableHead>
                        <TableHead className="text-right">PG 수수료</TableHead>
                        <TableHead className="text-right">플랫폼 수수료</TableHead>
                        <TableHead className="text-right">실 정산액</TableHead>
                        <TableHead>정산일</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySettlement.map((record) => (
                        <TableRow key={record.month}>
                          <TableCell className="font-medium">{record.month}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {record.totalDonations.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            -{record.pgFees.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right text-purple-600">
                            -{record.platformFees.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {record.netAmount.toLocaleString()}원
                          </TableCell>
                          <TableCell>{record.settlementDate}</TableCell>
                          <TableCell>
                            <Badge
                              variant={record.status === '완료' ? 'default' : 'secondary'}
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadReport(record.month)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadReceipt(record.month)}
                              >
                                <FileTextIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>월별 추이</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={monthlySettlement.map((item) => ({
                        month: item.month,
                        실정산액: item.netAmount,
                        총봉헌액: item.totalDonations,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                      <Legend />
                      <Bar dataKey="총봉헌액" fill="#94a3b8" />
                      <Bar dataKey="실정산액" fill={currentTenant.primaryColor} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Category Analysis */}
            <TabsContent value="category" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>항목별 봉헌액 (이번 달)</CardTitle>
                    <CardDescription>총 84,215,000원</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>항목별 상세</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categoryData.map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <span className="font-bold">{item.value.toLocaleString()}원</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${(item.value / 84215000) * 100}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Payment Method */}
            <TabsContent value="payment" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>결제 수단별 분포 (이번 달)</CardTitle>
                    <CardDescription>총 84,215,000원</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={paymentMethodData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {paymentMethodData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>결제 수단별 상세</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {paymentMethodData.map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <span className="font-bold">{item.value.toLocaleString()}원</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${(item.value / 84215000) * 100}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Info */}
          <Card className="mt-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">정산 안내</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• 정산은 매월 5일에 자동으로 진행됩니다</p>
              <p>• PG 수수료: 1.5% (신용카드, 간편결제), 가상계좌는 건당 500원</p>
              <p>• 플랫폼 수수료: 0.5% (FaithPay 서비스 이용료)</p>
              <p>• 세금계산서는 정산일에 자동으로 발행됩니다</p>
              <p>• 정산 내역은 투명하게 공개되며, 언제든지 다운로드할 수 있습니다</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}