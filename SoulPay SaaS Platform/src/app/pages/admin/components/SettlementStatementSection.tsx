import { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  Building2,
  Users,
  RefreshCw,
  Info,
  X,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminAPI, partnerAPI } from '../../../api/client';
import { Badge } from '../../../components/ui/badge';

export default function SettlementStatementSection() {
  const [activeSubTab, setActiveSubTab] = useState<'tenant' | 'partner'>('tenant');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [tenantStatements, setTenantStatements] = useState<any[]>([]);
  const [partnerStatements, setPartnerStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 인쇄 미리보기 모달 상태
  const [previewItem, setPreviewItem] = useState<{
    type: 'tenant' | 'partner';
    data: any;
  } | null>(null);

  const loadStatements = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, partnersRes] = await Promise.all([
        adminAPI.getStatements(selectedMonth),
        partnerAPI.getAll().catch(() => ({ success: true, data: [] })),
      ]);

      const partnersMap = new Map<string, any>();
      if (partnersRes.success && Array.isArray(partnersRes.data)) {
        partnersRes.data.forEach((p: any) => {
          partnersMap.set(p.id, p);
        });
      }

      if (res.success && res.data) {
        setTenantStatements(res.data.tenantStatements || []);
        const rawPartners = res.data.partnerStatements || [];
        const enrichedPartners = rawPartners.map((ps: any) => {
          const partnerObj = ps.partnerId ? partnersMap.get(ps.partnerId) : null;
          const candidateName = partnerObj?.name || partnerObj?.corpName || ps.partnerName;
          const finalName = candidateName && candidateName !== '파트너'
            ? candidateName
            : (ps.partnerRole === 'master_agency' ? '총판 대리점' : '영업자');
          return {
            ...ps,
            partnerName: finalName,
            bankName: ps.bankName || partnerObj?.bankName || '',
            accountNumber: ps.accountNumber || partnerObj?.accountNumber || '',
            accountHolder: ps.accountHolder || partnerObj?.accountHolder || finalName,
            partnerRole: ps.partnerRole || partnerObj?.role || 'sales_agent',
          };
        });
        setPartnerStatements(enrichedPartners);
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

  // 인쇄 미리보기 모달 열기
  const handleOpenPreview = (item: any, type: 'tenant' | 'partner') => {
    setPreviewItem({ type, data: item });
  };

  // 실제 인쇄 실행 (문서 영역만 인쇄)
  const handlePrintDocument = () => {
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
        toast.error('내보낼 대리점 대조 내역이 없습니다.');
        return;
      }
      const headers = ['대조번호', '정산월', '대리점·영업자명', '구분', '사업자유형', '수수료원금(원)', '스플릿정산액(원)', '지급계좌'];
      const rows = partnerStatements.map(ps => {
        const name = ps.partnerName && ps.partnerName !== '파트너'
          ? ps.partnerName
          : (ps.partnerRole === 'master_agency' ? '총판 대리점' : '영업자');
        return [
          ps.id,
          ps.month,
          `"${name}"`,
          ps.partnerRole === 'master_agency' ? '대리점' : '영업자',
          ps.isCorporate ? '법인' : '개인',
          ps.grossCommission,
          ps.netPayout || ps.grossCommission,
          `"${ps.bankName || ''} ${ps.accountNumber || ''}"`,
        ];
      });
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SoulPay_영업대리점_수수료대조표_${selectedMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('영업대리점 수수료 대조표 CSV가 다운로드되었습니다.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 인쇄 전용 CSS (모달 내용만 A4로 깔끔하게 인쇄) ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-document-sheet, #print-document-sheet * {
            visibility: visible;
          }
          #print-document-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 32px 40px !important;
            background: white !important;
            color: black !important;
            z-index: 999999 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

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
                    onClick={() => handleOpenPreview(st, 'tenant')}
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

          {partnerStatements.map((ps: any) => {
            // "파트너"로 단순 표기되지 않도록 실제 상호/이름을 우선 표출
            const displayName = ps.partnerName && ps.partnerName !== '파트너'
              ? ps.partnerName
              : (ps.partnerRole === 'master_agency' ? '총판 대리점' : '영업자');

            return (
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
                      {displayName} <span className="text-xs font-normal text-slate-500">({ps.month} 발생분)</span>
                    </h3>
                    {ps.bankName && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        {ps.bankName} {ps.accountNumber} {ps.accountHolder ? `(예금주: ${ps.accountHolder})` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenPreview({ ...ps, partnerName: displayName }, 'partner')}
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
            );
          })}
        </div>
      )}

      {/* ── 🖨️ 정식 정산 대조표 인쇄 미리보기 모달 ── */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* 모달 상단 조작 바 */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                  {previewItem.type === 'tenant' ? '가맹단체 정산 대조 명세서 미리보기' : '영업대리점 수수료 분구 대조표 미리보기'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintDocument}
                  className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  인쇄하기 (Print)
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 transition-colors cursor-pointer"
                  title="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 인쇄 대상 문서 영역 (A4 정식 명세서 포맷) */}
            <div className="p-6 sm:p-10 overflow-y-auto bg-slate-100 dark:bg-zinc-950 flex justify-center">
              <div
                id="print-document-sheet"
                className="bg-white text-slate-900 p-8 sm:p-10 rounded-xl border border-slate-200 shadow-md w-full max-w-[680px] space-y-6 font-sans"
              >
                {/* 헤더 */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 tracking-wider block">SOULPAY SETTLEMENT CENTER</span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-1">
                      {previewItem.type === 'tenant'
                        ? '가맹단체 헌금 결제 및 분구 대조표'
                        : '영업대리점 수수료 분구 대조 명세서'}
                    </h2>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 font-mono space-y-0.5">
                    <div>문서번호: {previewItem.data.id}</div>
                    <div>출력일시: {new Date().toLocaleDateString('ko-KR')}</div>
                  </div>
                </div>

                {/* 기본 정보 표 */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="space-y-1.5">
                    <div className="text-slate-500 text-[11px]">수신 (대상):</div>
                    <div className="font-bold text-slate-900 text-sm">
                      {previewItem.type === 'tenant' ? previewItem.data.name : previewItem.data.partnerName} 귀하
                    </div>
                    <div className="text-[11px] text-slate-600">
                      대상 구분: {previewItem.type === 'tenant' ? '가맹 단체 (교회/성당/사찰)' : (previewItem.data.partnerRole === 'master_agency' ? '총판/대리점' : '영업자')}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="text-slate-500 text-[11px]">발행처:</div>
                    <div className="font-bold text-slate-900 text-sm">주식회사 소울페이 (SoulPay Inc.)</div>
                    <div className="text-[11px] text-slate-600">정산 방식: PG 금융망 자동 스플릿 직입금</div>
                  </div>
                </div>

                {/* 정산 대조 요약 테이블 */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800">■ 정산 대조 세부 내역 ({previewItem.data.month})</span>
                  <table className="w-full text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-300 p-2.5 text-left font-bold">항목 구분</th>
                        <th className="border border-slate-300 p-2.5 text-center font-bold">건수</th>
                        <th className="border border-slate-300 p-2.5 text-right font-bold">발생 금액</th>
                        <th className="border border-slate-300 p-2.5 text-center font-bold">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItem.type === 'tenant' ? (
                        <>
                          <tr>
                            <td className="border border-slate-300 p-2.5 font-medium">총 결제 승인 원금</td>
                            <td className="border border-slate-300 p-2.5 text-center font-mono">{previewItem.data.totalCount}건</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono font-bold">{previewItem.data.grossAmount.toLocaleString()}원</td>
                            <td className="border border-slate-300 p-2.5 text-center text-slate-500 text-[11px]">SoulPay 승인원장</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-300 p-2.5 font-medium">PG사 직정산 기준액</td>
                            <td className="border border-slate-300 p-2.5 text-center font-mono">-</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono font-bold text-blue-700">{previewItem.data.grossAmount.toLocaleString()}원</td>
                            <td className="border border-slate-300 p-2.5 text-center text-slate-500 text-[11px]">PG사 상점관리자 대조</td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <td className="border border-slate-300 p-2.5 font-medium">수수료 발생 원금</td>
                            <td className="border border-slate-300 p-2.5 text-center font-mono">-</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono font-bold">{previewItem.data.grossCommission.toLocaleString()}원</td>
                            <td className="border border-slate-300 p-2.5 text-center text-slate-500 text-[11px]">계약 요율 기준</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-300 p-2.5 font-medium">스플릿 정산 대상액</td>
                            <td className="border border-slate-300 p-2.5 text-center font-mono">-</td>
                            <td className="border border-slate-300 p-2.5 text-right font-mono font-bold text-purple-700">{(previewItem.data.netPayout || previewItem.data.grossCommission).toLocaleString()}원</td>
                            <td className="border border-slate-300 p-2.5 text-center text-slate-500 text-[11px]">PG사 스플릿 직입금</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 법적 확인 및 직인 안내 */}
                <div className="pt-4 border-t border-slate-200 space-y-4 text-xs text-slate-600 leading-relaxed">
                  <p className="text-[11px] text-slate-500">
                    본 문서는 SoulPay 전자결제 중계 플랫폼의 데이터베이스에 실시간 기록된 결제 승인 원장을 바탕으로 발행된 공식 분구 대조 명세서입니다.
                    가맹단체 입금액 및 영업대리점 수수료는 공인 전자지급결제대행사(PG)를 통해 각 지정 계좌로 분할 직입금 처리됩니다.
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 text-sm">주식회사 소울페이 대표이사</div>
                      <div className="text-[10px] text-slate-400 font-mono">SoulPay SaaS Platform &middot; Verification System</div>
                    </div>

                    {/* 공식 확인 직인 인영 */}
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-2 border-red-600 flex items-center justify-center p-1 text-red-600 text-center font-serif text-[11px] font-black leading-tight rotate-[-6deg] select-none opacity-90">
                        소울페이<br />대표이사<br />직인
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
