import { useState, useEffect } from 'react';
import { FileText, Printer, Download, Building2, User, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { adminAPI } from '../../../api/client';

export default function SettlementStatementSection() {
  const [statementType, setStatementType] = useState<'tenant' | 'partner'>('tenant');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [tenantStatements, setTenantStatements] = useState<any[]>([]);
  const [partnerStatements, setPartnerStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatements() {
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
    }
    loadStatements();
  }, [selectedMonth]);




  const handlePrint = (title: string) => {
    toast.info(`${title} 인쇄 미리보기를 엽니다.`);
    window.print();
  };

  const handleDownloadPDF = (title: string) => {
    toast.success(`${title} PDF 명세서 다운로드가 시작되었습니다.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 탭 전환 및 월 선택 ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
        <div className="flex gap-2">
          <button
            onClick={() => setStatementType('tenant')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              statementType === 'tenant'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            원원사(교회/성당/사찰) 입금 명세서
          </button>
          <button
            onClick={() => setStatementType('partner')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              statementType === 'partner'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
            }`}
          >
            <User className="h-4 w-4" />
            영업 파트너 / 에이전트 세무 증빙 서식
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">정산 월:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
          />
          {loading && <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />}
          {error && <span className="text-[11px] text-red-500">{error}</span>}
        </div>
      </div>

      {/* ── 1. 원원사 입금 명세서 목록 ── */}
      {statementType === 'tenant' ? (
        <div className="space-y-4">
          {!loading && tenantStatements.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
              {selectedMonth} 기간의 단체 정산 명세서가 없습니다.
            </div>
          )}
          {tenantStatements.map((st: any) => (
            <div
              key={st.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 gap-2">
                <div>
                  <span className="text-[11px] font-mono text-slate-400">명세서 번호: {st.id}</span>
                  <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base flex items-center gap-2">
                    {st.name} <span className="text-xs font-normal text-slate-500">({st.month} 정산)</span>
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrint(`${st.name} 정산 명세서`)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <Printer className="h-3.5 w-3.5" /> 인쇄
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(`${st.name} 정산 명세서`)}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF 다운로드
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">총 결제 건수 / 금액</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-zinc-100 text-sm">
                    {st.totalCount}건 ({st.grossAmount.toLocaleString()}원)
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  <span className="text-[11px] text-purple-600 block mb-0.5">PG 수수료 공제액 (1.5%)</span>
                  <span className="font-bold font-mono text-purple-700 text-sm">
                    -{st.pgFee.toLocaleString()}원
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  <span className="text-[11px] text-emerald-600 block mb-0.5">최종 실입금액</span>
                  <span className="font-bold font-mono text-emerald-600 text-sm">
                    {st.netPayout.toLocaleString()}원
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">입금 완료일</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-zinc-100 text-sm flex items-center gap-1">
                    {st.payoutDate ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{st.payoutDate}</>
                    ) : '정산 예정'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── 2. 영업 파트너 / 에이전트 세무 증빙 서식 ── */
        <div className="space-y-4">
          {!loading && partnerStatements.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
              {selectedMonth} 기간의 파트너 정산 명세서가 없습니다.
            </div>
          )}
          {partnerStatements.map((ps: any) => (
            <div key={ps.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">발행 번호: {ps.id}</span>
                    {ps.isCorporate ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        🏢 법인사업자 (전자세금계산서)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        👤 개인 / 프리랜서 (원천징수)
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base mt-0.5">
                    {ps.partnerName} <span className="text-xs font-normal text-slate-500">({ps.month} 정산)</span>
                  </h3>
                  {ps.bankName && (
                    <p className="text-xs text-slate-500">{ps.bankName} · {ps.accountNumber} · {ps.accountHolder}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrint(`${ps.partnerName} 세무 증빙`)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer border-none"
                  >
                    <Printer className="h-3.5 w-3.5" /> 인쇄
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(ps.isCorporate ? `${ps.partnerName} 전자세금계산서` : `${ps.partnerName} 3.3% 원천징수 영수증`)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer border-none font-bold ${
                      ps.isCorporate ? 'bg-blue-50 hover:bg-blue-100 text-blue-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {ps.isCorporate ? '전자세금계산서 PDF' : '3.3% 영수증 PDF'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">
                    {ps.isCorporate ? '수수료 공급가액' : '영업 수수료 원금'}
                  </span>
                  <span className="font-bold font-mono text-slate-900 dark:text-zinc-100 text-sm">
                    {ps.grossCommission.toLocaleString()}원
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  {ps.isCorporate ? (
                    <>
                      <span className="text-[11px] text-blue-600 block mb-0.5">부가가치세 (VAT 10%)</span>
                      <span className="font-bold font-mono text-blue-600 text-sm">+{ps.vatAmount.toLocaleString()}원</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] text-red-600 block mb-0.5">3.3% 사업소득세 원천징수</span>
                      <span className="font-bold font-mono text-red-600 text-sm">-{ps.withholdingTax.toLocaleString()}원</span>
                    </>
                  )}
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                  <span className={`text-[11px] block mb-0.5 ${ps.isCorporate ? 'text-blue-900 dark:text-blue-200' : 'text-emerald-600'}`}>
                    {ps.isCorporate ? '세금계산서 청구 합계' : '실지급 수수료액'}
                  </span>
                  <span className={`font-bold font-mono text-sm ${ps.isCorporate ? 'text-blue-700 dark:text-blue-400' : 'text-emerald-600'}`}>
                    {ps.netPayout.toLocaleString()}원
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

