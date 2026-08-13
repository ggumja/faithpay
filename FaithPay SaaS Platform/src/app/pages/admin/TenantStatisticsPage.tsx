import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp } from '../../context/AppContext';
import { donationAPI } from '../../api/client';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { AdminSidebar } from '../../components/AdminSidebar';
import { PeriodRangePicker, PeriodUnit, PeriodSelection } from '../../components/PeriodRangePicker';

// 색상 팔레트
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

export default function TenantStatisticsPage() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { currentTenant, setCurrentTenant, tenants } = useApp();

  const [donations, setDonations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'method' | 'device' | 'item' | 'subscription'>('overview');

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

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
      fetchData(tenant.id);
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  const fetchData = async (tenantId: string) => {
    setIsLoading(true);
    try {
      const res = await donationAPI.getByTenant(tenantId);
      if (res.success && Array.isArray(res.data)) {
        const list = assignSequentialDonationIds(res.data);
        setDonations(list);
      }
    } catch (e: any) {
      toast.error('통계 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔴 선택된 기간 선택(periodSelection) 및 전일 23:59:59 마감 필터링
  const snapshotDonations = useMemo(() => {
    const startLimit = periodSelection.startDate;
    let endLimit = periodSelection.endDate;
    if (endLimit > yesterdayCutoff) {
      endLimit = yesterdayCutoff;
    }

    return donations.filter((d) => {
      const created = new Date(d.createdAt || d.created_at || d.date || 0);
      if (isNaN(created.getTime())) return false;

      // 1. 마감 시점(전일 23:59:59 또는 선택 종료일) 이하
      if (created > endLimit) return false;

      // 2. 선택 시작일 이상
      if (created < startLimit) return false;

      // 3. 정상 승인 완료건(completed/paid/success/approved)만
      const rawStatus = String(d.paymentStatus || d.payment_status || d.status || 'completed').toLowerCase();
      const isCompleted =
        rawStatus === 'completed' ||
        rawStatus === 'success' ||
        rawStatus === 'paid' ||
        rawStatus === 'approved' ||
        rawStatus === '결제완료' ||
        rawStatus === '승인완료';
      return isCompleted;
    });
  }, [donations, periodSelection, yesterdayCutoff]);

  // 마감 상세 목록 검색 및 페이징
  const filteredSnapshotList = useMemo(() => {
    return snapshotDonations.filter((d) => {
      if (!searchTerm) return true;
      const term = searchTerm.trim().toLowerCase();
      const donor = String(d.donorName || '').toLowerCase();
      const id = String(d.id || '').toLowerCase();
      const item = String(d.itemName || '').toLowerCase();
      const method = String(d.paymentMethod || '').toLowerCase();
      return donor.includes(term) || id.includes(term) || item.includes(term) || method.includes(term);
    });
  }, [snapshotDonations, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredSnapshotList.length / pageSize));
  const pagedSnapshotList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSnapshotList.slice(start, start + pageSize);
  }, [filteredSnapshotList, currentPage, pageSize]);

  // 1. 종합 통계 (Overview) - 과거 -> 현재(오름차순 시간순) 정렬
  const overviewStats = useMemo(() => {
    const totalAmount = snapshotDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const totalCount = snapshotDonations.length;
    const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;

    const trendMap: Record<string, { sortTime: number; key: string; amount: number }> = {};

    snapshotDonations.forEach((d) => {
      const date = new Date(d.createdAt || d.created_at || d.date);
      if (!isNaN(date.getTime())) {
        let key = '';
        let sortTime = date.getTime();

        if (periodUnit === 'daily') {
          key = `${date.getMonth() + 1}/${date.getDate()}`;
          sortTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        } else if (periodUnit === 'weekly') {
          const weekNum = Math.ceil(date.getDate() / 7);
          key = `${date.getMonth() + 1}월 ${weekNum}주`;
          sortTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        } else if (periodUnit === 'yearly') {
          key = `${date.getFullYear()}년`;
          sortTime = new Date(date.getFullYear(), 0, 1).getTime();
        } else {
          key = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
          sortTime = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
        }

        if (!trendMap[key]) {
          trendMap[key] = { sortTime, key, amount: 0 };
        }
        trendMap[key].amount += Number(d.amount) || 0;
      }
    });

    // 🔴 과거(Past) -> 현재(Present) 시간 오름차순 정렬 (차트 왼쪽: 과거, 오른쪽: 현재)
    const monthlyTrend = Object.values(trendMap)
      .sort((a, b) => a.sortTime - b.sortTime)
      .map((item) => ({ month: item.key, amount: item.amount }));

    return {
      totalAmount,
      totalCount,
      avgAmount,
      monthlyTrend,
    };
  }, [snapshotDonations, periodUnit]);

  // 2. 결제 수단별 통계 (Method)
  const methodStats = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    snapshotDonations.forEach((d) => {
      let method = d.paymentMethod || d.payment_method || d.method || '신용카드';
      if (method.includes('카드')) method = '신용카드';
      else if (method.includes('가상')) method = '가상계좌';
      else if (method.includes('계좌')) method = '실시간 계좌이체';
      else if (method.includes('카카오')) method = '카카오페이';

      if (!map[method]) map[method] = { amount: 0, count: 0 };
      map[method].amount += Number(d.amount) || 0;
      map[method].count += 1;
    });

    const chartData = Object.keys(map).map((name) => ({
      name,
      value: map[name].amount,
      count: map[name].count,
    }));

    return { map, chartData };
  }, [snapshotDonations]);

  // 3. 기기/채널별 통계 (Device)
  const deviceStats = useMemo(() => {
    let kioskAmount = 0;
    let kioskCount = 0;
    let webAmount = 0;
    let webCount = 0;

    snapshotDonations.forEach((d) => {
      const isKiosk = d.deviceType === 'KIOSK' || String(d.id || '').toUpperCase().includes('KIOSK');
      const amt = Number(d.amount) || 0;
      if (isKiosk) {
        kioskAmount += amt;
        kioskCount += 1;
      } else {
        webAmount += amt;
        webCount += 1;
      }
    });

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
  }, [snapshotDonations]);

  // 4. 봉헌 항목별 통계 (Item)
  const itemStats = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    snapshotDonations.forEach((d) => {
      const item = d.itemName || d.item_name || '일반헌금/보시';
      if (!map[item]) map[item] = { amount: 0, count: 0 };
      map[item].amount += Number(d.amount) || 0;
      map[item].count += 1;
    });

    const sortedList = Object.keys(map)
      .map((name) => ({ name, amount: map[name].amount, count: map[name].count }))
      .sort((a, b) => b.amount - a.amount);

    return sortedList;
  }, [snapshotDonations]);

  // 🏷️ 4. 봉헌 항목별 고유 목록 (테이블 컬럼 동적 분할용)
  const allItemNames = useMemo(() => {
    const list = itemStats.map((it) => it.name);
    return list.length > 0 ? list : ['일반헌금/보시'];
  }, [itemStats]);

  // 5. 정기 vs 일시 통계 (Subscription)
  const subscriptionStats = useMemo(() => {
    let recurringAmount = 0;
    let recurringCount = 0;
    let oneTimeAmount = 0;
    let oneTimeCount = 0;

    snapshotDonations.forEach((d) => {
      const amt = Number(d.amount) || 0;
      if (d.isRecurring) {
        recurringAmount += amt;
        recurringCount += 1;
      } else {
        oneTimeAmount += amt;
        oneTimeCount += 1;
      }
    });

    return {
      recurringAmount,
      recurringCount,
      oneTimeAmount,
      oneTimeCount,
      chartData: [
        { name: '🗓️ 정기 결제', amount: recurringAmount, count: recurringCount },
        { name: '⚡ 일시 결제', amount: oneTimeAmount, count: oneTimeCount },
      ],
    };
  }, [snapshotDonations]);

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

    snapshotDonations.forEach((d) => {
      const date = new Date(d.createdAt || d.created_at || d.date);
      if (isNaN(date.getTime())) return;

      let key = '';
      let sortTime = date.getTime();

      if (periodUnit === 'daily') {
        key = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        sortTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      } else if (periodUnit === 'weekly') {
        const weekNum = Math.ceil(date.getDate() / 7);
        key = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${weekNum}주차`;
        sortTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      } else if (periodUnit === 'yearly') {
        key = `${date.getFullYear()}년`;
        sortTime = new Date(date.getFullYear(), 0, 1).getTime();
      } else {
        key = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
        sortTime = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
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

      const amt = Number(d.amount) || 0;
      map[key].totalAmount += amt;
      map[key].totalCount += 1;

      // 1. 수단별
      let method = d.paymentMethod || d.payment_method || '신용카드';
      if (method.includes('카드')) method = '신용카드';
      else if (method.includes('가상')) method = '가상계좌';
      else if (method.includes('계좌')) method = '실시간 계좌이체';
      else if (method.includes('카카오')) method = '카카오페이';

      if (!map[key].methods[method]) map[key].methods[method] = { amount: 0, count: 0 };
      map[key].methods[method].amount += amt;
      map[key].methods[method].count += 1;

      // 2. 기기별
      const isKiosk = d.deviceType === 'KIOSK' || String(d.id || '').toUpperCase().includes('KIOSK');
      if (isKiosk) {
        map[key].kioskAmount += amt;
        map[key].kioskCount += 1;
      } else {
        map[key].webAmount += amt;
        map[key].webCount += 1;
      }

      // 3. 항목별
      const item = d.itemName || d.item_name || '일반헌금/보시';
      if (!map[key].items[item]) map[key].items[item] = { amount: 0, count: 0 };
      map[key].items[item].amount += amt;
      map[key].items[item].count += 1;

      // 4. 정기/일시
      if (d.isRecurring) {
        map[key].recurringAmount += amt;
        map[key].recurringCount += 1;
      } else {
        map[key].oneTimeAmount += amt;
        map[key].oneTimeCount += 1;
      }
    });

    // 🔴 과거(Past/Left) -> 현재(Present/Right) 시간 오름차순 정렬
    return Object.values(map).sort((a, b) => a.sortTime - b.sortTime);
  }, [snapshotDonations, periodUnit]);

  // CSV Export
  const handleExportCSV = () => {
    if (snapshotDonations.length === 0) {
      toast.error('내보낼 마감 통계 데이터가 없습니다.');
      return;
    }
    const headers = ['봉헌번호', '결제일시', '접수기기', '성명', '봉헌항목', '금액', '결제방법', '정기여부'];
    const rows = snapshotDonations.map((d) => [
      `"${d.id || ''}"`,
      `"${new Date(d.createdAt || d.created_at).toLocaleString()}"`,
      `"${d.deviceType === 'KIOSK' ? '키오스크' : '모바일/웹'}"`,
      `"${d.donorName || '무기명'}"`,
      `"${d.itemName || '일반헌금/보시'}"`,
      d.amount || 0,
      `"${d.paymentMethod || '신용카드'}"`,
      d.isRecurring ? '정기' : '일시',
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
                onClick={() => currentTenant && fetchData(currentTenant.id)}
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

          {/* ℹ️ 전일 23:59:59 마감 집계 안내 배너 */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <span className="font-bold text-sm block mb-0.5">
                🗓️ 마감 시점 기준: {cutoffDateStr} 기준 완료 데이터
              </span>
              본 통계 화면은 실시간 결제의 시차 변동 오류를 방지하기 위해 **전일 23:59:59 시점까지 정상 승인 완료된 결제건만 마감 집계**하여 보여줍니다. (당일 신규 결제건은 익일 새벽 자동 마감 집계 후 본 통계에 포함됩니다.)
            </div>
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
              5. 정기 vs 일시 분석
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
                    <p className="text-xs text-slate-400 mt-1">마감 완료 건수: {overviewStats.totalCount}건</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      평균 객단가 (1건당)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-emerald-600">
                      {overviewStats.avgAmount.toLocaleString()}원
                    </div>
                    <p className="text-xs text-slate-400 mt-1">1회 결제 시 평균 봉헌 금액</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      마감 승인 성공률
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-blue-600">100.0%</div>
                    <p className="text-xs text-slate-400 mt-1">미승인/이탈건 제외 정제 완료</p>
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
                        <TableHead className="text-right">평균 객단가</TableHead>
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
                      선택 기간 수납 상세 거래 명세 ({filteredSnapshotList.length}건)
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
                            선택된 기간 조건에 해당되는 마감 수납 내역이 없습니다.
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
                                {donation.paymentMethod || '신용카드'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={donation.isRecurring ? 'default' : 'secondary'} className="text-[11px]">
                                  {donation.isRecurring ? '정기' : '일시'}
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
                  {filteredSnapshotList.length > 0 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                      <p className="text-xs text-slate-500">
                        총 <span className="font-bold text-slate-800 dark:text-zinc-200">{filteredSnapshotList.length}</span>건 중 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredSnapshotList.length)}건 표시 (페이지 {currentPage} / {totalPages})
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
                          {methodStats.chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">수단별 수납 현황 표</CardTitle>
                    <CardDescription>결제 수단별 세부 금액 및 건수</CardDescription>
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
                        {methodStats.chartData.map((item) => (
                          <TableRow key={item.name}>
                            <TableCell className="font-semibold">{item.name}</TableCell>
                            <TableCell className="text-right font-medium">{item.count}건</TableCell>
                            <TableCell className="text-right font-bold text-indigo-600">
                              {item.value.toLocaleString()}원
                            </TableCell>
                          </TableRow>
                        ))}
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
                        <TableHead className="text-right">카카오페이</TableHead>
                        <TableHead className="text-right">계좌이체</TableHead>
                        <TableHead className="text-right">가상계좌</TableHead>
                        <TableHead className="text-right">총 수납액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodMatrixList.map((row) => (
                        <TableRow key={row.periodKey}>
                          <TableCell className="font-semibold text-slate-800 dark:text-zinc-200">{row.periodKey}</TableCell>
                          <TableCell className="text-right text-xs">
                            <span className="font-bold text-slate-700">{(row.methods['신용카드']?.amount || 0).toLocaleString()}원</span>
                            <span className="text-slate-400 ml-1">({row.methods['신용카드']?.count || 0}건)</span>
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <span className="font-bold text-amber-700">{(row.methods['카카오페이']?.amount || 0).toLocaleString()}원</span>
                            <span className="text-slate-400 ml-1">({row.methods['카카오페이']?.count || 0}건)</span>
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <span className="font-bold text-blue-700">{(row.methods['실시간 계좌이체']?.amount || 0).toLocaleString()}원</span>
                            <span className="text-slate-400 ml-1">({row.methods['실시간 계좌이체']?.count || 0}건)</span>
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <span className="font-bold text-emerald-700">{(row.methods['가상계좌']?.amount || 0).toLocaleString()}원</span>
                            <span className="text-slate-400 ml-1">({row.methods['가상계좌']?.count || 0}건)</span>
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

          {/* TAB 4: 봉헌 항목별 분석 */}
          {activeTab === 'item' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">봉헌 항목별 수납 순위 (전일 마감 기준)</CardTitle>
                  <CardDescription>가장 많이 접수된 봉헌/보시 항목 순위입니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">순위</TableHead>
                        <TableHead>봉헌 항목명</TableHead>
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

              {/* TAB 4 전용: 기간별 x 봉헌 항목별 집계표 (항목별 컬럼 분할) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">기간별 x 봉헌 항목별 상세 수납 집계표</CardTitle>
                  <CardDescription>선택한 기간별 각 봉헌/보시 항목의 수납 금액 및 건수입니다</CardDescription>
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

          {/* TAB 5: 정기 vs 일시 분석 */}
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
                    <CardTitle className="text-lg font-bold">일시 결제 수납</CardTitle>
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
                  <CardTitle className="text-lg font-bold">정기 vs 일시 비중 비교</CardTitle>
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

              {/* TAB 5 전용: 기간별 x 정기/일시 집계표 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">기간별 x 정기/일시 결제 상세 집계표</CardTitle>
                  <CardDescription>선택한 기간별 정기결제 및 일시결제의 비율과 금액 현황입니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>조회 기간</TableHead>
                        <TableHead className="text-right">정기결제 (건/금액)</TableHead>
                        <TableHead className="text-right">일시결제 (건/금액)</TableHead>
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
    </div>
  );
}
