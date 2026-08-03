import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useApp, Tenant } from '../../context/AppContext';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Building2, CheckCircle, AlertCircle, ExternalLink, Key, Clock, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import TenantApprovalModal from '../../components/TenantApprovalModal';
import TenantStatsPage from './TenantStatsPage';
import PartnerManagement from './PartnerManagement';
import CommissionStatsPage from './CommissionStatsPage';
import TransactionLedgerPage from './TransactionLedgerPage';
import { tenantAPI } from '../../api/client';


/* ─── active key ─────────────────── */
function useActiveKey(pathname: string) {
  if (pathname.includes('/tenants/pending')) return 'pending';
  if (pathname.includes('/stats'))           return 'stats';
  if (pathname.includes('/partners'))        return 'partners';
  if (pathname.includes('/commissions'))     return 'commissions';
  if (pathname.includes('/ledger'))          return 'ledger';
  return 'tenants';
}


const PAGE_META: Record<string, { title: string; desc: string }> = {
  tenants:     { title: '단체 목록',        desc: '승인 완료된 전체 단체 목록을 관리합니다.' },
  pending:     { title: '승인요청 목록',    desc: '새 입점 신청 단체를 검토하고 승인합니다.' },
  stats:       { title: '단체별 통계',      desc: '등록된 단체별 기부금 통계를 조회합니다.' },
  commissions: { title: '수수료 통계',      desc: '영업 파트너별 수수료 현황 및 정산을 관리합니다.' },
  ledger:      { title: '거래이력 (거래원장)', desc: '영업자·단체·대리점별 전체 결제 및 수수료 분배 내역을 조회합니다.' },
  partners:    { title: '영업 파트너 관리', desc: '영업 파트너(대리점/영업자) 목록 및 수수료를 관리합니다.' },
};


/* ─── style atoms ────────────────── */
const S = {
  inner:     'p-6',
  title:     'text-[18px] font-semibold text-[var(--hm-ink)] mb-0.5',
  sub:       'text-[12.5px] text-[var(--hm-ink-3)] mb-5',
  statGrid:  'grid grid-cols-3 gap-3 mb-5',
  statCard:  'bg-[var(--hm-paper)] rounded-[10px] border border-[var(--hm-border)] px-4 py-3.5 flex items-center gap-3',
  tableWrap: 'bg-[var(--hm-paper)] rounded-[10px] border border-[var(--hm-border)] overflow-hidden',
  thead:     'bg-[var(--hm-paper-2)]',
  th:        'text-[10.5px] font-medium text-[var(--hm-ink-3)] py-2.5',
  td:        'py-[10px] text-[12.5px]',
  chip:      (bg: string, text: string, border: string) =>
    `inline-flex items-center gap-1 text-[10.5px] font-medium rounded-[5px] px-2 py-0.5 border ${bg} ${text} ${border}`,
  btnAmber:  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11.5px] font-medium bg-amber-500 text-white border-none cursor-pointer hover:bg-amber-600 transition-colors',
  btnOutline:'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] font-medium bg-transparent text-[var(--hm-accent)] border border-[var(--hm-accent-border)] cursor-pointer hover:bg-[var(--hm-accent-bg)] transition-colors',
};

const PENDING_MOCK: Tenant[] = []; // API 로드 전 빈 배열

