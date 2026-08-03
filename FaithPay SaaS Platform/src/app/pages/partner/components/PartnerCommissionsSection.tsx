import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { PartnerCommission } from '../../../api/client';

interface PartnerCommissionsSectionProps {
  commissions: PartnerCommission[];
}

export function PartnerCommissionsSection({ commissions }: PartnerCommissionsSectionProps) {
  const totalDonation = commissions.reduce((sum, c) => sum + (c.donationAmount ?? 0), 0);
  const totalCommission = commissions.reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);

  // PG, 플랫폼 원가
  let pgCost = 1.5;
  let platformMargin = 0.5;
  let agencyRate = 0.5;
  try {
    const pgs = JSON.parse(localStorage.getItem('faithpay:pg_rates') || '[]');
    if (pgs.length > 0) pgCost = pgs[0].rate ?? 1.5;
    const pm = parseFloat(localStorage.getItem('faithpay:platform_margin') || '');
    if (!isNaN(pm)) platformMargin = pm;
  } catch {}

  const floorRate = +(pgCost + platformMargin + agencyRate).toFixed(2);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-[18px] font-bold text-slate-800">수수료 적립 및 조회</h1>
        <p className="text-[12.5px] text-slate-500 mt-0.5">내 가맹점에서 발생한 실시간 수수료 적립 및 정산 원장</p>
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

      {/* 수수료 구조 시각화 배너 */}
      <div className="flex items-center gap-2 flex-wrap p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
        <span className="font-bold text-slate-700">수수료 구조:</span>
        {[
          { label: `PG 원가 ${pgCost}%`, bg: 'bg-red-100 text-red-700' },
          { label: `플랫폼 마진 ${platformMargin}%`, bg: 'bg-amber-100 text-amber-700' },
          { label: `대리점 ${agencyRate}%`, bg: 'bg-purple-100 text-purple-700' },
          { label: `영업자 스프레드 (계약율 − ${floorRate}%)`, bg: 'bg-emerald-100 text-emerald-700' },
        ].map((item, i) => (
          <span key={i} className={`px-2 py-0.5 rounded-md font-semibold ${item.bg}`}>{item.label}</span>
        ))}
        <span className="ml-auto text-slate-400 font-mono">기본 하한선 {floorRate}%</span>
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
