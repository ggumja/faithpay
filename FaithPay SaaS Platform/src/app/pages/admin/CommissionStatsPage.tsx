import { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, CheckCircle2, Clock,
  RefreshCw, Users, Building2, ChevronDown, ChevronUp,
  PieChart, ArrowRight, Layers,
} from 'lucide-react';
import { partnerAPI, Partner, PartnerCommission } from '../../api/client';
import { toast } from 'sonner';

/* ── 수수료 구조 상수 ── */
const FEE = {
  pgCostRate:          1.5,  // 고정
  platformProfitRate:  0.5,  // 고정
  defaultCustomerRate: 3.0,  // 기준 (영업자 역량에 따라 변동)
  defaultAgencyRate:   0.5,  // 대리점 고정율 (대리점이 자체 설정)
};

/* ── style atoms ── */
const S = {
  page:     'p-6 space-y-5',
  card:     'bg-[var(--hm-paper)] rounded-[12px] border border-[var(--hm-border)] overflow-hidden',
  head:     'px-5 py-3 border-b border-[var(--hm-border)] flex items-center gap-2',
  body:     'px-5 py-4',
  label:    'text-[10.5px] font-semibold text-[var(--hm-ink-3)] uppercase tracking-wide',
  value:    'text-[13.5px] font-semibold text-[var(--hm-ink)]',
  mono:     'font-mono text-[var(--hm-accent)]',
  th:       'text-[10.5px] font-semibold text-[var(--hm-ink-3)] uppercase py-2.5 px-4 text-left bg-[var(--hm-paper-2)]',
  td:       'text-[12.5px] py-2.5 px-4 border-t border-[var(--hm-border)] text-[var(--hm-ink)]',
  chip:     (bg: string, text: string, border: string) =>
    `inline-flex items-center gap-1 text-[10.5px] font-medium rounded-[5px] px-2 py-0.5 border ${bg} ${text} ${border}`,
  btnGhost: 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11.5px] text-[var(--hm-ink-2)] bg-[var(--hm-paper-2)] border border-[var(--hm-border)] cursor-pointer hover:bg-[var(--hm-paper-3)] transition-colors',
  btnAccent:'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11.5px] font-semibold text-white bg-[var(--hm-accent)] border-none cursor-pointer hover:brightness-110 transition-all disabled:opacity-50',
};

interface PartnerWithComm extends Partner {
  commissions: PartnerCommission[];
  totalAmount: number;
  settledAmount: number;
  pendingAmount: number;
  channelShareRate?: number;
}

const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n)) + '원';

