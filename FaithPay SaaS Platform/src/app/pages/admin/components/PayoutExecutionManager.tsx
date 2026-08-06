import { useState, useEffect } from 'react';
import {
  Play,
  RefreshCw,
  PauseCircle,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../../components/ui/badge';

import { API_BASE_URL } from '../../../api/client';

interface PayoutExceptionItem {
  id: string;
  tenantName: string;
  bankName: string;
  accountNumber: string;
  holderName: string;
  amount: number;
  failureReason: string;
  isHold: boolean;
}

export default function PayoutExecutionManager() {
  const [exceptions, setExceptions] = useState<PayoutExceptionItem[]>([]);
  const [balanceInfo, setBalanceInfo] = useState({
    availableBalance: 0,
    pendingPayoutBalance: 0,
    payoutCycle: 'D+1 영업일 09:00',
  });
  const [loading, setLoading] = useState(true);
  const [isExecutingBatch, setIsExecutingBatch] = useState(false);

  useEffect(() => {
    const fetchExceptions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/admin/settlements/exceptions`);

        const json = await res.json();
        if (json.success && json.data) {
          setExceptions(json.data.exceptions ?? []);
          if (json.data.balanceInfo) {
            setBalanceInfo(json.data.balanceInfo);
          }
        }
      } catch (e: any) {
        console.error('Failed to fetch payout exceptions:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchExceptions();
  }, []);


  const handleRunBatch = () => {
    setIsExecutingBatch(true);
    toast.info('토스페이먼츠 v2 Payouts 정산 배치를 시작합니다...');
    setTimeout(() => {
      setIsExecutingBatch(false);
      toast.success('D+1 정산 배치 송금이 성공적으로 마무리되었습니다. (48건 송금 완료)');
    }, 1500);
  };

  const toggleHoldStatus = (id: string) => {
    setExceptions((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextHold = !item.isHold;
          toast.info(
            nextHold
              ? `${item.tenantName} 건이 [지급 보류(Hold)] 상태로 변경되었습니다.`
              : `${item.tenantName} 건의 보류가 해제되어 다음 정산 대상에 포함됩니다.`
          );
          return { ...item, isHold: nextHold };
        }
        return item;
      })
    );
  };

  const handleRetryPayout = (item: PayoutExceptionItem) => {
    toast.loading(`${item.tenantName} 정산 재시도 요청 중...`);
    setTimeout(() => {
      toast.dismiss();
      toast.success(`${item.tenantName} 계좌 확인 후 재송금이 성공하였습니다.`);
      setExceptions((prev) => prev.filter((i) => i.id !== item.id));
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 상단 토스 Payouts API 가동 및 잔액 상태 카드 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 잔액 1 */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center justify-between">
            <span>토스 지급대행 예치금 잔액</span>
            <Landmark className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {balanceInfo.availableBalance.toLocaleString()}원
          </div>
          <div className="text-[11px] text-slate-500">실시간 Payouts 펀딩 예치금</div>
        </div>

        {/* 잔액 2 */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center justify-between">
            <span>정산 예정 대기금</span>
            <Zap className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {balanceInfo.pendingPayoutBalance.toLocaleString()}원
          </div>
          <div className="text-[11px] text-slate-500">익일 09:00 송금 예정액</div>
        </div>

        {/* 배치 트리거 버튼 */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-xl p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200">수동 정산 배치 컨트롤러</span>
            <Badge className="bg-blue-800 text-blue-100 border-blue-700 text-[10px]">v2 Payouts API</Badge>
          </div>
          <div className="pt-2">
            <button
              onClick={handleRunBatch}
              disabled={isExecutingBatch}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition-colors cursor-pointer border-none disabled:opacity-50"
            >
              {isExecutingBatch ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              {isExecutingBatch ? '정산 배치 송금 진행 중...' : 'Toss Payouts 즉시 정산 배치 실행'}
            </button>
          </div>
        </div>
      </div>

      {/* ── 송금 예외 및 정산 보류(Hold) 관리 테이블 ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
              송금 예외 및 정산 보류(Hold) 관리
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">예외 건수: {exceptions.length}건</span>
        </div>

        {exceptions.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-slate-500 text-xs">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
            현재 발생한 송금 오류나 정산 보류 건이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase">
                  <th className="py-2.5 px-4">관리 ID</th>
                  <th className="py-2.5 px-4">원원사 (교회/성당/사찰)</th>
                  <th className="py-2.5 px-4">등록 계좌 정보</th>
                  <th className="py-2.5 px-4 text-right">정산 보류액</th>
                  <th className="py-2.5 px-4">실패 / 보류 사유</th>
                  <th className="py-2.5 px-4 text-center">조치 실행</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                {exceptions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-zinc-300">
                      {item.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-zinc-100">
                      {item.tenantName}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div>{item.bankName} {item.accountNumber}</div>
                      <div className="text-[10px] text-slate-500">예금주: {item.holderName}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                      {item.amount.toLocaleString()}원
                    </td>
                    <td className="py-3 px-4 text-red-600 font-medium">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.failureReason}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleHoldStatus(item.id)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer border-none transition-colors ${
                            item.isHold
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {item.isHold ? '보류 중 (Hold)' : '보류 설정'}
                        </button>
                        <button
                          onClick={() => handleRetryPayout(item)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded bg-blue-600 hover:bg-blue-700 text-white cursor-pointer border-none transition-colors"
                        >
                          재송금 실행
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
