import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Smartphone,
  Monitor,
  Repeat,
  Calendar,
  Building2,
  Receipt,
  User,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import { formatPhoneNumber } from '../../../utils/phoneUtils';
import { toast } from 'sonner';
import { donationAPI, tenantAPI } from '../../../api/client';

/** ISO 날짜 문자열 → 'YYYY-MM-DD HH:mm:ss' (KST 기준) */
const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(d);
    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;
    return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`;
  } catch {
    return iso.slice(0, 19).replace('T', ' ');
  }
};

/** 종교/단체 구분 텍스트 및 배지 */
const getReligionBadge = (type?: string) => {
  switch (type) {
    case 'buddhist':
      return { label: '불교·사찰', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200' };
    case 'catholic':
      return { label: '가톨릭·성당', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200' };
    case 'donation':
      return { label: '구호·공익', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200' };
    default:
      return { label: '개신교·교회', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200' };
  }
};

export default function MultiPartySettlementLedger() {
  const [donations, setDonations] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // 검색 및 다차원 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('ALL');
  const [tenantFilter, setTenantFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 거래 상세 보기 모달
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // 실측 DB 데이터 로딩
  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [donationRes, tenantRes] = await Promise.all([
        donationAPI.getAll(),
        tenantAPI.getAll().catch(() => ({ success: true, data: [] }))
      ]);

      if (donationRes.success && Array.isArray(donationRes.data)) {
        setDonations(donationRes.data);
      } else {
        setApiError(donationRes.error || '거래 데이터를 불러오지 못했습니다.');
      }

      if (tenantRes.success && Array.isArray(tenantRes.data)) {
        setTenants(tenantRes.data);
      }
    } catch (err: any) {
      setApiError(err.message || '데이터 조회 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 날짜 퀵 필터 헬퍼
  const handleQuickDateRange = (preset: 'today' | '7days' | 'month' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const d = new Date();
      d.setDate(1);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  // 필터링된 거래 목록 계산
  const filteredList = useMemo(() => {
    return donations.filter((tx) => {
      // 1. 검색어 필터
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (tx.id && tx.id.toLowerCase().includes(q)) ||
          (tx.transactionId && tx.transactionId.toLowerCase().includes(q)) ||
          (tx.approveNo && tx.approveNo.toLowerCase().includes(q)) ||
          (tx.donorName && tx.donorName.toLowerCase().includes(q)) ||
          (tx.donorPhone && tx.donorPhone.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, ''))) ||
          (tx.itemName && tx.itemName.toLowerCase().includes(q)) ||
          (tx.tenantName && tx.tenantName.toLowerCase().includes(q)) ||
          (tx.baptismName && tx.baptismName.toLowerCase().includes(q));

        if (!matches) return false;
      }

      // 2. 상태 필터
      const rawStatus = (tx.paymentStatus || 'pending').toLowerCase();
      if (statusFilter !== 'ALL' && rawStatus !== statusFilter.toLowerCase()) {
        return false;
      }

      // 3. 결제 방식 필터
      if (paymentTypeFilter === 'RECURRING' && !tx.isRecurring) return false;
      if (paymentTypeFilter === 'AUTH' && tx.isRecurring) return false;
      if (paymentTypeFilter === 'KIOSK' && tx.deviceType !== 'KIOSK') return false;

      // 4. 가맹단체 필터
      if (tenantFilter !== 'ALL' && tx.tenantId !== tenantFilter && tx.tenantSlug !== tenantFilter) {
        return false;
      }

      // 5. 날짜 범위 필터 (KST 기준)
      if (startDate || endDate) {
        const txTime = tx.createdAt ? new Date(tx.createdAt).getTime() : 0;
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00+09:00`).getTime();
          if (txTime < start) return false;
        }
        if (endDate) {
          const end = new Date(`${endDate}T23:59:59.999+09:00`).getTime();
          if (txTime > end) return false;
        }
      }

      return true;
    });
  }, [donations, searchQuery, statusFilter, paymentTypeFilter, tenantFilter, startDate, endDate]);

  // 상단 실측 KPI 통계 계산
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7);

    let todayAmount = 0;
    let todayCount = 0;
    let monthAmount = 0;
    let monthCount = 0;
    let cancelAmount = 0;
    let cancelCount = 0;
    let recurringCount = 0;

    donations.forEach((d) => {
      const isCompleted = d.paymentStatus === 'completed';
      const isCancelled = d.paymentStatus === 'cancelled';
      const amt = Number(d.amount || 0);
      const dDateStr = d.createdAt ? d.createdAt.slice(0, 10) : '';
      const dMonthStr = d.createdAt ? d.createdAt.slice(0, 7) : '';

      if (isCompleted) {
        if (dDateStr === todayStr) {
          todayAmount += amt;
          todayCount += 1;
        }
        if (dMonthStr === currentMonthStr) {
          monthAmount += amt;
          monthCount += 1;
        }
        if (d.isRecurring) {
          recurringCount += 1;
        }
      }

      if (isCancelled) {
        cancelAmount += amt;
        cancelCount += 1;
      }
    });

    const totalSuccessCount = donations.filter((d) => d.paymentStatus === 'completed').length;
    const recurringRate = totalSuccessCount > 0 ? ((recurringCount / totalSuccessCount) * 100).toFixed(1) : '0.0';

    return {
      todayAmount,
      todayCount,
      monthAmount,
      monthCount,
      cancelAmount,
      cancelCount,
      recurringCount,
      recurringRate,
    };
  }, [donations]);

  // CSV 내보내기 헬퍼
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      toast.error('내보낼 거래 데이터가 없습니다.');
      return;
    }

    const headers = [
      '거래번호',
      '결제일시',
      '상태',
      '가맹단체',
      '항목명',
      '결제금액',
      '결제유형',
      '결제수단',
      'PG사',
      'PG_TID',
      '승인번호',
      '기부자명',
      '연락처',
      '세례명_법명',
      '디바이스',
      '취소일시',
      '취소사유',
    ];

    const rows = filteredList.map((tx) => [
      `"${tx.id || ''}"`,
      `"${fmtDateTime(tx.createdAt)}"`,
      `"${tx.paymentStatus || ''}"`,
      `"${tx.tenantName || ''}"`,
      `"${tx.itemName || ''}"`,
      tx.amount || 0,
      `"${tx.isRecurring ? '정기결제' : '단건결제'}"`,
      `"${tx.paymentMethod || ''}"`,
      `"${tx.pgProvider || ''}"`,
      `"${tx.transactionId || ''}"`,
      `"${tx.approveNo || ''}"`,
      `"${tx.donorName || ''}"`,
      `"${tx.donorPhone || ''}"`,
      `"${tx.baptismName || ''}"`,
      `"${tx.deviceType || 'WEB_MOBILE'}"`,
      `"${tx.cancelApprovedAt ? fmtDateTime(tx.cancelApprovedAt) : ''}"`,
      `"${(tx.cancelReason || tx.failureReason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SoulPay_Transactions_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // GBL-16 fix: Blob URL 즉시 해제 (메모리 누수 방지)
    toast.success('거래원장 CSV 파일이 다운로드되었습니다.');

  };

  return (
    <div className="w-full space-y-6">
      {/* ── 상단 헤더 ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              통합 결제·거래 원장
            </h2>
            <Badge className="bg-blue-600 text-white font-bold text-xs px-2.5 py-0.5 border-none">
              실측 DB 100%
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            가맹 단체별 실시간 결제 승인, 취소, 환불 및 수납 거래 상세 내역을 통합 조회·관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* ── KPI 통계 요약 카드 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 오늘 결제액 */}
        <Card className="border-slate-200 dark:border-zinc-800 bg-gradient-to-br from-white to-blue-50/40 dark:from-zinc-900 dark:to-blue-950/20 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">오늘 결제액</span>
              <span className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 dark:text-white font-mono">
              {stats.todayAmount.toLocaleString()}원
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              오늘 승인 건수: <strong className="text-blue-600 font-bold">{stats.todayCount}건</strong>
            </div>
          </CardContent>
        </Card>

        {/* 이번 달 누적 결제액 */}
        <Card className="border-slate-200 dark:border-zinc-800 bg-gradient-to-br from-white to-emerald-50/40 dark:from-zinc-900 dark:to-emerald-950/20 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">이번 달 누적 결제액</span>
              <span className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 dark:text-white font-mono">
              {stats.monthAmount.toLocaleString()}원
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              이달 완료 건수: <strong className="text-emerald-600 font-bold">{stats.monthCount}건</strong>
            </div>
          </CardContent>
        </Card>

        {/* 취소 / 환불 */}
        <Card className="border-slate-200 dark:border-zinc-800 bg-gradient-to-br from-white to-rose-50/40 dark:from-zinc-900 dark:to-rose-950/20 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">취소 / 환불 누적</span>
              <span className="p-1.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-600">
                <XCircle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {stats.cancelAmount.toLocaleString()}원
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              취소·환불 건수: <strong className="text-rose-600 font-bold">{stats.cancelCount}건</strong>
            </div>
          </CardContent>
        </Card>

        {/* 정기결제 비중 */}
        <Card className="border-slate-200 dark:border-zinc-800 bg-gradient-to-br from-white to-purple-50/40 dark:from-zinc-900 dark:to-purple-950/20 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">정기결제(빌링) 비중</span>
              <span className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-600">
                <Repeat className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {stats.recurringRate}%
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              정기 승인 건수: <strong className="text-purple-600 font-bold">{stats.recurringCount}건</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 다차원 필터 및 검색 바 ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4 shadow-2xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* 통합 검색창 */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="거래번호, 승인번호, TID, 기부자명, 연락처, 항목 검색..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* 거래 상태 필터 */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="거래 상태 필터"
              className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">상태: 전체 보기</option>
              <option value="completed">결제완료 (Completed)</option>
              <option value="cancelled">결제취소 (Cancelled)</option>
              <option value="failed">승인실패 (Failed)</option>
              <option value="pending">결제대기 (Pending)</option>
            </select>
          </div>

          {/* 결제 방식 필터 */}
          <div className="md:col-span-2">
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
              aria-label="결제 방식 필터"
              className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">유형: 전체 방식</option>
              <option value="AUTH">단건 인증결제</option>
              <option value="RECURRING">정기결제(빌링)</option>
              <option value="KIOSK">키오스크 현장</option>
            </select>
          </div>

          {/* 가맹단체 필터 */}
          <div className="md:col-span-4">
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              aria-label="가맹 단체 필터"
              className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">가맹단체: 전체 가맹점</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 날짜 범위 지정 바 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-zinc-400 font-bold flex items-center gap-1 text-[11px]">
              <Calendar className="h-3.5 w-3.5" /> 기간 조회:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="조회 시작일"
              className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-slate-800 dark:text-zinc-200"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="조회 종료일"
              className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-slate-800 dark:text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { key: 'today', label: '오늘' },
              { key: '7days', label: '최근 7일' },
              { key: 'month', label: '이번 달' },
              { key: 'all', label: '전체' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleQuickDateRange(key as any)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 cursor-pointer border-none transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 거래 원장 테이블 ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-2xs">
        {/* 상단 건수 및 요약 인디케이터 */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between text-xs">
          <div className="text-slate-600 dark:text-zinc-300 font-medium">
            총 <strong className="text-blue-600 font-bold">{filteredList.length}건</strong>의 결제 거래 내역이 조회되었습니다.
          </div>
          <div className="text-[11px] text-slate-400">
            * 거래 행을 클릭하면 상세 결제 정보 및 PG 매출전표를 확인할 수 있습니다.
          </div>
        </div>

        {/* 로딩 / 에러 / 빈 상태 */}
        {loading && (
          <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
            실시간 결제 거래 데이터를 조회하고 있습니다...
          </div>
        )}
        {!loading && apiError && (
          <div className="py-12 text-center text-xs text-rose-500 font-medium">
            {apiError}
          </div>
        )}
        {!loading && !apiError && filteredList.length === 0 && (
          <div className="py-16 text-center text-xs text-slate-400">
            선택한 조건에 일치하는 결제 거래 내역이 없습니다.
          </div>
        )}

        {/* 데이터 테이블 */}
        {!loading && !apiError && filteredList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-wider">
                  <th className="py-3 px-4">거래일시 (KST)</th>
                  <th className="py-3 px-3 text-center">상태</th>
                  <th className="py-3 px-4">가맹 단체</th>
                  <th className="py-3 px-4">봉헌 / 공덕 항목</th>
                  <th className="py-3 px-4 text-right">결제 금액</th>
                  <th className="py-3 px-3 text-center">결제유형</th>
                  <th className="py-3 px-4">결제수단 / PG</th>
                  <th className="py-3 px-4">기부자 / 신도</th>
                  <th className="py-3 px-4 font-mono text-[10.5px]">식별 / 승인번호</th>
                  <th className="py-3 px-3 text-center">상세보기</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs font-medium">
                {filteredList.map((tx) => {
                  const religion = getReligionBadge(tx.religionType);
                  const isCompleted = tx.paymentStatus === 'completed';
                  const isCancelled = tx.paymentStatus === 'cancelled';
                  const isFailed = tx.paymentStatus === 'failed';

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-blue-50/40 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                    >
                      {/* 1. 거래일시 */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {fmtDateTime(tx.createdAt)}
                        </div>
                        {isCancelled && tx.cancelApprovedAt && (
                          <div className="text-[10px] text-rose-500 font-medium">
                            취소: {fmtDateTime(tx.cancelApprovedAt)}
                          </div>
                        )}
                      </td>

                      {/* 2. 거래상태 */}
                      <td className="py-3.5 px-3 text-center">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> 결제완료
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="h-3 w-3" /> 결제취소
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="h-3 w-3" /> 승인실패
                          </span>
                        )}
                        {!isCompleted && !isCancelled && !isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200">
                            <Clock className="h-3 w-3" /> 결제대기
                          </span>
                        )}
                      </td>

                      {/* 3. 가맹단체 */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>{tx.tenantName || '가맹 단체'}</span>
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${religion.color}`}>
                            {religion.label}
                          </span>
                        </div>
                        {tx.tenantSlug && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            @{tx.tenantSlug}
                          </div>
                        )}
                      </td>

                      {/* 4. 항목명 */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {tx.itemName || '봉헌금'}
                        </div>
                      </td>

                      {/* 5. 결제 금액 */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className={`font-black text-sm ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {Number(tx.amount || 0).toLocaleString()}원
                        </div>
                        {isCancelled && (
                          <div className="text-[10px] font-bold text-rose-600 font-mono">
                            환불: -{Number(tx.amount || 0).toLocaleString()}원
                          </div>
                        )}
                      </td>

                      {/* 6. 결제유형 */}
                      <td className="py-3.5 px-3 text-center">
                        {tx.isRecurring ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                            <Repeat className="h-3 w-3" /> 정기결제
                          </span>
                        ) : tx.deviceType === 'KIOSK' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                            <Monitor className="h-3 w-3" /> 키오스크
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200">
                            <Smartphone className="h-3 w-3" /> 단건결제
                          </span>
                        )}
                      </td>

                      {/* 7. 결제수단 / PG */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-zinc-200">
                          {tx.paymentMethod || '신용카드'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 font-mono text-[9px]">
                            {tx.pgProvider === 'nanopay' ? '나노페이' : '토스페이먼츠'}
                          </span>
                        </div>
                      </td>

                      {/* 8. 기부자 / 신도 */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{tx.donorName || '익명'}</span>
                          {tx.baptismName && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                              ({tx.baptismName})
                            </span>
                          )}
                        </div>
                        {tx.donorPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatPhoneNumber(tx.donorPhone)}
                          </div>
                        )}
                      </td>

                      {/* 9. 식별 / 승인번호 */}
                      <td className="py-3.5 px-4 font-mono text-[10.5px] text-slate-600 dark:text-zinc-400">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[9px]">거래:</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[130px]" title={tx.id}>
                            {tx.id}
                          </span>
                        </div>
                        {tx.approveNo && (
                          <div className="flex items-center gap-1 mt-0.5 text-emerald-700 dark:text-emerald-400">
                            <span className="text-slate-400 text-[9px]">승인:</span>
                            <span className="font-bold">{tx.approveNo}</span>
                          </div>
                        )}
                        {tx.transactionId && tx.transactionId !== tx.id && (
                          <div className="text-[9.5px] text-slate-400 truncate max-w-[130px]" title={tx.transactionId}>
                            TID: {tx.transactionId}
                          </div>
                        )}
                      </td>

                      {/* 10. 상세보기 버튼 */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-[11px] font-bold transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700 inline-flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" />
                          상세
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 거래 상세 전문 모달 (Transaction Detail Modal) ── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-800/40">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  결제 거래 상세 원장 (Transaction Detail)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              {/* 핵심 요약 배너 */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">결제 금액</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    {Number(selectedTx.amount || 0).toLocaleString()}원
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">
                    {selectedTx.itemName || '봉헌금'} · {selectedTx.tenantName}
                  </div>
                </div>
                <div className="text-right">
                  {selectedTx.paymentStatus === 'completed' && (
                    <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1">
                      결제완료 (정상)
                    </Badge>
                  )}
                  {selectedTx.paymentStatus === 'cancelled' && (
                    <Badge className="bg-rose-600 text-white font-bold text-xs px-3 py-1">
                      결제취소 (환불완료)
                    </Badge>
                  )}
                  {selectedTx.paymentStatus === 'failed' && (
                    <Badge className="bg-amber-600 text-white font-bold text-xs px-3 py-1">
                      승인실패
                    </Badge>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    {fmtDateTime(selectedTx.createdAt)}
                  </div>
                </div>
              </div>

              {/* 1. 결제 기본 식별 정보 */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-[11.5px]">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  결제 및 승인 식별 정보
                </h4>
                <div className="grid grid-cols-2 gap-2.5 bg-slate-50 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <div>
                    <span className="text-slate-400 text-[10px]">거래 고유번호 (Donation ID)</span>
                    <div className="font-mono font-bold text-slate-800 dark:text-zinc-200 mt-0.5 break-all flex items-center gap-1">
                      <span>{selectedTx.id}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTx.id);
                          toast.success('거래번호가 복사되었습니다.');
                        }}
                        className="text-slate-400 hover:text-blue-600"
                        title="복사"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px]">카드사 승인번호 (Approve No)</span>
                    <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {selectedTx.approveNo || '미발급 / -'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px]">PG사 거래번호 (TID)</span>
                    <div className="font-mono text-slate-700 dark:text-zinc-300 mt-0.5 break-all">
                      {selectedTx.transactionId || '-'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px]">연동 PG사 / 결제수단</span>
                    <div className="font-bold text-slate-800 dark:text-zinc-200 mt-0.5">
                      {selectedTx.pgProvider === 'nanopay' ? '나노페이(Smallbee)' : '토스페이먼츠'} · {selectedTx.paymentMethod || '신용카드'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 가맹 단체 정보 */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-[11.5px]">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  가맹 단체 정보
                </h4>
                <div className="grid grid-cols-2 gap-2.5 bg-slate-50 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <div>
                    <span className="text-slate-400 text-[10px]">가맹점 명칭</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedTx.tenantName}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">가맹점 식별자 (Slug / ID)</span>
                    <div className="font-mono text-slate-700 dark:text-zinc-300 mt-0.5">
                      {selectedTx.tenantSlug ? `@${selectedTx.tenantSlug}` : selectedTx.tenantId}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. 기부자 / 신도 인적사항 */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-[11.5px]">
                  <User className="h-4 w-4 text-emerald-600" />
                  기부자 / 신도 인적사항
                </h4>
                <div className="grid grid-cols-2 gap-2.5 bg-slate-50 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <div>
                    <span className="text-slate-400 text-[10px]">기부자 성명</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedTx.donorName || '익명 신도'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">연락처 (휴대폰)</span>
                    <div className="font-mono text-slate-800 dark:text-zinc-200 mt-0.5">
                      {selectedTx.donorPhone ? formatPhoneNumber(selectedTx.donorPhone) : '-'}
                    </div>
                  </div>
                  {selectedTx.baptismName && (
                    <div>
                      <span className="text-slate-400 text-[10px]">세례명 / 법명 / 직분</span>
                      <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                        {selectedTx.baptismName}
                      </div>
                    </div>
                  )}
                  {selectedTx.familyMembers && (
                    <div>
                      <span className="text-slate-400 text-[10px]">함께 봉헌한 가족</span>
                      <div className="text-slate-800 dark:text-zinc-200 mt-0.5">
                        {selectedTx.familyMembers}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. 취소 / 실패 정보 (해당 시) */}
              {(selectedTx.paymentStatus === 'cancelled' || selectedTx.paymentStatus === 'failed') && (
                <div className="space-y-2">
                  <h4 className="font-bold text-rose-600 flex items-center gap-1.5 text-[11.5px]">
                    <AlertTriangle className="h-4 w-4" />
                    취소 / 실패 상세 사유
                  </h4>
                  <div className="bg-rose-50 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40 text-rose-900 dark:text-rose-200">
                    <div>
                      <span className="text-rose-500 text-[10px] font-bold">사유 안내:</span>
                      <div className="font-medium mt-0.5">
                        {selectedTx.cancelReason || selectedTx.failureReason || '상세 사유 미기재'}
                      </div>
                    </div>
                    {selectedTx.cancelTransactionId && (
                      <div className="mt-2 text-[10px] font-mono text-rose-600">
                        취소 거래번호(TID): {selectedTx.cancelTransactionId}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. PG 공식 영수증 / 매출전표 바로가기 링크 */}
              {selectedTx.receiptUrl && (
                <div className="pt-2 flex justify-end">
                  <a
                    href={selectedTx.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    PG사 공식 매출전표(영수증) 열기
                  </a>
                </div>
              )}
            </div>

            {/* 모달 풋터 */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-800 dark:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
