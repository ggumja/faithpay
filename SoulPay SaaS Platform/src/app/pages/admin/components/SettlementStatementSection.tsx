import { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Building2,
  Users,
  RefreshCw,
  Info,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminAPI } from '../../../api/client';
import { Badge } from '../../../components/ui/badge';

export default function SettlementStatementSection() {
  const [activeSubTab, setActiveSubTab] = useState<'tenant' | 'partner'>('tenant');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [tenantStatements, setTenantStatements] = useState<any[]>([]);
  const [partnerStatements, setPartnerStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getStatements(selectedMonth);
      if (res.success && res.data) {
        setTenantStatements(res.data.tenantStatements || []);
        setPartnerStatements(res.data.partnerStatements || []);
      } else {
        setTenantStatements([]);
        setPartnerStatements([]);
      }
    } catch (err: any) {
      console.error('Failed to load settlement statements:', err);
      setError('명세서 데이터를 불러오는데 실패했습니다.');
      setTenantStatements([]);
      setPartnerStatements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatements();
  }, [selectedMonth]);

  const handlePrint = (title: string) => {
    toast.info(`${title} 인쇄 미리보기를 엽니다.`);
    window.print();
  };

  // CSV 내보내기 헬퍼
  const handleExportCSV = () => {
    if (activeSubTab === 'tenant') {
      if (tenantStatements.length === 0) {
        toast.error('내보낼 단체 대조 내역이 없습니다.');
        return;
      }
      const headers = ['대조번호', '정산월', '단체명', '승인건수', '총결제승인액(원)', '시스템예상공제(원)', '단체기준액(원)'];
      const rows = tenantStatements.map(st => [
        st.id,
        st.month,
        `"${st.name}"`,
        st.totalCount,
        st.grossAmount,
        st.pgFee || 0,
        st.netPayout || st.grossAmount,
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SoulPay_가맹단체_분구대조표_${selectedMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('가맹단체 분구 대조표 CSV가 다운로드되었습니다.');
    } else {
      if (partnerStatements.length === 0) {
        toast.error('내보낼 파트너 대조 내역이 없습니다.');
        return;
      }
      const headers = ['대조번호', '정산월', '파트너명', '구분', '사업자유형', '수수료공급가액(원)', '부가세(원)', '실지급기준액(원)'];
      const rows = partnerStatements.map(ps => [
        ps.id,
        ps.month,
        `"${ps.partnerName}"`,
        ps.partnerRole === 'master_agency' ? '대리점' : '영업자',
        ps.isCorporate ? '법인' : '개인',
        ps.grossCommission,
        ps.vatAmount || 0,
        ps.netPayout || ps.grossCommission,
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SoulPay_대리점_수수료대조표_${selectedMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('대리점 수수료 대조표 CSV가 다운로드되었습니다.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 안내 및 상단 컨트롤 바 ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
        {/* 서브 탭 전환 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('tenant')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'tenant'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            가맹단체 거래 대조표
          </button>
          <button
            onClick={() => setActiveSubTab('partner')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'partner'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            영업대리점 수수료 대조표
          </button>
        </div>

        {/* 월 선택 및 액션 버튼 */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 whitespace-nowrap">대상월:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
            />
          </div>

          <button
            onClick={loadStatements}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-zinc-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span> 다운로드
          </button>
        </div>
      </div>

      {/* ── 상점관리자 대조 가이드 배너 ── */}
      <div className="p-3.5 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {activeSubTab === 'tenant' ? '가맹단체 정산금 대조 안내' : '영업대리점 수수료 대조 안내'}
          </span>
          <p className="text-[11.5px]">
            {activeSubTab === 'tenant'
              ? '본 대조표는 SoulPay 플랫폼을 통해 집계된 결제 승인 원금 기준입니다. 단체별 개별 계약 수수료, 부가세, 정산 주기(D+N) 차감 후 최종 실입금액은 가맹하신 PG사(나노/토스) 상점관리자 정산 내역에서 확인하실 수 있습니다.'
              : '영업대리점 및 영업자 수수료는 PG사의 스플릿(Split) 정산 연동에 따라 지정 계좌로 분할 직입금됩니다. 원천징수 영수증 및 세금계산서 증빙은 PG사 정산 센터에서 발급 처리됩니다.'}
          </p>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs font-medium">{error}</div>}

      {/* ── 1. 가맹단체 분구 대조표 ── */}
      {activeSubTab === 'tenant' ? (
        <div className="space-y-3">
          {!loading && tenantStatements.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
              {selectedMonth} 기간에 발생한 가맹단체 결제 내역이 없습니다 (0건).
            </div>
          )}

          {tenantStatements.map((st: any) => (
            <div
              key={st.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4.5 space-y-3.5 shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">대조코드: {st.id}</span>
                    <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-zinc-800">
                      PG 직정산 대상
                    </Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base mt-0.5">
                    {st.name} <span className="text-xs font-normal text-slate-500">({st.month} 거래 합산)</span>
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrint(`${st.name} 정산 대조표`)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <Printer className="h-3.5 w-3.5" /> 인쇄 미리보기
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">총 결제 승인 건수 / 금액</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-zinc-100 text-sm">
                    {st.totalCount}건 ({st.grossAmount.toLocaleString()}원)
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">시스템 기준 분구액</span>
                  <span className="font-bold font-mono text-blue-600 dark:text-blue-400 text-sm">
                    {st.grossAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-500 block mb-0.5">실 정산 확인</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300 text-xs flex items-center gap-1">
                    각 PG사 상점관리자 조회
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── 2. 영업대리점 수수료 분구 대조표 ── */
        <div className="space-y-3">
          {!loading && partnerStatements.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
              {selectedMonth} 기간에 발생한 파트너 수수료 분구 내역이 없습니다 (0건).
            </div>
          )}

          {partnerStatements.map((ps: any) => (
            <div
              key={ps.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4.5 space-y-3.5 shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">분구코드: {ps.id}</span>
                    <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-zinc-800">
                      {ps.partnerRole === 'master_agency' ? '총판/대리점' : '영업자'}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base mt-0.5">
                    {ps.partnerName} <span className="text-xs font-normal text-slate-500">({ps.month} 발생분)</span>
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrint(`${ps.partnerName} 수수료 대조표`)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <Printer className="h-3.5 w-3.5" /> 인쇄 미리보기
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">수수료 발생 원금</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-zinc-100 text-sm">
                    {ps.grossCommission.toLocaleString()}원
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 block mb-0.5">스플릿 정산 대상액</span>
                  <span className="font-bold font-mono text-purple-700 dark:text-purple-300 text-sm">
                    {(ps.netPayout || ps.grossCommission).toLocaleString()}원
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-500 block mb-0.5">지급 방식</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                    PG사 자동 스플릿 직입금
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
