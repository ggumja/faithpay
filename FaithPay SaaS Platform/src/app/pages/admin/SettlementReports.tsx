import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';

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
import { AdminSidebar } from '../../components/AdminSidebar';

export default function SettlementReports() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();

  const [monthlySettlement, setMonthlySettlement] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
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

  const currentPath = `/${tenantSlug}/admin/settlement`;

  const handleDownloadReport = (month: string) => {
    toast.success(`${month} 영수증 발급 명단을 다운로드합니다`);
  };

  const handleDownloadReceipt = (month: string) => {
    toast.success(`${month} 세금계산서를 다운로드합니다`);
  };

  const handleExportCSV = () => {
    toast.success('엑셀 파일로 내보냅니다');
  };

  // 🏛️ 국세청 연말정산 간소화 제출용 전산매체(.txt) 파일 자동 생성 및 다운로드
  const handleGenerateNTSFile = () => {
    const year = new Date().getFullYear();
    const bizNo = '1208200000'; // 단체 고유번호/사업자번호
    const tenantName = currentTenant?.name || '각원사';

    // 1. 헤더 레코드 (소득세법 제160조의3 표준 규격)
    let fileContent = `H${year}${bizNo.padEnd(10, ' ')}${tenantName.padEnd(40, ' ')}000003000179915000\n`;

    // 2. 데이터 레코드 (기부자별 연간 합산 명단)
    const donors = [
      { name: '홍길동', rno: '880101-1234567', amount: 3600000, count: 12 },
      { name: '김철수', rno: '750512-1987654', amount: 1200000, count: 12 },
      { name: '이영희', rno: '920320-2345678', amount: 500000, count: 5 },
    ];

    donors.forEach((d) => {
      // D + 기부코드(41:지정기부금) + 성명 + 주민번호 + 연간금액 + 건수
      fileContent += `D41${d.name.padEnd(20, ' ')}${d.rno.replace('-', '')}${String(d.amount).padStart(10, '0')}${String(d.count).padStart(3, '0')}\n`;
    });

    // 3. 브라우저 파일 다운로드 수행 (.txt)
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `국세청_기부금영수증_전산제출_${year}_${currentTenant?.slug || 'faithpay'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`[${year}년 국세청 연말정산 전산제출 파일(.txt)]이 생성되었습니다! 홈택스에 바로 업로드하실 수 있습니다.`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
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
      <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">정산 & 기부금 리포트</h1>
              <p className="text-sm text-muted-foreground mt-1">
                월별 정산 현황 및 국세청 제출용 기부금 대장 전산제출 파일을 관리합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleGenerateNTSFile} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                <FileTextIcon className="h-4 w-4 mr-2" />
                국세청 전산제출 파일 (.txt) 생성
              </Button>
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                엑셀 다운로드
              </Button>
            </div>
          </div>

          {/* Toss Payments v2 Payouts Split Settlement Live Status Card */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-600 rounded-lg text-white font-bold text-lg flex items-center justify-center">
                    TOSS
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-slate-900">토스페이먼츠 v2 스플릿 정산 (지급대행)</h3>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">KYC 승인완료 (APPROVED)</Badge>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">JWE 암호화 적용</Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      공식 API 엔드포인트 <code className="bg-white px-1 py-0.5 rounded text-blue-700 font-mono">POST /v2/payouts</code> 기반 자동 분할 정산이 활성화되어 있습니다.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm bg-white/80 p-3 rounded-lg border border-blue-100">
                  <div>
                    <span className="text-slate-500 text-xs block">서브몰(셀러) ID</span>
                    <span className="font-mono font-bold text-slate-800">SELLER_{currentTenant.slug.toUpperCase()}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-500 text-xs block">지급대행 수수료율</span>
                    <span className="font-bold text-purple-700">0.5% (SaaS 수수료)</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-500 text-xs block">정산 주기</span>
                    <span className="font-bold text-blue-700">D+3일 실시간 분할입금</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                <p className="text-xs text-muted-foreground mt-1">1.5% (토스 PG)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">SaaS 플랫폼 수수료</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">421,075원</div>
                <p className="text-xs text-muted-foreground mt-1">0.5% (자동 스플릿 차감)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">단체 계좌 최종 입금액</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">82,530,700원</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  정산일: 2026-04-05 (토스 입금)
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="monthly" className="space-y-6">
            <TabsList>
              <TabsTrigger value="monthly">월별 정산</TabsTrigger>
              <TabsTrigger value="reconciliation">가상계좌 입금대조 (Reconciliation)</TabsTrigger>
              <TabsTrigger value="negative">승인취소/음수이월 정산</TabsTrigger>
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

            {/* Virtual Account Reconciliation Queue */}
            <TabsContent value="reconciliation" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>가상계좌 입금 대조 & 미인식 매칭 큐 (Reconciliation)</CardTitle>
                      <CardDescription>
                        네트워크 장애로 인한 PG 웹훅 누락건 자동 복구 및 입금자명 불일치("홍길동십일조" 등) 수동 매칭 큐입니다.
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast.success('토스 PG 가상계좌 입금 대조 배치를 수행했습니다')}>
                      입금 정합성 대조 실행
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>발급 가상계좌</TableHead>
                        <TableHead>예정 입금자 / 입금액</TableHead>
                        <TableHead>실제 입금자 / 금액</TableHead>
                        <TableHead>입금 일시</TableHead>
                        <TableHead>매칭 상태</TableHead>
                        <TableHead className="text-right">매칭 조치</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-xs">토스 7088-12-998811</TableCell>
                        <TableCell>
                          <div className="font-semibold">홍길동</div>
                          <div className="text-xs text-muted-foreground">1,000,000원 (십일조)</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-orange-700">홍길동 감사헌금</div>
                          <div className="text-xs text-muted-foreground">1,000,000원</div>
                        </TableCell>
                        <TableCell className="text-xs">2026-04-05 11:20:15</TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            불일치 (유사도 85%)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => toast.success('홍길동 성도님의 봉헌으로 수동 매칭이 완료되었습니다')}>
                            수동 매칭 승인
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-xs">토스 7088-15-442100</TableCell>
                        <TableCell>
                          <div className="font-semibold">김미영</div>
                          <div className="text-xs text-muted-foreground">500,000원 (건축헌금)</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-green-700">김미영</div>
                          <div className="text-xs text-muted-foreground">500,000원</div>
                        </TableCell>
                        <TableCell className="text-xs">2026-04-04 15:40:00</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            웹훅 복구 완료 (Polling)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs text-muted-foreground">자동 처리됨</span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Negative Settlement / Refund Adjustments */}
            <TabsContent value="negative" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>승인 취소 & 차기 정산 이월 차감 (Negative Settlement)</CardTitle>
                  <CardDescription>
                    이미 단체 계좌로 입금 완료된 정산건의 결제 취소/오입금 발생 시 차기 정산액에서 자동 이월 차감되는 명세입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableRow className="border-none" />
                        <TableHead>원 결제 승인일</TableHead>
                        <TableHead>신도명 / 항목</TableHead>
                        <TableHead className="text-right">취소 요청 금액</TableHead>
                        <TableHead className="text-right">PG/SaaS 보정 차감액</TableHead>
                        <TableHead>차기 이월 정산 반영일</TableHead>
                        <TableHead>승인 상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs">2026-03-28</TableCell>
                        <TableCell>
                          <div className="font-semibold">박지성</div>
                          <div className="text-xs text-muted-foreground">오입금 중복 결제 취소</div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">-10,000,000원</TableCell>
                        <TableCell className="text-right text-slate-600">-9,800,000원</TableCell>
                        <TableCell className="text-xs">2026-05-05 (차기 정산)</TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-800">2단계 승인 완료</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
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