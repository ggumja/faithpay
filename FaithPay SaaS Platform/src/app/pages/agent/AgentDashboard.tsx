import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp, mockTenants } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  LayoutDashboard, Building2, TrendingUp, UserCircle, LogOut,
} from 'lucide-react';
import { Partner, PartnerCommission, partnerAPI } from '../../api/client';

// Modular Section Components
import { PartnerHomeSection } from '../partner/components/PartnerHomeSection';
import { PartnerTenantsSection } from '../partner/components/PartnerTenantsSection';
import { PartnerCommissionsSection } from '../partner/components/PartnerCommissionsSection';
import { PartnerMyInfoSection } from '../partner/components/PartnerMyInfoSection';

type Section = 'home' | 'tenants' | 'commissions' | 'myinfo';

const NAV_ITEMS: { key: Section; icon: any; label: string; desc: string }[] = [
  { key: 'home', icon: LayoutDashboard, label: '대시보드', desc: '현황 요약' },
  { key: 'tenants', icon: Building2, label: '단체 관리', desc: '내 관할 단체 목록' },
  { key: 'commissions', icon: TrendingUp, label: '수수료 조회', desc: '수수료 발생 기록' },
  { key: 'myinfo', icon: UserCircle, label: '내 정보 수정', desc: '정산 계좌 · 연락처' },
];

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { tenants } = useApp();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [myTenants, setMyTenants] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [section, setSection] = useState<Section>('home');

  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBank, setEditBank] = useState('');
  const [editAccount, setEditAccount] = useState('');
  const [editHolder, setEditHolder] = useState('');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        // 영업자 전용 세션 및 파트너 객체 생성 (이수진)
        let sessionUser: any = {
          id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          name: '이수진',
          email: 'agent@faithpay.kr',
          role: 'sales_agent',
          referralCode: 'LSJ002',
          agencyRate: 0.3,
        };
        try {
          const sessionRaw = localStorage.getItem('faithpay_partner_session');
          if (sessionRaw) {
            const parsed = JSON.parse(sessionRaw);
            sessionUser = { ...sessionUser, ...parsed };
          }
        } catch {}

        const activePartner: Partner = {
          id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          name: '이수진',
          email: 'agent@faithpay.kr',
          phone: '010-9876-5432',
          role: 'sales_agent',
          parentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          commissionRate: 0.3,
          agencyRate: 0.3,
          referralCode: 'LSJ002',
          bankName: sessionUser.bankName || '신한은행',
          accountNumber: sessionUser.accountNumber || '110-123-456789',
          accountHolder: sessionUser.accountHolder || '이수진',
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        setPartner(activePartner);
        setEditPhone(activePartner.phone ?? '');
        setEditEmail(activePartner.email ?? '');
        setEditBank((activePartner as any).bankName ?? '');
        setEditAccount((activePartner as any).accountNumber ?? '');
        setEditHolder((activePartner as any).accountHolder ?? '');

        // 이수진 영업자 전용 유치 단체 동기 필터링 (봉원사, 명성교회, 명동대성당 3개소)
        const sourceTenants = (tenants && tenants.length > 0) ? tenants : mockTenants;
        const agentKeys = ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'partner-004', 'LSJ002', 'agent-001', 'AGENT-001'];

        const agentTenants = sourceTenants.filter(t => {
          const pId = (t as any).registeredByPartnerId;
          const pRef = (t as any).registeredByReferralCode || (t as any).referralCode;
          const pName = (t as any).registeredByPartnerName;
          return agentKeys.includes(pId) || agentKeys.includes(pRef) || pName === '이수진';
        });

        setMyTenants(agentTenants);

        // 안전한 백그라운드 API 동기화 (이수진 파트너 명시적 매칭)
        try {
          const res = await partnerAPI.getAll();
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const found = res.data.find(x =>
              x.id === activePartner.id ||
              x.referralCode === activePartner.referralCode ||
              x.email === 'agent@faithpay.kr' ||
              x.name === '이수진'
            );
            if (found) {
              setPartner({ ...found, name: '이수진', referralCode: 'LSJ002', role: 'sales_agent' });
            }
          }
        } catch {}

        try {
          const commRes = await partnerAPI.getCommissions(activePartner.id);
          if (commRes.success && commRes.data) setCommissions(commRes.data);
        } catch {}
      } catch (err) {
        console.error('Failed to load agent dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [tenants]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">영업자 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!partner) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── 좌측 사이드바 ── */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        {/* 브랜딩 헤더 */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-md">
              F
            </div>
            <div>
              <span className="font-bold text-white text-[15px] tracking-tight block leading-tight">FaithPay</span>
              <span className="text-[10px] text-amber-400 font-semibold">영업자 전용 포털</span>
            </div>
          </div>

          {/* 영업자 프로필 카드 */}
          <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold text-xs flex items-center justify-center shrink-0">
              {partner.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{partner.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0 border-0">
                  영업자
                </Badge>
                <span className="text-[10px] text-slate-400 font-mono">CODE: {partner.referralCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = section === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer border-0 ${
                  isActive
                    ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <div>
                  <div className="text-[13px] leading-snug">{item.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-amber-100' : 'text-slate-500'}`}>{item.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* 하단 세션 로그아웃 */}
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

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 p-8 overflow-y-auto">
        {section === 'home' && (
          <PartnerHomeSection
            partner={partner}
            myTenants={myTenants}
            commissions={commissions}
            setSection={(s) => setSection(s === 'agents' ? 'home' : s)}
          />
        )}

        {section === 'tenants' && (
          <PartnerTenantsSection
            partner={partner}
            myTenants={myTenants}
            subAgents={[]}
          />
        )}

        {section === 'commissions' && (
          <PartnerCommissionsSection commissions={commissions} isAgency={false} />
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
            editAgencyRate={0}
            setEditAgencyRate={() => {}}
            subAgents={[]}
            setAgentRates={() => {}}
          />
        )}
      </main>
    </div>
  );
}
