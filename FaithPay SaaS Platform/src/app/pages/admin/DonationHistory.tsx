import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp, mockTenants } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Menu,
  Heart,
  Search,
  Download,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Receipt,
} from 'lucide-react';

// Mock donation data
const mockDonations = [
  {
    id: 'FP2026001',
    date: '2026-03-28',
    time: '14:30',
    name: '홍길동',
    phone: '010-1234-5678',
    item: '십일조',
    amount: 100000,
    method: '카드',
    status: 'completed',
    prayer: '가족의 건강을 위해 기도 부탁드립니다',
  },
  {
    id: 'FP2026002',
    date: '2026-03-28',
    time: '12:15',
    name: '김영희',
    phone: '010-2345-6789',
    item: '감사헌금',
    amount: 50000,
    method: '계좌이체',
    status: 'completed',
    prayer: '새로운 직장에서 잘 정착할 수 있도록',
  },
  {
    id: 'FP2026003',
    date: '2026-03-27',
    time: '19:45',
    name: '박철수',
    phone: '010-3456-7890',
    item: '건축헌금',
    amount: 1000000,
    method: '가상계좌',
    status: 'pending',
    prayer: '',
  },
  {
    id: 'FP2026004',
    date: '2026-03-27',
    time: '16:20',
    name: '이미선',
    phone: '010-4567-8901',
    item: '선교헌금',
    amount: 200000,
    method: '카드',
    status: 'completed',
    prayer: '선교사님들의 안전을 위해',
  },
  {
    id: 'FP2026005',
    date: '2026-03-27',
    time: '11:00',
    name: '최민수',
    phone: '010-5678-9012',
    item: '십일조',
    amount: 150000,
    method: '카드',
    status: 'completed',
    prayer: '',
  },
  {
    id: 'FP2026006',
    date: '2026-03-26',
    time: '20:30',
    name: '정수진',
    phone: '010-6789-0123',
    item: '감사헌금',
    amount: 30000,
    method: '계좌이체',
    status: 'completed',
    prayer: '취업 감사합니다',
  },
  {
    id: 'FP2026007',
    date: '2026-03-26',
    time: '18:00',
    name: '강동훈',
    phone: '010-7890-1234',
    item: '주일헌금',
    amount: 20000,
    method: '카드',
    status: 'completed',
    prayer: '',
  },
  {
    id: 'FP2026008',
    date: '2026-03-25',
    time: '15:45',
    name: '윤서연',
    phone: '010-8901-2345',
    item: '건축헌금',
    amount: 500000,
    method: '가상계좌',
    status: 'completed',
    prayer: '교회가 잘 지어지길',
  },
];

export default function DonationHistory() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { currentTenant, setCurrentTenant, currentAdmin } = useApp();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, setCurrentTenant]);

  if (!currentTenant) {
    return <div>Loading...</div>;
  }

  if (!currentAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>관리자 로그인이 필요합니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentPath = location.pathname;

  // Filter donations
  const filteredDonations = mockDonations.filter((donation) => {
    const matchesSearch =
      donation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || donation.method === methodFilter;
    
    let matchesDate = true;
    if (startDate && endDate) {
      matchesDate = donation.date >= startDate && donation.date <= endDate;
    } else if (startDate) {
      matchesDate = donation.date >= startDate;
    } else if (endDate) {
      matchesDate = donation.date <= endDate;
    }

    return matchesSearch && matchesStatus && matchesMethod && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDonations = filteredDonations.slice(startIndex, endIndex);

  // Statistics
  const totalAmount = filteredDonations.reduce((sum, d) => sum + d.amount, 0);
  const completedCount = filteredDonations.filter((d) => d.status === 'completed').length;
  const pendingCount = filteredDonations.filter((d) => d.status === 'pending').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">완료</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">대기중</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">실패</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleExport = () => {
    // CSV export logic would go here
    alert('CSV 다운로드 기능은 데모입니다');
  };

  const handleViewDetail = (donation: any) => {
    setSelectedDonation(donation);
  };

  const handlePrintReceipt = (donation: any) => {
    alert(`${donation.id} 영수증 출력 (데모)`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b p-4 flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">봉헌 내역</h1>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Heart className="h-8 w-8" style={{ color: currentTenant.primaryColor }} />
                <h1 className="text-3xl font-bold">봉헌 내역</h1>
              </div>
              <p className="text-muted-foreground">모든 봉헌 내역을 조회하고 관리하세요</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    총 봉헌액
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: currentTenant.primaryColor }}>
                    {totalAmount.toLocaleString()}원
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredDonations.length}건
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    완료
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{completedCount}건</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    정상 처리된 봉헌
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    대기중
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{pendingCount}건</div>
                  <p className="text-xs text-muted-foreground mt-1">입금 대기</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle>검색 및 필터</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="이름, 전화번호, 봉헌번호 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="pending">대기중</SelectItem>
                      <SelectItem value="failed">실패</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="결제방법" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 방법</SelectItem>
                      <SelectItem value="카드">카드</SelectItem>
                      <SelectItem value="계좌이체">계좌이체</SelectItem>
                      <SelectItem value="가상계좌">가상계좌</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    엑셀 다운로드
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      시작일
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      종료일
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>봉헌 목록</CardTitle>
                <CardDescription>
                  {filteredDonations.length}건의 봉헌 내역이 조회되었습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>봉헌번호</TableHead>
                        <TableHead>일시</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>봉헌항목</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                        <TableHead>결제방법</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-center">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDonations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            조회된 봉헌 내역이 없습니다
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentDonations.map((donation) => (
                          <TableRow key={donation.id}>
                            <TableCell className="font-mono text-sm">
                              {donation.id}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{donation.date}</div>
                                <div className="text-muted-foreground text-xs">
                                  {donation.time}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{donation.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {donation.phone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{donation.item}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {donation.amount.toLocaleString()}원
                            </TableCell>
                            <TableCell>{donation.method}</TableCell>
                            <TableCell>{getStatusBadge(donation.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2 justify-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewDetail(donation)}
                                  title="상세보기"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePrintReceipt(donation)}
                                  title="영수증 출력"
                                >
                                  <Receipt className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                      {startIndex + 1}-{Math.min(endIndex, filteredDonations.length)} /{' '}
                      {filteredDonations.length}건
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => setCurrentPage(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detail Modal */}
            {selectedDonation && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setSelectedDonation(null)}
              >
                <Card
                  className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CardHeader>
                    <CardTitle>봉헌 상세 정보</CardTitle>
                    <CardDescription>{selectedDonation.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">봉헌자</p>
                        <p className="font-semibold">{selectedDonation.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">연락처</p>
                        <p className="font-semibold">{selectedDonation.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">봉헌 항목</p>
                        <p className="font-semibold">{selectedDonation.item}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">금액</p>
                        <p className="font-semibold text-lg">
                          {selectedDonation.amount.toLocaleString()}원
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">결제 방법</p>
                        <p className="font-semibold">{selectedDonation.method}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">상태</p>
                        <div className="mt-1">{getStatusBadge(selectedDonation.status)}</div>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">봉헌 일시</p>
                        <p className="font-semibold">
                          {selectedDonation.date} {selectedDonation.time}
                        </p>
                      </div>
                    </div>

                    {selectedDonation.prayer && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">기도 제목</p>
                        <p className="p-3 bg-slate-50 rounded-lg">{selectedDonation.prayer}</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        className="flex-1"
                        onClick={() => handlePrintReceipt(selectedDonation)}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        영수증 출력
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedDonation(null)}>
                        닫기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
