/* PartnerCommissionsSection — A안: "정산 관리" 통합 섹션
 * 서브탭 3종:
 *   1. 수수료 발생 내역 (건별 원장)
 *   2. 정산 수령 내역  (메인 관리자 → 대리점 입금 확정)
 *   3. 영업자별 지급 현황 (대리점 전용: 대리점 → 영업자 하위 정산)
 * 
 * 기간 필터: 3개 탭 모두 이번달/지난달/특정월/전체 동일 적용
 */

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Receipt, TrendingUp, Users, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { PartnerCommission, PartnerSettlement, partnerAPI, Partner } from '../../../api/client';

interface PartnerCommissionsSectionProps {
  commissions: PartnerCommission[];
  isAgency?: boolean;
  partner: Partner;
}

/* ── 상태 배지 ── */
const StatusBadge = ({ status }: { status: PartnerSettlement['status'] }) => {
  const map = {
    scheduled:  { label: '입금 예정',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    processing: { label: '처리 중',    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    paid:       { label: '✓ 입금완료', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    cancelled:  { label: '취소',       cls: 'bg-red-100 text-red-600 border-red-200' },
  };
  const m = map[status] ?? map.scheduled;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.cls}`}>
      {m.label}
    </span>
  );
};

const fmt     = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n)) + '원';
const fmtDate = (s: string) => {
  try { return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { return s; }
};

/* ── 기간 필터 타입 ── */
type PeriodKey = 'thisMonth' | 'lastMonth' | 'custom' | 'all';

/* ── 공용 기간 필터 바 컴포넌트 ── */
function PeriodFilter({
  value, onChange, customFrom, customTo, onCustomFrom, onCustomTo,
}: {
  value: PeriodKey;
  onChange: (v: PeriodKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
}) {
  const now = new Date();
  const options: { key: PeriodKey; label: string }[] = [
    { key: 'thisMonth', label: `${now.getMonth() + 1}월 (이번 달)` },
    { key: 'lastMonth', label: `${now.getMonth()}월 (지난 달)` },
    { key: 'custom',    label: '기간 직접 지정' },
    { key: 'all',       label: '전체' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays size={13} className="text-[var(--hm-ink-3)] shrink-0" />
      <div className="flex items-center gap-1 flex-wrap">
        {options.map(o => (
          <button key={o.key} onClick={() => onChange(o.key)}
            className={`px-3 py-1.5 rounded-[7px] text-[11.5px] font-semibold cursor-pointer border transition-colors ${
              value === o.key
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-[var(--hm-paper)] text-[var(--hm-ink-3)] border-[var(--hm-border)] hover:bg-[var(--hm-paper-2)]'
            }`}>{o.label}
          </button>
        ))}
      </div>
      {/* 기간 직접 지정 입력 */}
      {value === 'custom' && (
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={customFrom}
            onChange={e => onCustomFrom(e.target.value)}
            className="px-2 py-1.5 text-[11.5px] border border-[var(--hm-border)] rounded-[7px] bg-[var(--hm-paper)] text-[var(--hm-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-[11px] text-[var(--hm-ink-3)]">~</span>
          <input
            type="date"
            value={customTo}
            onChange={e => onCustomTo(e.target.value)}
            className="px-2 py-1.5 text-[11.5px] border border-[var(--hm-border)] rounded-[7px] bg-[var(--hm-paper)] text-[var(--hm-ink)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      )}
    </div>
  );
}

/* ── 날짜 포함 여부 체크 (공용) ── */
function inPeriod(dateStr: string, period: PeriodKey, customFrom: string, customTo: string): boolean {
  if (period === 'all') return true;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (period === 'thisMonth') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (period === 'lastMonth') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    }
    if (period === 'custom' && customFrom && customTo) {
      const from = new Date(customFrom); const to = new Date(customTo + 'T23:59:59');
      return d >= from && d <= to;
    }
  } catch {}
  return true;
}

/* ═══════════════════════════════════════════════════════════ */
export function PartnerCommissionsSection({
  commissions,
  isAgency = false,
  partner,
}: PartnerCommissionsSectionProps) {
  /* ── 서브탭 ── */
  type MainTab = 'commission' | 'settlement' | 'agentPayout';
  const [mainTab, setMainTab] = useState<MainTab>('commission');

  /* ── 공용 기간 필터 상태 (탭별 독립) ── */
  const [commPeriod,       setCommPeriod]       = useState<PeriodKey>('all');
  const [settlePeriod,     setSettlePeriod]     = useState<PeriodKey>('thisMonth');
  const [agentPayPeriod,   setAgentPayPeriod]   = useState<PeriodKey>('thisMonth');

  /* ── 기간 직접 지정 (탭별) ── */
  const [commFrom,     setCommFrom]     = useState('');
  const [commTo,       setCommTo]       = useState('');
  const [settleFrom,   setSettleFrom]   = useState('');
  const [settleTo,     setSettleTo]     = useState('');
  const [agentFrom,    setAgentFrom]    = useState('');
  const [agentTo,      setAgentTo]      = useState('');

  /* ── 정산 내역 데이터 ── */
  const [settlements,        setSettlements]        = useState<PartnerSettlement[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [expandedId,         setExpandedId]         = useState<string | null>(null);

  useEffect(() => {
    if (mainTab === 'settlement' || mainTab === 'agentPayout') {
      setLoadingSettlements(true);
      const fn = isAgency
        ? partnerAPI.getSettlements(partner.id)
        : partnerAPI.getAgentSettlements(partner.id);
      fn.then(res => {
        if (res.success && res.data) setSettlements(res.data);
      }).finally(() => setLoadingSettlements(false));
    }
  }, [mainTab, partner.id, isAgency]);

  /* ── now ── */
  const now = new Date();

  /* ════════════════════════════════════
     탭 1: 수수료 발생 내역 집계
  ════════════════════════════════════ */
  const filteredComm = useMemo(() => commissions.filter(c =>
    inPeriod(c.createdAt, commPeriod, commFrom, commTo)
  ), [commissions, commPeriod, commFrom, commTo]);

  const pendingList     = filteredComm.filter(c => c.settlementStatus !== 'paid');
  const settledComms    = filteredComm.filter(c => c.settlementStatus === 'paid');
  const totalDonation   = filteredComm.reduce((s, c) => s + (c.donationAmount   ?? 0), 0);
  const totalCommission = filteredComm.reduce((s, c) => s + (c.commissionAmount ?? 0), 0);
  const totalSettledComm= settledComms.reduce((s, c) => s + (c.commissionAmount ?? 0), 0);

  const commPeriodLabel = commPeriod === 'thisMonth'
    ? `${now.getMonth() + 1}월` : commPeriod === 'lastMonth'
    ? `${now.getMonth()}월` : commPeriod === 'custom' && commFrom && commTo
    ? `${commFrom} ~ ${commTo}` : '전체';

  /* ════════════════════════════════════
     탭 2: 정산 수령 내역 집계
  ════════════════════════════════════ */
  const filteredSettlements = useMemo(() => settlements.filter(s =>
    inPeriod(s.settledAt ?? s.createdAt, settlePeriod, settleFrom, settleTo)
  ), [settlements, settlePeriod, settleFrom, settleTo]);

  const paidSettlements   = filteredSettlements.filter(s => s.status === 'paid');
  const totalReceived     = paidSettlements.reduce((s, x) => s + x.netAmount, 0);
  const totalCommTotal    = paidSettlements.reduce((s, x) => s + x.totalCommission, 0);
  const settlePeriodLabel = settlePeriod === 'thisMonth'
    ? `${now.getMonth() + 1}월` : settlePeriod === 'lastMonth'
    ? `${now.getMonth()}월` : settlePeriod === 'custom' && settleFrom && settleTo
    ? `${settleFrom} ~ ${settleTo}` : '전체';

  /* ════════════════════════════════════
     탭 3: 영업자별 지급 현황 집계
  ════════════════════════════════════ */
  const filteredAgentBreakdowns = useMemo(() => {
    return settlements
      .filter(s => inPeriod(s.settledAt ?? s.createdAt, agentPayPeriod, agentFrom, agentTo))
      .flatMap(s => (s.agentBreakdowns ?? []).map(b => ({
        ...b,
        period: `${s.periodStart} ~ ${s.periodEnd}`,
        settledAt: s.settledAt,
      })));
  }, [settlements, agentPayPeriod, agentFrom, agentTo]);

  const agentMap = new Map<string, { name: string; businessType: string; taxType: string; totalNet: number; totalMargin: number; count: number }>();
  filteredAgentBreakdowns.forEach(b => {
    const prev = agentMap.get(b.agentId) ?? { name: b.agentName, businessType: b.businessType ?? 'individual', taxType: b.taxType ?? 'withholding', totalNet: 0, totalMargin: 0, count: 0 };
    agentMap.set(b.agentId, { name: b.agentName, businessType: b.businessType ?? 'individual', taxType: b.taxType ?? 'withholding', totalNet: prev.totalNet + (b.netAgentReceived ?? (b as any).agentReceived ?? 0), totalMargin: prev.totalMargin + b.agencyMargin, count: prev.count + 1 });
  });
  const agentSummaries = Array.from(agentMap.entries()).map(([id, v]) => ({ id, ...v }));

  const agentPayPeriodLabel = agentPayPeriod === 'thisMonth'
    ? `${now.getMonth() + 1}월` : agentPayPeriod === 'lastMonth'
    ? `${now.getMonth()}월` : agentPayPeriod === 'custom' && agentFrom && agentTo
    ? `${agentFrom} ~ ${agentTo}` : '전체';

  /* ── 탭 정의 ── */
  const TABS: { key: MainTab; icon: any; label: string; badge?: number }[] = [
    { key: 'commission',  icon: TrendingUp, label: '수수료 발생 내역',   badge: filteredComm.length },
    { key: 'settlement',  icon: Receipt,    label: '정산 수령 내역',     badge: filteredSettlements.length },
    ...(isAgency ? [{ key: 'agentPayout' as MainTab, icon: Users, label: '영업자별 지급 현황', badge: filteredAgentBreakdowns.length }] : []),
  ];

  return (
    <div className="p-6 space-y-5 bg-[var(--hm-paper-2)] dark:bg-zinc-950 min-h-full">

      {/* 헤더 */}
      <div>
        <h1 className="text-[18px] font-bold text-[var(--hm-ink)]">정산 관리</h1>
        <p className="text-[12.5px] text-[var(--hm-ink-3)] mt-0.5">
          수수료 발생 원장 · 메인 관리자 입금 확정 · {isAgency ? '영업자별 하위 지급 현황' : '내 정산 수령 내역'}
        </p>
      </div>

      {/* 메인 탭 */}
      <div className="flex items-center gap-1 bg-[var(--hm-paper)] border border-[var(--hm-border)] p-1 rounded-xl w-fit">
        {TABS.map(({ key, icon: Icon, label, badge }) => {
          const on = mainTab === key;
          return (
            <button key={key} onClick={() => setMainTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[12.5px] font-semibold transition-all cursor-pointer border-0 ${
                on ? 'bg-emerald-600 text-white shadow' : 'bg-transparent text-[var(--hm-ink-3)] hover:text-[var(--hm-ink)]'
              }`}>
              <Icon size={13} className={on ? 'text-white' : 'text-[var(--hm-ink-3)]'} />
              {label}
              {badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                  on ? 'bg-white/20 text-white' : 'bg-[var(--hm-paper-2)] text-[var(--hm-ink-3)]'
                }`}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════
          탭 1: 수수료 발생 내역
      ══════════════════════════════════ */}
      {mainTab === 'commission' && (
        <>
          {/* 기간 필터 */}
          <PeriodFilter
            value={commPeriod} onChange={setCommPeriod}
            customFrom={commFrom} customTo={commTo}
            onCustomFrom={setCommFrom} onCustomTo={setCommTo}
          />

          {/* KPI */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: `총 결제액 (${commPeriodLabel})`,   value: fmt(totalDonation),    color: 'text-slate-700' },
              { label: `수수료 발생 (${commPeriodLabel})`, value: fmt(totalCommission),  color: 'text-emerald-600' },
              { label: `정산 완료 (${commPeriodLabel})`,   value: fmt(totalSettledComm), color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <Card key={label} className="border-slate-200">
                <CardContent className="p-4">
                  <div className={`text-[18px] font-bold ${color}`}>{value}</div>
                  <div className="text-[10.5px] text-[var(--hm-ink-3)] mt-1">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 정산 주기 안내 배너 */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 shadow">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500 text-white font-bold text-[10px]">D+1 영업일 자동 정산</Badge>
                <span className="text-xs font-bold text-slate-200">다음 입금 예정일: 익일 09:00</span>
              </div>
              <p className="text-[11px] text-slate-400">* 토스페이먼츠 정산 주기에 따라 카드 승인 후 D+1 영업일에 계좌 자동 송금됩니다.</p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 bg-slate-800 rounded-lg text-emerald-400 font-bold border border-slate-700 shrink-0">
              ⚡ Payouts v2
            </span>
          </div>

          {/* 사업자 유형별 세무 산식 */}
          <div className="p-4 bg-[var(--hm-paper)] border border-[var(--hm-border)] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--hm-ink)]">세무 정산 및 이체 금액 산출 명세 ({commPeriodLabel})</span>
              <span className="text-[10.5px] text-slate-500 font-medium">🔒 사업자 유형은 등록 시 확정되며 변경이 불가합니다</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>🏢 법인 / 일반사업자 (전자세금계산서)</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">VAT 10%</Badge>
                </div>
                <div className="flex justify-between text-xs text-slate-600 pt-1">
                  <span>수수료 공급가액:</span><span className="font-mono font-bold">{fmt(totalCommission)}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-700">
                  <span>부가가치세 (10%):</span><span className="font-mono font-bold">+{fmt(totalCommission * 0.1)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-blue-900 border-t border-blue-200 pt-1.5 mt-1">
                  <span>세금계산서 청구 총액:</span><span className="font-mono text-sm">{fmt(totalCommission * 1.1)}</span>
                </div>
              </div>
              <div className="p-3.5 bg-emerald-50/60 rounded-lg border border-emerald-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>👤 개인 / 프리랜서 (3.3% 원천징수)</span>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">원천징수 차감</Badge>
                </div>
                <div className="flex justify-between text-xs text-slate-600 pt-1">
                  <span>수수료 총액:</span><span className="font-mono font-bold">{fmt(totalCommission)}</span>
                </div>
                <div className="flex justify-between text-xs text-red-600">
                  <span>3.3% 사업소득세 공제:</span><span className="font-mono font-bold">-{fmt(totalCommission * 0.033)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-900 border-t border-emerald-200 pt-1.5 mt-1">
                  <span>계좌 실입금액:</span><span className="font-mono text-sm">{fmt(totalCommission * 0.967)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 건별 원장 테이블 */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-[14px] font-bold text-[var(--hm-ink)]">
                수수료 발생 원장 — {commPeriodLabel} ({filteredComm.length}건 / 미정산 {pendingList.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--hm-paper-2)]">
                    <TableHead className="text-[11px]">발생일시</TableHead>
                    <TableHead className="text-[11px]">단체명</TableHead>
                    <TableHead className="text-[11px]">결제번호</TableHead>
                    <TableHead className="text-right text-[11px]">신도 결제액</TableHead>
                    <TableHead className="text-right text-[11px]">수수료 적립</TableHead>
                    <TableHead className="text-center text-[11px]">정산 상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComm.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                        {commPeriodLabel} 수수료 발생 기록이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : filteredComm.map(c => (
                    <TableRow key={c.id} className="hover:bg-[var(--hm-paper-2)]">
                      <TableCell className="text-[11px] text-[var(--hm-ink-3)]">{fmtDate(c.createdAt)}</TableCell>
                      <TableCell className="font-semibold text-[12.5px] text-[var(--hm-ink)]">{c.tenantName}</TableCell>
                      <TableCell className="font-mono text-[11px] text-[var(--hm-ink-3)]">{c.donationId}</TableCell>
                      <TableCell className="text-right text-[12px] font-semibold text-[var(--hm-ink)]">{fmt(c.donationAmount ?? 0)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 text-[12px]">+{fmt(c.commissionAmount ?? 0)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.settlementStatus === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
                          {c.settlementStatus === 'paid' ? '✓ 입금완료' : '정산대기'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════
          탭 2: 정산 수령 내역
      ══════════════════════════════════ */}
      {mainTab === 'settlement' && (
        <>
          {/* 기간 필터 */}
          <PeriodFilter
            value={settlePeriod} onChange={setSettlePeriod}
            customFrom={settleFrom} customTo={settleTo}
            onCustomFrom={setSettleFrom} onCustomTo={setSettleTo}
          />

          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: `수령 합계 (${settlePeriodLabel})`,    value: fmt(totalReceived),               color: 'text-emerald-600', sub: '실입금 기준' },
              { label: `수수료 발생 (${settlePeriodLabel})`,  value: fmt(totalCommTotal),              color: 'text-slate-700',   sub: '세전 합계' },
              { label: `정산 완료 회차 (${settlePeriodLabel})`, value: `${paidSettlements.length}회`,  color: 'text-indigo-600',  sub: '입금 확정 건' },
              { label: '입금 예정',                            value: `${settlements.filter(s => s.status === 'scheduled').length}건`, color: 'text-amber-600', sub: '처리 대기 중' },
            ].map(({ label, value, color, sub }) => (
              <Card key={label} className="border-slate-200">
                <CardContent className="p-4">
                  <div className={`text-[17px] font-bold ${color}`}>{value}</div>
                  <div className="text-[11.5px] text-[var(--hm-ink)] font-semibold mt-1">{label}</div>
                  <div className="text-[10px] text-[var(--hm-ink-3)] mt-0.5">{sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 정산 흐름 구조 배너 */}
          <div className="flex items-center gap-2 flex-wrap p-3.5 bg-[var(--hm-paper)] border border-[var(--hm-border)] rounded-xl text-[11px]">
            <span className="font-bold text-[var(--hm-ink)]">정산 흐름:</span>
            <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-800 text-white">메인 관리자</span>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-700">대리점 수령</span>
            {isAgency && <>
              <ChevronRight size={12} className="text-slate-400" />
              <span className="px-2 py-0.5 rounded-md font-semibold bg-purple-100 text-purple-700">영업자 지급 (마진 차감)</span>
            </>}
          </div>

          {/* 정산 내역 목록 (accordion) */}
          {loadingSettlements ? (
            <div className="py-10 text-center text-[var(--hm-ink-3)] text-sm">정산 내역을 불러오는 중...</div>
          ) : filteredSettlements.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <Receipt size={28} className="text-slate-300" />
              <p className="text-[13px] text-[var(--hm-ink-3)] font-semibold">{settlePeriodLabel} 정산 내역이 없습니다.</p>
              <p className="text-[11px] text-slate-400">기간을 변경하거나 전체로 조회해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSettlements.map(s => {
                const isExpanded = expandedId === s.id;
                return (
                  <Card key={s.id} className={`border-[var(--hm-border)] overflow-hidden ${s.status === 'paid' ? '' : 'opacity-80'}`}>
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--hm-paper-2)] transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--hm-paper-2)] border border-[var(--hm-border)] flex items-center justify-center shrink-0">
                          <Receipt size={16} className="text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[13.5px] font-bold text-[var(--hm-ink)]">
                              {s.periodStart} ~ {s.periodEnd}
                            </span>
                            <StatusBadge status={s.status} />
                          </div>
                          <p className="text-[11px] text-[var(--hm-ink-3)] mt-0.5">
                            {s.note ?? ''} · 세무 유형: {s.taxType === 'vat' ? '부가세 10% (세금계산서)' : '원천징수 3.3%'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <div className="text-[10.5px] text-[var(--hm-ink-3)]">수수료 합계 → 실수령액</div>
                          <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                            <span className="text-[12px] text-[var(--hm-ink-2)]">{fmt(s.totalCommission)}</span>
                            <span className="text-slate-300">→</span>
                            <span className="text-[14px] font-bold text-emerald-700">{fmt(s.netAmount)}</span>
                          </div>
                        </div>
                        <div className="text-right hidden md:block">
                          <div className="text-[10.5px] text-[var(--hm-ink-3)]">입금일</div>
                          <div className="text-[12px] font-semibold text-[var(--hm-ink)] mt-0.5">
                            {s.settledAt ? fmtDate(s.settledAt) : '—'}
                          </div>
                        </div>
                        {isExpanded
                          ? <ChevronDown size={15} className="text-slate-400 shrink-0" />
                          : <ChevronRight size={15} className="text-slate-400 shrink-0" />}
                      </div>
                    </div>

                    {/* accordion 상세 */}
                    {isExpanded && (
                      <div className="border-t border-[var(--hm-border)] bg-[var(--hm-paper-2)] px-5 py-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { label: '수수료 합계 (공급가액)', value: fmt(s.totalCommission), color: 'text-slate-700' },
                            {
                              label: s.taxType === 'vat' ? '부가가치세 (10%)' : '원천징수 공제 (3.3%)',
                              value: `${s.taxType === 'vat' ? '+' : '-'}${fmt(s.taxAmount)}`,
                              color: s.taxType === 'vat' ? 'text-blue-600' : 'text-red-500',
                            },
                            { label: '실수령액 (계좌 입금)', value: fmt(s.netAmount), color: 'text-emerald-700' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="p-3 bg-[var(--hm-paper)] rounded-xl border border-[var(--hm-border)]">
                              <div className="text-[10.5px] text-[var(--hm-ink-3)] mb-1">{label}</div>
                              <div className={`text-[15px] font-bold font-mono ${color}`}>{value}</div>
                            </div>
                          ))}
                        </div>
                        {isAgency && s.agentBreakdowns && s.agentBreakdowns.length > 0 && (
                          <div>
                            <div className="text-[11.5px] font-bold text-[var(--hm-ink)] mb-2 flex items-center gap-1.5">
                              <Users size={12} className="text-purple-600" /> 영업자별 하위 지급 명세 (각 영업자 사업자 유형별 개별 세무 처리)
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-[var(--hm-paper)]">
                                  <TableHead className="text-[10.5px]">영업자 / 사업자 유형</TableHead>
                                  <TableHead className="text-right text-[10.5px]">수수료 발생</TableHead>
                                  <TableHead className="text-right text-[10.5px]">대리점 마진</TableHead>
                                  <TableHead className="text-right text-[10.5px]">세전 지급액</TableHead>
                                  <TableHead className="text-right text-[10.5px]">세무 처리</TableHead>
                                  <TableHead className="text-right text-[10.5px]">실수령액</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {s.agentBreakdowns.map(b => {
                                  const btLabel = b.businessType === 'corporate' ? { label: '법인', cls: 'bg-blue-100 text-blue-700' }
                                    : b.businessType === 'individual_business' ? { label: '일반사업자', cls: 'bg-green-100 text-green-700' }
                                    : { label: '프리랜서', cls: 'bg-emerald-100 text-emerald-700' };
                                  const isVat = b.taxType === 'vat';
                                  const grossAmt = b.grossAgentAmount ?? (b.commissionAmount - b.agencyMargin);
                                  const netAmt   = b.netAgentReceived ?? (b as any).agentReceived ?? grossAmt;
                                  return (
                                    <TableRow key={b.agentId} className="hover:bg-[var(--hm-paper)]">
                                      <TableCell className="font-semibold text-[12.5px] text-[var(--hm-ink)]">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center">{b.agentName.charAt(0)}</div>
                                          <div>
                                            <div>{b.agentName}</div>
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold ${btLabel.cls}`}>
                                              {isVat ? '🏬' : '👤'} {btLabel.label}
                                            </span>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right text-[12px] font-mono text-[var(--hm-ink)]">{fmt(b.commissionAmount)}</TableCell>
                                      <TableCell className="text-right text-[12px] font-mono text-red-500">-{fmt(b.agencyMargin)}</TableCell>
                                      <TableCell className="text-right text-[12px] font-mono text-slate-600">{fmt(grossAmt)}</TableCell>
                                      <TableCell className={`text-right text-[12px] font-mono ${isVat ? 'text-blue-600' : 'text-red-500'}`}>
                                        {isVat ? '+' : '-'}{fmt(b.taxAmount ?? 0)}
                                        <div className="text-[9px] text-[var(--hm-ink-3)] mt-0.5">{isVat ? 'VAT 10%' : '원천징수 3.3%'}</div>
                                      </TableCell>
                                      <TableCell className="text-right text-[13px] font-bold font-mono text-purple-700">{fmt(netAmt)}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════
          탭 3: 영업자별 지급 현황 (대리점 전용)
      ══════════════════════════════════ */}
      {mainTab === 'agentPayout' && isAgency && (
        <>
          {/* 기간 필터 */}
          <PeriodFilter
            value={agentPayPeriod} onChange={setAgentPayPeriod}
            customFrom={agentFrom} customTo={agentTo}
            onCustomFrom={setAgentFrom} onCustomTo={setAgentTo}
          />

          {loadingSettlements ? (
            <div className="py-10 text-center text-[var(--hm-ink-3)] text-sm">지급 내역을 불러오는 중...</div>
          ) : filteredAgentBreakdowns.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <Users size={28} className="text-slate-300" />
              <p className="text-[13px] text-[var(--hm-ink-3)] font-semibold">{agentPayPeriodLabel} 영업자 지급 내역이 없습니다.</p>
              <p className="text-[11px] text-slate-400">기간을 변경하거나 전체로 조회해 보세요.</p>
            </div>
          ) : (
            <>
              {/* 영업자 요약 KPI 카드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {agentSummaries.map(agent => {
                  const isVat = agent.taxType === 'vat';
                  const btLabel = agent.businessType === 'corporate' ? '법인'
                    : agent.businessType === 'individual_business' ? '일반사업자' : '프리랜서';
                  return (
                    <Card key={agent.id} className="border-[var(--hm-border)]">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 font-bold text-[13px] flex items-center justify-center shrink-0 border border-purple-200">
                          {agent.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold text-[var(--hm-ink)] truncate">{agent.name}</span>
                            <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold border ${
                              isVat ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>{isVat ? '🏬 ' + btLabel : '👤 ' + btLabel}</span>
                          </div>
                          <div className="text-[10px] text-[var(--hm-ink-3)] mt-0.5">
                            정산 {agent.count}회 · 마진 차감 {fmt(agent.totalMargin)}
                            <span className={`ml-1.5 text-[9px] font-bold ${isVat ? 'text-blue-500' : 'text-red-500'}`}>
                              {isVat ? 'VAT +10%' : '원천징수 -3.3%'}
                            </span>
                          </div>
                          <div className="text-[15px] font-bold text-purple-700 mt-0.5 font-mono">{fmt(agent.totalNet)}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* 영업자별 상세 지급 이력 테이블 */}
              <Card className="border-[var(--hm-border)]">
                <CardHeader className="pb-3 border-b border-[var(--hm-border)]">
                  <CardTitle className="text-[14px] font-bold text-[var(--hm-ink)]">
                    영업자별 지급 이력 — {agentPayPeriodLabel} ({filteredAgentBreakdowns.length}건)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[var(--hm-paper-2)]">
                     <TableHead className="text-[11px]">정산 기간</TableHead>
                        <TableHead className="text-[11px]">영업자 / 유형</TableHead>
                        <TableHead className="text-right text-[11px]">수수료 발생</TableHead>
                        <TableHead className="text-right text-[11px]">대리점 마진</TableHead>
                        <TableHead className="text-right text-[11px]">세전 지급액</TableHead>
                        <TableHead className="text-right text-[11px]">세무 처리</TableHead>
                        <TableHead className="text-right text-[11px]">실수령액</TableHead>
                        <TableHead className="text-center text-[11px]">입금일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgentBreakdowns.map((b, i) => {
                        const isVat = b.taxType === 'vat';
                        const btLabel = b.businessType === 'corporate' ? '법인'
                          : b.businessType === 'individual_business' ? '일반사업자' : '프리랜서';
                        const grossAmt = b.grossAgentAmount ?? (b.commissionAmount - b.agencyMargin);
                        const netAmt   = b.netAgentReceived ?? (b as any).agentReceived ?? grossAmt;
                        return (
                          <TableRow key={`${b.agentId}-${i}`} className="hover:bg-[var(--hm-paper-2)]">
                            <TableCell className="text-[11px] text-[var(--hm-ink-3)]">{b.period}</TableCell>
                            <TableCell className="font-semibold text-[12.5px] text-[var(--hm-ink)]">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-lg bg-purple-100 text-purple-700 font-bold text-[9px] flex items-center justify-center">{b.agentName.charAt(0)}</div>
                                <div>
                                  <div>{b.agentName}</div>
                                  <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                                    isVat ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                                  }`}>{isVat ? '🏬' : '👤'} {btLabel}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-[12px] font-mono text-[var(--hm-ink)]">{fmt(b.commissionAmount)}</TableCell>
                            <TableCell className="text-right text-[12px] font-mono text-red-500">-{fmt(b.agencyMargin)}</TableCell>
                            <TableCell className="text-right text-[12px] font-mono text-slate-600">{fmt(grossAmt)}</TableCell>
                            <TableCell className={`text-right text-[12px] font-mono ${isVat ? 'text-blue-600' : 'text-red-500'}`}>
                              {isVat ? '+' : '-'}{fmt(b.taxAmount ?? 0)}
                              <div className="text-[9px] text-[var(--hm-ink-3)]">{isVat ? 'VAT 10%' : '원천 3.3%'}</div>
                            </TableCell>
                            <TableCell className="text-right text-[13px] font-bold font-mono text-purple-700">{fmt(netAmt)}</TableCell>
                            <TableCell className="text-center text-[11px] text-[var(--hm-ink-3)]">
                              {b.settledAt ? fmtDate(b.settledAt) : <span className="text-slate-300">—</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
