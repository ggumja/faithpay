import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp } from '../../context/AppContext';
import { statisticsAPI, DailyClosingSummary } from '../../api/client';
import { assignSequentialDonationIds } from './DonationHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  BarChart3,
  CreditCard,
  Monitor,
  Tag,
  RefreshCw,
  Download,
  Info,
  Smartphone,
  Repeat,
  Menu,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { AdminSidebar } from '../../components/AdminSidebar';
import { PeriodRangePicker, PeriodUnit, PeriodSelection } from '../../components/PeriodRangePicker';
import { useTenantTerms } from '../../hooks/useTenantTerms';

// 색상 팔레트
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

function formatDateToYMD(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getSnapshotPeriodKey(closingDate: string, unit: PeriodUnit): string {
  const parts = (closingDate || '').split('-').map(Number);
  if (parts.length < 3) return '';
  const [year, month, day] = parts;
  if (unit === 'daily') {
    return `${month}/${day}`;
  } else if (unit === 'weekly') {
    const weekNum = Math.ceil(day / 7);
    return `${month}월 ${weekNum}주`;
  } else if (unit === 'yearly') {
    return `${year}년`;
  } else {
    return `${year}.${String(month).padStart(2, '0')}`;
  }
}

export default function TenantStatisticsPage() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { currentTenant, setCurrentTenant, tenants } = useApp();
  const terms = useTenantTerms(currentTenant);

  // 🔴 DB 영구 적재 일별 마감 스냅샷 및 종합 통계 상태 (Full Scan 제거)
  const [dailySnapshots, setDailySnapshots] = useState<DailyClosingSummary[]>([]);
  const [snapshotSummary, setSnapshotSummary] = useState<any>(null);
  const [closedTransactions, setClosedTransactions] = useState<any[]>([]);
  const [totalTransactionCount, setTotalTransactionCount] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'method' | 'device' | 'item' | 'subscription'>('overview');
  const [isEasyPayModalOpen, setIsEasyPayModalOpen] = useState(false);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);

  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>('daily');
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      unit: 'daily',
      startDate: start,
      endDate: end,
      label: `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getFullYear()}년 ${end.getMonth() + 1}월 ${end.getDate()}일`,
    };
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 마감 기준일 (전일 23:59:59)
  const yesterdayCutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const cutoffDateStr = useMemo(() => {
    return yesterdayCutoff.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [yesterdayCutoff]);

  const fetchData = async (targetTenantId: string) => {
    setIsLoading(true);
    try {
      const startDateStr = formatDateToYMD(periodSelection.startDate);
      const endDateStr = formatDateToYMD(periodSelection.endDate);

      const [snapRes, txRes] = await Promise.all([
        statisticsAPI.getClosingSnapshots(targetTenantId, {
          startDate: startDateStr,
          endDate: endDateStr,
        }),
        statisticsAPI.getClosingTransactions(targetTenantId, {
          startDate: startDateStr,
          endDate: endDateStr,
          page: currentPage,
          pageSize,
          search: searchTerm,
        }),
      ]);

      if (snapRes.success && snapRes.data) {
        setDailySnapshots(snapRes.data.snapshots || []);
        setSnapshotSummary(snapRes.data.summary);
      } else {
        setDailySnapshots([]);
        setSnapshotSummary(null);
      }

      if (txRes.success && txRes.data) {
        setClosedTransactions(assignSequentialDonationIds(txRes.data.items || []));
        setTotalTransactionCount(txRes.data.totalCount || 0);
      } else {
        setClosedTransactions([]);
        setTotalTransactionCount(0);
      }
    } catch (e: any) {
      console.error('Failed to fetch statistics data from DB:', e);
      toast.error('통계 데이터를 불러오는 중 오류가 발생했습니다.');
      setDailySnapshots([]);
      setSnapshotSummary(null);
      setClosedTransactions([]);
      setTotalTransactionCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const decodedSlug = tenantSlug ? decodeURIComponent(tenantSlug).trim().toLowerCase() : '';
    const tenant = tenants.find(
      (t) =>
        (t.slug && t.slug.toLowerCase() === decodedSlug) ||
        (t.id && t.id.toLowerCase() === decodedSlug) ||
        (t.name && t.name.toLowerCase() === decodedSlug) ||
        (t.slug && decodeURIComponent(t.slug).toLowerCase() === decodedSlug)
    ) || currentTenant;

    const targetKey = tenant?.id || tenant?.slug || decodedSlug;
    if (tenant) {
      setCurrentTenant(tenant);
    }
    if (targetKey) {
      fetchData(targetKey);
    }
  }, [tenantSlug, tenants, setCurrentTenant, currentTenant, periodSelection, currentPage, searchTerm]);


  // 마감 상세 목록 페이징 및 필터
  const totalPages = Math.max(1, Math.ceil(totalTransactionCount / pageSize));
  const pagedSnapshotList = closedTransactions;

  // 1. 종합 통계 (Overview) - DB 영구 스냅샷 기준 시간 오름차순
  const overviewStats = useMemo(() => {
    const totalAmount = snapshotSummary?.totalAmount || 0;
    const totalCount = snapshotSummary?.totalCount || 0;
    const avgAmount = snapshotSummary?.avgTicketAmount || 0;

    const trendMap: Record<string, { sortTime: number; key: string; amount: number }> = {};

    dailySnapshots.forEach((s) => {
      const parts = (s.closingDate || '').split('-').map(Number);
      if (parts.length < 3) return;
      const [year, month, day] = parts;
      const date = new Date(year, month - 1, day);

      const key = getSnapshotPeriodKey(s.closingDate, periodUnit);
      if (!key) return;

      let sortTime = date.getTime();
      if (periodUnit === 'yearly') {
        sortTime = new Date(year, 0, 1).getTime();
      } else if (periodUnit === 'monthly') {
        sortTime = new Date(year, month - 1, 1).getTime();
      }

      if (!trendMap[key]) {
        trendMap[key] = { sortTime, key, amount: 0 };
      }
      trendMap[key].amount += s.totalAmount || 0;
    });

    const monthlyTrend = Object.values(trendMap)
      .sort((a, b) => a.sortTime - b.sortTime)
      .map((item) => ({ month: item.key, amount: item.amount }));

    return {
      totalAmount,
      totalCount,
      avgAmount,
      monthlyTrend,
    };
  }, [dailySnapshots, snapshotSummary, periodUnit]);

  // 2. 결제 수단별 통계 (Method)
  const getMethodCategory = (rawMethod?: string): string => {
    if (!rawMethod) return '신용카드';
    const m = String(rawMethod).trim();
    const lower = m.toLowerCase();

    if (m.includes('가상') || lower.includes('virtual')) {
      return '가상계좌';
    }

    if (
      m.includes('카카오') || lower.includes('kakao') ||
      m.includes('네이버') || lower.includes('naver') ||
      m.includes('토스페이') || lower.includes('tosspay') ||
      (m.includes('토스') && !m.includes('토스페이먼츠') && !m.includes('토스뱅크')) ||
      m.includes('간편') || lower.includes('simple') || lower.includes('easy') ||
      m.includes('계좌') || m.includes('이체') || lower.includes('transfer')
    ) {
      return '간편결제';
    }

    return '신용카드';
  };

  const methodStats = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {
      '신용카드': {
        amount: snapshotSummary?.methodMatrix?.['신용카드']?.amount || 0,
        count: snapshotSummary?.methodMatrix?.['신용카드']?.count || 0,
      },
      '간편결제': {
        amount: snapshotSummary?.methodMatrix?.['간편결제']?.amount || 0,
        count: snapshotSummary?.methodMatrix?.['간편결제']?.count || 0,
      },
      '가상계좌': {
        amount: snapshotSummary?.methodMatrix?.['가상계좌']?.amount || 0,
        count: snapshotSummary?.methodMatrix?.['가상계좌']?.count || 0,
      },
    };

    const CATEGORIES = ['신용카드', '간편결제', '가상계좌'];
    const summaryList = CATEGORIES.map((name) => ({
      name,
      value: map[name]?.amount || 0,
      count: map[name]?.count || 0,
    }));

    const chartData = summaryList.filter((item) => item.value > 0);
    return { map, summaryList, chartData };
  }, [snapshotSummary]);

  // 팝업 모달용 간편결제 세부 페이별 통계 집계 (건수, 금액, 비중 %)
  const modalEasyPayStats = useMemo(() => {
    const targetSnapshots = selectedPeriodKey
      ? dailySnapshots.filter((s) => getSnapshotPeriodKey(s.closingDate, periodUnit) === selectedPeriodKey)
      : dailySnapshots;

    const map: Record<string, { amount: number; count: number }> = {
      '카카오페이': { amount: 0, count: 0 },
      '네이버페이': { amount: 0, count: 0 },
      '토스페이': { amount: 0, count: 0 },
      '기타 간편결제': { amount: 0, count: 0 },
    };

    targetSnapshots.forEach((s) => {
      const breakdown = s.methodMatrix?.['간편결제']?.breakdown || {};
      for (const [k, v] of Object.entries(breakdown)) {
        if (!map[k]) map[k] = { amount: 0, count: 0 };
        map[k].amount += v.amount || 0;
        map[k].count += v.count || 0;
      }
    });

    const totalAmount = Object.values(map).reduce((sum, v) => sum + v.amount, 0);
    const totalCount = Object.values(map).reduce((sum, v) => sum + v.count, 0);

    const list = Object.entries(map)
      .map(([name, stat]) => ({
        name,
        amount: stat.amount,
        count: stat.count,
        ratio: totalAmount > 0 ? ((stat.amount / totalAmount) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.amount - a.amount);

    return { totalAmount, totalCount, list };
  }, [dailySnapshots, selectedPeriodKey, periodUnit]);

  // 3. 기기/채널별 통계 (Device)
  const deviceStats = useMemo(() => {
    const kioskAmount = snapshotSummary?.deviceMatrix?.kioskAmount || 0;
    const kioskCount = snapshotSummary?.deviceMatrix?.kioskCount || 0;
    const webAmount = snapshotSummary?.deviceMatrix?.webAmount || 0;
    const webCount = snapshotSummary?.deviceMatrix?.webCount || 0;

    const totalAmt = kioskAmount + webAmount;
    const kioskRatio = totalAmt > 0 ? ((kioskAmount / totalAmt) * 100).toFixed(1) : '0';
    const webRatio = totalAmt > 0 ? ((webAmount / totalAmt) * 100).toFixed(1) : '0';

    return {
      kioskAmount,
      kioskCount,
      kioskRatio,
      webAmount,
      webCount,
      webRatio,
      chartData: [
        { name: '🖥️ 키오스크(KIOSK)', amount: kioskAmount, count: kioskCount },
        { name: '📱 모바일/웹(WEB_MOBILE)', amount: webAmount, count: webCount },
      ],
    };
  }, [snapshotSummary]);

  // 4. 봉헌 항목별 통계 (Item)
  const itemStats = useMemo(() => {
    const items = snapshotSummary?.itemMatrix || {};
    const sortedList = Object.entries(items)
      .map(([name, stat]: [string, any]) => ({
        name,
        amount: Number(stat.amount) || 0,
        count: Number(stat.count) || 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return sortedList;
  }, [snapshotSummary]);

  // 🏷️ 4. 봉헌 항목별 고유 목록 (테이블 컬럼 동적 분할용)
  const allItemNames = useMemo(() => {
    const list = itemStats.map((it) => it.name);
    return list.length > 0 ? list : ['일반헌금/보시'];
  }, [itemStats]);

  // 5. 정기 vs 1회성 통계 (Subscription)
  const subscriptionStats = useMemo(() => {
    const recurringAmount = snapshotSummary?.subscriptionMatrix?.recurringAmount || 0;
    const recurringCount = snapshotSummary?.subscriptionMatrix?.recurringCount || 0;
    const oneTimeAmount = snapshotSummary?.subscriptionMatrix?.oneTimeAmount || 0;
    const oneTimeCount = snapshotSummary?.subscriptionMatrix?.oneTimeCount || 0;

    const totalAmt = recurringAmount + oneTimeAmount;
    const recurringRatio = totalAmt > 0 ? ((recurringAmount / totalAmt) * 100).toFixed(1) : '0';
    const oneTimeRatio = totalAmt > 0 ? ((oneTimeAmount / totalAmt) * 100).toFixed(1) : '0';

    return {
      recurringAmount,
      recurringCount,
      recurringRatio,
      oneTimeAmount,
      oneTimeCount,
      oneTimeRatio,
    };
  }, [snapshotSummary]);

  // 🔴 5개 탭별 기간(일/주/월/년) 교차 집계 매트릭스 계산 - 과거 -> 현재(오름차순 시간순) 정렬
  const periodMatrixList = useMemo(() => {
    const map: Record<string, {
      sortTime: number;
      periodKey: string;
      totalAmount: number;
      totalCount: number;
      methods: Record<string, { amount: number; count: number }>;
      kioskAmount: number;
      kioskCount: number;
      webAmount: number;
      webCount: number;
      items: Record<string, { amount: number; count: number }>;
      recurringAmount: number;
      recurringCount: number;
      oneTimeAmount: number;
      oneTimeCount: number;
    }> = {};

    dailySnapshots.forEach((s) => {
      const parts = (s.closingDate || '').split('-').map(Number);
      if (parts.length < 3) return;
      const [year, month, day] = parts;
      const date = new Date(year, month - 1, day);

      const key = getSnapshotPeriodKey(s.closingDate, periodUnit);
      if (!key) return;

      let sortTime = date.getTime();
      if (periodUnit === 'yearly') {
        sortTime = new Date(year, 0, 1).getTime();
      } else if (periodUnit === 'monthly') {
        sortTime = new Date(year, month - 1, 1).getTime();
      }

      if (!map[key]) {
        map[key] = {
          sortTime,
          periodKey: key,
          totalAmount: 0,
          totalCount: 0,
          methods: {},
          kioskAmount: 0,
          kioskCount: 0,
          webAmount: 0,
          webCount: 0,
          items: {},
          recurringAmount: 0,
          recurringCount: 0,
          oneTimeAmount: 0,
          oneTimeCount: 0,
        };
      }

      map[key].totalAmount += s.totalAmount || 0;
      map[key].totalCount += s.totalCount || 0;

      // 1. 수단별
      for (const [mKey, mVal] of Object.entries(s.methodMatrix || {})) {
        if (!map[key].methods[mKey]) map[key].methods[mKey] = { amount: 0, count: 0 };
        map[key].methods[mKey].amount += mVal.amount || 0;
        map[key].methods[mKey].count += mVal.count || 0;
      }

      // 2. 기기별
      if (s.deviceMatrix) {
        map[key].kioskAmount += s.deviceMatrix.kioskAmount || 0;
        map[key].kioskCount += s.deviceMatrix.kioskCount || 0;
        map[key].webAmount += s.deviceMatrix.webAmount || 0;
        map[key].webCount += s.deviceMatrix.webCount || 0;
      }

      // 3. 항목별
      for (const [iKey, iVal] of Object.entries(s.itemMatrix || {})) {
        if (!map[key].items[iKey]) map[key].items[iKey] = { amount: 0, count: 0 };
        map[key].items[iKey].amount += iVal.amount || 0;
        map[key].items[iKey].count += iVal.count || 0;
      }

      // 4. 정기/일시
    });

    // 🔴 과거(Past/Left) -> 현재(Present/Right) 시간 오름차순 정렬
    return Object.values(map).sort((a, b) => a.sortTime - b.sortTime);
  }, [dailySnapshots, periodUnit]);

  // 마감 스냅샷 DB 재집계 실행
  const handleRefreshBatch = async () => {
    if (!currentTenant) return;
    setIsLoading(true);
    try {
      const res = await statisticsAPI.runClosingBatch(currentTenant.id);
      if (res.success) {
        toast.success('전일 마감 스냅샷 DB 재집계가 완료되었습니다.');
        await fetchData(currentTenant.id);
      } else {
        toast.error('마감 재집계 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error('Failed to run batch closing:', e);
      toast.error('마감 재집계 요청에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // CSV Export
  const handleExportCSV = async () => {
    if (!currentTenant) return;
    try {
      const startDateStr = formatDateToYMD(periodSelection.startDate);
      const endDateStr = formatDateToYMD(periodSelection.endDate);
      const res = await statisticsAPI.getClosingTransactions(currentTenant.id, {
        startDate: startDateStr,
        endDate: endDateStr,
        page: 1,
        pageSize: 5000,
      });
      const list = res.data?.items || [];
      if (list.length === 0) {
        toast.error('내보낼 마감 통계 데이터가 없습니다.');
        return;
      }
      const headers = ['봉헌번호', '결제일시', '접수기기', '성명', '봉헌항목', '금액', '결제방법', '정기여부'];
      const rows = list.map((d: any) => [
        `"${d.id || ''}"`,
        `"${new Date(d.createdAt || d.created_at).toLocaleString()}"`,
        `"${d.deviceType === 'KIOSK' ? '키오스크' : '모바일/웹'}"`,
        `"${d.donorName || '무기명'}"`,
        `"${d.itemName || '일반헌금/보시'}"`,
        d.amount || 0,
        `"${getMethodCategory(d.paymentMethod || d.payment_method || d.method)}"`,
        d.isRecurring ? '정기' : '1회성',
      ]);

      const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `마감통계_${cutoffDateStr.slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('전일 마감 통계 CSV 파일을 다운로드했습니다.');
    } catch (e) {
      console.error('CSV error:', e);
      toast.error('CSV 다운로드 중 오류가 발생했습니다.');
    }
  };

  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Main Container */}
      <div className="flex-1 min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">마감 통계 센터</h1>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8 w-full space-y-6">
          {/* Header & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <BarChart3 className="h-8 w-8 text-indigo-600" />
                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">수납 마감 통계 센터</h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                전일 23:59:59 마감 스냅샷 데이터를 기반으로 정확하고 정제된 경영/출납 통계를 제공합니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRefreshBatch}
                className="gap-2 text-xs font-semibold"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                마감 재집계
              </Button>
              <Button onClick={handleExportCSV} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs font-semibold">
                <Download className="h-3.5 w-3.5" />
                마감 통계 엑셀 다운로드
              </Button>
            </div>
          </div>

          {/* 🗓️ 기간 지정 툴바 UI (첨부 이미지 디자인 100% 동일) */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <PeriodRangePicker
              unit={periodUnit}
              onUnitChange={setPeriodUnit}
              selection={periodSelection}
              onSelectionChange={setPeriodSelection}
            />
          </div>

          {/* ℹ️ 집계 시점 안내 배너 */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  🗓️ 조회 기간: {periodSelection.label}
                </span>
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  (마감 기준일: {cutoffDateStr} 스냅샷)
                </span>
              </div>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap pl-6 sm:pl-0">
              * 당일 실시간 수납 건은 익일 00:00 마감 스냅샷 생성 후 통계에 반영됩니다.
            </span>
          </div>

          {/* 하위 메뉴 탭 (5개 세분화 하위메뉴) */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-zinc-800 pb-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 border border-slate-200 dark:border-zinc-800'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              1. 종합 수납 통계
            </button>
            <button
              onClick={() => setActiveTab('method')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'method'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 border border-slate-200 dark:border-zinc-800'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              2. 결제 수단별 분석
            </button>
            <button
              onClick={() => setActiveTab('device')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'device'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 border border-slate-200 dark:border-zinc-800'
              }`}
            >
              <Monitor className="h-4 w-4" />
              3. 기기/채널별 분석
            </button>
            <button
              onClick={() => setActiveTab('item')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'item'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 border border-slate-200 dark:border-zinc-800'
              }`}
            >
              <Tag className="h-4 w-4" />
              4. 봉헌 항목별 분석
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'subscription'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 border border-slate-200 dark:border-zinc-800'
              }`}
            >
              <Repeat className="h-4 w-4" />
              5. 정기 vs 1회성 분석
            </button>
          </div>

          {/* TAB 1: 종합 수납 통계 */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      전일 마감 총 봉헌액
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-indigo-600">
                      {overviewStats.totalAmount.toLocaleString()}원
                    </div>
                    <p className="text-xs text-slate-400 mt-1">선택 기간 마감 완료 합계</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      총 마감 수납 건수
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-blue-600">
                      {overviewStats.totalCount.toLocaleString()}건
                    </div>
                    <p className="text-xs text-slate-400 mt-1">선택 기간 정상 승인 완료 건수</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      평균 결제금액
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-emerald-600">
                      {overviewStats.avgAmount.toLocaleString()}원
                    </div>
                    <p className="text-xs text-slate-400 mt-1">1회 결제 시 평균 봉헌 금액</p>
                  </CardContent>
                </Card>
              </div>

              {/* 월별 수납액 추이 차트 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">월별 봉헌 수납 추이 (마감 기준)</CardTitle>
                  <CardDescription>전일 마감 스냅샷에 포함된 월별 실제 수납 완료액입니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={overviewStats.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                      <Bar dataKey="amount" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* TAB 1 전용: 기간별 총 수납 집계표 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">기간별 총 수납 집계표</CardTitle>
                  <CardDescription>선택한 기간 단위별 수납 건수 및 금액 내역입니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>조회 기간</TableHead>
                        <TableHead className="text-right">수납 건수</TableHead>
                        <TableHead className="text-right">평균 결제금액</TableHead>
                        <TableHead className="text-right">총 수납 금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodMatrixList.map((row) => (
                        <TableRow key={row.periodKey}>
                          <TableCell className="font-semibold text-slate-800 dark:text-zinc-200">{row.periodKey}</TableCell>
                          <TableCell className="text-right font-medium">{row.totalCount}건</TableCell>
                          <TableCell className="text-right text-slate-600">
                            {(row.totalCount > 0 ? Math.round(row.totalAmount / row.totalCount) : 0).toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {row.totalAmount.toLocaleString()}원
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* TAB 1 전용: 선택 기간 수납 상세 거래 명세 내역 테이블 */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold">
                      선택 기간 수납 상세 거래 명세 ({totalTransactionCount.toLocaleString()}건)
                    </CardTitle>
                    <CardDescription>
                      선택한 기간 및 마감 시점 스냅샷에 포함된 정제 완료 수납 내역 목록입니다
                    </CardDescription>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="성명, 접수번호, 항목, 수단 검색..."
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
                        <TableHead>접수번호</TableHead>
                        <TableHead>결제일시</TableHead>
                        <TableHead>채널</TableHead>
                        <TableHead>성명</TableHead>
                        <TableHead>봉헌 항목</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                        <TableHead>결제 수단</TableHead>
                        <TableHead>구분</TableHead>
                        <TableHead>마감 상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedSnapshotList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-slate-400 py-8">
                            {periodSelection.startDate > yesterdayCutoff
                              ? '선택하신 기간은 아직 마감(전일 23:59:59)되지 않아 마감 통계 데이터가 없습니다. (당일 거래는 익일 00:00 마감 후 반영)'
                              : '선택된 기간 조건에 해당되는 마감 수납 내역이 없습니다.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        pagedSnapshotList.map((donation) => {
                          const isKiosk = donation.deviceType === 'KIOSK' || String(donation.id || '').toUpperCase().includes('KIOSK');
                          return (
                            <TableRow key={donation.id}>
                              <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                {donation.id}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                {donation.createdAt ? new Date(donation.createdAt).toLocaleString('ko-KR') : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={isKiosk ? 'secondary' : 'outline'} className="text-[11px]">
                                  {isKiosk ? '키오스크' : '모바일/웹'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-slate-900 dark:text-zinc-100">
                                {donation.donorName || '무기명'}
                              </TableCell>
                              <TableCell>{donation.itemName || '일반헌금/보시'}</TableCell>
                              <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {(Number(donation.amount) || 0).toLocaleString()}원
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                                {getMethodCategory(donation.paymentMethod || donation.payment_method || donation.method)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={donation.isRecurring ? 'default' : 'secondary'} className="text-[11px]">
                                  {donation.isRecurring ? '정기' : '1회성'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-semibold text-[11px]">
                                  결제완료
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  {totalTransactionCount > 0 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                      <p className="text-xs text-slate-500">
                        총 <span className="font-bold text-slate-800 dark:text-zinc-200">{totalTransactionCount}</span>건 중 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalTransactionCount)}건 표시 (페이지 {currentPage} / {totalPages})
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-8 text-xs gap-1"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          이전
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-8 text-xs gap-1"
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
          )}

          {/* TAB 2: 결제 수단별 분석 */}
          {activeTab === 'method' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">결제 수단별 금액 비중</CardTitle>
                    <CardDescription>수단별 수납액 비중 (전일 마감 기준)</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    {methodStats.chartData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                        <CreditCard className="h-10 w-10 mb-2 opacity-40" />
                        <p className="text-sm font-medium">조회 기간 내 결제 수납 내역이 없습니다 (0건)</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={methodStats.chartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {methodStats.chartData.map((item, index) => {
                              const colorMap: Record<string, string> = {
                                '신용카드': '#3B82F6',
                                '간편결제': '#F59E0B',
                                '가상계좌': '#10B981',
                              };
                              return (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={colorMap[item.name] || COLORS[index % COLORS.length]}
                                />
                              );
                            })}
                          </Pie>
                          <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">수단별 수납 현황 표</CardTitle>
                    <CardDescription>결제 수단별 세부 금액 및 건수 (신용카드 / 간편결제 / 가상계좌)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>결제 수단</TableHead>
                          <TableHead className="text-right">결제 건수</TableHead>
                          <TableHead className="text-right">총 수납 금액</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {methodStats.summaryList.map((item) => {
                          const isEasyPay = item.name === '간편결제';
                          return (
                            <TableRow
                              key={item.name}
                              onClick={() => {
                                if (isEasyPay) {
                                  setSelectedPeriodKey(null);
                                  setIsEasyPayModalOpen(true);
                                }
                              }}
                              className={isEasyPay ? 'cursor-pointer hover:bg-amber-50/80 dark:hover:bg-amber-950/30 transition-colors group' : ''}
                            >
                              <TableCell className="font-semibold">
                                <div className="flex items-center gap-2">
                                  <span>{item.name}</span>
                                  {isEasyPay && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10.5px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 group-hover:bg-amber-100 transition-colors font-bold px-1.5 py-0.5 flex items-center gap-1 shadow-xs"
                                    >
                                      세부 분석 🔍
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">{item.count}건</TableCell>
                              <TableCell className="text-right font-bold text-indigo-600">
                                {item.value.toLocaleString()}원
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* TAB 2 전용: 기간별 x 결제 수단별 집계표 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">기간별 x 결제 수단별 상세 수납 집계표</CardTitle>
                  <CardDescription>선택한 기간별 각 결제 수단의 수납 금액 및 건수입니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>조회 기간</TableHead>
                        <TableHead className="text-right">신용카드</TableHead>
                        <TableHead
                          className="text-right text-amber-700 dark:text-amber-400 cursor-pointer hover:underline"
                          onClick={() => {
                            setSelectedPeriodKey(null);
                            setIsEasyPayModalOpen(true);
                          }}
                          title="전체 기간 간편결제 상세 팝업 열기"
                        >
                          간편결제 🔍
                        </TableHead>
                        <TableHead className="text-right">가상계좌</TableHead>
                        <TableHead className="text-right">총 수납액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodMatrixList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                            조회된 수납 내역이 없습니다 (0건)
                          </TableCell>
                        </TableRow>
                      ) : (
                        periodMatrixList.map((row) => (
                          <TableRow key={row.periodKey}>
                            <TableCell className="font-semibold text-slate-800 dark:text-zinc-200">{row.periodKey}</TableCell>
                            <TableCell className="text-right text-xs">
                              <span className="font-bold text-slate-700">{(row.methods['신용카드']?.amount || 0).toLocaleString()}원</span>
                              <span className="text-slate-400 ml-1">({row.methods['신용카드']?.count || 0}건)</span>
                            </TableCell>
                            <TableCell
                              className="text-right text-xs cursor-pointer hover:bg-amber-50/70 dark:hover:bg-amber-950/20 transition-colors group"
                              onClick={() => {
                                setSelectedPeriodKey(row.periodKey);
                                setIsEasyPayModalOpen(true);
                              }}
                              title={`${row.periodKey} 간편결제 페이별 건·금액·비중 분석 열기`}
                            >
                              <span className="font-bold text-amber-700 underline-offset-2 group-hover:underline">{(row.methods['간편결제']?.amount || 0).toLocaleString()}원</span>
                              <span className="text-slate-400 ml-1">({row.methods['간편결제']?.count || 0}건)</span>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <span className="font-bold text-emerald-700">{(row.methods['가상계좌']?.amount || 0).toLocaleString()}원</span>
                              <span className="text-slate-400 ml-1">({row.methods['가상계좌']?.count || 0}건)</span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400">
                              {row.totalAmount.toLocaleString()}원
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: 기기/채널별 분석 */}
          {activeTab === 'device' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-950">
                      <Monitor className="h-5 w-5 text-purple-600" />
                      키오스크 (KIOSK) 점유율
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-purple-700">
                      {deviceStats.kioskAmount.toLocaleString()}원
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mt-2">
                      점유율: <span className="text-purple-600 font-extrabold">{deviceStats.kioskRatio}%</span> ({deviceStats.kioskCount}건)
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-950">
                      <Smartphone className="h-5 w-5 text-blue-600" />
                      모바일 / 웹 (WEB_MOBILE) 점유율
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-blue-700">
                      {deviceStats.webAmount.toLocaleString()}원
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mt-2">
                      점유율: <span className="text-blue-600 font-extrabold">{deviceStats.webRatio}%</span> ({deviceStats.webCount}건)
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">기기별 수납 비교 차트</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={deviceStats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                      <Bar dataKey="amount" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* TAB 3 전용: 기간별 x 기기/채널별 집계표 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">기간별 x 기기/채널별 상세 수납 집계표</CardTitle>
                  <CardDescription>선택한 기간별 키오스크 및 모바일/웹 수납 건수와 금액입니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>조회 기간</TableHead>
                        <TableHead className="text-right">키오스크 (건수/금액)</TableHead>
                        <TableHead className="text-right">모바일/웹 (건수/금액)</TableHead>
                        <TableHead className="text-right">총 수납 건수</TableHead>
                        <TableHead className="text-right">총 수납 금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodMatrixList.map((row) => (
                        <TableRow key={row.periodKey}>
                          <TableCell className="font-semibold text-slate-800 dark:text-zinc-200">{row.periodKey}</TableCell>
                          <TableCell className="text-right text-xs">
                            <span className="font-bold text-purple-700">{row.kioskAmount.toLocaleString()}원</span>
                            <span className="text-slate-400 ml-1">({row.kioskCount}건)</span>
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <span className="font-bold text-blue-700">{row.webAmount.toLocaleString()}원</span>
                            <span className="text-slate-400 ml-1">({row.webCount}건)</span>
                          </TableCell>
                          <TableCell className="text-right font-medium">{row.totalCount}건</TableCell>
                          <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {row.totalAmount.toLocaleString()}원
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: 봉헌/보시/후원 항목별 분석 */}
          {activeTab === 'item' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{terms.donation} 항목별 수납 순위 (전일 마감 기준)</CardTitle>
                  <CardDescription>가장 많이 접수된 {terms.donation} 항목 순위입니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">순위</TableHead>
                        <TableHead>{terms.donation} 항목명</TableHead>
                        <TableHead className="text-right">접수 건수</TableHead>
                        <TableHead className="text-right">총 수납 금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemStats.map((item, idx) => (
                        <TableRow key={item.name}>
                          <TableCell className="text-center font-extrabold text-slate-500">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900">{item.name}</TableCell>
                          <TableCell className="text-right font-medium">{item.count}건</TableCell>
                          <TableCell className="text-right font-bold text-indigo-600">
                            {item.amount.toLocaleString()}원
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* TAB 4 전용: 기간별 x 항목별 집계표 (항목별 컬럼 분할) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">기간별 x {terms.donation} 항목별 상세 수납 집계표</CardTitle>
                  <CardDescription>선택한 기간별 각 {terms.donation} 항목의 수납 금액 및 건수입니다</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">조회 기간</TableHead>
                        {allItemNames.map((itemName) => (
                          <TableHead key={itemName} className="text-right whitespace-nowrap">
                            {itemName} (금액/건수)
                          </TableHead>
                        ))}
                        <TableHead className="text-right whitespace-nowrap">총 수납 건수</TableHead>
                        <TableHead className="text-right whitespace-nowrap">총 수납 금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodMatrixList.map((row) => (
                        <TableRow key={row.periodKey}>
                          <TableCell className="font-semibold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                            {row.periodKey}
                          </TableCell>
                          {allItemNames.map((itemName) => {
                            const itemData = row.items[itemName];
                            const amt = itemData?.amount || 0;
                            const cnt = itemData?.count || 0;
                            return (
                              <TableCell key={itemName} className="text-right text-xs whitespace-nowrap">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                  {amt.toLocaleString()}원
                                </span>
                                <span className="text-slate-400 ml-1">({cnt}건)</span>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-medium whitespace-nowrap">{row.totalCount}건</TableCell>
                          <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {row.totalAmount.toLocaleString()}원
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: 정기 vs 1회성 분석 */}
          {activeTab === 'subscription' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">정기 결제 수납</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-indigo-600">
                      {subscriptionStats.recurringAmount.toLocaleString()}원
                    </div>
                    <p className="text-xs text-slate-500 mt-1">총 {subscriptionStats.recurringCount}건 완료</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">1회성 결제 수납</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-emerald-600">
                      {subscriptionStats.oneTimeAmount.toLocaleString()}원
                    </div>
                    <p className="text-xs text-slate-500 mt-1">총 {subscriptionStats.oneTimeCount}건 완료</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">정기 vs 1회성 비중 비교</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={subscriptionStats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                      <Bar dataKey="amount" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* TAB 5 전용: 기간별 x 정기/1회성 집계표 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">기간별 x 정기/1회성 결제 상세 집계표</CardTitle>
                  <CardDescription>선택한 기간별 정기결제 및 1회성 결제의 비율과 금액 현황입니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>조회 기간</TableHead>
                        <TableHead className="text-right">정기결제 (건/금액)</TableHead>
                        <TableHead className="text-right">1회성 결제 (건/금액)</TableHead>
                        <TableHead className="text-right">정기 수납 비중</TableHead>
                        <TableHead className="text-right">총 수납 금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodMatrixList.map((row) => {
                        const recRatio = row.totalAmount > 0 ? ((row.recurringAmount / row.totalAmount) * 100).toFixed(1) : '0';
                        return (
                          <TableRow key={row.periodKey}>
                            <TableCell className="font-semibold text-slate-800 dark:text-zinc-200">{row.periodKey}</TableCell>
                            <TableCell className="text-right text-xs">
                              <span className="font-bold text-indigo-600">{row.recurringAmount.toLocaleString()}원</span>
                              <span className="text-slate-400 ml-1">({row.recurringCount}건)</span>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <span className="font-bold text-emerald-600">{row.oneTimeAmount.toLocaleString()}원</span>
                              <span className="text-slate-400 ml-1">({row.oneTimeCount}건)</span>
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-indigo-700">
                              {recRatio}%
                            </TableCell>
                            <TableCell className="text-right font-bold text-indigo-600 dark:text-indigo-400">
                              {row.totalAmount.toLocaleString()}원
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* 🟢 간편결제 세부 내역 상세 팝업 (Easy Pay Detail Modal - Hallmark Design) */}
      <Dialog open={isEasyPayModalOpen} onOpenChange={setIsEasyPayModalOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xl"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          {/* 헤더 영역: 닫기 버튼과의 겹침 방지를 위해 pr-10 패딩 부여 */}
          <DialogHeader className="pb-4 border-b border-slate-100 dark:border-zinc-800/80 pr-10">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-200/50 dark:border-amber-800/30">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                {/* 기간 메타데이터 뱃지 행: 길이가 길어도 깨지지 않도록 flex-wrap 지원 */}
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                    <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>{selectedPeriodKey || periodSelection.label}</span>
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                    ({periodUnit === 'daily' ? '일별' : periodUnit === 'weekly' ? '주별' : periodUnit === 'yearly' ? '년별' : '월별'} 기준)
                  </span>
                  {selectedPeriodKey && (
                    <button
                      type="button"
                      onClick={() => setSelectedPeriodKey(null)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/80 transition-colors"
                    >
                      전체 보기 ↩
                    </button>
                  )}
                </div>

                <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
                  간편결제 수납 세부 분석
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  선택된 기간 동안 접수된 카카오페이, 네이버페이, 토스페이의 세부 수납 통계입니다.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-5">
            {/* 요약 KPI 카드 3종 (안정적인 고정 레이아웃 및 균형잡힌 타이포그래피) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <Card className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 shadow-xs">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-900/80 dark:text-amber-300">
                      총 간편결제액
                    </span>
                    <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      <Smartphone className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="my-2.5">
                    <span className="text-2xl font-black tracking-tight text-amber-700 dark:text-amber-400 tabular-nums">
                      {modalEasyPayStats.totalAmount.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300 ml-1">원</span>
                  </div>
                  <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70">
                    선택 기간 수납 합계
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50/70 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 shadow-xs">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                      총 거래 건수
                    </span>
                    <span className="p-1 rounded-md bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                      <Receipt className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="my-2.5">
                    <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">
                      {modalEasyPayStats.totalCount.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-300 ml-1">건</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    정상 승인 완료 건
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 shadow-xs">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-900/80 dark:text-indigo-300">
                      1회 평균 결제액
                    </span>
                    <span className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      <CreditCard className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="my-2.5">
                    <span className="text-2xl font-black tracking-tight text-indigo-700 dark:text-indigo-400 tabular-nums">
                      {(modalEasyPayStats.totalCount > 0 ? Math.round(modalEasyPayStats.totalAmount / modalEasyPayStats.totalCount) : 0).toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-indigo-800 dark:text-indigo-300 ml-1">원</span>
                  </div>
                  <p className="text-[11px] text-indigo-700/70 dark:text-indigo-400/70">
                    건당 평균 수납 금액
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 페이별 건수 · 금액 · 비중 집계표 */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                    세부 수단별 수납 현황
                  </h4>
                  <Badge variant="outline" className="text-[11px] px-2 py-0.2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700">
                    총 {modalEasyPayStats.list.length}개 수단
                  </Badge>
                </div>
                <span className="text-xs text-slate-400 dark:text-zinc-500">
                  점유 비중 순 정렬
                </span>
              </div>

              <div className="border border-slate-200/90 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/90 dark:bg-zinc-800/60">
                      <TableHead className="font-semibold text-slate-600 dark:text-zinc-300">세부 결제 수단</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600 dark:text-zinc-300">결제 건수</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600 dark:text-zinc-300">점유 비중</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600 dark:text-zinc-300">총 수납 금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalEasyPayStats.list.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center text-slate-400 dark:text-zinc-500">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                              수납된 간편결제 내역이 없습니다
                            </p>
                            <p className="text-xs text-slate-400 dark:text-zinc-500">
                              선택된 기간({selectedPeriodKey || periodSelection.label}) 동안 발생한 승인 완료 간편결제 내역이 0건입니다.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      modalEasyPayStats.list.map((item) => {
                        const getBadgeColor = (name: string) => {
                          if (name.includes('카카오')) return 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300';
                          if (name.includes('네이버')) return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300';
                          if (name.includes('토스')) return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300';
                          if (name.includes('계좌') || name.includes('이체')) return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300';
                          return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300';
                        };
                        return (
                          <TableRow key={item.name} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                            <TableCell className="font-semibold text-slate-800 dark:text-zinc-200">
                              <Badge variant="outline" className={`text-xs px-2 py-0.5 font-bold ${getBadgeColor(item.name)}`}>
                                {item.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-800 dark:text-zinc-200 tabular-nums">
                              {item.count.toLocaleString()}건
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-600 dark:text-zinc-400">
                              <div className="flex items-center justify-end gap-2.5">
                                <div className="w-16 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-amber-500 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(0, Number(item.ratio)))}%` }}
                                  />
                                </div>
                                <span className="text-xs w-10 text-right tabular-nums">{item.ratio}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                              {item.amount.toLocaleString()}원
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
