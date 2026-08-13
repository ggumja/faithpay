import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
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
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { donationAPI } from '../../api/client';
import { assignSequentialDonationIds } from './DonationHistory';
import { useTenantTerms } from '../../hooks/useTenantTerms';
import { toast } from 'sonner';

export default function RecurringPendingPage() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { tenants, currentTenant, setCurrentTenant } = useApp();
  const terms = useTenantTerms(currentTenant?.orgType);

  const [donations, setDonations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
      fetchDonations(tenant.id);
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  const fetchDonations = async (tenantId: string) => {
    setIsLoading(true);
    try {
      const res = await donationAPI.getByTenant(tenantId);
      if (res.success && res.data) {
        setDonations(assignSequentialDonationIds(res.data));
      } else {
        setDonations([]);
      }
    } catch (e) {
      console.error(e);
      setDonations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 미래 정기결제 결제대기 목록 (isRecurring === true && (pending || scheduled))
  const recurringPendingList = useMemo(() => {
    return donations.filter((d) => {
      const isRecurring = d.isRecurring || d.is_recurring;
      const status = d.paymentStatus || d.payment_status || d.status;
      return isRecurring && (status === 'pending' || status === 'scheduled');
    });
  }, [donations]);

  // 검색 필터링
  const filteredList = useMemo(() => {
    return recurringPendingList.filter((d) => {
      if (!searchTerm) return true;
      const term = searchTerm.trim().toLowerCase();
      const donor = String(d.donorName || '').toLowerCase();
      const id = String(d.id || '').toLowerCase();
      const item = String(d.itemName || '').toLowerCase();
      const phone = String(d.donorPhone || '').toLowerCase();
      return donor.includes(term) || id.includes(term) || item.includes(term) || phone.includes(term);
    });
  }, [recurringPendingList, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const totalPendingAmount = useMemo(() => {
    return recurringPendingList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [recurringPendingList]);

  const currentPath = location.pathname;

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 p-4 flex items-center gap-4">
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
          <h1 className="text-lg font-semibold">{terms.recurringPending} 목록</h1>
        </div>

        {/* Content Body */}
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-100">
                  {terms.recurringPending} 목록
                </h1>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-xs">
                  미래 결제 예정
                </Badge>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 text-sm">
                미래 특정 날짜에 자동 이체/청구될 정기결제 대기 건을 독립적으로 조회하고 관리합니다
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => fetchDonations(currentTenant.id)}
              disabled={isLoading}
              className="gap-2 cursor-pointer shadow-xs self-start md:self-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  대기 중인 정기결제 건수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {recurringPendingList.length}건
                </div>
                <p className="text-xs text-slate-400 mt-1">다음 청구 주기 대기 목록</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  예정 총 이체액
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {totalPendingAmount.toLocaleString()}원
                </div>
                <p className="text-xs text-slate-400 mt-1">자동 청구 시 수납될 예상 총액</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  자동 이체 정상 상태
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  정상 예약됨
                </div>
                <p className="text-xs text-slate-400 mt-1">결제일시 도래 시 자동 승인 실행</p>
              </CardContent>
            </Card>
          </div>

          {/* Search & Main Table Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold">
                  정기결제 결제대기 명세 ({filteredList.length}건)
                </CardTitle>
                <CardDescription>
                  승인 완료된 실시간 결제 내역과 분리되어 보관되는 미래 자동 결제 예약 목록입니다
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="성명, 봉헌번호, 항목 검색..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 text-xs"
                />
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>봉헌번호</TableHead>
                    <TableHead>예정 결제일시</TableHead>
                    <TableHead>성명</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>봉헌 항목</TableHead>
                    <TableHead className="text-right">결제 금액</TableHead>
                    <TableHead>결제 수단</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400 space-y-2">
                        <Calendar className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                        <p className="font-semibold text-sm">현재 대기 중인 미래 정기결제 예약 건이 없습니다.</p>
                        <p className="text-xs text-slate-400">정기결제 신규 신청 시 다음 청구 예정일로 자동 예약됩니다.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedList.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          {item.id}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') + ' (예정)' : '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-zinc-100">
                          {item.donorName || '무기명'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {item.donorPhone || '-'}
                        </TableCell>
                        <TableCell>{item.itemName || '일반헌금/보시'}</TableCell>
                        <TableCell className="text-right font-bold text-amber-600 dark:text-amber-400">
                          {(Number(item.amount) || 0).toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600 dark:text-zinc-300">
                          {item.paymentMethod || '정기결제 빌링'}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 font-semibold text-[11px]">
                            결제대기 (예약)
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {filteredList.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <p className="text-xs text-slate-500">
                    총 <span className="font-bold text-slate-800 dark:text-zinc-200">{filteredList.length}</span>건 중 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredList.length)}건 표시 (페이지 {currentPage} / {totalPages})
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 text-xs gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      이전
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 text-xs gap-1 cursor-pointer"
                    >
                      다음
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
