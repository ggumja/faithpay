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
import { toast } from 'sonner';
import { partnerAPI } from '../../../api/client';

interface LedgerItem {
  id: string;
  txDate: string;
  tenantName: string;
  tenantSlug: string;
  pgProvider: 'toss' | 'nanopay';
  grossAmount: number;
  pgFee: number;
  tenantPayout: number;
  platformFee: number;
  partnerFee: number;
  agentFee: number;
  netProfit: number;
  status: 'COMPLETED' | 'SCHEDULED' | 'FAILED' | 'HOLD';
  payoutCycle: 'REALTIME' | 'D+1' | 'D+2' | 'D+3' | 'D+7' | 'WEEKLY' | 'MONTHLY';
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export default function MultiPartySettlementLedger() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
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
    if (!searchQuery) return true;
    return (
      item.tenantName.includes(searchQuery) ||
      (item as any).tenantId?.includes(searchQuery) ||
      item.id.includes(searchQuery)
    );
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
      '단체명',
      'PG사',
      '총결제액',
      'PG원가수수료(1.5%)',
      '원원사정산액(98%)',
      '플랫폼수수료(0.5%)',
      '총판수수료(0.15%)',
      '에이전트수수료(0.05%)',
      '플랫폼순수익(0.3%)',
      '정산상태',
    ];
    const rows = filteredList.map((i) => [
      i.id,
      i.txDate,
      i.tenantName,
      i.pgProvider.toUpperCase(),
      i.grossAmount,
      i.pgFee,
      i.tenantPayout,
      i.platformFee,
      i.partnerFee,
      i.agentFee,
      i.netProfit,
      i.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FaithPay_4Party_Settlement_Ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('4자간 정산 원장 Excel CSV 다운로드가 완료되었습니다.');
  };

  return (
    <div className="space-y-4 animate-fade-in">
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
                <th className="py-3 px-4">원원사 (교회/성당/사찰)</th>
                <th className="py-3 px-4 text-right">총 결제액</th>
                <th className="py-3 px-4 text-right bg-purple-50/50 dark:bg-purple-950/20 text-purple-700">
                  PG 원가 (1.5%)
                </th>
                <th className="py-3 px-4 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700">
                  원원사 정산금 (98.0%)
                </th>
                <th className="py-3 px-4 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-700">
                  플랫폼 총수수료 (0.5%)
                </th>
                <th className="py-3 px-4 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-800">
                  총판 (0.15%)
                </th>
                <th className="py-3 px-4 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-800">
                  에이전트 (0.05%)
                </th>
                <th className="py-3 px-4 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700">
                  플랫폼 순수익 (0.3%)
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
                    <div className="text-[10px] text-slate-400 font-mono">{item.txDate}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-zinc-200">
                    <div>{item.tenantName}</div>
                    <div className="text-[10px] text-slate-400 font-mono font-normal">{item.tenantSlug}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-zinc-100">
                    {item.grossAmount.toLocaleString()}원
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-purple-700 dark:text-purple-300 bg-purple-50/30 dark:bg-purple-950/10">
                    -{item.pgFee.toLocaleString()}원
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                    {item.tenantPayout.toLocaleString()}원
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/10">
                    {item.platformFee.toLocaleString()}원
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                    {item.partnerFee.toLocaleString()}원
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                    {item.agentFee.toLocaleString()}원
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10">
                    {item.netProfit.toLocaleString()}원
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
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">총 결제 건수 / 금액</span>
                <span className="font-bold font-mono text-slate-900 dark:text-zinc-100 text-sm">
                  3건 ({selectedDetail.grossAmount.toLocaleString()}원)
                </span>
              </div>
              <div>
                <span className="text-emerald-600 block text-[11px]">원원사 실입금액 (98%)</span>
                <span className="font-bold font-mono text-emerald-600 text-sm">
                  {selectedDetail.tenantPayout.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-purple-600 block text-[11px]">플랫폼 수수료 (0.5%)</span>
                <span className="font-bold font-mono text-purple-600 text-sm">
                  {selectedDetail.platformFee.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 세부 결제 건별 테이블 */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                📦 정산에 포함된 개별 헌금/결제 승인 내역 (3건)
              </h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-zinc-800 text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                    <th className="py-2 px-3">결제 일시</th>
                    <th className="py-2 px-3">헌금자 성명</th>
                    <th className="py-2 px-3">헌금 종류</th>
                    <th className="py-2 px-3">결제 수단</th>
                    <th className="py-2 px-3 text-right">결제 승인액</th>
                    <th className="py-2 px-3 text-right">원원사 입금액</th>
                    <th className="py-2 px-3 text-right">플랫폼 수익</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono">
                  <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 text-slate-500">2026-08-06 14:32:10</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-800 dark:text-zinc-200">홍길동 성도</td>
                    <td className="py-2.5 px-3 font-sans">주일 헌금</td>
                    <td className="py-2.5 px-3 font-sans">신용카드 (신한)</td>
                    <td className="py-2.5 px-3 text-right font-bold">{(selectedDetail.grossAmount * 0.5).toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{(selectedDetail.tenantPayout * 0.5).toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-right text-purple-600 font-bold">{(selectedDetail.platformFee * 0.5).toLocaleString()}원</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 text-slate-500">2026-08-06 14:15:02</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-800 dark:text-zinc-200">김미선 집사</td>
                    <td className="py-2.5 px-3 font-sans">십일조 헌금</td>
                    <td className="py-2.5 px-3 font-sans">카카오페이</td>
                    <td className="py-2.5 px-3 text-right font-bold">{(selectedDetail.grossAmount * 0.3).toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{(selectedDetail.tenantPayout * 0.3).toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-right text-purple-600 font-bold">{(selectedDetail.platformFee * 0.3).toLocaleString()}원</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 text-slate-500">2026-08-06 13:50:44</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-800 dark:text-zinc-200">무명 성도</td>
                    <td className="py-2.5 px-3 font-sans">건축 헌금</td>
                    <td className="py-2.5 px-3 font-sans">토스페이</td>
                    <td className="py-2.5 px-3 text-right font-bold">{(selectedDetail.grossAmount * 0.2).toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{(selectedDetail.tenantPayout * 0.2).toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-right text-purple-600 font-bold">{(selectedDetail.platformFee * 0.2).toLocaleString()}원</td>
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
