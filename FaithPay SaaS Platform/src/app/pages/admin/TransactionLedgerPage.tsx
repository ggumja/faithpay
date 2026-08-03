import { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Search, Download, ChevronDown, ChevronUp,
  Users, Building2, TrendingUp, DollarSign, Filter, X,
  ArrowUpDown, Calendar, Layers,
} from 'lucide-react';
import { partnerAPI, Partner, PartnerCommission } from '../../api/client';
import { toast } from 'sonner';

/* ── 타입 ── */
interface LedgerRow extends PartnerCommission {
  agentName:  string;
  agencyId:   string;
  agencyName: string;
}

/* ── 포맷 헬퍼 ── */
const fmt      = (n: number | undefined) => n != null ? new Intl.NumberFormat('ko-KR').format(Math.round(n)) + '원' : '-';
const fmtRate  = (r: number | undefined) => r != null ? r.toFixed(2) + '%' : '-';
const fmtDate  = (s: string) => new Date(s).toLocaleDateString('ko-KR', { year:'2-digit', month:'2-digit', day:'2-digit' });
const fmtDT    = (s: string) =>
  new Date(s).toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });

/* ── CSV 내보내기 ── */
function exportCSV(rows: LedgerRow[]) {
  const header = ['일시','단체명','영업자','대리점','결제금액','계약율(%)','영업자수령','대리점수령','상태'].join(',');
  const lines  = rows.map(r => [
    `"${fmtDT(r.createdAt)}"`,
    `"${r.tenantName}"`,
    `"${r.agentName}"`,
    `"${r.agencyName}"`,
    r.donationAmount,
    r.contractRate ?? r.commissionRate,
    r.commissionAmount,
    r.breakdown?.agencyAmount ?? 0,
    r.status,
  ].join(','));
  const blob = new Blob(['\uFEFF' + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `거래이력_${new Date().toISOString().slice(0,10)}.csv`,
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('CSV 파일을 다운로드했습니다.');
}

/* ── style atoms ── */
const S = {
  page:   'p-6 space-y-4',
  card:   'bg-[var(--hm-paper)] rounded-[12px] border border-[var(--hm-border)] overflow-hidden',
  head:   'px-5 py-3 border-b border-[var(--hm-border)] flex items-center gap-2',
  th:     'text-[10.5px] font-semibold text-[var(--hm-ink-3)] uppercase py-2.5 px-4 text-left bg-[var(--hm-paper-2)]',
  td:     'text-[12px] py-2.5 px-4 border-t border-[var(--hm-border)] text-[var(--hm-ink)]',
  chip:   (bg: string, text: string, border: string) =>
    `inline-flex items-center gap-1 text-[10.5px] font-medium rounded-[5px] px-2 py-0.5 border ${bg} ${text} ${border}`,
  select: 'h-8 px-2.5 pr-7 rounded-[7px] text-[12px] text-[var(--hm-ink)] bg-[var(--hm-paper)] border border-[var(--hm-border)] cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-[var(--hm-accent)]',
  input:  'h-8 px-2.5 rounded-[7px] text-[12px] text-[var(--hm-ink)] bg-[var(--hm-paper)] border border-[var(--hm-border)] focus:outline-none focus:ring-1 focus:ring-[var(--hm-accent)]',
  btn:    'inline-flex items-center gap-1.5 px-3 h-8 rounded-[7px] text-[11.5px] cursor-pointer border transition-colors',
};

export default function TransactionLedgerPage() {
  const [rows,     setRows]     = useState<LedgerRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  /* ── 필터 ── */
  const [fAgent,    setFAgent]    = useState('');
  const [fAgency,   setFAgency]   = useState('');
  const [fTenant,   setFTenant]   = useState('');
  const [fStatus,   setFStatus]   = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo,   setFDateTo]   = useState('');
  const [fRateMin,  setFRateMin]  = useState('');

  /* ── 정렬 ── */
  const [sortBy,  setSortBy]  = useState<'date'|'amount'|'commission'>('date');
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc');

  /* ── 데이터 로드 ── */
  const load = async () => {
    setLoading(true);
    try {
      const res = await partnerAPI.getAll();
      const all: Partner[] = res?.success && Array.isArray(res.data) ? res.data : [];
      setPartners(all);

      const agents   = all.filter(p => p.role === 'sales_agent');
      const agencies = all.filter(p => p.role === 'master_agency');
      const agMap    = Object.fromEntries(agencies.map(a => [a.id, a.name]));

      const out: LedgerRow[] = [];
      await Promise.all(agents.map(async (ag) => {
        try {
          const cr = await partnerAPI.getCommissions(ag.id);
          const comms: PartnerCommission[] = cr?.success && Array.isArray(cr.data) ? cr.data : [];
          const pid = (ag as any).parentId ?? '';
          comms.forEach(c => out.push({ ...c, agentName: ag.name, agencyId: pid, agencyName: agMap[pid] ?? '(직접)' }));
        } catch {}
      }));
      setRows(out);
    } catch {
      toast.error('거래이력을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  /* ── 필터링 + 정렬 ── */
  const filtered = useMemo(() => {
    let r = rows.filter(row => {
      if (fAgent  && row.partnerId  !== fAgent)  return false;
      if (fAgency && row.agencyId   !== fAgency) return false;
      if (fTenant && !row.tenantName.includes(fTenant)) return false;
      if (fStatus && row.status     !== fStatus) return false;
      if (fDateFrom && new Date(row.createdAt) < new Date(fDateFrom))           return false;
      if (fDateTo   && new Date(row.createdAt) > new Date(fDateTo + 'T23:59:59')) return false;
      const cr = row.contractRate ?? row.commissionRate;
      if (fRateMin && cr < parseFloat(fRateMin)) return false;
      return true;
    });
    r.sort((a, b) => {
      const va = sortBy==='date' ? new Date(a.createdAt).getTime() : sortBy==='amount' ? a.donationAmount : a.commissionAmount;
      const vb = sortBy==='date' ? new Date(b.createdAt).getTime() : sortBy==='amount' ? b.donationAmount : b.commissionAmount;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return r;
  }, [rows, fAgent, fAgency, fTenant, fStatus, fDateFrom, fDateTo, fRateMin, sortBy, sortDir]);

  /* ── 요약 ── */
  const sum = useMemo(() => ({
    count:    filtered.length,
    payment:  filtered.reduce((s,r) => s + r.donationAmount, 0),
    agent:    filtered.reduce((s,r) => s + r.commissionAmount, 0),
    agency:   filtered.reduce((s,r) => s + (r.breakdown?.agencyAmount ?? 0), 0),
    platform: filtered.reduce((s,r) => s + (r.breakdown?.platformProfitAmount ?? 0), 0),
    pg:       filtered.reduce((s,r) => s + (r.breakdown?.pgCostAmount ?? 0), 0),
  }), [filtered]);

  const agents   = partners.filter(p => p.role === 'sales_agent');
  const agencies = partners.filter(p => p.role === 'master_agency');
  const hasFilter = fAgent||fAgency||fTenant||fStatus||fDateFrom||fDateTo||fRateMin;
  const reset = () => { setFAgent('');setFAgency('');setFTenant('');setFStatus('');setFDateFrom('');setFDateTo('');setFRateMin(''); };
  const toggleSort = (col: typeof sortBy) => {
    if (sortBy===col) setSortDir(d => d==='desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  return (
    <div className={S.page}>

      {/* ─ 헤더 액션 버튼 (제목은 상위 SystemAdminDashboard에서 렌더링) ─ */}
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => exportCSV(filtered)} disabled={filtered.length===0}
          className={`${S.btn} bg-[var(--hm-paper)] text-[var(--hm-ink-2)] border-[var(--hm-border)] hover:bg-[var(--hm-paper-2)] disabled:opacity-40`}>
          <Download size={12}/> CSV 내보내기
        </button>
        <button onClick={load} disabled={loading}
          className={`${S.btn} bg-[var(--hm-paper)] text-[var(--hm-ink-2)] border-[var(--hm-border)] hover:bg-[var(--hm-paper-2)]`}>
          <RefreshCw size={12} className={loading ? 'animate-spin':''}/> 새로고침
        </button>
      </div>

      {/* ─ 필터 바 ─ */}
      <div className={S.card}>
        <div className="px-4 py-3 flex flex-wrap items-center gap-2.5">
          <Filter size={13} className="text-[var(--hm-ink-3)] shrink-0"/>

          {/* 영업자 */}
          <div className="relative">
            <select value={fAgent} onChange={e=>setFAgent(e.target.value)} className={S.select} style={{minWidth:110}}>
              <option value="">영업자 전체</option>
              {agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--hm-ink-3)]"/>
          </div>

          {/* 대리점 */}
          <div className="relative">
            <select value={fAgency} onChange={e=>setFAgency(e.target.value)} className={S.select} style={{minWidth:120}}>
              <option value="">대리점 전체</option>
              {agencies.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--hm-ink-3)]"/>
          </div>

          {/* 단체명 */}
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--hm-ink-3)] pointer-events-none"/>
            <input value={fTenant} onChange={e=>setFTenant(e.target.value)}
              placeholder="단체명 검색" className={`${S.input} pl-7`} style={{width:130}}/>
          </div>

          {/* 상태 */}
          <div className="relative">
            <select value={fStatus} onChange={e=>setFStatus(e.target.value)} className={S.select} style={{minWidth:100}}>
              <option value="">상태 전체</option>
              <option value="settled">정산완료</option>
              <option value="pending">정산대기</option>
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--hm-ink-3)]"/>
          </div>

          {/* 날짜 */}
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-[var(--hm-ink-3)]"/>
            <input type="date" value={fDateFrom} onChange={e=>setFDateFrom(e.target.value)} className={S.input} style={{width:130}}/>
            <span className="text-[11px] text-[var(--hm-ink-3)]">~</span>
            <input type="date" value={fDateTo}   onChange={e=>setFDateTo(e.target.value)}   className={S.input} style={{width:130}}/>
          </div>

          {/* 계약율 구간 */}
          <div className="relative">
            <select value={fRateMin} onChange={e=>setFRateMin(e.target.value)} className={S.select} style={{minWidth:110}}>
              <option value="">계약율 전체</option>
              <option value="3.0">3.0% 이상</option>
              <option value="3.5">3.5% 이상</option>
              <option value="4.0">4.0% 이상</option>
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--hm-ink-3)]"/>
          </div>

          {hasFilter && (
            <button onClick={reset} className="flex items-center gap-1 text-[11px] text-[var(--hm-ink-3)] hover:text-red-500 transition-colors cursor-pointer border-none bg-transparent">
              <X size={11}/> 초기화
            </button>
          )}
          <span className="ml-auto text-[11px] text-[var(--hm-ink-3)]">{filtered.length}건 조회됨</span>
        </div>
      </div>

      {/* ─ 요약 집계 ─ */}
      <div className="grid grid-cols-6 gap-2.5">
        {[
          { Icon:Layers,     label:'거래 건수',   value:`${sum.count}건`,    color:'bg-[var(--hm-accent-bg)]', text:'text-[var(--hm-accent)]' },
          { Icon:DollarSign, label:'결제 총액',   value:fmt(sum.payment),    color:'bg-slate-50',              text:'text-slate-600' },
          { Icon:TrendingUp, label:'영업자 수령', value:fmt(sum.agent),      color:'bg-amber-50',              text:'text-amber-600' },
          { Icon:Building2,  label:'대리점 수령', value:fmt(sum.agency),     color:'bg-emerald-50',            text:'text-emerald-600' },
          { Icon:TrendingUp, label:'플랫폼 수익', value:fmt(sum.platform),   color:'bg-indigo-50',             text:'text-indigo-600' },
          { Icon:DollarSign, label:'PG 비용',     value:fmt(sum.pg),         color:'bg-slate-50',              text:'text-slate-400' },
        ].map(c => (
          <div key={c.label} className={`${S.card} px-3.5 py-3 flex items-center gap-2.5`}>
            <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${c.color}`}>
              <c.Icon size={14} className={c.text}/>
            </div>
            <div className="min-w-0">
              <p className="text-[9.5px] font-semibold text-[var(--hm-ink-3)] uppercase tracking-wide">{c.label}</p>
              <p className="text-[12.5px] font-bold text-[var(--hm-ink)] leading-tight truncate">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─ 거래 테이블 ─ */}
      <div className={S.card}>
        <div className={S.head}>
          <Layers size={13} className="text-[var(--hm-accent)] shrink-0"/>
          <span className="text-[12.5px] font-semibold text-[var(--hm-ink)]">거래 내역</span>
          <span className="text-[10.5px] text-[var(--hm-ink-3)] ml-auto">{filtered.length}건</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[var(--hm-ink-3)]">
            <RefreshCw size={15} className="animate-spin"/>
            <span className="text-[12px]">불러오는 중...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Search size={28} className="text-[var(--hm-ink-3)] mx-auto mb-2"/>
            <p className="text-[12.5px] text-[var(--hm-ink-3)]">
              {hasFilter ? '검색 조건에 맞는 거래 내역이 없습니다.' : '거래 이력이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={S.th} onClick={()=>toggleSort('date')}
                    style={{cursor:'pointer',userSelect:'none'}}
                  ><span className="inline-flex items-center gap-1">일시 <ArrowUpDown size={10} className="opacity-60"/></span></th>
                  <th className={S.th}>단체</th>
                  <th className={S.th}>영업자</th>
                  <th className={S.th}>대리점</th>
                  <th className={`${S.th} text-right`} onClick={()=>toggleSort('amount')}
                    style={{cursor:'pointer',userSelect:'none'}}
                  ><span className="inline-flex items-center gap-1 justify-end w-full">결제금액 <ArrowUpDown size={10} className="opacity-60"/></span></th>
                  <th className={`${S.th} text-center`}>계약율</th>
                  <th className={`${S.th} text-right`} onClick={()=>toggleSort('commission')}
                    style={{cursor:'pointer',userSelect:'none'}}
                  ><span className="inline-flex items-center gap-1 justify-end w-full">영업자 수령 <ArrowUpDown size={10} className="opacity-60"/></span></th>
                  <th className={`${S.th} text-right`}>대리점 수령</th>
                  <th className={`${S.th} text-center`}>상태</th>
                  <th className={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.flatMap(row => {
                  const isOpen    = expanded === row.id;
                  const bd        = row.breakdown as any;
                  
                  const contractR = row.contractRate ?? bd?.contractRate ?? bd?.customerRate ?? (row as any).tenantContractRate ?? 3.0;
                  const pgCostR   = bd?.pgCostRate ?? 1.5;
                  const platformR = bd?.platformProfitRate ?? 0.5;
                  const agencyR   = bd?.agencyRate ?? 0.5;
                  const agentRate = bd?.agentRate ?? Math.max(0, contractR - pgCostR - platformR - agencyR);

                  const totalFeeAmt = bd?.totalFeeAmount ?? Math.round(row.donationAmount * (contractR / 100));
                  const pgCostAmt   = bd?.pgCostAmount ?? Math.round(row.donationAmount * (pgCostR / 100));
                  const platformAmt = bd?.platformProfitAmount ?? Math.round(row.donationAmount * (platformR / 100));
                  const agencyAmt   = bd?.agencyAmount ?? bd?.masterAgencyAmount ?? Math.round(row.donationAmount * (agencyR / 100));
                  const agentAmt    = bd?.agentAmount ?? bd?.salesAgentAmount ?? row.commissionAmount ?? Math.round(row.donationAmount * (agentRate / 100));

                  return [
                    <tr key={row.id}
                      onClick={() => setExpanded(isOpen ? null : row.id)}
                      className="cursor-pointer hover:bg-[var(--hm-paper-2)] transition-colors"
                    >
                      <td className={S.td}>
                        <span className="text-[11px] font-mono text-[var(--hm-ink-2)]">{fmtDT(row.createdAt)}</span>
                      </td>
                      <td className={S.td}>
                        <span className="font-medium text-[12.5px]">{row.tenantName}</span>
                      </td>
                      <td className={S.td}><span className="text-[var(--hm-ink-2)]">{row.agentName}</span></td>
                      <td className={S.td}><span className="text-[var(--hm-ink-2)]">{row.agencyName}</span></td>
                      <td className={`${S.td} text-right font-semibold`}>{fmt(row.donationAmount)}</td>
                      <td className={`${S.td} text-center`}>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-[4px] ${
                          contractR >= 4.0 ? 'bg-amber-100 text-amber-700' :
                          contractR >= 3.5 ? 'bg-indigo-50 text-indigo-600' :
                          'bg-slate-100 text-slate-600'}`}>
                          {fmtRate(contractR)}
                        </span>
                      </td>
                      <td className={`${S.td} text-right`}>
                        <span className="font-bold text-amber-600">{fmt(agentAmt)}</span>
                        <span className="ml-1 text-[10px] text-[var(--hm-ink-3)]">({fmtRate(agentRate)})</span>
                      </td>
                      <td className={`${S.td} text-right text-emerald-600`}>
                        {fmt(agencyAmt)}
                        <span className="ml-1 text-[10px] text-[var(--hm-ink-3)]">({fmtRate(agencyR)})</span>
                      </td>
                      <td className={`${S.td} text-center`}>
                        {row.status === 'settled'
                          ? <span className={S.chip('bg-emerald-50','text-emerald-700','border-emerald-200')}>정산완료</span>
                          : <span className={S.chip('bg-amber-50','text-amber-600','border-amber-200')}>정산대기</span>}
                      </td>
                      <td className={`${S.td} text-center`}>
                        {isOpen ? <ChevronUp size={13} className="text-[var(--hm-ink-3)]"/> : <ChevronDown size={13} className="text-[var(--hm-ink-3)]"/>}
                      </td>
                    </tr>,

                    ...(isOpen ? [
                      <tr key={row.id+'-bd'} className="bg-[var(--hm-paper-2)]">
                        <td colSpan={10} className="px-6 py-3 border-t border-[var(--hm-border)]">
                          <div className="grid grid-cols-5 gap-3 mb-2">
                            {[
                              { label:'고객 결제 수수료', rate:fmtRate(contractR), amt:fmt(totalFeeAmt), color:'text-[var(--hm-ink)]', bg:'bg-[var(--hm-paper)]' },
                              { label:'PG 원가 (고정)', rate:fmtRate(pgCostR), amt:fmt(pgCostAmt), color:'text-slate-500', bg:'bg-slate-50' },
                              { label:'플랫폼 수익 (고정)', rate:fmtRate(platformR), amt:fmt(platformAmt), color:'text-indigo-600', bg:'bg-indigo-50' },
                              { label:'대리점 수령 (고정)', rate:fmtRate(agencyR), amt:fmt(agencyAmt), color:'text-emerald-600', bg:'bg-emerald-50' },
                              { label:'영업자 수령 (잔여)', rate:fmtRate(agentRate), amt:fmt(agentAmt), color:'text-amber-600', bg:'bg-amber-50' },
                            ].map(b => (
                              <div key={b.label} className={`rounded-[8px] px-3 py-2 border border-[var(--hm-border)] ${b.bg}`}>
                                <p className="text-[9.5px] text-[var(--hm-ink-3)] font-medium">{b.label}</p>
                                <p className={`text-[13px] font-bold leading-snug mt-0.5 ${b.color}`}>{b.amt}</p>
                                <p className="text-[10px] text-[var(--hm-ink-3)]">{b.rate}</p>
                              </div>
                            ))}
                          </div>
                          {row.status==='settled' && row.settledAt && (
                            <p className="text-[10.5px] text-[var(--hm-ink-3)]">정산일: {fmtDate(row.settledAt)}</p>
                          )}
                        </td>
                      </tr>
                    ] : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
