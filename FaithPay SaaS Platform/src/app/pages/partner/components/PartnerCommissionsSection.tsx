import { useState } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { PartnerCommission } from '../../../api/client';

interface PartnerCommissionsSectionProps {
  commissions: PartnerCommission[];
  isAgency?: boolean;
}

export function PartnerCommissionsSection({ commissions, isAgency = false }: PartnerCommissionsSectionProps) {
  const [mainTab,    setMainTab]    = useState<'history' | 'settled'>('history');
  const [periodTab,  setPeriodTab]  = useState<'thisMonth' | 'lastMonth' | 'all'>('all');

  // 기간 필터링
  const filtered = commissions.filter(c => {
    if (periodTab === 'all') return true;
    try {
      const d = new Date(c.createdAt);
      const now = new Date();
      if (periodTab === 'thisMonth') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (periodTab === 'lastMonth') {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1);
        return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
      }
    } catch {}
    return true;
  });

  const pendingList = filtered.filter(c => c.settlementStatus !== 'paid');
  const settledList = filtered.filter(c => c.settlementStatus === 'paid');

  const totalDonation   = filtered.reduce((sum, c) => sum + (c.donationAmount   ?? 0), 0);
  const totalCommission = filtered.reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);
  const totalSettled    = settledList.reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);

  const now = new Date();
  const periodLabel = periodTab === 'thisMonth' ? `${now.getMonth()+1}월` : periodTab === 'lastMonth' ? `${now.getMonth()}월` : '전체';

  return (
    <div className="p-6 space-y-5 bg-[var(--hm-paper-2)] dark:bg-zinc-950 min-h-full">
      <div>
        <h1 className="text-[18px] font-bold text-[var(--hm-ink)]">수수료 적립 및 조회</h1>
        <p className="text-[12.5px] text-[var(--hm-ink-3)] mt-0.5">내 가맹점에서 발생한 실시간 수수료 적립 및 정산 원장</p>
      </div>

      {/* 기간 필터 + 메인 탭 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* 메인 탭 */}
        <div className="flex items-center gap-1 bg-[var(--hm-paper)] border border-[var(--hm-border)] p-1 rounded-lg">
          {([['history', '수수료 발생 내역'], ['settled', '정산 완료 이력']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setMainTab(key)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-all cursor-pointer border-0 ${
                mainTab === key ? 'bg-emerald-600 text-white shadow' : 'text-[var(--hm-ink-3)] hover:text-[var(--hm-ink)] bg-transparent'
              }`}>
              {label}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                mainTab === key ? 'bg-white/20 text-white' : 'bg-[var(--hm-paper-2)] text-[var(--hm-ink-3)]'
              }`}>
                {key === 'history' ? pendingList.length : settledList.length}
              </span>
            </button>
          ))}
        </div>
        {/* 기간 필터 */}
        <div className="flex items-center gap-1">
          {([['thisMonth', '이번 달'], ['lastMonth', '지난 달'], ['all', '전체']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setPeriodTab(key)}
              className={`px-3 py-1.5 rounded-[7px] text-[11.5px] font-semibold cursor-pointer border transition-colors ${
                periodTab === key
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-[var(--hm-paper)] text-[var(--hm-ink-3)] border-[var(--hm-border)] hover:bg-[var(--hm-paper-2)]'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 수수료 KPI */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: `총 신도 결제액 (${periodLabel})`,  value: `${totalDonation.toLocaleString()}원`,   color: 'text-slate-700' },
          { label: `수수료 발생 (${periodLabel})`,      value: `${totalCommission.toLocaleString()}원`, color: 'text-emerald-600' },
          { label: `정산 완료 금액 (${periodLabel})`,  value: `${totalSettled.toLocaleString()}원`,    color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="p-4">
              <div className={`text-[18px] font-bold ${color}`}>{value}</div>
              <div className="text-[10.5px] text-slate-400 mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 정산 주기별 입금 시점 및 진행 상태 안내 바 */}
      <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-[10px]">
              D+1 영업일 자동 정산 적용 중
            </Badge>
            <span className="text-xs font-bold text-slate-200">다음 입금 예정일: 익일 09:00</span>
          </div>
          <p className="text-[11px] text-slate-400">
            * 토스페이먼츠 정산 주기에 따라 카드 승인 후 D+1 영업일에 수수료 계좌로 자동 송금됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 bg-slate-800 rounded-lg text-emerald-400 font-bold border border-slate-700">
            ⚡ 실시간 입금 지원 (Payouts v2)
          </span>
        </div>
      </div>

      {/* 사업자 유형별 세무 정산 카드 (법인 VAT 10% vs 개인 3.3% 원천징수) */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            세무 정산 및 이체 금액 산출 명세
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            🔒 사업자 유형은 등록 시 확정되며 변경이 불가합니다
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 🏢 법인 / 일반사업자 산식 */}
          <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
              <span>🏢 법인 / 일반사업자 (전자세금계산서)</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">VAT 10% 별도</Badge>
            </div>
            <div className="flex justify-between text-xs text-slate-600 pt-1">
              <span>수수료 공급가액:</span>
              <span className="font-mono font-bold text-slate-800">{totalCommission.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-xs text-blue-700">
              <span>부가가치세 (10%):</span>
              <span className="font-mono font-bold">+{Math.floor(totalCommission * 0.1).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-blue-900 border-t border-blue-200 pt-1.5 mt-1">
              <span>세금계산서 청구 총액:</span>
              <span className="font-mono text-sm">{Math.floor(totalCommission * 1.1).toLocaleString()}원</span>
            </div>
          </div>

          {/* 👤 개인 / 프리랜서 산식 */}
          <div className="p-3.5 bg-emerald-50/60 rounded-lg border border-emerald-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
              <span>👤 개인 / 프리랜서 (3.3% 원천징수)</span>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">원천징수 차감</Badge>
            </div>
            <div className="flex justify-between text-xs text-slate-600 pt-1">
              <span>수수료 총액:</span>
              <span className="font-mono font-bold text-slate-800">{totalCommission.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-xs text-red-600">
              <span>3.3% 사업소득세 공제:</span>
              <span className="font-mono font-bold">-{Math.floor(totalCommission * 0.033).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-emerald-900 border-t border-emerald-200 pt-1.5 mt-1">
              <span>계좌 실입금액:</span>
              <span className="font-mono text-sm">{Math.floor(totalCommission * 0.967).toLocaleString()}원</span>
            </div>
          </div>
        </div>
      </div>

      {/* 수수료 구조 시각화 배너 */}
      <div className="flex items-center gap-2 flex-wrap p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
        <span className="font-bold text-slate-700">수수료 정산 구조:</span>
        {isAgency ? (
          <>
            <span className="px-2 py-0.5 rounded-md font-semibold bg-purple-100 text-purple-700">대리점 수수료 마진</span>
            <span className="text-slate-300 font-bold">+</span>
            <span className="px-2 py-0.5 rounded-md font-semibold bg-indigo-100 text-indigo-700">영업자 부여 베이스 수수료</span>
            <span className="text-slate-300 font-bold">➔</span>
            <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-700">가맹점 계약 수수료율</span>
          </>
        ) : (
          <>
            <span className="px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-700">내 정산 베이스 수수료율</span>
            <span className="text-slate-300 font-bold">➔</span>
            <span className="px-2 py-0.5 rounded-md font-semibold bg-blue-100 text-blue-700">가맹점 계약 수수료율</span>
            <span className="text-slate-300 font-bold">➔</span>
            <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-700">내 영업 순마진 수익</span>
          </>
        )}
      </div>

      {/* 수수료 원장 내역 테이블 */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {mainTab === 'history' ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-[11px]">발생일시</TableHead>
                  <TableHead className="text-[11px]">단체명</TableHead>
                  <TableHead className="text-[11px]">결제번호</TableHead>
                  <TableHead className="text-right text-[11px]">신도 결제액</TableHead>
                  <TableHead className="text-right text-[11px]">수수료 적립</TableHead>
                  <TableHead className="text-center text-[11px]">스프레드 구조</TableHead>
                  <TableHead className="text-center text-[11px]">정산상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                      {filtered.length === 0 ? '해당 기간 수수료 발생 기록이 없습니다.' : '정산 대기 중인 수수료가 없습니다.'}
                    </TableCell>
                  </TableRow>
                ) : pendingList.map(c => {
                  const amt = c.donationAmount ?? 0;
                  const contractRate = (c as any).contractRate ?? 0;
                  const floorRate = (c as any).floorRate ?? 0;
                  const spreadRate = contractRate > 0 ? Math.max(0, contractRate - floorRate) : 0;
                  const spreadAmt = Math.round(amt * spreadRate / 100);
                  return (
                    <TableRow key={c.id} className="hover:bg-slate-50">
                      <TableCell className="text-[11px] text-slate-500">{c.createdAt}</TableCell>
                      <TableCell className="font-semibold text-[12.5px]">{c.tenantName}</TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-500">{c.donationId}</TableCell>
                      <TableCell className="text-right text-[12px] font-semibold">{amt.toLocaleString()}원</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 text-[12px]">
                        +{(c.commissionAmount ?? 0).toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-center">
                        {contractRate > 0 ? (
                          <>
                            <div className="flex h-4 rounded overflow-hidden w-24 mx-auto">
                              {[
                                { pct: floorRate,    bg: 'bg-slate-300',   title: `원가 ${floorRate}%` },
                                { pct: spreadRate,   bg: 'bg-emerald-400', title: `마진 ${spreadRate.toFixed(1)}%` },
                              ].map(item => (
                                <div key={item.title} title={item.title} className={`${item.bg} h-full`}
                                  style={{ width: `${contractRate > 0 ? item.pct / contractRate * 100 : 0}%` }} />
                              ))}
                            </div>
                            <div className="text-[9px] text-emerald-700 font-bold mt-0.5">+{spreadAmt.toLocaleString()}원</div>
                          </>
                        ) : <span className="text-[10px] text-slate-400">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px]">정산대기</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            /* ── 정산 완료 입금 이력 탭 ── */
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-[11px]">입금일시</TableHead>
                  <TableHead className="text-[11px]">단체명</TableHead>
                  <TableHead className="text-[11px]">결제번호</TableHead>
                  <TableHead className="text-right text-[11px]">신도 결제액</TableHead>
                  <TableHead className="text-right text-[11px]">입금 수수료</TableHead>
                  <TableHead className="text-center text-[11px]">정산 상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settledList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                      {filtered.length === 0 ? '해당 기간 정산 완료 내역이 없습니다.' : '아직 정산 완료된 건이 없습니다.'}
                    </TableCell>
                  </TableRow>
                ) : settledList.map(c => (
                  <TableRow key={c.id} className="hover:bg-blue-50/30">
                    <TableCell className="text-[11px] text-slate-500">{c.createdAt}</TableCell>
                    <TableCell className="font-semibold text-[12.5px]">{c.tenantName}</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">{c.donationId}</TableCell>
                    <TableCell className="text-right text-[12px] font-semibold">{(c.donationAmount ?? 0).toLocaleString()}원</TableCell>
                    <TableCell className="text-right font-bold text-blue-600 text-[12px]">
                      +{(c.commissionAmount ?? 0).toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-blue-600 text-white text-[10px]">✓ 입금완료</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
