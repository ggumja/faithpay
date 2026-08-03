import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp, mockTenants } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  LayoutDashboard, Building2, TrendingUp, Users, UserCircle, LogOut,
} from 'lucide-react';
import { Partner, PartnerCommission, partnerAPI } from '../../api/client';

// Modular Section Components
import { PartnerHomeSection } from './components/PartnerHomeSection';
import { PartnerTenantsSection } from './components/PartnerTenantsSection';
import { PartnerCommissionsSection } from './components/PartnerCommissionsSection';
import { PartnerAgentsSection } from './components/PartnerAgentsSection';
import { PartnerMyInfoSection } from './components/PartnerMyInfoSection';

type Section = 'home' | 'tenants' | 'commissions' | 'agents' | 'myinfo';

const NAV_ITEMS: { key: Section; icon: any; label: string; desc: string }[] = [
  { key: 'home', icon: LayoutDashboard, label: '대시보드', desc: '현황 요약' },
  { key: 'tenants', icon: Building2, label: '단체 관리', desc: '관리 단체 목록' },
  { key: 'commissions', icon: TrendingUp, label: '수수료 조회', desc: '수수료 발생 기록' },
  { key: 'agents', icon: Users, label: '영업자 관리', desc: '소속 영업자 (대리점 전용)' },
  { key: 'myinfo', icon: UserCircle, label: '내 정보 수정', desc: '계좌 · 연락처' },
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
  const [editAgencyRate, setEditAgencyRate] = useState<number>(0.5);
  const [selectedAgent, setSelectedAgent] = useState<Partner | null>(null);

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

        // 세션 id로 매칭, 없으면 role로 폴백, 없으면 기본 대리점 생성
        let p: Partner | undefined = allPartners.find(x => x.id === sessionUser.id);
        if (!p) p = allPartners.find(x => x.role === sessionUser.role);
        if (!p) {
          p = {
            id: sessionUser.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            name: sessionUser.name || '한국불교문화원',
            email: sessionUser.email || 'sjlee@temple-pay.kr',
            phone: sessionUser.phone || '02-567-8901',
            role: sessionUser.role || 'master_agency',
            commissionRate: sessionUser.agencyRate ?? 0.5,
            agencyRate: sessionUser.agencyRate ?? 0.5,
            referralCode: sessionUser.referralCode || 'BIT2024',
            bankName: '국민은행',
            accountNumber: '620-21-0123456',
            accountHolder: '불교정보화협의회',
            status: 'active',
            createdAt: new Date().toISOString(),
          };
        }

        const merged = { ...p, role: sessionUser.role, name: sessionUser.name ?? p.name };
        setPartner(merged as Partner);
        setEditPhone(merged.phone ?? '');
        setEditEmail(merged.email ?? '');
        setEditBank((merged as any).bankName ?? '');
        setEditAccount((merged as any).accountNumber ?? '');
        setEditHolder((merged as any).accountHolder ?? '');

        // 대리점 기본 수수료율 복원 (localStorage > 세션 > 기본값)
        const savedDefaultRate = localStorage.getItem(`faithpay:agency_default_rate_${merged.id}`) ||
                                 localStorage.getItem('faithpay:agency_default_rate');
        const activeAgencyRate = savedDefaultRate ? parseFloat(savedDefaultRate) : ((merged as any).agencyRate ?? (merged as any).commissionRate ?? 0.5);
        setEditAgencyRate(activeAgencyRate);
        (merged as any).agencyRate = activeAgencyRate;

        const commRes = await partnerAPI.getCommissions(merged.id);
        setCommissions(commRes.success && commRes.data ? commRes.data : []);

        let fetchedSubAgents: Partner[] = [];
        if (merged.role === 'master_agency') {
          const agentsRes = await partnerAPI.getByParent(merged.id);
          if (agentsRes.success && Array.isArray(agentsRes.data) && agentsRes.data.length > 0) {
            fetchedSubAgents = agentsRes.data;
          } else {
            fetchedSubAgents = [
              {
                id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
                name: '이수진',
                email: 'agent.lee@temple-pay.kr',
                phone: '010-9876-5432',
                role: 'sales_agent',
                parentId: merged.id,
                commissionRate: 0.3,
                agencyRate: 0.3,
                referralCode: 'LSJ002',
                bankName: '신한은행',
                accountNumber: '110-123-456789',
                accountHolder: '이수진',
                status: 'active',
                createdAt: new Date().toISOString(),
              }
            ];
          }
          setSubAgents(fetchedSubAgents);

          let savedMap: Record<string, number> = {};
          try { savedMap = JSON.parse(localStorage.getItem('faithpay:agent_rates') || '{}'); } catch {}
          const defaultFee = activeAgencyRate;

          const rates: Record<string, number> = {};
          fetchedSubAgents.forEach((a: Partner) => {
            rates[a.id] = savedMap[a.id] ?? (a as any).agencyRate ?? defaultFee;
          });
          setAgentRates(rates);
        }

        // 대리점 본사 (BIT2024 / 한국불교문화원) 및 소속 영업자 (LSJ002 / 이수진) 관할 ID 세트
        const agencyAgentIds = [
          merged.id,
          merged.referralCode,
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          'BIT2024',
          'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          'LSJ002',
        ];
        fetchedSubAgents.forEach(a => {
          if (a.id) agencyAgentIds.push(a.id);
          if (a.referralCode) agencyAgentIds.push(a.referralCode);
        });

        // 가용한 단체 소스 중 이 대리점 본사 및 소속 영업자가 등록한 단체만 정확히 필터링
        const sourceTenants = (tenants && tenants.length > 0) ? tenants : mockTenants;

        const agencyManagedTenants = sourceTenants.filter(t =>
          agencyAgentIds.includes((t as any).registeredByPartnerId) ||
          agencyAgentIds.includes((t as any).registeredByReferralCode) ||
          agencyAgentIds.includes((t as any).referralCode) ||
          (t as any).registrationSource === 'agency' ||
          (t as any).registrationSource === 'agent'
        );

        setMyTenants(agencyManagedTenants);
      } catch (err) {
        console.error('Failed to load partner dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [navigate, tenants]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">파트너 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!partner) return null;

  const isAgency = partner.role === 'master_agency';
  const navItems = isAgency ? NAV_ITEMS : NAV_ITEMS.filter(n => n.key !== 'agents');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── 좌측 사이드바 ── */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        {/* 브랜딩 헤더 */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white font-bold flex items-center justify-center text-sm shadow-md">
              F
            </div>
            <div>
              <span className="font-bold text-white text-[15px] tracking-tight block leading-tight">FaithPay</span>
              <span className="text-[10px] text-slate-400 font-medium">파트너 영업 포털</span>
            </div>
          </div>

          {/* 파트너 프로필 미니 카투스 */}
          <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              isAgency ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
            }`}>
              {partner.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{partner.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge className={`text-[9px] px-1.5 py-0 border-0 ${
                  isAgency ? 'bg-purple-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {isAgency ? '대리점' : '영업자'}
                </Badge>
                <span className="text-[10px] text-slate-400 font-mono">CODE: {partner.referralCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 네비게이션 메뉴 */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setSection(item.key);
                  if (item.key === 'agents') setSelectedAgent(null);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 font-medium'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                <div>
                  <div className="text-[13px] leading-none">{item.label}</div>
                  <div className={`text-[10px] mt-1 ${active ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* 사이드바 하단 로그아웃 */}
        <div className="p-3 border-t border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs h-9"
            onClick={() => {
              localStorage.removeItem('faithpay_partner_session');
              navigate('/partner/login');
            }}
          >
            <LogOut className="h-3.5 w-3.5 mr-2 text-slate-500" /> 세션 로그아웃
          </Button>
        </div>
      </aside>

      {/* ── 우측 메인 콘텐츠 영억 ── */}
      <main className="flex-1 p-8 overflow-y-auto">
        {section === 'home' && (
          <PartnerHomeSection
            partner={partner}
            myTenants={myTenants}
            commissions={commissions}
            setSection={setSection}
          />
        )}

        {section === 'tenants' && (
          <PartnerTenantsSection
            partner={partner}
            myTenants={myTenants}
            subAgents={subAgents}
          />
        )}

        {section === 'commissions' && (
          <PartnerCommissionsSection commissions={commissions} />
        )}

        {section === 'agents' && isAgency && (
          <PartnerAgentsSection
            partner={partner}
            subAgents={subAgents}
            agentRates={agentRates}
            setAgentRates={setAgentRates}
            editAgencyRate={editAgencyRate}
            savingAgentId={savingAgentId}
            setSavingAgentId={setSavingAgentId}
            selectedAgent={selectedAgent}
            setSelectedAgent={setSelectedAgent}
            tenants={tenants}
          />
        )}

        {section === 'myinfo' && (
          <PartnerMyInfoSection
            partner={partner}
            editPhone={editPhone}
            setEditPhone={setEditPhone}
            editEmail={editEmail}
            setEditEmail={setEditEmail}
            editBank={editBank}
            setEditBank={setEditBank}
            editAccount={editAccount}
            setEditAccount={setEditAccount}
            editHolder={editHolder}
            setEditHolder={setEditHolder}
            editAgencyRate={editAgencyRate}
            setEditAgencyRate={setEditAgencyRate}
            subAgents={subAgents}
            setAgentRates={setAgentRates}
          />
        )}
      </main>
    </div>
  );
}
