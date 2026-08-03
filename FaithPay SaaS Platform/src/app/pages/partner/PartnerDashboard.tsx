import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  LayoutDashboard, Building2, TrendingUp, Users, UserCircle,
  Plus, Copy, ExternalLink, LogOut, Briefcase, ChevronRight,
  RefreshCw, BadgePercent, Landmark, Phone, Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { Partner, PartnerCommission, partnerAPI } from '../../api/client';


type Section = 'home' | 'tenants' | 'commissions' | 'agents' | 'myinfo';

const NAV_ITEMS: { key: Section; icon: any; label: string; desc: string }[] = [
  { key: 'home',        icon: LayoutDashboard, label: '대시보드',    desc: '현황 요약' },
  { key: 'tenants',     icon: Building2,       label: '단체 관리',   desc: '관리 단체 목록' },
  { key: 'commissions', icon: TrendingUp,      label: '수수료 조회', desc: '수수료 발생 기록' },
  { key: 'agents',      icon: Users,           label: '영업자 관리', desc: '소속 영업자 (대리점 전용)' },
  { key: 'myinfo',      icon: UserCircle,      label: '내 정보 수정',desc: '계좌 · 연락처' },
];

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const { tenants } = useApp();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [myTenants, setMyTenants] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [section, setSection] = useState<Section>('home');

  const [subAgents, setSubAgents] = useState<Partner[]>([]);
  const [agentRates, setAgentRates] = useState<Record<string, number>>({});
  const [savingAgentId, setSavingAgentId] = useState<string | null>(null);

  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBank, setEditBank] = useState('');
  const [editAccount, setEditAccount] = useState('');
  const [editHolder, setEditHolder] = useState('');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        // 로그인 세션 읽기
        const sessionRaw = localStorage.getItem('faithpay_partner_session');
        if (!sessionRaw) {
          navigate('/partner/login');
          return;
        }
        const sessionUser = JSON.parse(sessionRaw);

        // 전체 파트너 목록에서 현재 로그인 계정 읽기
        const res = await partnerAPI.getAll();
        const allPartners = res.success && Array.isArray(res.data) ? res.data : [];

        // 세션 id로 매칭, 없으면 role로 폴백
        let p: Partner | undefined = allPartners.find(x => x.id === sessionUser.id);
        if (!p) p = allPartners.find(x => x.role === sessionUser.role);
        if (!p && allPartners.length > 0) p = allPartners[0];

        if (p) {
          // 세션의 role이 API 데이터보다 우선: 세션에 name/role 저장된 값으로 오버라이드
          const merged = { ...p, role: sessionUser.role, name: sessionUser.name ?? p.name };
          setPartner(merged as Partner);
          setEditPhone(merged.phone ?? '');
          setEditEmail(merged.email ?? '');
          setEditBank((merged as any).bankName ?? '');
          setEditAccount((merged as any).accountNumber ?? '');
          setEditHolder((merged as any).accountHolder ?? '');

          const commRes = await partnerAPI.getCommissions(merged.id);
          setCommissions(commRes.success && commRes.data ? commRes.data : []);
          setMyTenants(tenants.slice(0, 5));

          if (merged.role === 'master_agency') {
            const agentsRes = await partnerAPI.getByParent(merged.id);
            if (agentsRes.success && agentsRes.data) {
              setSubAgents(agentsRes.data);
              const rates: Record<string, number> = {};
              agentsRes.data.forEach((a: Partner) => {
                // 대리점이 해당 영업자에게 지정한 대리점 수수료율 (기본 0.5%)
                const val = (a as any).agencyRate ?? (a as any).agentRate;
                rates[a.id] = (typeof val === 'number' && val > 0 && val < 10) ? val : 0.5;
              });
              setAgentRates(rates);
            }
          }
        } else {
          setPartner(null);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [tenants]);

  const inviteUrl = `${window.location.origin}/onboarding?ref=${partner?.referralCode ?? ''}`;
  const handleCopyLink = () => {
    if (!partner) return;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('초대 링크가 복사되었습니다!');
  };

  const totalMonthlyVolume = myTenants.reduce((acc, t) => acc + (t.monthlyDonation ?? 0), 0);
  const totalMonthlyCommission = myTenants.reduce((acc, t) => acc + (t.commission ?? 0), 0);

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500">영업 파트너 정보를 불러오는 중...</p>
      </div>
    </div>
  );

  if (!partner) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <Briefcase className="h-12 w-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-700">등록된 영업 파트너 정보가 없습니다</h2>
        <p className="text-sm text-slate-400">영업 대리점 또는 영업자로 승인된 파트너 계정이 필요합니다.</p>
        <Button onClick={() => navigate('/partner/apply')} className="bg-emerald-600 hover:bg-emerald-700">파트너 제휴 신청하기</Button>
      </div>
    </div>
  );

  const isAgency = partner.role === 'master_agency';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className={`text-white sticky top-0 z-20 border-b shrink-0 ${
        isAgency ? 'bg-purple-950 border-purple-900' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isAgency ? 'bg-purple-500' : 'bg-emerald-500'
            }`}>
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-[13px] font-bold leading-none">
                {isAgency ? 'FaithPay 대리점 포털' : 'FaithPay 영업자 포털'}
              </div>
              <div className="text-[10px] opacity-60 mt-0.5">
                {isAgency ? 'Tier-1 영업 대리점 관리 시스템' : 'Tier-2 영업자 정산 대시보드'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[12px] font-bold">{partner.name}</p>
              <Badge className={`text-white text-[10px] hover:opacity-100 px-1.5 py-0 ${
                isAgency ? 'bg-purple-500 hover:bg-purple-500' : 'bg-emerald-600 hover:bg-emerald-600'
              }`}>
                {isAgency ? `🏢 Tier-1 대리점 (${(partner as any).agencyRate ?? 0.5}%)` : `💼 Tier-2 영업자 (베이스 ${agentBaseFloor}%)`}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-7 px-2"
              onClick={() => { localStorage.removeItem('faithpay_partner_session'); navigate('/partner/login'); }}>
              <LogOut className="h-3.5 w-3.5 mr-1" /> 로그아웃
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="px-4 py-4 border-b border-slate-100">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              isAgency ? 'bg-purple-100' : 'bg-emerald-100'
            }`}>
              <span className={`font-bold text-sm ${isAgency ? 'text-purple-700' : 'text-emerald-700'}`}>
                {partner.name?.charAt(0) ?? 'P'}
              </span>
            </div>
            <p className="text-[12px] font-bold text-slate-800 truncate">{partner.name}</p>
            <p className={`text-[10px] font-bold mt-0.5 ${ isAgency ? 'text-purple-500' : 'text-emerald-500'}`}>
              {isAgency ? '🏢 영업 대리점' : '💼 영업자'}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">{partner.referralCode}</p>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {NAV_ITEMS.filter(item => item.key !== 'agents' || isAgency).map(({ key, icon: Icon, label, desc }) => {
              const active = section === key;
              const activeColor = isAgency ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700';
              const activeIcon  = isAgency ? 'text-purple-600' : 'text-emerald-600';
              const activeChev  = isAgency ? 'text-purple-400' : 'text-emerald-400';
              const activeText  = isAgency ? 'text-purple-700' : 'text-emerald-700';
              return (
                <button key={key} onClick={() => setSection(key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer border-0 bg-transparent
                    ${active ? activeColor : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? activeIcon : 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12.5px] font-semibold leading-none ${active ? activeText : ''}`}>{label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{desc}</div>
                  </div>
                  {active && <ChevronRight className={`h-3 w-3 shrink-0 ${activeChev}`} />}
                </button>
              );
            })}
          </nav>

          <div className="px-3 py-3 border-t border-slate-100 space-y-1.5">
            <button onClick={() => navigate('/partner/tenants/new')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white text-[12px] font-semibold transition-colors cursor-pointer border-0 ${
                isAgency ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}>
              <Plus className="h-3.5 w-3.5" /> 신규 단체 개설
            </button>
            <button onClick={handleCopyLink}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[12px] font-medium transition-colors cursor-pointer bg-white">
              <Copy className="h-3.5 w-3.5" /> 초대 링크 복사
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* 대시보드 홈 */}
          {section === 'home' && (() => {
            let pgCostHome = 1.5, platformMarginHome = 0.5;
            try {
              const pgs = JSON.parse(localStorage.getItem('faithpay:pg_rates') || '[]');
              if (pgs.length > 0) pgCostHome = pgs[0].rate ?? 1.5;
              const pm = parseFloat(localStorage.getItem('faithpay:platform_margin') || '');
              if (!isNaN(pm)) platformMarginHome = pm;
            } catch {}
            const parentAgencyFee = (partner as any).agencyRate ?? 0.5;
            const agentBaseFloor = +(pgCostHome + platformMarginHome + parentAgencyFee).toFixed(2);

            const cards = isAgency ? [
              { label: '소속 영업자', value: `${subAgents.length}명`, sub: '하위 영업 네트워크', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: '관리 단체 수', value: `${myTenants.length}개소`, sub: '본인 및 소속 영업자 단체', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: '당월 결제 총액', value: `${totalMonthlyVolume.toLocaleString()}원`, sub: '실시간 집계', icon: Landmark, color: 'text-slate-700', bg: 'bg-slate-100' },
              { label: '금월 정산 예정', value: `${totalMonthlyCommission.toLocaleString()}원`, sub: '익월 10일 입금', icon: BadgePercent, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ] : [
              { label: '내 베이스 수수료', value: `${agentBaseFloor}%`, sub: `PG ${pgCostHome}%+플랫폼 ${platformMarginHome}%+대리점 ${parentAgencyFee}%`, icon: BadgePercent, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: '관리 단체 수', value: `${myTenants.length}개소`, sub: '본인 귀속 영업 단체', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: '당월 결제 총액', value: `${totalMonthlyVolume.toLocaleString()}원`, sub: '실시간 집계', icon: Landmark, color: 'text-slate-700', bg: 'bg-slate-100' },
              { label: '금월 정산 예정', value: `${totalMonthlyCommission.toLocaleString()}원`, sub: '익월 10일 입금', icon: BadgePercent, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ];

            return (
              <div className="space-y-6 max-w-5xl">
                <div>
                  <h1 className="text-[18px] font-bold text-slate-800">대시보드</h1>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">
                    {isAgency ? '영업 대리점 실적 및 관리 현황' : '영업자 개별 수수료 및 영업 현황'}
                  </p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {cards.map(({ label, value, sub, icon: Icon, color, bg }) => (
                  <Card key={label} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div className={`text-[18px] font-bold leading-tight ${color}`}>{value}</div>
                      <div className="text-[10.5px] text-slate-400 mt-0.5">{label}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{sub}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {!isAgency && (
                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 overflow-hidden shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-600 text-white text-[11px] hover:bg-emerald-600">영업자 핵심 가이드</Badge>
                          <span className="text-[14px] font-bold text-slate-800">내 베이스 수수료 기반 고객 계약 체결</span>
                        </div>
                        <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed">
                          영업자님의 <strong>내 베이스 수수료(하한선)는 {agentBaseFloor}%</strong>입니다.
                          사찰·교회 고객과 계약 체결 시 베이스 수수료({agentBaseFloor}%) 이상으로 계약 수수료율을 설정하면, 초과되는 차액이 전액 <strong>영업자 수익 마진</strong>으로 적립됩니다.
                        </p>
                      </div>
                      <div className="text-right shrink-0 p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                        <div className="text-[10.5px] text-slate-500 font-bold">내 베이스 수수료</div>
                        <div className="text-[26px] font-bold text-emerald-700 font-mono leading-none mt-1">{agentBaseFloor}%</div>
                        <div className="text-[9.5px] text-emerald-600 mt-1 font-medium">PG+플랫폼+대리점 합산</div>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">베이스 수수료 ({agentBaseFloor}%) 구성:</span>
                        <span className="font-mono text-slate-500">PG {pgCostHome}% + 플랫폼 {platformMarginHome}% + 소속대리점 {parentAgencyFee}% = {agentBaseFloor}%</span>
                      </div>
                      <div className="flex h-6 rounded-lg overflow-hidden text-[10px] font-bold">
                        <div className="bg-red-200 text-red-800 flex items-center justify-center px-2">PG {pgCostHome}%</div>
                        <div className="bg-amber-200 text-amber-800 flex items-center justify-center px-2">플랫폼 {platformMarginHome}%</div>
                        <div className="bg-purple-200 text-purple-800 flex items-center justify-center px-2">대리점 {parentAgencyFee}%</div>
                        <div className="bg-emerald-500 text-white flex items-center justify-center flex-1 font-bold">
                          + 영업자 마진 (계약율 - {agentBaseFloor}%)
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center text-[11.5px]">
                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <div className="text-slate-400 font-medium">고객 {agentBaseFloor}% 계약 시</div>
                        <div className="font-bold text-slate-500 mt-1">마진 0.0% (수익 없음)</div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-100/60 border border-emerald-300">
                        <div className="text-emerald-900 font-bold">고객 {(agentBaseFloor + 0.5).toFixed(1)}% 계약 시 (추천)</div>
                        <div className="font-bold text-emerald-700 text-[13px] mt-1">마진 +0.5% 전액 수익!</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <div className="text-slate-400 font-medium">고객 {(agentBaseFloor + 1.0).toFixed(1)}% 계약 시</div>
                        <div className="font-bold text-emerald-700 text-[13px] mt-1">마진 +1.0% 전액 수익!</div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        onClick={() => navigate('/partner/tenants/new')}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> 내 베이스 수수료로 신규 가맹점 개설하기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[14px] font-bold">최근 관리 단체</CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs text-emerald-600" onClick={() => setSection('tenants')}>
                      전체 보기 <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {myTenants.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">관리 단체가 없습니다. 신규 단체를 개설하세요.</p>
                  ) : (
                    <div className="space-y-2">
                      {myTenants.slice(0, 3).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="text-[12.5px] font-semibold text-slate-800">{t.name}</p>
                              <p className="text-[10.5px] text-slate-400">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('ko-KR') : '—'}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/${t.slug}`)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            );
          })()}

          {/* 단체 관리 */}
          {section === 'tenants' && (
            <div className="space-y-5 max-w-5xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[18px] font-bold text-slate-800">단체 관리</h1>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">본인이 개설·관리하는 종교 단체 목록</p>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => navigate('/partner/tenants/new')}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> 신규 개설
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-[11px]">종교</TableHead>
                        <TableHead className="text-[11px]">단체명</TableHead>
                        <TableHead className="text-[11px]">개설일</TableHead>
                        <TableHead className="text-right text-[11px]">월 수납 총액</TableHead>
                        <TableHead className="text-right text-[11px]">내 월 수수료</TableHead>
                        <TableHead className="text-center text-[11px]">이동</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myTenants.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400 text-sm">관리 중인 단체가 없습니다.</TableCell></TableRow>
                      ) : myTenants.map(t => (
                        <TableRow key={t.id} className="hover:bg-slate-50">
                          <TableCell><Badge variant="outline" className="text-[10px] font-semibold">{t.religion}</Badge></TableCell>
                          <TableCell className="font-semibold text-[12.5px] text-slate-800">{t.name}</TableCell>
                          <TableCell className="text-[11px] text-slate-400">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('ko-KR') : '—'}</TableCell>
                          <TableCell className="text-right text-[12px] font-semibold">{(t.monthlyDonation ?? 0).toLocaleString()}원</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 text-[12px]">+{(t.commission ?? 0).toLocaleString()}원</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/${t.slug}`)}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 수수료 조회 */}
          {section === 'commissions' && (() => {
            let pgCost = 1.5, platformMargin = 0.5;
            try {
              const pgs = JSON.parse(localStorage.getItem('faithpay:pg_rates') || '[]');
              if (pgs.length > 0) pgCost = pgs[0].rate ?? 1.5;
              const pm = parseFloat(localStorage.getItem('faithpay:platform_margin') || '');
              if (!isNaN(pm)) platformMargin = pm;
            } catch { /* ignore */ }
            const agencyRate = isAgency ? ((partner as any).agencyRate ?? (partner as any).commissionRate ?? 0.7) : 0.7;
            const floorRate = +(pgCost + platformMargin + agencyRate).toFixed(2);
            const totalDonation   = commissions.reduce((s, c) => s + (c.donationAmount ?? 0), 0);
            const totalCommission = commissions.reduce((s, c) => s + (c.commissionAmount ?? 0), 0);
            return (
              <div className="space-y-5 max-w-5xl">
                <div>
                  <h1 className="text-[18px] font-bold text-slate-800">수수료 조회</h1>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">신도 결제 발생 시 실시간 수수료 적립 및 스프레드 구조</p>
                </div>
                {/* 요약 카드 */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '총 신도 결제액',    value: `${totalDonation.toLocaleString()}원`,   color: 'text-slate-700' },
                    { label: '총 수수료 적립',     value: `${totalCommission.toLocaleString()}원`, color: 'text-emerald-600' },
                    { label: 'PG 자동 정산 대기',  value: `${commissions.filter(c => c.settlementStatus !== 'paid').length}건`, color: 'text-indigo-600' },
                  ].map(({ label, value, color }) => (
                    <Card key={label} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className={`text-[18px] font-bold ${color}`}>{value}</div>
                        <div className="text-[10.5px] text-slate-400 mt-1">{label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* 구조 배너 */}
                <div className="flex items-center gap-2 flex-wrap p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                  <span className="font-bold text-slate-700">수수료 구조:</span>
                  {[
                    { label: `PG 원가 ${pgCost}%`,          bg: 'bg-red-100 text-red-700' },
                    { label: `플랫폼 마진 ${platformMargin}%`, bg: 'bg-amber-100 text-amber-700' },
                    { label: `대리점 ${agencyRate}%`,         bg: 'bg-purple-100 text-purple-700' },
                    { label: `영업자 스프레드 (계약율 − ${floorRate}%)`, bg: 'bg-emerald-100 text-emerald-700' },
                  ].map((item, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-md font-semibold ${item.bg}`}>{item.label}</span>
                  ))}
                  <span className="ml-auto text-slate-400">하한선 {floorRate}%</span>
                </div>
                <Card>
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
                          <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400 text-sm">수수료 발생 기록이 없습니다.</TableCell></TableRow>
                        ) : commissions.map(c => {
                          const amt = c.donationAmount ?? 0;
                          const contractRate = (c as any).contractRate ?? 3.0;
                          const spreadRate = Math.max(0, contractRate - floorRate);
                          const spreadAmt  = Math.round(amt * spreadRate / 100);
                          return (
                            <TableRow key={c.id} className="hover:bg-slate-50">
                              <TableCell className="text-[11px] text-slate-500">{c.createdAt}</TableCell>
                              <TableCell className="font-semibold text-[12.5px]">{c.tenantName}</TableCell>
                              <TableCell className="font-mono text-[11px] text-slate-500">{c.donationId}</TableCell>
                              <TableCell className="text-right text-[12px] font-semibold">{amt.toLocaleString()}원</TableCell>
                              <TableCell className="text-right font-bold text-emerald-600 text-[12px]">+{(c.commissionAmount ?? 0).toLocaleString()}원</TableCell>
                              <TableCell className="text-center">
                                <div className="flex h-4 rounded overflow-hidden w-24 mx-auto">
                                  {[
                                    { pct: pgCost,         bg: 'bg-red-300',     title: `PG ${pgCost}%` },
                                    { pct: platformMargin, bg: 'bg-amber-300',   title: `플 ${platformMargin}%` },
                                    { pct: agencyRate,     bg: 'bg-purple-300',  title: `대 ${agencyRate}%` },
                                    { pct: spreadRate,     bg: 'bg-emerald-400', title: `스프레드 ${spreadRate.toFixed(1)}%` },
                                  ].map(item => (
                                    <div key={item.title} title={item.title} className={`${item.bg} h-full`}
                                      style={{ width: `${item.pct / contractRate * 100}%` }} />
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
          })()}

          {/* 영업자 관리 (대리점 전용) */}
          {section === 'agents' && isAgency && (
            <div className="space-y-5 max-w-4xl">
              {/* 헤더 */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-[18px] font-bold text-slate-800">영업자 관리</h1>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">소속 영업자 현황 및 수수료율 설정</p>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs shrink-0"
                  onClick={() => {
                    const link = `${window.location.origin}/partner/apply?ref=${partner.referralCode}`;
                    navigator.clipboard.writeText(link);
                    toast.success('영업자 초대 링크가 복사되었습니다!');
                  }}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> 영업자 초대 링크 복사
                </Button>
              </div>

              {/* 요약 KPI + 오버라이딩 마진 집계 */}
              {(() => {
                // 각 영업자별 지정 대리점 수수료율(내 수수료)로 합산
                const agencyOverridingMargin = subAgents.reduce((s, a) => {
                  if (a.status !== 'active') return s;
                  const mockMonthly = ((a as any).monthlyAmount ?? 5000000);
                  const aRate = agentRates[a.id] ?? (a as any).agencyRate ?? 0.5;
                  return s + Math.round(mockMonthly * aRate / 100);
                }, 0);

                return (
                  <>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: '총 소속 영업자', value: `${subAgents.length}명`,
                          color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: '활성 영업자',    value: `${subAgents.filter(a => a.status === 'active').length}명`,
                          color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: '대기/정지',      value: `${subAgents.filter(a => a.status !== 'active').length}명`,
                          color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: '당월 대리점 마진 합계', value: `${agencyOverridingMargin.toLocaleString()}원`,
                          color: 'text-purple-600', bg: 'bg-purple-50' },
                      ].map(({ label, value, color, bg }) => (
                        <Card key={label} className="border-slate-200">
                          <CardContent className="p-4">
                            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                              <Users className={`h-3.5 w-3.5 ${color}`} />
                            </div>
                            <div className={`text-[18px] font-bold leading-none ${color}`}>{value}</div>
                            <div className="text-[10.5px] text-slate-400 mt-1">{label}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* 영업자별 오버라이딩 마진 집계 테이블 */}
                    <Card className="border-purple-100">
                      <CardHeader className="pb-3 bg-purple-50/50 border-b border-purple-100">
                        <div>
                          <CardTitle className="text-[13.5px] font-bold text-purple-900">
                            🏆 영업자별 오버라이딩 마진 집계
                          </CardTitle>
                          <CardDescription className="text-[11px] mt-0.5">
                            소속 영업자의 결제 실적에 영업자별 지정 대리점 수수료율(내 수수료 %)을 적용한 대리점 수익 집계입니다.
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-[11px]">영업자</TableHead>
                              <TableHead className="text-[11px]">추천 코드</TableHead>
                              <TableHead className="text-[11px]">상태</TableHead>
                              <TableHead className="text-right text-[11px]">당월 추정 결제액</TableHead>
                              <TableHead className="text-right text-[11px]">대리점 마진율</TableHead>
                              <TableHead className="text-right text-[11px] text-purple-700">오버라이딩 마진</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subAgents.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                                  소속 영업자가 없습니다.
                                </TableCell>
                              </TableRow>
                            ) : subAgents.map(agent => {
                              const mockMonthly = (agent as any).monthlyAmount ?? 5000000;
                              const agentAgencyRate = agentRates[agent.id] ?? (agent as any).agencyRate ?? 0.5;
                              const overriding  = Math.round(mockMonthly * agentAgencyRate / 100);
                              const isActive    = agent.status === 'active';
                              return (
                                <TableRow key={agent.id} className="hover:bg-purple-50/20">
                                  <TableCell>
                                    <div className="font-semibold text-[12.5px]">{agent.name}</div>
                                    <div className="text-[10px] text-slate-400">{agent.email}</div>
                                  </TableCell>
                                  <TableCell className="font-mono text-[11px] text-indigo-600">{agent.referralCode}</TableCell>
                                  <TableCell>
                                    <Badge className={`text-[10px] hover:opacity-100 ${isActive
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                      : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}`}>
                                      {isActive ? '활성' : '대기/정지'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right text-[12px] font-semibold">
                                    {isActive ? mockMonthly.toLocaleString() + '원' : <span className="text-slate-300">—</span>}
                                  </TableCell>
                                  <TableCell className="text-right text-[12px] font-mono text-purple-600 font-bold">
                                    {agentAgencyRate}%
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isActive ? (
                                      <span className="font-bold text-purple-700 text-[13px]">
                                        +{overriding.toLocaleString()}원
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 text-[12px]">비활성</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        {subAgents.length > 0 && (
                          <div className="flex items-center justify-between px-4 py-3 border-t border-purple-100 bg-purple-50/40">
                            <span className="text-[11.5px] text-purple-700 font-semibold">
                              활성 영업자 {subAgents.filter(a => a.status === 'active').length}명 합산
                            </span>
                            <span className="text-[15px] font-bold text-purple-800">
                              총 +{agencyOverridingMargin.toLocaleString()}원 / 월
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                );
              })()}

              {subAgents.length === 0 ? (
                <Card>
                  <CardContent className="py-14 text-center">
                    <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">소속 영업자가 없습니다</p>
                    <p className="text-[12px] text-slate-400 mt-1">초대 링크를 공유하여 영업자를 등록하세요.</p>
                    <Button size="sm" variant="outline" className="mt-4 text-xs"
                      onClick={() => {
                        const link = `${window.location.origin}/partner/apply?ref=${partner.referralCode}`;
                        navigator.clipboard.writeText(link);
                        toast.success('초대 링크가 복사되었습니다!');
                      }}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" /> 초대 링크 복사
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {subAgents.map(agent => {
                     const rate = agentRates[agent.id] ?? 0.4;     // 절대 수수료율 (%)
                     // 수수료 구조 계산용
                     let pgCost2 = 1.5, platformMargin2 = 0.5;
                     try { const pgs2 = JSON.parse(localStorage.getItem('faithpay:pg_rates') || '[]'); if (pgs2.length > 0) pgCost2 = pgs2[0].rate ?? 1.5; const pm2 = parseFloat(localStorage.getItem('faithpay:platform_margin') || ''); if (!isNaN(pm2)) platformMargin2 = pm2; } catch { /* ignore */ }
                     const myAgencyRate2 = (partner as any).agencyRate ?? (partner as any).commissionRate ?? 0.7;
                     const isValid = true;  // 절대값 입력이므로 항상 유효
                     const isActive = agent.status === 'active';
                    return (
                      <Card key={agent.id} className={`border ${isActive ? 'border-slate-200' : 'border-amber-200 bg-amber-50/30'}`}>
                        <CardContent className="p-5 space-y-4">
                          {/* 영업자 기본 정보 */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                <span className={`font-bold text-sm ${isActive ? 'text-amber-700' : 'text-slate-400'}`}>
                                  {agent.name?.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-800 text-[13px]">{agent.name}</p>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold
                                    ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {isActive ? '활성' : agent.status === 'pending' ? '대기' : '정지'}
                                  </span>
                                </div>
                                <p className="text-[10.5px] text-slate-400 mt-0.5">
                                  <span className="font-mono">{agent.referralCode}</span>
                                  {agent.email && <> · {agent.email}</>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {/* 초대 링크 */}
                              <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/partner/dashboard?agent=${agent.referralCode}`);
                                  toast.success(`${agent.name} 접속 링크가 복사되었습니다.`);
                                }}>
                                <Copy className="h-3 w-3 mr-1" /> 링크
                              </Button>
                              {/* 상태 토글 */}
                              <Button variant="outline" size="sm"
                                className={`h-7 text-[11px] px-2.5 ${isActive
                                  ? 'border-red-200 text-red-500 hover:bg-red-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                                onClick={() => {
                                  toast.success(isActive
                                    ? `${agent.name} 계정을 정지했습니다.`
                                    : `${agent.name} 계정을 활성화했습니다.`);
                                }}>
                                {isActive ? '정지' : '활성화'}
                              </Button>
                            </div>
                          </div>

                          {/* 관리 단체 현황 */}
                          <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50">
                            <div className="text-center">
                              <div className="text-[14px] font-bold text-slate-700">—</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">관리 단체</div>
                            </div>
                            <div className="text-center border-x border-slate-200">
                              <div className="text-[14px] font-bold text-slate-700">—</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">당월 결제액</div>
                            </div>
                             <div className="text-center">
                               <div className="text-[14px] font-bold text-purple-600">{rate}%</div>
                               <div className="text-[10px] text-slate-400 mt-0.5">대리점 수수료율 (내 수수료)</div>
                             </div>
                          </div>

                           {/* 대리점 수수료율 (내 수수료) 입력 */}
                           <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
                             <div className="flex items-center justify-between gap-3">
                               <div>
                                 <p className="text-[12px] font-bold text-purple-950">대리점 수수료율 (내 수수료 %)</p>
                                 <p className="text-[10.5px] text-purple-700 mt-0.5">
                                   이 영업자가 유치하는 가맹점의 결제 발생 시 대리점(나)에 귀속되는 고정 수수료율입니다.
                                 </p>
                               </div>
                               <div className="flex items-center gap-1.5 shrink-0">
                                 <input
                                   type="number"
                                   step="0.1"
                                   min="0"
                                   max="3"
                                   value={rate}
                                   onChange={e => {
                                     const v = parseFloat(e.target.value);
                                     if (!isNaN(v)) setAgentRates(prev => ({ ...prev, [agent.id]: v }));
                                   }}
                                   className="w-20 px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-[13px] font-bold text-right text-purple-800 outline-none focus:border-purple-500 transition-colors"
                                 />
                                 <span className="text-[13px] font-bold text-purple-900">%</span>
                               </div>
                             </div>

                             {/* 수수료 구조 안내 */}
                             <div className="p-2.5 bg-white rounded-lg border border-purple-100 space-y-1.5">
                               <div className="text-[10.5px] font-bold text-slate-700 flex items-center justify-between">
                                 <span>💡 고객 계약 수수료 공식:</span>
                                 <span className="font-mono text-purple-700">계약율 = PG 1.5% + 플랫폼 0.5% + 대리점 {rate}% + 영업자 마진</span>
                               </div>
                               <div className="flex items-center gap-1 flex-wrap text-[10px]">
                                 <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">PG {pgCost2}%</span>
                                 <span className="text-slate-300">+</span>
                                 <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">플랫폼 {platformMargin2}%</span>
                                 <span className="text-slate-300">+</span>
                                 <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">대리점(나) {rate}%</span>
                                 <span className="text-slate-300">+</span>
                                 <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">영업자 마진 (차액)</span>
                                 <span className="text-slate-400 ml-auto font-semibold">하한선 {+(pgCost2 + platformMargin2 + rate).toFixed(2)}%</span>
                               </div>
                             </div>
                           </div>

                          {/* 저장 버튼 */}
                          <div className="flex justify-end">
                            <Button size="sm" disabled={savingAgentId === agent.id}
                              onClick={async () => {
                                setSavingAgentId(agent.id);
                                try {
                                  const res = await partnerAPI.updateAgentRate(agent.id, rate);
                                  if (res.success) toast.success(`${agent.name} 대리점 수수료율 ${rate}%로 저장되었습니다.`);
                                  else toast.error('저장에 실패했습니다.');
                                } catch { toast.error('저장 중 오류가 발생했습니다.'); }
                                finally { setSavingAgentId(null); }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                              {savingAgentId === agent.id
                                ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />저장 중...</>
                                : '수수료율 저장'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 내 정보 수정 */}
          {section === 'myinfo' && (
            <div className="space-y-5 max-w-xl">
              <div>
                <h1 className="text-[18px] font-bold text-slate-800">내 정보 수정</h1>
                <p className="text-[12.5px] text-slate-500 mt-0.5">연락처 및 정산 계좌 정보 수정</p>
              </div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-bold flex items-center gap-1.5">
                    <UserCircle className="h-4 w-4 text-slate-400" /> 기본 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] text-slate-500 mb-1 block">파트너명</Label>
                      <Input value={partner.name} disabled className="text-[12.5px] bg-slate-50" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-500 mb-1 block">추천 코드</Label>
                      <Input value={partner.referralCode} disabled className="text-[12.5px] bg-slate-50 font-mono" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-500 mb-1 block">연락처</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="pl-8 text-[12.5px]" placeholder="010-0000-0000" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-500 mb-1 block">이메일</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="pl-8 text-[12.5px]" placeholder="email@example.com" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-bold flex items-center gap-1.5">
                    <Landmark className="h-4 w-4 text-slate-400" /> 정산 계좌 정보
                  </CardTitle>
                  <CardDescription className="text-[11px]">수수료 정산금이 입금될 계좌를 입력하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-[11px] text-slate-500 mb-1 block">은행</Label>
                    <Input value={editBank} onChange={e => setEditBank(e.target.value)} className="text-[12.5px]" placeholder="신한은행" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] text-slate-500 mb-1 block">계좌번호</Label>
                      <Input value={editAccount} onChange={e => setEditAccount(e.target.value)} className="text-[12.5px] font-mono" placeholder="000-000-000000" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-500 mb-1 block">예금주</Label>
                      <Input value={editHolder} onChange={e => setEditHolder(e.target.value)} className="text-[12.5px]" placeholder="홍길동" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-semibold" onClick={() => toast.success('정보가 저장되었습니다.')}>
                저장하기
              </Button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