export default function CommissionStatsPage() {
  const [partners, setPartners] = useState<PartnerWithComm[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await partnerAPI.getAll();
      const list: Partner[] = res?.success && Array.isArray(res.data) ? res.data : [];

      const enriched = await Promise.all(list.map(async (p) => {
        try {
          const cr = await partnerAPI.getCommissions(p.id);
          const comms: PartnerCommission[] = cr?.success && Array.isArray(cr.data) ? cr.data : [];
          const totalAmount   = comms.reduce((s, c) => s + (c.commissionAmount || 0), 0);
          const settledAmount = comms.filter(c => c.status === 'settled').reduce((s, c) => s + (c.commissionAmount || 0), 0);
          return { ...p, commissions: comms, totalAmount, settledAmount, pendingAmount: totalAmount - settledAmount };
        } catch {
          return { ...p, commissions: [], totalAmount: 0, settledAmount: 0, pendingAmount: 0 };
        }
      }));

      setPartners(enriched);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalAll      = partners.reduce((s, p) => s + p.totalAmount, 0);
  const settledAll    = partners.reduce((s, p) => s + p.settledAmount, 0);
  const pendingAll    = partners.reduce((s, p) => s + p.pendingAmount, 0);
  const masters       = partners.filter(p => p.role === 'master_agency');
  const agents        = partners.filter(p => p.role === 'sales_agent');

  /* ── 수수료 구조 설명 블록 ── */
  const FeeStructureCard = () => {
    // 개어원 실효율 예시: 3.0%, 3.5%, 4.0%
    const examples = [
      { contractRate: 3.0, agentRate: 0.5,  note: '\ud45c\uc900' },
      { contractRate: 3.5, agentRate: 1.0,  note: '+0.5% \uc778\uc13c\ud2f0\ube0c' },
      { contractRate: 4.0, agentRate: 1.5,  note: '+1.0% \uc778\uc13c\ud2f0\ube0c' },
    ];
    const baseRate = FEE.defaultCustomerRate;
    const agencyRate = FEE.defaultAgencyRate;
    const agentRate  = baseRate - FEE.pgCostRate - FEE.platformProfitRate - agencyRate;

    return (
      <div className={S.card}>
        <div className={S.head}>
          <PieChart size={13} className="text-[var(--hm-accent)] shrink-0" />
          <span className="text-[12.5px] font-semibold text-[var(--hm-ink)]">수수료 분배 구조</span>
          <span className="text-[10.5px] text-[var(--hm-ink-3)] ml-auto">카드 결제 기준</span>
        </div>
        <div className="px-5 py-4">

          {/* 바 시각화 — 기본 3% 기준 */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[11px] text-[var(--hm-ink-3)]">고객 결제 수수료</span>
              <span className="text-[12px] font-bold text-[var(--hm-ink)]">{FEE.defaultCustomerRate}% <span className="text-[10px] font-normal text-[var(--hm-ink-3)]">(\uc601\uc5c5\uc790 \ud611\uc0c1\uc5d0 \ub530\ub77c \ubcc0\ub3d9 \uac00\ub2a5)</span></span>
            </div>
            <div className="flex h-6 rounded-[6px] overflow-hidden border border-[var(--hm-border)]">
              <div
                className="flex items-center justify-center text-[9.5px] font-semibold text-slate-600 bg-slate-200 shrink-0"
                style={{ width: `${(FEE.pgCostRate / baseRate) * 100}%` }}
              >PG {FEE.pgCostRate}%</div>
              <div
                className="flex items-center justify-center text-[9.5px] font-semibold text-indigo-700 bg-indigo-100 shrink-0"
                style={{ width: `${(FEE.platformProfitRate / baseRate) * 100}%` }}
              >플랫폼 {FEE.platformProfitRate}%</div>
              <div
                className="flex items-center justify-center text-[9.5px] font-semibold text-emerald-700 bg-emerald-100 shrink-0"
                style={{ width: `${(agencyRate / baseRate) * 100}%` }}
              >대리점 {agencyRate}%</div>
              <div
                className="flex items-center justify-center text-[9.5px] font-semibold text-amber-700 bg-amber-100 flex-1"
              >영업자 {agentRate}%</div>
            </div>
            <div className="flex items-center flex-wrap gap-3 mt-2.5">
              {[
                { color: 'bg-slate-200',   label: 'PG \uc6d0\uac00 (\uace0\uc815)',        rate: `${FEE.pgCostRate}%` },
                { color: 'bg-indigo-100',  label: '\ud50c\ub7ab\ud3fc \uc218\uc775 (\uace0\uc815)',    rate: `${FEE.platformProfitRate}%` },
                { color: 'bg-emerald-100', label: '\ub300\ub9ac\uc810 \uace0\uc815\uc728 (\ub300\ub9ac\uc810 \uc790\uccb4 \uc124\uc815)', rate: `${agencyRate}%` },
                { color: 'bg-amber-100',   label: '\uc601\uc5c5\uc790 (\ucc44\ub110\ud480 - \ub300\ub9ac\uc810\uc728, \uc5d1\uc0ad\uc5d0 \ub530\ub77c \uc99d\uac00)', rate: `${agentRate}%~` },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-[3px] shrink-0 ${item.color} border border-[var(--hm-border)]`} />
                  <span className="text-[11px] text-[var(--hm-ink-3)]">{item.label}</span>
                  <span className="text-[11px] font-semibold text-[var(--hm-ink)]">{item.rate}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 계약율별 영업자 수수료 분배 표 */}
          <div className="rounded-[8px] bg-[var(--hm-paper-2)] border border-[var(--hm-border)] p-3">
            <p className="text-[10.5px] font-semibold text-[var(--hm-ink-3)] mb-2.5">📊 계약율별 영업자 수수료 변화 (100만원 결제 시)</p>
            <table className="w-full">
              <thead>
                <tr>
                  {['\uace0\uac1d \uacc4\uc57d\uc728','\ub300\ub9ac\uc810','PG','\ud50c\ub7ab\ud3fc','\uc601\uc5c5\uc790 (\ub098\uba38\uc9c0)','\ube44\uace0'].map(h => (
                    <th key={h} className="text-[9.5px] font-semibold text-[var(--hm-ink-3)] text-right pb-1.5 first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {examples.map(ex => {
                  const pool = ex.contractRate - FEE.pgCostRate - FEE.platformProfitRate;
                  const base = 1000000;
                  return (
                    <tr key={ex.contractRate} className="border-t border-[var(--hm-border)]">
                      <td className="text-[11px] font-bold text-[var(--hm-ink)] py-1.5">{ex.contractRate}%</td>
                      <td className="text-[11px] text-right text-emerald-600">{(base * agencyRate / 100).toLocaleString('ko-KR')}\uc6d0</td>
                      <td className="text-[11px] text-right text-slate-500">{(base * FEE.pgCostRate / 100).toLocaleString('ko-KR')}\uc6d0</td>
                      <td className="text-[11px] text-right text-indigo-600">{(base * FEE.platformProfitRate / 100).toLocaleString('ko-KR')}\uc6d0</td>
                      <td className="text-[11px] text-right text-amber-600 font-bold">{(base * ex.agentRate / 100).toLocaleString('ko-KR')}\uc6d0 <span className="font-normal text-[10px]">({ex.agentRate}%)</span></td>
                      <td className="text-[9.5px] text-right text-[var(--hm-ink-3)]">{ex.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* ── 통계 카드 ── */
  const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
    <div className={`${S.card} px-4 py-3.5 flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 ${color.bg}`}>
        <Icon size={16} className={color.text} />
      </div>
      <div className="min-w-0">
        <p className={S.label}>{label}</p>
        <p className="text-[16px] font-bold text-[var(--hm-ink)] leading-tight">{value}</p>
        {sub && <p className="text-[10.5px] text-[var(--hm-ink-3)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className={S.page}>

      {/* ── 헤더 액션 ── */}
      <div className="flex justify-end mb-1">
        <button onClick={load} disabled={loading} className={S.btnGhost}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* ── 수수료 구조 카드 ── */}
      <FeeStructureCard />

      {/* ── 요약 통계 4개 ── */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={Layers}       label="영업채널 수수료 합계"   value={loading ? '...' : fmt(totalAll)}     sub="대리점 + 영업자 합산"  color={{ bg: 'bg-[var(--hm-accent-bg)]',  text: 'text-[var(--hm-accent)]' }} />
        <StatCard icon={CheckCircle2} label="정산 완료"              value={loading ? '...' : fmt(settledAll)}   sub={`${totalAll > 0 ? ((settledAll/totalAll)*100).toFixed(0) : 0}% 정산됨`} color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }} />
        <StatCard icon={Clock}        label="정산 대기"              value={loading ? '...' : fmt(pendingAll)}   sub="미정산 수수료"       color={{ bg: 'bg-amber-50',   text: 'text-amber-600'   }} />
        <StatCard icon={Users}        label="활성 파트너"            value={loading ? '...' : `${partners.filter(p=>p.status==='active').length}명`} sub={`대리점 ${masters.length} · 영업자 ${agents.length}`} color={{ bg: 'bg-purple-50',  text: 'text-purple-600'  }} />
      </div>

      {/* ── 파트너별 수수료 테이블 ── */}
      <div className={S.card}>
        <div className={S.head}>
          <TrendingUp size={13} className="text-[var(--hm-accent)] shrink-0" />
          <span className="text-[12.5px] font-semibold text-[var(--hm-ink)]">파트너별 수수료 현황</span>
          <span className="text-[10.5px] text-[var(--hm-ink-3)] ml-auto">{partners.length}명</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-[var(--hm-ink-3)]">
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-[12px]">불러오는 중...</span>
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-12">
            <Users size={28} className="text-[var(--hm-ink-3)] mx-auto mb-2" />
            <p className="text-[12px] text-[var(--hm-ink-3)]">파트너 데이터가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={S.th}>파트너</th>
                <th className={`${S.th} text-right`}>수수료율</th>
                <th className={`${S.th} text-right`}>총 수령액</th>
                <th className={`${S.th} text-right`}>정산 완료</th>
                <th className={`${S.th} text-right`}>정산 대기</th>
                <th className={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {partners.map(p => {
                const isOpen      = expanded === p.id;
                const agencyR     = (p as any).agencyRate ?? 0;
                // 영업자: 수수료 이력에서 평균 실효율 계산
                const comms       = (p as any).commissions ?? [];
                const avgRate     = comms.length > 0
                  ? comms.reduce((s: number, c: any) => s + (c.commissionRate ?? 0), 0) / comms.length
                  : agencyR;
                const roleLabel   = p.role === 'master_agency' ? '대리점' : '영업자';
                const roleColor   = p.role === 'master_agency'
                  ? S.chip('bg-emerald-50','text-emerald-700','border-emerald-200')
                  : S.chip('bg-amber-50','text-amber-700','border-amber-200');
                const statusColor = p.status === 'active'
                  ? S.chip('bg-[var(--hm-accent-bg)]','text-[var(--hm-accent)]','border-[var(--hm-accent-border)]')
                  : S.chip('bg-slate-50','text-slate-500','border-slate-200');
                const rateLabel   = p.role === 'master_agency'
                  ? `${agencyR}% 고정`
                  : `평균 ${avgRate.toFixed(2)}% (계약별 변동)`;

                return [
                  <tr
                    key={p.id}
                    className="cursor-pointer hover:bg-[var(--hm-paper-2)] transition-colors"
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                  >
                    <td className={S.td}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--hm-paper-2)] border border-[var(--hm-border)] flex items-center justify-center text-[11px] font-bold text-[var(--hm-ink)]">
                          {p.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--hm-ink)] text-[12.5px]">{p.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={roleColor}>{roleLabel}</span>
                            <span className={statusColor}>{p.status === 'active' ? '활성' : p.status === 'pending' ? '대기' : '정지'}</span>
                            <span className="text-[10px] font-mono text-[var(--hm-ink-3)]">{p.referralCode}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`${S.td} text-right`}>
                      <span className="font-mono text-[12.5px] font-semibold text-[var(--hm-ink)]">{rateLabel}</span>
                    </td>
                    <td className={`${S.td} text-right font-semibold`}>{fmt(p.totalAmount)}</td>
                    <td className={`${S.td} text-right text-emerald-600 font-semibold`}>{fmt(p.settledAmount)}</td>
                    <td className={`${S.td} text-right text-amber-600 font-semibold`}>{fmt(p.pendingAmount)}</td>
                    <td className={`${S.td} text-right`}>
                      {isOpen
                        ? <ChevronUp size={13} className="text-[var(--hm-ink-3)] inline" />
                        : <ChevronDown size={13} className="text-[var(--hm-ink-3)] inline" />
                      }
                    </td>
                  </tr>,

                  /* ── 수수료 내역 확장 ── */
                  isOpen && p.commissions.length > 0 && (
                    <tr key={`${p.id}-detail`}>
                      <td colSpan={6} className="bg-[var(--hm-paper-2)] border-t border-[var(--hm-border)] p-0">
                        <div className="p-4">
                          <p className="text-[10.5px] font-semibold text-[var(--hm-ink-3)] mb-2 uppercase tracking-wide">수수료 내역</p>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-[var(--hm-border)]">
                                {['단체','결제금액','채널풀(1%)','수령액','상태','일자'].map(h => (
                                  <th key={h} className="text-[10px] font-semibold text-[var(--hm-ink-3)] py-1.5 px-2 text-left">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {p.commissions.map(c => {
                                const channelPool = Math.round(c.donationAmount * FEE.channelPoolRate / 100);
                                return (
                                  <tr key={c.id} className="border-b border-[var(--hm-border)] last:border-0">
                                    <td className="text-[11.5px] py-2 px-2 text-[var(--hm-ink)]">{c.tenantName}</td>
                                    <td className="text-[11.5px] py-2 px-2 font-mono text-[var(--hm-ink)]">{fmt(c.donationAmount)}</td>
                                    <td className="text-[11.5px] py-2 px-2 font-mono text-[var(--hm-ink-3)]">{fmt(channelPool)}</td>
                                    <td className="text-[11.5px] py-2 px-2 font-mono font-semibold text-[var(--hm-ink)]">
                                      {fmt(c.commissionAmount)}
                                      <span className="text-[9.5px] text-[var(--hm-ink-3)] ml-1">({((c.commissionAmount/c.donationAmount)*100).toFixed(2)}%)</span>
                                    </td>
                                    <td className="py-2 px-2">
                                      <span className={c.status === 'settled'
                                        ? S.chip('bg-emerald-50','text-emerald-700','border-emerald-200')
                                        : S.chip('bg-amber-50','text-amber-700','border-amber-200')
                                      }>{c.status === 'settled' ? '정산완료' : '대기'}</span>
                                    </td>
                                    <td className="text-[10.5px] py-2 px-2 text-[var(--hm-ink-3)]">
                                      {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {/* 미니 요약 */}
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--hm-border)]">
                            <div className="flex items-center gap-1.5">
                              <DollarSign size={11} className="text-[var(--hm-ink-3)]" />
                              <span className="text-[11px] text-[var(--hm-ink-3)]">총</span>
                              <span className="text-[11.5px] font-semibold text-[var(--hm-ink)]">{fmt(p.totalAmount)}</span>
                            </div>
                            <ArrowRight size={10} className="text-[var(--hm-ink-3)]" />
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={11} className="text-emerald-500" />
                              <span className="text-[11px] text-emerald-600 font-semibold">{fmt(p.settledAmount)}</span>
                            </div>
                            <span className="text-[var(--hm-ink-3)]">+</span>
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} className="text-amber-500" />
                              <span className="text-[11px] text-amber-600 font-semibold">{fmt(p.pendingAmount)}</span>
                              <span className="text-[10px] text-[var(--hm-ink-3)]">대기</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ),
                  isOpen && p.commissions.length === 0 && (
                    <tr key={`${p.id}-empty`}>
                      <td colSpan={6} className="bg-[var(--hm-paper-2)] border-t border-[var(--hm-border)] py-4 text-center">
                        <p className="text-[11.5px] text-[var(--hm-ink-3)]">수수료 이력이 없습니다.</p>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
