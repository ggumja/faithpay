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
          // status 필드명 통일: 'settled' | 'paid' | 'SETTLED' 모두 정산 완료로 처리
          const isSettled = (c: PartnerCommission) => {
            const st1 = ((c as any).status ?? '').toLowerCase();
            const st2 = ((c as any).settlementStatus ?? '').toLowerCase();
            return st1 === 'settled' || st1 === 'paid' || st2 === 'settled' || st2 === 'paid';
          };
          const settledAmount = comms.filter(isSettled).reduce((s, c) => s + (c.commissionAmount || 0), 0);
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
                const comms       = (p as any).commissions ?? [];
                
                let rateLabel = '';
                if (p.role === 'master_agency') {
                  const agencyR = (p as any).agencyRate || 0.5;
                  rateLabel = `${agencyR.toFixed(2)}% (대리점 고정)`;
                } else {
                  if (comms.length > 0) {
                    const avgRate = comms.reduce((s: number, c: any) => s + (c.commissionRate ?? 0.5), 0) / comms.length;
                    rateLabel = `평균 ${avgRate.toFixed(2)}%`;
                  } else {
                    rateLabel = `평균 0.50% (기본)`;
                  }
                }

                const roleLabel   = p.role === 'master_agency' ? '대리점' : '영업자';
                const roleColor   = p.role === 'master_agency'
                  ? S.chip('bg-emerald-50','text-emerald-700','border-emerald-200')
                  : S.chip('bg-amber-50','text-amber-700','border-amber-200');
                const statusColor = p.status === 'active'
                  ? S.chip('bg-[var(--hm-accent-bg)]','text-[var(--hm-accent)]','border-[var(--hm-accent-border)]')
                  : S.chip('bg-slate-50','text-slate-500','border-slate-200');

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
