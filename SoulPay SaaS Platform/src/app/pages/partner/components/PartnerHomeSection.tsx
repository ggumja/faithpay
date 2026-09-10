import { Building2, Plus, Copy, ChevronRight, Briefcase, Info } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Partner, PartnerCommission, settingsAPI } from '../../../api/client';
import { toast } from 'sonner';

interface PartnerHomeSectionProps {
  partner: Partner;
  myTenants: any[];
  commissions: PartnerCommission[];
  setSection: (section: 'home' | 'tenants' | 'commissions' | 'agents' | 'myinfo') => void;
}

export function PartnerHomeSection({
  partner,
  myTenants,
  commissions,
  setSection,
}: PartnerHomeSectionProps) {
  const navigate = useNavigate();
  const isAgency = partner.role === 'master_agency';

  const totalDonation = commissions.reduce((sum, c) => sum + (c.donationAmount ?? 0), 0);
  const totalCommission = commissions.reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);

  // PG·플랫폼 원가 — DB(system_settings) 에서 로드
  const [pgCost, setPgCost] = useState(1.5);
  const [platformMargin, setPlatformMargin] = useState(0.5);
  const [agencyRateForAgent, setAgencyRateForAgent] = useState(0.3);

  useEffect(() => {
    settingsAPI.getAll().then(res => {
      if (!res.success || !res.data) return;
      const { pg_rates, platform_margin } = res.data;
      if (Array.isArray(pg_rates) && pg_rates.length > 0) {
        setPgCost(pg_rates[0].rate ?? 1.5);
      }
      if (platform_margin !== undefined) {
        const pm = parseFloat(String(platform_margin));
        if (!isNaN(pm)) setPlatformMargin(pm);
      }
    }).catch(() => {});

    // 영업자 본인의 대리점 수수료율은 partner.agencyRate에서 직접 읽기
    if (partner.agencyRate !== undefined) {
      setAgencyRateForAgent(partner.agencyRate);
    }
  }, [partner.agencyRate]);

  const agentBaseFloor = +(pgCost + platformMargin + agencyRateForAgent).toFixed(2);

  return (
    <div className="p-6 sm:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      {/* 파트너 환영 카드 (SoulPay 브랜드 블루 그라디언트) */}
      <Card className="border-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-2xl shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
        <CardContent className="p-6 sm:p-7 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-0 text-[11px] font-bold px-2.5 py-0.5 backdrop-blur-xs">
                {isAgency ? '👑 마스터 대리점 파트너' : '💼 영업 파트너'}
              </Badge>
              <span className="text-xs text-blue-100 font-mono font-medium opacity-90">ID: {partner.referralCode}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">{partner.name} 님, 환영합니다</h2>
            <p className="text-xs text-blue-100 leading-relaxed max-w-xl opacity-90">
              {isAgency
                ? '소속 영업자를 관리하고 가맹 단체 개설 및 대리점 오버라이딩 수수료를 실시간으로 확인하세요.'
                : '가맹 단체(교회·사찰·비영리)를 개설하고 계약 수수료 마진 수익을 실시간으로 관리하세요.'}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              className="text-xs bg-white/15 hover:bg-white/25 text-white border-0 rounded-xl h-10 px-4 font-semibold cursor-pointer transition-all"
              onClick={() => {
                const link = `${window.location.origin}/partner/apply?ref=${partner.referralCode}`;
                navigator.clipboard.writeText(link);
                toast.success('파트너 추천 초대 링크가 복사되었습니다!');
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" /> 초대 링크 복사
            </Button>
            <Button
              size="sm"
              className="bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-xl h-10 px-4 shadow-xs cursor-pointer border-0 transition-all active:scale-[0.98]"
              onClick={() => navigate('/partner/tenants/new')}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> 가맹점 신규 개설
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 영업자 전용 베이스 수수료 & 계약 마진 가이드라인 (영업자 파트너 전용) */}
      {!isAgency && (
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    영업 파트너 베이스 수수료 및 가맹점 계약 마진 가이드라인
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    대리점 및 플랫폼에서 보장하는 내 기본 베이스 수수료(하한선)를 기반으로 가맹 단체 계약을 등록하세요.
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs px-2.5 py-1">
                내 베이스 수수료: {agentBaseFloor}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-600 block">1. 내 정산 베이스 수수료 (하한선)</span>
                <p className="text-xl font-black text-slate-900 font-mono">
                  {agentBaseFloor}%
                </p>
                <p className="text-[10px] text-slate-400">대리점 부여 정산 기본율</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-600 block">2. 예시 가맹점 계약 수수료율</span>
                <p className="text-xl font-black text-blue-600 font-mono">
                  3.0%
                </p>
                <p className="text-[10px] text-blue-600/80">* 가맹점 계약 시 하한선 이상 적용</p>
              </div>
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                <span className="text-[11px] font-bold text-blue-900 block">3. 3.0% 계약 시 내 영업 마진</span>
                <p className="text-xl font-black text-blue-700 font-mono">
                  +{(3.0 - agentBaseFloor).toFixed(1)}% 수익
                </p>
                <p className="text-[10px] text-blue-800 font-semibold">(1,000만원 결제 시 +{(10000000 * (3.0 - agentBaseFloor) / 100).toLocaleString()}원)</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-slate-500">
                💡 고객(교회/사찰) 계약 수수료율 설정에 따라 내 영업 마진이 결정됩니다.
              </p>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 rounded-xl h-9"
                onClick={() => navigate('/partner/tenants/new')}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> 가맹점 개설하러 가기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI 카드 4종 (Tenant Admin Dashboard 일치 스타일) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(() => {
          const now = new Date();
          const thisMonthCommissions = commissions.filter(c => {
            try { return new Date(c.createdAt).getMonth() === now.getMonth() && new Date(c.createdAt).getFullYear() === now.getFullYear(); }
            catch { return false; }
          });
          const pendingThisMonth = thisMonthCommissions
            .filter(c => c.settlementStatus !== 'paid')
            .reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);
          return [
            { label: '관리 가맹 단체',        value: `${myTenants.length}개소`,                 color: 'text-slate-900',   sub: '가맹점 총계' },
            { label: '누적 신도 결제액',      value: `${totalDonation.toLocaleString()}원`,      color: 'text-blue-600',  sub: '전체 결제 누적' },
            { label: '수수료 누적 적립 (추정)', value: `${totalCommission.toLocaleString()}원`,    color: 'text-indigo-600', sub: '결제 승인 기반 추정치' },
            { label: '이번 달 정산 예정액 (추정)', value: `${pendingThisMonth.toLocaleString()}원`, color: 'text-amber-600',   sub: `${now.getMonth() + 1}월 승인 기반 추정치` },
          ].map(({ label, value, color, sub }) => (
            <Card key={label} className="p-5 border-slate-200/90 rounded-2xl bg-white shadow-xs hover:border-slate-300 transition-colors space-y-1">
              <div className="text-xs font-bold text-slate-500">{label}</div>
              <div className={`text-2xl font-black tracking-tight ${color}`}>{value}</div>
              <p className="text-[11px] text-slate-400 font-medium">{sub}</p>
            </Card>
          ));
        })()}
      </div>

      {/* ⚠️ PG Split 분할 정산 및 추정치 안내 */}
      <div className="flex items-start gap-2 p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 text-amber-900 text-xs leading-relaxed">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-950">PG Split(분할) 정산 안내: </span>
          <span>
            정산은 SoulPay 플랫폼이 직접 집행하지 않으며, <strong>PG사(나노솔루션 · 토스페이먼츠)의 Split 정산 시스템</strong>이 계약 요율에 따라 가맹 단체 및 영업 파트너 계좌로 직접 분할 지급합니다. 대시보드의 모든 수수료 금액은 결제 승인 원장을 기반으로 집계된 <strong>추정 데이터</strong>이며, 가맹점별 PG 계약 주기(D+1, D+2 등) 및 취소/환불 등에 따라 실제 입금 시점에 차이가 발생할 수 있습니다.
          </span>
        </div>
      </div>
    </div>
  );
}
