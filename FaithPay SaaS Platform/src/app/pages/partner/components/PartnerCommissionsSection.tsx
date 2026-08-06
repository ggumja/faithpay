import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { PartnerCommission } from '../../../api/client';

interface PartnerCommissionsSectionProps {
  commissions: PartnerCommission[];
  isAgency?: boolean;
}

export function PartnerCommissionsSection({ commissions, isAgency = false }: PartnerCommissionsSectionProps) {
  const totalDonation = commissions.reduce((sum, c) => sum + (c.donationAmount ?? 0), 0);
  const totalCommission = commissions.reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);

  return (
    <div className="p-6 space-y-5 bg-[var(--hm-paper-2)] dark:bg-zinc-950 min-h-full">
      <div>
        <h1 className="text-[18px] font-bold text-[var(--hm-ink)]">수수료 적립 및 조회</h1>
        <p className="text-[12.5px] text-[var(--hm-ink-3)] mt-0.5">내 가맹점에서 발생한 실시간 수수료 적립 및 정산 원장</p>
      </div>

      {/* 수수료 KPI */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '총 신도 결제액', value: `${totalDonation.toLocaleString()}원`, color: 'text-slate-700' },
          { label: '총 수수료 적립', value: `${totalCommission.toLocaleString()}원`, color: 'text-emerald-600' },
          { label: 'PG 자동 정산 대기', value: `${commissions.filter(c => c.settlementStatus !== 'paid').length}건`, color: 'text-indigo-600' },
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
          <span className="text-[11px] text-blue-600 font-semibold">
            [내 정보] 메뉴에서 사업자 유형을 변경할 수 있습니다
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
              {commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    수수료 발생 기록이 없습니다.
                  </TableCell>
                </TableRow>
              ) : commissions.map(c => {
                const amt = c.donationAmount ?? 0;
                const contractRate = (c as any).contractRate ?? 3.0;
                const spreadRate = Math.max(0, contractRate - floorRate);
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
                      <div className="flex h-4 rounded overflow-hidden w-24 mx-auto">
                        {[
                          { pct: pgCost, bg: 'bg-red-300', title: `PG ${pgCost}%` },
                          { pct: platformMargin, bg: 'bg-amber-300', title: `플 ${platformMargin}%` },
                          { pct: agencyRate, bg: 'bg-purple-300', title: `대 ${agencyRate}%` },
                          { pct: spreadRate, bg: 'bg-emerald-400', title: `스프레드 ${spreadRate.toFixed(1)}%` },
                        ].map(item => (
                          <div
                            key={item.title}
                            title={item.title}
                            className={`${item.bg} h-full`}
                            style={{ width: `${item.pct / contractRate * 100}%` }}
                          />
                        ))}
                      </div>
                      <div className="text-[9px] text-emerald-700 font-bold mt-0.5">+{spreadAmt.toLocaleString()}원</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.settlementStatus === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
                        {c.settlementStatus === 'paid' ? 'PG 입금완료' : '정산대기'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
