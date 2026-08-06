import { useState } from 'react';
import { FileText, Printer, Download, Building2, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettlementStatementSection() {
  const [statementType, setStatementType] = useState<'tenant' | 'partner'>('tenant');
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  const mockTenantStatements = [
    {
      id: 'ST-202608-01',
      month: '2026년 08월',
      name: '대한불교조계종 각원사',
      businessNo: '211-82-01923',
      totalCount: 142,
      grossAmount: 48500000,
      pgFee: 727500, // 1.5%
      netPayout: 47772500,
      payoutDate: '2026-08-02',
    },
    {
      id: 'ST-202608-02',
      month: '2026년 08월',
      name: '명성교회',
      businessNo: '120-89-49201',
      totalCount: 380,
      grossAmount: 94200000,
      pgFee: 1413000,
      netPayout: 92787000,
      payoutDate: '2026-08-02',
    },
  ];

  const mockPartnerTaxStatements = [
    {
      id: 'TAX-202608-01',
      month: '2026년 08월',
      partnerName: '서울 총판 영업본부 (주식회사 엠앤에스)',
      businessNo: '107-88-39201',
      businessType: 'corporation' as const,     // 🏢 법인사업자 → 전자세금계산서
      grossCommission: 2850000,
      vatAmount: 285000,                         // 부가가치세 10% (법인에게 청구)
      withholdingTax: 0,                         // 법인은 원천징수 없음
      netPayout: 3135000,                        // 공급가액 + VAT = 법인이 청구하는 합계
      status: 'ISSUED',
    },
    {
      id: 'TAX-202608-02',
      month: '2026년 08월',
      partnerName: '김철수 에이전트 (개인사업자)',
      businessNo: '920110-1******',
      businessType: 'freelancer' as const,       // 👤 프리랜서 → 3.3% 원천징수
      grossCommission: 950000,
      vatAmount: 0,                              // 프리랜서는 VAT 없음
      withholdingTax: 31350,                     // 3.3% 사업소득세 원천징수
      netPayout: 918650,                         // 수수료 - 원천징수 = 실지급액
      status: 'ISSUED',
    },
  ];

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
        </div>
      </div>

      {/* ── 1. 원원사 입금 명세서 목록 ── */}
      {statementType === 'tenant' ? (
        <div className="space-y-4">
          {mockTenantStatements.map((st) => (
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
                  <p className="text-xs text-slate-500">고유번호증/사업자번호: {st.businessNo}</p>
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
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {st.payoutDate}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── 2. 영업 파트너 / 에이전트 세무 증빙 서식 (법인 세금계산서 vs 개인 3.3%) ── */
        <div className="space-y-4">
          {/* 법인사업자 예시 건 */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">발행 번호: TAX-202608-01</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    🏢 법인사업자 (전자세금계산서)
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base mt-0.5">
                  서울 총판 영업본부 (주식회사 엠앤에스) <span className="text-xs font-normal text-slate-500">(2026년 08월 정산)</span>
                </h3>
                <p className="text-xs text-slate-500">사업자등록번호: 107-88-39201 · 대표자: 김대표</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrint(`주식회사 엠앤에스 전자세금계산서`)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer border-none"
                >
                  <Printer className="h-3.5 w-3.5" /> 인쇄
                </button>
                <button
                  onClick={() => handleDownloadPDF(`주식회사 엠앤에스 전자세금계산서`)}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer border-none font-bold"
                >
                  <FileText className="h-3.5 w-3.5" /> 전자세금계산서 PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                <span className="text-[11px] text-slate-500 block mb-0.5">수수료 공급가액</span>
                <span className="font-bold font-mono text-slate-900 dark:text-zinc-100 text-sm">
                  2,850,000원
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                <span className="text-[11px] text-blue-600 block mb-0.5">부가가치세 (VAT 10%)</span>
                <span className="font-bold font-mono text-blue-600 text-sm">
                  +285,000원
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                <span className="text-[11px] text-blue-900 dark:text-blue-200 block mb-0.5">세금계산서 청구 합계</span>
                <span className="font-bold font-mono text-blue-700 dark:text-blue-400 text-sm">
                  3,135,000원
                </span>
              </div>
            </div>
          </div>

          {/* 개인 / 프리랜서 예시 건 */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">발행 번호: TAX-202608-02</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    👤 개인 / 프리랜서 (원천징수)
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base mt-0.5">
                  김철수 에이전트 (개인) <span className="text-xs font-normal text-slate-500">(2026년 08월 정산)</span>
                </h3>
                <p className="text-xs text-slate-500">주민등록번호: 920110-1******</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrint(`김철수 원천징수 영수증`)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer border-none"
                >
                  <Printer className="h-3.5 w-3.5" /> 인쇄
                </button>
                <button
                  onClick={() => handleDownloadPDF(`김철수 3.3% 원천징수 영수증`)}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1.5 cursor-pointer border-none font-bold"
                >
                  <FileText className="h-3.5 w-3.5" /> 3.3% 영수증 PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                <span className="text-[11px] text-slate-500 block mb-0.5">영업 수수료 원금</span>
                <span className="font-bold font-mono text-slate-900 dark:text-zinc-100 text-sm">
                  950,000원
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                <span className="text-[11px] text-red-600 block mb-0.5">3.3% 사업소득세 원천징수</span>
                <span className="font-bold font-mono text-red-600 text-sm">
                  -31,350원
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                <span className="text-[11px] text-emerald-600 block mb-0.5">실지급 수수료액</span>
                <span className="font-bold font-mono text-emerald-600 text-sm">
                  918,650원
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
