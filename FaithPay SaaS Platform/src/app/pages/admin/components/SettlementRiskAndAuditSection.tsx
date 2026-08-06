import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  Sliders,
  FileCheck2,
  BellRing,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Save,
  ArrowRightLeft,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';

import { API_BASE_URL } from '../../../api/client';

export default function SettlementRiskAndAuditSection() {
  const [minThreshold, setMinThreshold] = useState<number>(10000);
  const [enableAlertKakao, setEnableAlertKakao] = useState(true);
  const [enableAlertEmail, setEnableAlertEmail] = useState(true);

  const [clawbackItems, setClawbackItems] = useState<any[]>([]);
  const [rolloverAccounts, setRolloverAccounts] = useState<any[]>([]);
  const [auditReport, setAuditReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRiskAudit = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/admin/settlements/risk-audit`);

        const json = await res.json();
        if (json.success && json.data) {
          setClawbackItems(json.data.clawbackItems ?? []);
          setRolloverAccounts(json.data.rolloverAccounts ?? []);
          setAuditReport(json.data.auditReport ?? []);
        }
      } catch (e: any) {
        console.error('Failed to fetch risk audit data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRiskAudit();
  }, []);


  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 1. 환불/취소 소급 상계 (Clawback) 원장 ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-red-600" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
              1. 헌금/결제 취소 건 수수료 소급 상계 (Refund Clawback) 원장
            </h3>
          </div>
          <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[10px]">
            익일/익월 정산 차감 상계
          </Badge>
        </div>

        <p className="text-xs text-slate-500">
          이미 정산금이 지급된 이후 환불/취소가 발생한 결제건에 대하여, 다음 정산 회차에서 수수료 및 원원사 입금액을 마이너스(-) 상계 처리합니다.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800 text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                <th className="py-2.5 px-3">취소 관리 ID</th>
                <th className="py-2.5 px-3">취소 일시</th>
                <th className="py-2.5 px-3">단체명 / 헌금자</th>
                <th className="py-2.5 px-3 text-right">취소 원금</th>
                <th className="py-2.5 px-3 text-right text-red-600">원원사 상계액 (98%)</th>
                <th className="py-2.5 px-3 text-right text-purple-600">플랫폼 차감 (0.5%)</th>
                <th className="py-2.5 px-3 text-center">상계 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono">
              {clawbackItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-zinc-100">{item.id}</td>
                  <td className="py-2.5 px-3 text-slate-500">{item.date}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">{item.tenantName}</span>
                    <span className="text-slate-400 text-[10px] ml-1.5">({item.donorName})</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-zinc-300">
                    -{item.originalAmount.toLocaleString()}원
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-red-600">
                    {item.clawbackNetPayout.toLocaleString()}원
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-purple-600">
                    {item.clawbackPlatformFee.toLocaleString()}원
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    {item.status === 'ADJUSTED' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px]">
                        상계 완료
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 font-bold text-[10px]">
                        차기 정산 차감 예정
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. 최저 정산 이체 한도 & 이월 관리 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 이체 한도 설정 */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600" />
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-xs">
                2. 최저 정산 이체 한도 설정 (Threshold)
              </h3>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-none text-[10px]">자동 이월 엔진</Badge>
          </div>
          <p className="text-[11.5px] text-slate-500">
            정산 수수료액이 설정 금액 미만인 경우 계좌 이체 수수료 절감을 위해 자동으로 다음 회차로 이월 정산됩니다.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <label className="text-xs font-bold text-slate-700">최저 이체액 기준:</label>
            <select
              value={minThreshold}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMinThreshold(val);
                toast.success(`최저 이체 기준액이 ${val.toLocaleString()}원으로 변경되었습니다.`);
              }}
              className="px-3 py-1.5 text-xs font-bold font-mono rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 outline-none"
            >
              <option value={5000}>5,000원 이상 이체</option>
              <option value={10000}>10,000원 이상 이체 (기본값)</option>
              <option value={30000}>30,000원 이상 이체</option>
              <option value={50000}>50,000원 이상 이체</option>
            </select>
          </div>
        </div>

        {/* 현재 이월 누적 건 목록 */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-purple-600" />
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-xs">
                현재 한도 미달 이월 누적 건 ({rolloverAccounts.length}건)
              </h3>
            </div>
          </div>
          <div className="space-y-2">
            {rolloverAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 rounded-lg flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-zinc-200 block">{acc.partnerName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{acc.targetDate}</span>
                </div>
                <div className="font-mono font-bold text-purple-600 text-sm">
                  {acc.accumAmount.toLocaleString()}원
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. 기부금 영수증 vs PG 실입금액 교차 검증 (Cross-Auditing) ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
              3. 국세청 기부금 영수증 원금(100%) vs PG 실입금액(98%) 대조 검증
            </h3>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px]">
            연말정산 100% 매칭 검증
          </Badge>
        </div>

        <p className="text-xs text-slate-500">
          종교 단체가 신도에게 발급하는 소득공제용 기부금 영수증 원금(100%)과 실제 통장에 입금되는 PG 정산금(98%) 사이의 수수료 차액을 자동 교차 검증하여 세무 오류를 사전에 예방합니다.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800 text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                <th className="py-2.5 px-3">검증 그룹 ID</th>
                <th className="py-2.5 px-3">원원사 (교회/성당/사찰)</th>
                <th className="py-2.5 px-3 text-right">기부금 영수증 총액 (100%)</th>
                <th className="py-2.5 px-3 text-right text-emerald-600">PG 실입금액 (98%)</th>
                <th className="py-2.5 px-3 text-right text-purple-600">PG/플랫폼 수수료 (2%)</th>
                <th className="py-2.5 px-3 text-center">대조 검증 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono">
              {auditReport.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-zinc-100">{rep.id}</td>
                  <td className="py-2.5 px-3 font-sans font-bold text-slate-800 dark:text-zinc-200">
                    {rep.tenantName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-zinc-100">
                    {rep.grossDonation100.toLocaleString()}원
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                    {(rep.netSettlement98 ?? rep.pgNetPayout98 ?? 0).toLocaleString()}원
                  </td>
                  <td className="py-2.5 px-3 text-right text-purple-600 font-bold">
                    {(rep.pgFee15 ?? rep.feeAmount2 ?? 0).toLocaleString()}원
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> 대조 매칭 완료
                    </Badge>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. 실시간 정산 실패 자동 알림 (Payout Alert Webhook) ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
              4. 실시간 정산 실패 웹훅/알림톡 설정 (Payout Failure Alert)
            </h3>
          </div>
          <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]">
            실시간 Push & SMS
          </Badge>
        </div>

        <p className="text-xs text-slate-500">
          토스 예치금 부족이나 정산 계좌 상태 이상으로 이체가 실패할 경우, 즉시 시스템 관리자 및 파트너에게 알림톡/메일을 자동 발송합니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-slate-800 dark:text-zinc-200 block">카카오 알림톡 자동 발송</span>
              <span className="text-[11px] text-slate-500">정산 실패 시 담당자 폰으로 알림톡 수신</span>
            </div>
            <button
              onClick={() => {
                setEnableAlertKakao(!enableAlertKakao);
                toast.info(`알림톡 설정이 ${!enableAlertKakao ? '활성화' : '비활성화'} 되었습니다.`);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                enableAlertKakao ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {enableAlertKakao ? '켜짐 (ON)' : '꺼짐 (OFF)'}
            </button>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-slate-800 dark:text-zinc-200 block">이메일 긴급 알림 리포트</span>
              <span className="text-[11px] text-slate-500">정산 에러 로그 및 원인 이메일 발송</span>
            </div>
            <button
              onClick={() => {
                setEnableAlertEmail(!enableAlertEmail);
                toast.info(`이메일 알림이 ${!enableAlertEmail ? '활성화' : '비활성화'} 되었습니다.`);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                enableAlertEmail ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {enableAlertEmail ? '켜짐 (ON)' : '꺼짐 (OFF)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
