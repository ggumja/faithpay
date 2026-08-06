/* PartnerCommissionsSection — A안: "정산 관리" 통합 섹션
 * 서브탭 3종:
 *   1. 수수료 발생 내역 (건별 원장)
 *   2. 정산 수령 내역  (메인 관리자 → 대리점 입금 확정)
 *   3. 영업자별 지급 현황 (대리점 전용: 대리점 → 영업자 하위 정산)
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Receipt, TrendingUp, Users } from 'lucide-react';
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

const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n)) + '원';
const fmtDate = (s: string) => {
  try { return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { return s; }
};

/* ═══════════════════════════════════════════════════════════ */
export function PartnerCommissionsSection({
  commissions,
  isAgency = false,
  partner,
}: PartnerCommissionsSectionProps) {
  /* ── 서브탭 ── */
  type MainTab = 'commission' | 'settlement' | 'agentPayout';
  const [mainTab, setMainTab] = useState<MainTab>('commission');

  /* ── 기간 필터 (수수료 발생 탭) ── */
  const [periodTab, setPeriodTab] = useState<'thisMonth' | 'lastMonth' | 'all'>('all');

  /* ── 정산 내역 데이터 ── */
  const [settlements, setSettlements] = useState<PartnerSettlement[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  /* ── 수수료 발생 탭 집계 ── */
  const now = new Date();
  const filtered = commissions.filter(c => {
    if (periodTab === 'all') return true;
    try {
      const d = new Date(c.createdAt);
      if (periodTab === 'thisMonth') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (periodTab === 'lastMonth') {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1);
        return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
      }
    } catch {}
    return true;
  });
  const pendingList  = filtered.filter(c => c.settlementStatus !== 'paid');
  const settledComms = filtered.filter(c => c.settlementStatus === 'paid');
  const totalDonation   = filtered.reduce((s, c) => s + (c.donationAmount   ?? 0), 0);
  const totalCommission = filtered.reduce((s, c) => s + (c.commissionAmount ?? 0), 0);
  const totalSettledComm= settledComms.reduce((s, c) => s + (c.commissionAmount ?? 0), 0);
  const periodLabel = periodTab === 'thisMonth' ? `${now.getMonth() + 1}월` : periodTab === 'lastMonth' ? `${now.getMonth()}월` : '전체';

  /* ── 정산 내역 탭 집계 ── */
  const paidSettlements     = settlements.filter(s => s.status === 'paid');
  const totalReceived       = paidSettlements.reduce((s, x) => s + x.netAmount, 0);
  const thisMonthReceived   = paidSettlements.filter(s => {
    try { const d = new Date(s.settledAt ?? s.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }
    catch { return false; }
  }).reduce((s, x) => s + x.netAmount, 0);

  /* ── 영업자별 지급 현황 (대리점 전용) ── */
  const allBreakdowns = settlements.flatMap(s => (s.agentBreakdowns ?? []).map(b => ({ ...b, period: `${s.periodStart} ~ ${s.periodEnd}`, settledAt: s.settledAt })));
  const agentMap = new Map<string, { name: string; total: number; count: number }>();
  allBreakdowns.forEach(b => {
    const prev = agentMap.get(b.agentId) ?? { name: b.agentName, total: 0, count: 0 };
    agentMap.set(b.agentId, { name: b.agentName, total: prev.total + b.agentReceived, count: prev.count + 1 });
  });
  const agentSummaries = Array.from(agentMap.entries()).map(([id, v]) => ({ id, ...v }));

  /* ── 탭 정의 ── */
  const TABS: { key: MainTab; icon: any; label: string; badge?: number }[] = [
    { key: 'commission', icon: TrendingUp, label: '수수료 발생 내역', badge: commissions.length },
    { key: 'settlement', icon: Receipt,    label: '정산 수령 내역',   badge: settlements.length },
    ...(isAgency ? [{ key: 'agentPayout' as MainTab, icon: Users, label: '영업자별 지급 현황', badge: agentSummaries.length }] : []),
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
          <div className="flex items-center gap-1">
            {([['thisMonth', '이번 달'], ['lastMonth', '지난 달'], ['all', '전체']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setPeriodTab(key)}
                className={`px-3 py-1.5 rounded-[7px] text-[11.5px] font-semibold cursor-pointer border transition-colors ${
                  periodTab === key ? 'bg-slate-800 text-white border-slate-800' : 'bg-[var(--hm-paper)] text-[var(--hm-ink-3)] border-[var(--hm-border)] hover:bg-[var(--hm-paper-2)]'
                }`}>{label}
              </button>
            ))}
          </div>

          {/* KPI */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: `총 결제액 (${periodLabel})`,    value: fmt(totalDonation),    color: 'text-slate-700' },
              { label: `수수료 발생 (${periodLabel})`,  value: fmt(totalCommission),  color: 'text-emerald-600' },
              { label: `정산 완료 (${periodLabel})`,    value: fmt(totalSettledComm), color: 'text-blue-600' },
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
              <span className="text-xs font-bold text-[var(--hm-ink)]">세무 정산 및 이체 금액 산출 명세</span>
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
                수수료 발생 원장 — {periodLabel} ({filtered.length}건 / 미정산 {pendingList.length}건)
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
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                        {periodLabel} 수수료 발생 기록이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(c => (
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
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '정산 수령 누적',      value: fmt(totalReceived),      color: 'text-emerald-600',  sub: '전체 입금 확정 합계' },
              { label: '이번 달 수령',         value: fmt(thisMonthReceived),  color: 'text-amber-600',    sub: `${now.getMonth() + 1}월 입금 기준` },
              { label: '정산 회차',            value: `${paidSettlements.length}회`,  color: 'text-indigo-600',  sub: '완료 정산 횟수' },
              { label: '예정 정산',            value: `${settlements.filter(s => s.status === 'scheduled').length}건`, color: 'text-slate-600', sub: '처리 대기 중' },
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
          ) : settlements.length === 0 ? (
            <div className="py-10 text-center text-[var(--hm-ink-3)] text-sm">정산 내역이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {settlements.map(s => {
                const isExpanded = expandedId === s.id;
                return (
                  <Card key={s.id} className={`border-[var(--hm-border)] overflow-hidden transition-all ${s.status === 'paid' ? '' : 'opacity-80'}`}>
                    {/* 정산 행 헤더 */}
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
                        {isExpanded ? <ChevronDown size={15} className="text-slate-400 shrink-0" /> : <ChevronRight size={15} className="text-slate-400 shrink-0" />}
                      </div>
                    </div>

                    {/* 정산 상세 (펼쳐지는 accordion) */}
                    {isExpanded && (
                      <div className="border-t border-[var(--hm-border)] bg-[var(--hm-paper-2)] px-5 py-4 space-y-4">
                        {/* 세무 산식 */}
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

                        {/* 영업자별 하위 지급 명세 (대리점 전용) */}
                        {isAgency && s.agentBreakdowns && s.agentBreakdowns.length > 0 && (
                          <div>
                            <div className="text-[11.5px] font-bold text-[var(--hm-ink)] mb-2 flex items-center gap-1.5">
                              <Users size={12} className="text-purple-600" /> 영업자별 하위 지급 명세
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-[var(--hm-paper)]">
                                  <TableHead className="text-[10.5px]">영업자</TableHead>
                                  <TableHead className="text-right text-[10.5px]">수수료 발생</TableHead>
                                  <TableHead className="text-right text-[10.5px]">대리점 마진 차감</TableHead>
                                  <TableHead className="text-right text-[10.5px]">영업자 수령액</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {s.agentBreakdowns.map(b => (
                                  <TableRow key={b.agentId} className="hover:bg-[var(--hm-paper)]">
                                    <TableCell className="font-semibold text-[12.5px] text-[var(--hm-ink)]">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center">{b.agentName.charAt(0)}</div>
                                        {b.agentName}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right text-[12px] font-mono text-[var(--hm-ink)]">{fmt(b.commissionAmount)}</TableCell>
                                    <TableCell className="text-right text-[12px] font-mono text-red-500">-{fmt(b.agencyMargin)}</TableCell>
                                    <TableCell className="text-right text-[13px] font-bold font-mono text-purple-700">{fmt(b.agentReceived)}</TableCell>
                                  </TableRow>
                                ))}
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
          {loadingSettlements ? (
            <div className="py-10 text-center text-[var(--hm-ink-3)] text-sm">지급 내역을 불러오는 중...</div>
          ) : agentSummaries.length === 0 ? (
            <div className="py-10 text-center text-[var(--hm-ink-3)] text-sm">영업자 지급 내역이 없습니다.</div>
          ) : (
            <>
              {/* 영업자 요약 카드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {agentSummaries.map(agent => (
                  <Card key={agent.id} className="border-[var(--hm-border)]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold text-[13px] flex items-center justify-center shrink-0 border border-purple-200">
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-[var(--hm-ink)]">{agent.name}</div>
                        <div className="text-[11px] text-[var(--hm-ink-3)] mt-0.5">정산 {agent.count}회</div>
                        <div className="text-[14px] font-bold text-purple-700 mt-0.5 font-mono">{fmt(agent.total)}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 영업자별 정산 상세 테이블 */}
              <Card className="border-[var(--hm-border)]">
                <CardHeader className="pb-3 border-b border-[var(--hm-border)]">
                  <CardTitle className="text-[14px] font-bold text-[var(--hm-ink)]">
                    영업자별 하위 지급 전체 이력
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[var(--hm-paper-2)]">
                        <TableHead className="text-[11px]">정산 기간</TableHead>
                        <TableHead className="text-[11px]">영업자</TableHead>
                        <TableHead className="text-right text-[11px]">수수료 발생</TableHead>
                        <TableHead className="text-right text-[11px]">대리점 마진</TableHead>
                        <TableHead className="text-right text-[11px]">영업자 수령</TableHead>
                        <TableHead className="text-center text-[11px]">입금일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allBreakdowns.map((b, i) => (
                        <TableRow key={`${b.agentId}-${i}`} className="hover:bg-[var(--hm-paper-2)]">
                          <TableCell className="text-[11px] text-[var(--hm-ink-3)]">{b.period}</TableCell>
                          <TableCell className="font-semibold text-[12.5px] text-[var(--hm-ink)]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-lg bg-purple-100 text-purple-700 font-bold text-[9px] flex items-center justify-center">{b.agentName.charAt(0)}</div>
                              {b.agentName}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-[12px] font-mono text-[var(--hm-ink)]">{fmt(b.commissionAmount)}</TableCell>
                          <TableCell className="text-right text-[12px] font-mono text-red-500">-{fmt(b.agencyMargin)}</TableCell>
                          <TableCell className="text-right text-[13px] font-bold font-mono text-purple-700">{fmt(b.agentReceived)}</TableCell>
                          <TableCell className="text-center text-[11px] text-[var(--hm-ink-3)]">
                            {b.settledAt ? fmtDate(b.settledAt) : <span className="text-slate-300">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
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