export default function SystemAdminDashboard() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { tenants, updateTenantInfo } = useApp();
  const [selectedForApproval, setSelectedForApproval] = useState<Tenant | null>(null);
  const [pendingList, setPendingList] = useState<Tenant[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [tenantViewMode, setTenantViewMode] = useState<'all' | 'agency'>('all');

  const active = useActiveKey(location.pathname);
  const meta   = PAGE_META[active];

  // 승인 대기 목록 API 로드
  useEffect(() => {
    if (active === 'pending') {
      setPendingLoading(true);
      tenantAPI.getPending()
        .then(res => {
          if (res.success && res.data) setPendingList(res.data);
          else toast.error('승인 대기 목록을 불러오지 못했습니다.');
        })
        .catch(() => toast.error('네트워크 오류가 발생했습니다.'))
        .finally(() => setPendingLoading(false));
    }
  }, [active]);

  const religion = (t: string) =>
    ({ protestant: '기독교', catholic: '천주교', buddhist: '불교' }[t] ?? t);

  const tList = tenants.map(t => ({
    ...t,
    live: t.slug === 'gakwonsa' || t.paymentConfig?.isActive || false,
  }));
  const liveCnt = tList.filter(t => t.live).length;

  // ── 대리점별 단체 묶음 그룹 생성 ──────────────────────────────────
  const agencyGroups = [
    {
      id: 'agency-bit',
      name: '한국불교문화원',
      code: 'BIT2024',
      rate: 0.5,
      agentNames: ['이수진', '박지훈'],
      items: tList.filter(t => {
        const ref = (t as any).registeredByReferralCode || (t as any).referralCode;
        const name = (t as any).registeredByPartnerName;
        return ref === 'BIT2024' || ref === 'LSJ002' || name === '이수진' || name === '한국불교문화원' ||
               ['bongwonsa', 'myungsung-church', 'myeongdong-cathedral', 'bulguksa', 'yoido-fullgospel'].includes(t.slug);
      }).map(t => ({
        ...t,
        agentName: ['bongwonsa', 'myungsung-church', 'myeongdong-cathedral'].includes(t.slug) ? '이수진 (영업자)' : '대리점 본사 직접',
        contractRate: (t as any).contractRate ?? (t.slug === 'bongwonsa' ? 3.2 : t.slug === 'myeongdong-cathedral' ? 2.9 : 3.0),
      })),
    },
    {
      id: 'agency-krs',
      name: '한국종교솔루션(주)',
      code: 'KRS2024',
      rate: 0.5,
      agentNames: ['김정수', '박민호'],
      items: tList.filter(t => {
        const ref = (t as any).registeredByReferralCode || (t as any).referralCode;
        const name = (t as any).registeredByPartnerName;
        return ref === 'KRS2024' || ref === 'KJS001' || ref === 'PMH003' || name === '김정수' || name === '박민호' ||
               ['gakwonsa', 'joyful-church', 'serenity-temple', 'grace-cathedral'].includes(t.slug);
      }).map(t => ({
        ...t,
        agentName: ['gakwonsa', 'joyful-church'].includes(t.slug) ? '김정수 (영업자)' : '박민호 (영업자)',
        contractRate: (t as any).contractRate ?? (t.slug === 'gakwonsa' ? 3.0 : 3.2),
      })),
    },
  ];

  // 기타 대리점 미지정 단체
  const agencyAssignedSlugs = new Set(agencyGroups.flatMap(g => g.items.map(i => i.slug)));
  const directItems = tList.filter(t => !agencyAssignedSlugs.has(t.slug)).map(t => ({
    ...t,
    agentName: '플랫폼 본사 직접',
    contractRate: (t as any).contractRate ?? 3.0,
  }));

  if (directItems.length > 0) {
    agencyGroups.push({
      id: 'agency-direct',
      name: '플랫폼 본사 직접 유치 관리',
      code: 'SYSTEM',
      rate: 0.0,
      agentNames: ['시스템 관리자'],
      items: directItems,
    });
  }

  return (
    <div className={S.inner}>
      {/* ── 공통 페이지 헤더 ── */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className={S.title}>{meta.title}</h1>
          <p className={S.sub}>{meta.desc}</p>
        </div>
      </div>

      {/* ── 단체 목록 ───────────────────────────── */}
      {active === 'tenants' && (
        <>
          {/* stat row */}
          <div className={S.statGrid}>
            {[
              { label:'전체 단체',   value:`${tenants.length}개`, color:'text-[var(--hm-ink)]',   bg:'bg-[var(--hm-accent-bg)]', Icon:Building2   },
              { label:'결제 활성화', value:`${liveCnt}개`,         color:'text-emerald-600',        bg:'bg-emerald-50',            Icon:CheckCircle },
              { label:'미설정',      value:`${tenants.length-liveCnt}개`, color:'text-amber-600',  bg:'bg-amber-50',              Icon:AlertCircle },
            ].map(c => (
              <div key={c.label} className={S.statCard}>
                <div className={`w-9 h-9 rounded-[8px] ${c.bg} flex items-center justify-center shrink-0`}>
                  <c.Icon size={16} className={c.color} />
                </div>
                <div>
                  <div className="text-[10.5px] text-[var(--hm-ink-3)]">{c.label}</div>
                  <div className={`text-[20px] font-bold ${c.color} leading-none`}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 뷰 모드 토글 탭 (전체 목록 뷰 vs 영업대리점별 묶어보기) */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer border-none ${
                  tenantViewMode === 'all'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
                onClick={() => setTenantViewMode('all')}
              >
                📋 전체 단체 목록 뷰 ({tenants.length}개)
              </button>
              <button
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer border-none ${
                  tenantViewMode === 'agency'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
                onClick={() => setTenantViewMode('agency')}
              >
                🏢 영업대리점별 묶어보기 ({agencyGroups.length}개 대리점)
              </button>
            </div>
          </div>

          {/* 1. 전체 단체 목록 뷰 */}
          {tenantViewMode === 'all' && (
            <div className={S.tableWrap}>
              <div className="px-4 py-2.5 border-b border-[var(--hm-border)] flex items-center gap-2">
                <Building2 size={13} className="text-[var(--hm-accent)]" />
                <span className="text-[12.5px] font-medium text-[var(--hm-ink)]">승인 완료 단체</span>
                <span className="text-[12px] text-[var(--hm-ink-3)]">(총 {tenants.length}개)</span>
              </div>
              <Table>
                <TableHeader className={S.thead}>
                  <TableRow>
                    {['단체명','종교','연락처','PG사','MID','상태','작업'].map((h,i) => (
                      <TableHead key={h} className={`${S.th} ${i===6?'text-center':''}`}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tList.map(t => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-[var(--hm-accent-bg)] transition-colors"
                      onClick={() => navigate(`/system/admin/tenant/${t.id}`)}
                    >
                      <TableCell className={`${S.td} font-medium text-[var(--hm-ink)]`}>
                        <span className="flex items-center gap-1.5">
                          {t.name}<ExternalLink size={10} className="text-[var(--hm-border)]"/>
                        </span>
                      </TableCell>
                      <TableCell className={S.td}>
                        <span className={S.chip('bg-transparent','text-[var(--hm-ink-2)]','border-[var(--hm-border)]')}>{religion(t.religionType)}</span>
                      </TableCell>
                      <TableCell className={`${S.td} text-[var(--hm-ink-2)] text-[12px]`}>{t.contact.phone}</TableCell>
                      <TableCell className={S.td}>
                        {t.slug === 'gakwonsa' || t.paymentConfig?.pgProvider
                          ? <span className={S.chip('bg-[var(--hm-accent-bg)]','text-[var(--hm-accent)]','border-[var(--hm-accent-border)]')}>나노PG</span>
                          : <span className="text-[11px] text-[var(--hm-ink-3)]">미설정</span>}
                      </TableCell>
                      <TableCell className={`${S.td} font-mono text-[11.5px] text-[var(--hm-ink-2)]`}>
                        {t.slug === 'gakwonsa' ? '240000006' : t.paymentConfig?.mid ?? <span className="text-[var(--hm-ink-3)]">—</span>}
                      </TableCell>
                      <TableCell className={S.td}>
                        {t.live
                          ? <span className={S.chip('bg-emerald-50','text-emerald-700','border-emerald-200')}><CheckCircle size={10}/>활성화</span>
                          : <span className={S.chip('bg-red-50','text-red-600','border-red-200')}><AlertCircle size={10}/>미설정</span>}
                      </TableCell>
                      <TableCell className={`${S.td} text-center`}>
                        <button
                          className={S.btnOutline}
                          onClick={e => { e.stopPropagation(); navigate(`/system/admin/tenant/${t.id}`); }}
                        >상세 / PG 설정</button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 2. 영업대리점별 묶어보기 뷰 */}
          {tenantViewMode === 'agency' && (
            <div className="space-y-6">
              {agencyGroups.map(group => (
                <div key={group.id} className="bg-white rounded-xl border border-purple-200 overflow-hidden shadow-2xs">
                  {/* 대리점 헤더 */}
                  <div className="px-5 py-4 bg-gradient-to-r from-purple-50/80 via-slate-50 to-white border-b border-purple-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-base shadow-2xs">
                        🏢
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-800">{group.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold font-mono bg-purple-100 text-purple-800 border border-purple-200">
                            대리점코드: {group.code}
                          </span>
                          {group.rate > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              대리점 마진율 {group.rate}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          소속 영업자: <strong>{group.agentNames.join(', ')}</strong> · 관할 가맹점 단체: <strong>{group.items.length}개소</strong>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        관할 단체 {group.items.length}개소 운용 중
                      </span>
                    </div>
                  </div>

                  {/* 관할 단체 목록 테이블 */}
                  <Table>
                    <TableHeader className={S.thead}>
                      <TableRow>
                        <TableHead className={`${S.th} w-12 text-center`}>No</TableHead>
                        <TableHead className={S.th}>가맹점 단체명</TableHead>
                        <TableHead className={S.th}>종교</TableHead>
                        <TableHead className={S.th}>담당 영업자</TableHead>
                        <TableHead className={S.th}>계약 수수료율</TableHead>
                        <TableHead className={S.th}>결제 상태</TableHead>
                        <TableHead className={`${S.th} text-center`}>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((t, idx) => (
                        <TableRow
                          key={t.id}
                          className="hover:bg-purple-50/20 cursor-pointer transition-colors"
                          onClick={() => navigate(`/system/admin/tenant/${t.id}`)}
                        >
                          <TableCell className="text-center font-mono text-xs font-bold text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-slate-800 text-xs">
                            <div>
                              <span className="flex items-center gap-1.5">
                                {t.name} <ExternalLink size={10} className="text-slate-400" />
                              </span>
                              <span className="font-mono text-[10.5px] text-slate-400 font-normal">faithpay.kr/{t.slug}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className={S.chip('bg-transparent','text-[var(--hm-ink-2)]','border-[var(--hm-border)]')}>{religion(t.religionType)}</span>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-purple-800">
                            {t.agentName}
                          </TableCell>
                          <TableCell className="text-xs font-bold font-mono text-emerald-700">
                            {t.contractRate}%
                          </TableCell>
                          <TableCell className="text-xs">
                            {t.live
                              ? <span className={S.chip('bg-emerald-50','text-emerald-700','border-emerald-200')}><CheckCircle size={10}/>활성화</span>
                              : <span className={S.chip('bg-red-50','text-red-600','border-red-200')}><AlertCircle size={10}/>미설정</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              className={S.btnOutline}
                              onClick={e => { e.stopPropagation(); navigate(`/system/admin/tenant/${t.id}`); }}
                            >
                              상세 / PG 설정
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 승인요청 목록 ──────────────────────── */}
      {active === 'pending' && (
        <>
          <div className="flex items-center gap-3 mb-5 p-4 rounded-[10px] border border-amber-200 bg-amber-50/60">
            <div className="w-9 h-9 rounded-[8px] bg-amber-100 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-amber-600" />
            </div>
            <div>
              <div className="text-[10.5px] text-amber-700">심사 대기 중</div>
              <div className="text-[20px] font-bold text-amber-600 leading-none">
                {pendingLoading ? '...' : `${pendingList.length}건`}
              </div>
            </div>
            <p className="ml-4 text-[12px] text-amber-800/70">새 입점 신청 단체를 검토한 후 승인 또는 거절하세요.</p>
            <button
              onClick={() => {
                setPendingLoading(true);
                tenantAPI.getPending()
                  .then(res => { if (res.success && res.data) setPendingList(res.data); })
                  .finally(() => setPendingLoading(false));
              }}
              className="ml-auto p-1.5 rounded-md text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer border-none bg-transparent"
              title="새로고침"
            >
              <RefreshCw size={14} className={pendingLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className={`${S.tableWrap} border-amber-200`}>
            <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-50/50 flex items-center gap-2">
              <span className={S.chip('bg-amber-500','text-white','border-transparent')}>승인 대기</span>
              <span className="text-[12.5px] font-medium text-[var(--hm-ink)]">입점 신청 목록</span>
              <span className="text-[12px] text-[var(--hm-ink-3)]">({pendingList.length}건)</span>
            </div>
            <Table>
              <TableHeader className={S.thead}>
                <TableRow>
                  {['신청 단체명','종교','담당자 / 연락처','신청 경로','신청일','처리'].map((h,i) => (
                    <TableHead key={h} className={`${S.th} ${i===5?'text-center':''}`}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-[var(--hm-ink-3)] text-[12px]">
                      <RefreshCw size={14} className="animate-spin inline mr-2" />불러오는 중...
                    </TableCell>
                  </TableRow>
                ) : pendingList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-[var(--hm-ink-3)] text-[12px]">
                      심사 대기 중인 입점 신청이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : pendingList.map(pt => (
                  <TableRow
                    key={pt.id}
                    className="cursor-pointer hover:bg-[var(--hm-accent-bg)] transition-colors"
                    onClick={() => navigate(`/system/admin/tenants/pending/${pt.id}`)}
                  >
                    <TableCell className={`${S.td} font-medium text-[var(--hm-ink)]`}>
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>
                        {pt.name}
                        <ExternalLink size={10} className="text-[var(--hm-border)]" />
                      </span>
                    </TableCell>
                    <TableCell className={S.td}>
                      <span className={S.chip('bg-amber-50','text-amber-700','border-amber-200')}>{religion(pt.religionType)}</span>
                    </TableCell>
                    <TableCell className={S.td}>
                      <div className="text-[var(--hm-ink)] font-medium text-[12px]">{pt.contact.name ?? '—'}</div>
                      <div className="text-[var(--hm-ink-3)] text-[11px]">{pt.contact.phone}</div>
                    </TableCell>
                    {/* 신청 경로 */}
                    <TableCell className={S.td}>
                      {(() => {
                        const src = (pt as any).registrationSource;
                        const partnerName = (pt as any).registeredByPartnerName;
                        const refCode = (pt as any).registeredByReferralCode;
                        if (src === 'agency') return (
                          <div>
                            <span className={S.chip('bg-purple-50','text-purple-700','border-purple-200')}>
                              🏢 대리점 등록
                            </span>
                            {partnerName && <div className="text-[10.5px] text-[var(--hm-ink-3)] mt-0.5">{partnerName} {refCode ? `(${refCode})` : ''}</div>}
                          </div>
                        );
                        if (src === 'agent') return (
                          <div>
                            <span className={S.chip('bg-amber-50','text-amber-700','border-amber-200')}>
                              💼 영업자 등록
                            </span>
                            {partnerName && <div className="text-[10.5px] text-[var(--hm-ink-3)] mt-0.5">{partnerName} {refCode ? `(${refCode})` : ''}</div>}
                          </div>
                        );
                        return (
                          <div>
                            <span className={S.chip('bg-slate-100','text-slate-600','border-slate-300')}>
                              🏠 FaithPay 플랫폼
                            </span>
                            <div className="text-[10.5px] text-[var(--hm-ink-3)] mt-0.5">직접 유치 (플랫폼이 대리점/영업자 역할)</div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className={`${S.td} font-mono text-[var(--hm-ink-3)] text-[11px]`}>
                      {pt.appliedAt ? new Date(pt.appliedAt).toLocaleDateString('ko-KR') : pt.createdAt ?? '—'}
                    </TableCell>
                    <TableCell className={`${S.td} text-center`}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className={S.btnAmber}
                          onClick={e => { e.stopPropagation(); navigate(`/system/admin/tenants/pending/${pt.id}`); }}
                        >
                          <Key size={11}/> 상세 심사
                        </button>
                        <button
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium bg-transparent text-red-500 border border-red-200 cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={async e => {
                            e.stopPropagation();
                            const res = await tenantAPI.rejectPending(pt.id);
                            if (res.success) {
                              toast.success(`${pt.name} 신청을 거절했습니다.`);
                              setPendingList(prev => prev.filter(p => p.id !== pt.id));
                            } else {
                              toast.error('거절 처리에 실패했습니다.');
                            }
                          }}
                        >
                          거절
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {active === 'stats'       && <TenantStatsPage />}
      {active === 'commissions' && <CommissionStatsPage />}
      {active === 'ledger'      && <TransactionLedgerPage />}
      {active === 'partners'    && <PartnerManagement />}


      {/* 승인 모달 */}
      {selectedForApproval && (
        <TenantApprovalModal
          tenant={selectedForApproval}
          onApprove={id => { updateTenantInfo(id, { ...selectedForApproval, status:'active' }); setSelectedForApproval(null); }}
          onReject={() => setSelectedForApproval(null)}
          onClose={() => setSelectedForApproval(null)}
        />
      )}
    </div>
  );
}