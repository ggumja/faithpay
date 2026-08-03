import { Building2, Plus, Copy, ChevronRight, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Partner, PartnerCommission } from '../../../api/client';
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

  // 수수료 및 거래액 집계
  const totalDonation = commissions.reduce((sum, c) => sum + (c.donationAmount ?? 0), 0);
  const totalCommission = commissions.reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);

  // PG, 플랫폼 원가
  let pgCost = 1.5;
  let platformMargin = 0.5;
  try {
    const pgs = JSON.parse(localStorage.getItem('faithpay:pg_rates') || '[]');
    if (pgs.length > 0) pgCost = pgs[0].rate ?? 1.5;
    const pm = parseFloat(localStorage.getItem('faithpay:platform_margin') || '');
    if (!isNaN(pm)) platformMargin = pm;
  } catch {}

  // 영업자 베이스 수수료 하한선 (PG 1.5% + 플랫폼 0.5% + 대리점 지정 수수료율)
  let agencyRateForAgent = 0.3;
  try {
    const agentRatesMap = JSON.parse(localStorage.getItem('faithpay:agent_rates') || '{}');
    if (agentRatesMap[partner.id] !== undefined) {
      agencyRateForAgent = agentRatesMap[partner.id];
    }
  } catch {}
  const agentBaseFloor = +(pgCost + platformMargin + agencyRateForAgent).toFixed(2);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 파트너 환영 카드 */}
      <Card className="border-slate-800 bg-slate-900 text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <CardContent className="p-6 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className={isAgency ? 'bg-purple-600 text-white' : 'bg-amber-600 text-white'}>
                {isAgency ? '🏢 대리점 파트너' : '💼 영업자 파트너'}
              </Badge>
              <span className="text-xs text-slate-400 font-mono">ID: {partner.referralCode}</span>
            </div>
            <h2 className="text-xl font-bold">{partner.name} 님, 환영합니다</h2>
            <p className="text-xs text-slate-300">
              {isAgency
                ? '소속 영업자를 관리하고 가맹점 개설 및 대리점 오버라이딩 수수료를 실시간으로 확인하세요.'
                : '가맹 사찰 · 교회를 개설하고 계약 수수료 마진 수익을 실시간으로 관리하세요.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              className="text-xs bg-white/10 hover:bg-white/20 text-white border-0"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              onClick={() => navigate('/partner/tenants/new')}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> 가맹점 신규 개설
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 영업자 전용 베이스 수수료 & 계약 마진 가이드라인 (영업자 파트너 전용) */}
      {!isAgency && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 shadow-sm">
          <CardHeader className="pb-3 border-b border-amber-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-2xs">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-[14.5px] font-bold text-amber-950">
                    🎯 영업자 베이스 수수료 및 가맹점 계약 마진 가이드라인
                  </CardTitle>
                  <CardDescription className="text-[11px] text-amber-800 mt-0.5">
                    대리점 및 플랫폼에서 보장하는 내 기본 베이스 수수료(하한선)를 기반으로 가맹점 계약을 등록하세요.
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-amber-600 text-white font-mono text-[11px] px-2.5 py-0.5 shadow-2xs">
                내 베이스 수수료: {agentBaseFloor}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-1">
                <span className="text-[10.5px] font-bold text-amber-800 block">1. 내 정산 베이스 수수료 (하한선)</span>
                <p className="text-[15px] font-bold text-amber-900 font-mono">
                  {agentBaseFloor}%
                </p>
                <p className="text-[10px] text-slate-400">대리점 부여 정산 기본율</p>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-amber-200 space-y-1">
                <span className="text-[10.5px] font-bold text-amber-800 block">2. 예시 가맹점 계약 수수료율</span>
                <p className="text-[15px] font-bold text-slate-700 font-mono">
                  3.0%
                </p>
                <p className="text-[10px] text-amber-700">* 가맹점 계약 시 하한선 이상 적용</p>
              </div>
              <div className="p-3.5 bg-amber-100/60 rounded-xl border border-amber-300 space-y-1">
                <span className="text-[10.5px] font-bold text-amber-900 block">3. 3.0% 계약 시 내 영업 마진</span>
                <p className="text-[15px] font-bold text-emerald-700 font-mono">
                  +{(3.0 - agentBaseFloor).toFixed(1)}% 수익
                </p>
                <p className="text-[10px] text-emerald-800 font-semibold">(1,000만원 결제 시 +{(10000000 * (3.0 - agentBaseFloor) / 100).toLocaleString()}원)</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-500">
                💡 고객(교회/사찰) 계약 수수료율 설정에 따라 내 영업 마진이 결정됩니다.
              </p>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4"
                onClick={() => navigate('/partner/tenants/new')}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> 가맹점 개설하러 가기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI 카드 3종 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '관리 단체', value: `${myTenants.length}개소`, color: 'text-slate-800' },
          { label: '누적 신도 결제액', value: `${totalDonation.toLocaleString()}원`, color: 'text-indigo-600' },
          { label: '수수료 누적 적립', value: `${totalCommission.toLocaleString()}원`, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="p-5">
              <div className={`text-[20px] font-bold ${color}`}>{value}</div>
              <div className="text-[11.5px] text-slate-400 mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
