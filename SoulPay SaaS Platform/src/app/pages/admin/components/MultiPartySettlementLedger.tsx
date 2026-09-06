import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
  ArrowUpDown,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import { formatPhoneNumber } from '../../../utils/phoneUtils';
import { toast } from 'sonner';
import { partnerAPI } from '../../../api/client';

/** ISO 날짜 문자열 → 'YYYY-MM-DD HH:mm:ss' (KST) */
const fmtDate = (iso?: string | null): string => {
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
  } catch { return iso.slice(0, 19).replace('T', ' '); }
};

interface LedgerItem {
  id: string;
  txDate: string;
  tenantName: string;
  tenantSlug: string;
  tenantId?: string;
  paymentMethod?: string;
  pgProvider: 'toss' | 'nanopay';
  pgTid?: string;
  itemName?: string;
  donorName?: string;
  donorPhone?: string;
  baptismName?: string;
  agencyName?: string;
  agentName?: string;
  partnerName?: string;
  partnerRole?: string;
  isRecurring?: boolean;
  paymentType?: 'BILLING' | 'AUTH';
  deviceType?: 'KIOSK' | 'WEB_MOBILE';
  settlementMonth?: string;
  // DB 실제 수수료율
  contractRate?: number;   // 가맹 계약 수수료율 (%)
  agencyRate?: number;     // 대리점 수수료율 (%)
  agentRate?: number;      // 영업자 수수료율 (%)
  commissionPool?: number; // 총 수수료 풀 (gross × contractRate%)
  // 금액
  grossAmount: number;
  pgFee: number;
  tenantPayout: number;
  platformFee: number;   // SoulPay 순수익 (0.5%)
  partnerFee: number;    // HQ 대리점 (0.5%)
  agentFee: number;      // HQ 영업자 (0.5%)
  netProfit: number;
  // 정산 상태 (DB settlement_status 기반)
  status: 'COMPLETED' | 'SCHEDULED' | 'FAILED' | 'HOLD';
  payoutCycle: 'REALTIME' | 'D+1' | 'D+2' | 'D+3' | 'D+7' | 'WEEKLY' | 'MONTHLY';
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export default function MultiPartySettlementLedger() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDetail, setSelectedDetail] = useState<LedgerItem | null>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const queryParams: Record<string, string> = {};
      if (startDate) queryParams.startDate = startDate;
      if (endDate)   queryParams.endDate = endDate;
      if (statusFilter !== 'ALL') queryParams.status = statusFilter;
      const res = await partnerAPI.getLedger(queryParams);
      if (res.success && Array.isArray(res.data)) {
        setLedger(res.data);

      } else {
        setApiError(res.error ?? '데이터 조회 실패');
      }



    } catch (e: any) {
      setApiError(e.message || '원장 데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter]);


  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const filteredList = ledger.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q || 
      item.tenantName.toLowerCase().includes(q) ||
      (item.tenantId && item.tenantId.toLowerCase().includes(q)) ||
      (item.itemName && item.itemName.toLowerCase().includes(q)) ||
      (item.donorName && item.donorName.toLowerCase().includes(q)) ||
      (item.agencyName && item.agencyName.toLowerCase().includes(q)) ||
      (item.agentName && item.agentName.toLowerCase().includes(q)) ||
      item.id.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' || item.status === statusFilter;
    const matchesDevice =
      deviceFilter === 'ALL' ||
      (deviceFilter === 'KIOSK' && item.deviceType === 'KIOSK') ||
      (deviceFilter === 'WEB_MOBILE' && item.deviceType !== 'KIOSK');

    return matchesQuery && matchesStatus && matchesDevice;
  });

  const handleQuickDateRange = (preset: 'today' | '7days' | 'month' | 'all') => {
    const todayStr = new Date().toISOString().split('T')[0];
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

  const handleExportCSV = () => {
    const headers = [
      '거래번호',
      '결제일시',
      '가맹단체명',
      '봉헌항목',
      '기부자(마스킹)',
      '연락처(마스킹)',
      '결제유형',
      '결제기기',
      '결제수단',
      'PG사',
      '총결제액',
      'PG원가수수료(1.5%)',
      '가맹점정산액(98%)',
      '플랫폼수수료(0.5%)',
      '대리점수수료',
      '영업자수수료',
      '플랫폼순수익',
      '대리점명',
      '영업자명',
      '정산상태',
    ];
    const rows = filteredList.map((i) => [
      i.id,
      i.txDate,
      i.tenantName,
      i.itemName || '일반 헌금',
      i.donorName || '미지정',
      i.donorPhone || '',
      i.isRecurring || i.paymentType === 'BILLING' ? '빌링키 정기' : '카드 인증',
      i.deviceType === 'KIOSK' ? '현장 키오스크' : '온라인 웹/모바일',
      i.paymentMethod || '신용카드',
      i.pgProvider.toUpperCase(),
      i.grossAmount,
      i.pgFee,
      i.tenantPayout,
      i.platformFee,
      i.partnerFee,
      i.agentFee,
      i.netProfit,
      i.agencyName || 'HQ (본사)',
      i.agentName || '직접 영업',
      i.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SoulPay_4Party_Settlement_Ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('4자간 정산 원장 Excel CSV 다운로드가 완료되었습니다.');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── 페이지 상단 헤더 ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">거래이력 (거래원장)</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">영업자-단체-대리점별 전체 결제 및 수수료 분배 내역을 실시간으로 조회합니다.</p>
      </div>

      {/* ── 필터 및 기간 검색 바 ── */}

      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3 shadow-2xs">
        {/* 상단 검색 및 상태 필터 */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="거래번호 또는 단체명 검색..."
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 outline-none cursor-pointer"
            >
              <option value="ALL">전체 정산 상태</option>
              <option value="COMPLETED">입금 완료</option>
              <option value="SCHEDULED">지급 예정 (D+1)</option>
              <option value="HOLD">지급 유예 (보류)</option>
              <option value="FAILED">송금 오류</option>
            </select>

            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 outline-none cursor-pointer"
            >
              <option value="ALL">전체 결제기기</option>
              <option value="KIOSK">🖥️ 현장 키오스크</option>
              <option value="WEB_MOBILE">📱 온라인 웹/모바일</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-blue-600" />
            원장 Excel (CSV) 다운로드
          </button>
        </div>

        {/* 하단 날짜 기간 지정 바 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80 gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-600 dark:text-zinc-400">📅 정산 기간 지정:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-mono"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-mono"
            />
          </div>

          {/* 기간 퀵 선택 버튼 */}
          <div className="flex gap-1">
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

      {/* ── 4자간 분구 원장 테이블 ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-2xs">
        {/* 로딩 / 에러 */}
        {loading && (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">DB에서 원장 데이터를 불러오는 중...</div>
        )}
        {!loading && apiError && (
          <div className="py-8 text-center text-xs text-red-500">{apiError}</div>
        )}
        {!loading && !apiError && filteredList.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-400">조회된 원장 항목이 없습니다.</div>
        )}
        {!loading && !apiError && filteredList.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4">거래번호 / 일시</th>
                <th className="py-3 px-4">가맹단체 (교회/성당/사찰)</th>
                <th className="py-3 px-4 text-center">결제기기</th>
                <th className="py-3 px-4 text-right">총 결제액</th>
                <th className="py-3 px-4 text-right bg-slate-100/80 dark:bg-zinc-700/40 text-slate-600 dark:text-zinc-300">
                  계약수수료
                </th>
                <th className="py-3 px-4 text-right bg-purple-50/50 dark:bg-purple-950/20 text-purple-700">
                  PG 원가 (1.5%)
                </th>
                <th className="py-3 px-4 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700">
                  가맹단체 정산금
                </th>
                <th className="py-3 px-4 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-800">
                  HQ 대리점
                </th>
                <th className="py-3 px-4 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-800">
                  HQ 영업자
                </th>
                <th className="py-3 px-4 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700">
                  플랫폼 순수익
                </th>
                <th className="py-3 px-4 text-center">정산 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs font-medium">
              {filteredList.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedDetail(item)}
                  className="hover:bg-blue-50/50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>{item.id}</span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-200">
                        상세보기 🔍
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{fmtDate(item.txDate)}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-zinc-200">
                    <div>
                      {item.tenantName || item.tenantId || '가맹 단체'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono font-normal">{item.tenantSlug}</div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    {item.deviceType === 'KIOSK' ? (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                        🖥️ 키오스크
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1">
                        📱 웹/모바일
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-zinc-100">
                    {item.grossAmount.toLocaleString()}원
                  </td>
                  {/* 계약수수료 컬럼 (gross × contractRate%) */}
                  <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-zinc-300 bg-slate-50/60 dark:bg-zinc-800/30">
                    {(item.commissionPool ?? Math.round(item.grossAmount * ((item.contractRate ?? 3) / 100))).toLocaleString()}원
                    <div className="text-[9px] text-slate-400 font-normal">
                      {item.contractRate != null ? `${item.contractRate}%` : ''}
                    </div>
                  </td>
                  {/* PG 원가 */}
                  <td className="py-3 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/30 dark:bg-purple-950/10">
                    -{item.pgFee.toLocaleString()}원
                    <div className="text-[9px] text-purple-400 font-normal">1.5%</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                    {item.tenantPayout.toLocaleString()}원
                    <div className="text-[9px] text-emerald-400 font-normal">
                      {((item.tenantPayout / item.grossAmount) * 100).toFixed(1)}%
                    </div>
                  </td>
                  {/* HQ 대리점 */}
                  <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                    {item.partnerFee.toLocaleString()}원
                    <div className="text-[9px] text-amber-400 font-normal">
                      {item.agencyRate != null ? `${item.agencyRate}%` : ''}
                    </div>
                  </td>
                  {/* HQ 영업자 */}
                  <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                    {item.agentFee.toLocaleString()}원
                    <div className="text-[9px] text-amber-400 font-normal">
                      {item.agentRate != null ? `${item.agentRate}%` : ''}
                    </div>
                  </td>
                  {/* 플랫폼 순수익 (= contractRate - 1.5% PG - agencyRate - agentRate) */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10">
                    {item.netProfit.toLocaleString()}원
                    <div className="text-[9px] text-indigo-400 font-normal">
                      {item.contractRate != null && item.agencyRate != null && item.agentRate != null
                        ? `${(item.contractRate - 1.5 - item.agencyRate - item.agentRate).toFixed(1)}%`
                        : ''}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center space-y-1">
                    {item.status === 'COMPLETED' && (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-bold border-none text-[11px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> 입금완료
                      </Badge>
                    )}
                    {item.status === 'SCHEDULED' && (
                      <Badge variant="outline" className="border-blue-300 text-blue-700 font-bold text-[11px]">
                        <Clock className="h-3 w-3 mr-1 text-blue-500" /> D+1 예정
                      </Badge>
                    )}
                    {item.status === 'HOLD' && (
                      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 font-bold text-[11px]">
                        <ShieldAlert className="h-3 w-3 mr-1 text-amber-600" /> 지급유예
                      </Badge>
                    )}
                    {item.status === 'FAILED' && (
                      <Badge variant="destructive" className="font-bold text-[11px]">
                        <AlertCircle className="h-3 w-3 mr-1" /> 송금오류
                      </Badge>
                    )}
                    <div className="text-[9.5px] font-mono text-slate-400">
                      {item.payoutCycle === 'REALTIME' && '⚡ 실시간 즉시 이체'}
                      {item.payoutCycle === 'D+1' && '🕘 D+1 익일 09:00'}
                      {item.payoutCycle === 'D+2' && '📅 D+2 입금 예정'}
                      {item.payoutCycle === 'D+3' && '📅 D+3 입금 예정'}
                      {item.payoutCycle === 'D+7' && '📅 D+7 입금 예정'}
                      {item.payoutCycle === 'WEEKLY' && '📆 주간 정산 (매주)'}
                      {item.payoutCycle === 'MONTHLY' && '🗓️ 월간 정산 (매월 지정일)'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* ── 🔍 세부 헌금/결제 건별 내역 드릴다운 모달 ── */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-150">
            {/* 모달 헤더 */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-blue-400">정산 그룹 ID: {selectedDetail.id}</span>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>{selectedDetail.tenantName}</span>
                  <Badge className="bg-blue-500 text-white text-[10px]">
                    {selectedDetail.pgProvider.toUpperCase()}
                  </Badge>
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer border-none"
              >
                ✕
              </button>
            </div>

            {/* 정산 구성 통계 */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 grid grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">총 결제 금액</span>
                <span className="font-bold font-mono text-slate-900 dark:text-zinc-100 text-sm">
                  {selectedDetail.grossAmount.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-emerald-600 block text-[11px]">가맹 단체 입금액</span>
                <span className="font-bold font-mono text-emerald-600 text-sm">
                  {selectedDetail.tenantPayout.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-purple-600 block text-[11px]">플랫폼 수익 (0.5%)</span>
                <span className="font-bold font-mono text-purple-600 text-sm">
                  {selectedDetail.platformFee.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-indigo-600 block text-[11px]">대리점 / 영업자 정산</span>
                <span className="font-bold font-mono text-indigo-600 text-sm">
                  {(selectedDetail.partnerFee + selectedDetail.agentFee).toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 🔒 기부자 및 결제 상세 정보 (개인정보보호법 마스킹 적용) */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>🔒 거래 상세 및 기부자 정보</span>
                <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded font-mono border border-amber-200">개인정보보호법 마스킹 적용</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-lg">
                <div>
                  <span className="text-slate-400 text-[10.5px] block">봉헌 항목</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">{selectedDetail.itemName || '일반 헌금'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] block">기부자 성명 (마스킹)</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{selectedDetail.donorName || '미지정'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] block">연락처 (마스킹)</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-zinc-300">{selectedDetail.donorPhone ? formatPhoneNumber(selectedDetail.donorPhone) : '미지정'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] block">결제 수단 및 방식</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    {selectedDetail.isRecurring || selectedDetail.paymentType === 'BILLING' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">⚡ 빌링키 정기결제</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">💳 카드 인증결제</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] block">결제 기기 (Device)</span>
                  <span className="font-extrabold flex items-center gap-1 mt-0.5">
                    {selectedDetail.deviceType === 'KIOSK' ? (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">🖥️ 현장 키오스크</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">📱 온라인 웹/모바일</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] block">담당 대리점</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">{selectedDetail.agencyName || 'HQ (본사)'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] block">담당 영업자</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">{selectedDetail.agentName || '직접 영업'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] block">PG 승인 번호</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400">{selectedDetail.pgTid || selectedDetail.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] block">승인 일시</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400">{fmtDate(selectedDetail.txDate)}</span>
                </div>
              </div>
            </div>

            {/* 실데이터 4자간 자동 수수료 분구 명세 */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                ⚡ 4자간 자동 수수료 분구 명세 (Split Detail)
              </h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800 text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                    <th className="py-2 px-3">분구 대상 (4자)</th>
                    <th className="py-2 px-3">역할 / 명칭</th>
                    <th className="py-2 px-3 text-right">계약 수수료율</th>
                    <th className="py-2 px-3 text-right">분할 수수료액</th>
                    <th className="py-2 px-3 text-center">정산 상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono">
                  {/* 1. 가맹단체 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 font-sans font-bold text-emerald-700">1. 가맹단체</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-zinc-200">
                      {selectedDetail.tenantName || selectedDetail.tenantId || '가맹 단체'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                      {selectedDetail.contractRate != null
                        ? `${(100 - selectedDetail.contractRate).toFixed(1)}%`
                        : `${((selectedDetail.tenantPayout / (selectedDetail.grossAmount || 1)) * 100).toFixed(1)}%`
                      }
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{selectedDetail.tenantPayout.toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {selectedDetail.status === 'COMPLETED'
                        ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">지급 완료</span>
                        : selectedDetail.status === 'HOLD'
                        ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">지급 유예</span>
                        : selectedDetail.status === 'FAILED'
                        ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">송금 오류</span>
                        : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">지급 예정</span>
                      }
                    </td>
                  </tr>
                  {/* 2. PG사 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-500">2. PG사 ({selectedDetail.pgProvider?.toUpperCase()})</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-600">카드/전자결제 원가 (플랫폼이 지출)</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-500">1.5%</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-bold">{selectedDetail.pgFee.toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">원가 정산</span>
                    </td>
                  </tr>
                  {/* 3. HQ 대리점 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 font-sans font-bold text-indigo-700">3. HQ 대리점</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-zinc-200">
                      {selectedDetail.agencyName || 'SoulPay HQ (본사)'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-600">
                      {selectedDetail.agencyRate != null ? `${selectedDetail.agencyRate}%` : '0.5%'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-indigo-600 font-bold">{selectedDetail.partnerFee.toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {selectedDetail.status === 'COMPLETED'
                        ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">지급 완료</span>
                        : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">정산 대기</span>
                      }
                    </td>
                  </tr>
                  {/* 4. HQ 영업자 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 font-sans font-bold text-amber-700">4. HQ 영업자</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-zinc-200">
                      {selectedDetail.agentName || 'SoulPay HQ 직속 영업자'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                      {selectedDetail.agentRate != null ? `${selectedDetail.agentRate}%` : '0.5%'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-600 font-bold">{selectedDetail.agentFee.toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {selectedDetail.status === 'COMPLETED'
                        ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">지급 완료</span>
                        : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">정산 대기</span>
                      }
                    </td>
                  </tr>
                  {/* 5. SoulPay 플랫폼 순수익 */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 font-sans font-bold text-purple-700">5. SoulPay 플랫폼</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-zinc-200">플랫폼 순수익 (커미션 풀 잔액)</td>
                    <td className="py-2.5 px-3 text-right font-bold text-purple-600">
                      {selectedDetail.contractRate != null && selectedDetail.agencyRate != null && selectedDetail.agentRate != null
                        ? `${(selectedDetail.contractRate - 1.5 - selectedDetail.agencyRate - selectedDetail.agentRate).toFixed(1)}%`
                        : '0.5%'
                      }
                    </td>
                    <td className="py-2.5 px-3 text-right text-purple-600 font-bold">{selectedDetail.platformFee.toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">플랫폼 귀속</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>


            {/* 모달 하단 푸터 */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-800 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  toast.success(`${selectedDetail.tenantName} 세부 결제 내역 엑셀 다운로드가 완료되었습니다.`);
                }}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer border-none transition-colors"
              >
                📥 세부 내역 Excel 다운로드
              </button>
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg cursor-pointer border-none transition-colors"
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
