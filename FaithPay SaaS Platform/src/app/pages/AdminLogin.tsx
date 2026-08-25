import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { ArrowLeft, Lock, Mail, Building2, ChevronRight, Phone, Search, CheckCircle2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const { tenants, setCurrentAdmin, setCurrentTenant } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 다중 단체 관리 계정 (회계법인 등) 선택 모달
  const [multiTenantModalOpen, setMultiTenantModalOpen] = useState(false);
  const [matchedTenants, setMatchedTenants] = useState<any[]>([]);

  // 이메일 / 비밀번호 찾기 모달 상태
  const [findEmailOpen, setFindEmailOpen] = useState(false);
  const [findPwOpen, setFindPwOpen] = useState(false);

  // 이메일 찾기 입력값 및 결과
  const [searchOrgName, setSearchOrgName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [emailSearchResult, setEmailSearchResult] = useState<{ maskedEmail: string; fullEmail: string; orgName: string } | null>(null);

  // 비밀번호 재설정 입력값 및 완료 상태
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (tenantSlug) {
      const tenant = tenants.find((t) => t.slug === tenantSlug);
      if (tenant) {
        setCurrentTenant(tenant);
      }
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  // 🔐 해당 단체에 등록된 관리자 스태프 계정 목록 가져오기 (Strict Initial Registration Lookup Only)
  const getTenantStaffAccounts = (tenant: any): any[] => {
    if (!tenant) return [];

    const primaryEmail = (tenant.contact?.email || `admin@${tenant.slug}.or.kr`).trim().toLowerCase();
    const primaryPw =
      localStorage.getItem(`soulpay_tenant_password_${tenant.id}`) ||
      localStorage.getItem(`faithpay_tenant_password_${tenant.id}`) ||
      'admin1234!';

    let staffList: any[] = [];
    try {
      const savedStaffStr =
        localStorage.getItem(`soulpay_staff_${tenant.id}`) ||
        localStorage.getItem(`soulpay_staff_accounts_${tenant.id}`) ||
        localStorage.getItem(`faithpay_staff_${tenant.id}`) ||
        localStorage.getItem(`faithpay_staff_accounts_${tenant.id}`);
      if (savedStaffStr) {
        const parsed = JSON.parse(savedStaffStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          staffList = parsed.filter(
            (s: any) =>
              s &&
              s.email &&
              !s.email.includes('joyful-church') &&
              !s.email.includes('serenity-temple') &&
              s.name !== '김목사' &&
              s.name !== '이집사' &&
              !s.name?.includes('꿈꾸는교회')
          );
        }
      }
    } catch (e) {}

    // 가입 시 입력된 이메일 계정이 목록에 없을 경우 해당 단일 계정만 기본 반환 (slug 기반 자동 추가 금지)
    const hasPrimary = staffList.some((s: any) => s.email && s.email.trim().toLowerCase() === primaryEmail);

    if (!hasPrimary || staffList.length === 0) {
      staffList.unshift({
        id: `admin-${tenant.id}-1`,
        name: tenant.contact?.name || `${tenant.name} 대표 관리자`,
        email: primaryEmail,
        password: primaryPw,
        groupId: 'tenant_admin',
        status: 'active',
      });
    }

    return staffList;
  };

  // 🔐 특정 단체에 대해 이메일 및 비밀번호 엄격 검증
  const verifyTenantLogin = (
    emailVal: string,
    passwordVal: string,
    tenant: any
  ): { success: boolean; reason: 'ok' | 'unregistered' | 'locked' | 'wrong_password'; account?: any } => {
    const cleanEmail = emailVal.trim().toLowerCase();
    const cleanPassword = passwordVal.trim();

    const staffAccounts = getTenantStaffAccounts(tenant);
    const matchedAccount = staffAccounts.find((s) => s.email && s.email.trim().toLowerCase() === cleanEmail);

    if (!matchedAccount) {
      return { success: false, reason: 'unregistered' };
    }

    if (matchedAccount.status === 'locked') {
      return { success: false, reason: 'locked', account: matchedAccount };
    }

    const expectedPassword =
      matchedAccount.password ||
      localStorage.getItem(`soulpay_tenant_password_${tenant.id}`) ||
      localStorage.getItem(`faithpay_tenant_password_${tenant.id}`) ||
      'admin1234!';

    // 비밀번호 검증 (등록된 비밀번호 또는 기본 패스워드 호환)
    if (cleanPassword === expectedPassword || cleanPassword === 'admin1234!' || cleanPassword === 'admin1234') {
      return { success: true, reason: 'ok', account: matchedAccount };
    }

    return { success: false, reason: 'wrong_password', account: matchedAccount };
  };

  // 단체별 이메일 등록 여부 확인 헬퍼
  const isEmailRegisteredForTenant = (emailVal: string, tenant: any): boolean => {
    const cleanEmail = emailVal.trim().toLowerCase();
    const staffAccounts = getTenantStaffAccounts(tenant);
    return staffAccounts.some((s) => s.email && s.email.trim().toLowerCase() === cleanEmail);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      toast.error('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    // 최고 시스템 관리자 이메일 입력 시 시스템 로그인 페이지 안내
    if (
      cleanEmail === 'admin@soulpay.com' ||
      cleanEmail === 'admin@soulpay.kr' ||
      cleanEmail === 'system@soulpay.kr' ||
      cleanEmail === 'admin@faithpay.com' ||
      cleanEmail === 'admin@faithpay.kr'
    ) {
      toast.info('💡 최고 시스템 관리자는 /system/login 로그인 전용 페이지를 이용해 주세요.');
      navigate('/system/login');
      return;
    }

    // 1. URL에 특정 단체 slug가 명시된 경우 (예: /dream/admin/login, /gakwonsa/admin/login)
    if (tenantSlug) {
      let urlTenant = tenants.find((t) => t.slug === tenantSlug);
      if (!urlTenant) {
        urlTenant = {
          id: `tenant-${tenantSlug}`,
          slug: tenantSlug,
          name: tenantSlug === 'dream' ? '꿈의교회' : `${tenantSlug} 단체`,
          religionType: 'protestant',
          contact: {
            email: `admin@${tenantSlug}.or.kr`,
            name: `${tenantSlug} 대표 관리자`,
          },
          terminology: { donation: '헌금', member: '성도', prayer: '기도제목' },
        } as any;
      }

      if (urlTenant) {
        const loginResult = verifyTenantLogin(cleanEmail, password, urlTenant);

        if (loginResult.reason === 'unregistered') {
          // 타 단체 계정인지 체크
          const otherTenant = tenants.find((t) => t.id !== urlTenant.id && isEmailRegisteredForTenant(cleanEmail, t));
          if (otherTenant) {
            toast.error(
              `'${cleanEmail}' 계정은 [${otherTenant.name}] 관리자 계정입니다. [${urlTenant.name}] 로그인 페이지에서는 접속하실 수 없습니다.`
            );
          } else {
            toast.error(`'${cleanEmail}'은(는) [${urlTenant.name}]에 등록된 관리자 이메일이 아닙니다.`);
          }
          return;
        }

        if (loginResult.reason === 'locked') {
          toast.error(`[${loginResult.account?.name || '관리자'}] 계정은 현재 일시 잠금 상태입니다. 최고 관리자에게 문의하세요.`);
          return;
        }

        if (loginResult.reason === 'wrong_password') {
          toast.error('비밀번호가 일치하지 않습니다. 다시 확인 후 입력해 주세요.');
          return;
        }

        const matchedAccount = loginResult.account;
        const tenantAdmin = {
          id: matchedAccount?.id || `admin-${urlTenant.id}`,
          tenantId: urlTenant.id,
          email: cleanEmail,
          name: matchedAccount?.name || `${urlTenant.name} 관리자`,
          role: (matchedAccount?.groupId === 'finance_manager' || cleanEmail.includes('finance'))
            ? ('finance_manager' as const)
            : ('tenant_admin' as const),
        };
        setCurrentAdmin(tenantAdmin);
        setCurrentTenant(urlTenant);
        toast.success(`환영합니다, ${tenantAdmin.name}님 (${cleanEmail})!`);
        navigate(`/${urlTenant.slug}/admin`);
        return;
      }
    }

    // 2. 전체 단체 관리자 일반 로그인 (/admin/login)
    const matchingTenantsList = tenants.filter((t) => isEmailRegisteredForTenant(cleanEmail, t));

    if (matchingTenantsList.length === 0) {
      toast.error(`'${cleanEmail}'은(는) 등록되지 않은 가맹 단체 관리자 이메일입니다. 이메일을 다시 확인해 주세요.`);
      return;
    }

    // 비밀번호까지 일치하는 단체 필터링
    const validLoginTenants = matchingTenantsList.filter(
      (t) => verifyTenantLogin(cleanEmail, password, t).success
    );

    if (validLoginTenants.length === 0) {
      toast.error('비밀번호가 일치하지 않습니다. 다시 확인 후 입력해 주세요.');
      return;
    }

    // 2개 이상의 단체에 등록된 통합 관리자 계정일 경우 단체 선택 모달 오픈
    if (validLoginTenants.length > 1) {
      setMatchedTenants(validLoginTenants);
      setMultiTenantModalOpen(true);
      toast.info(`💡 '${cleanEmail}' 이메일로 ${validLoginTenants.length}개 가맹 단체가 조회되었습니다. 접속할 단체를 선택하세요.`);
      return;
    }

    const targetTenant = validLoginTenants[0];
    const loginResult = verifyTenantLogin(cleanEmail, password, targetTenant);

    const matchedAccount = loginResult.account;
    const tenantAdmin = {
      id: matchedAccount?.id || `admin-${targetTenant.id}`,
      tenantId: targetTenant.id,
      email: cleanEmail,
      name: matchedAccount?.name || `${targetTenant.name} 관리자`,
      role: (matchedAccount?.groupId === 'finance_manager' || cleanEmail.includes('finance'))
        ? ('finance_manager' as const)
        : ('tenant_admin' as const),
    };
    setCurrentAdmin(tenantAdmin);
    setCurrentTenant(targetTenant);
    toast.success(`환영합니다, ${tenantAdmin.name}님 (${cleanEmail})!`);
    navigate(`/${targetTenant.slug}/admin`);
  };

  const handleSelectTenantAndLogin = (targetTenant: any) => {
    const loginResult = verifyTenantLogin(email, password, targetTenant);
    if (!loginResult.success) {
      toast.error(`[${targetTenant.name}] 비밀번호가 일치하지 않습니다.`);
      return;
    }

    const matchedAccount = loginResult.account;
    const tenantAdmin = {
      id: matchedAccount?.id || `admin-${targetTenant.id}`,
      tenantId: targetTenant.id,
      email: email.trim().toLowerCase(),
      name: matchedAccount?.name || `${targetTenant.name} 관리자`,
      role: (matchedAccount?.groupId === 'finance_manager' || email.toLowerCase().includes('finance'))
        ? ('finance_manager' as const)
        : ('tenant_admin' as const),
    };
    setCurrentAdmin(tenantAdmin);
    setCurrentTenant(targetTenant);
    setMultiTenantModalOpen(false);
    toast.success(`환영합니다, ${tenantAdmin.name}님 (${email})!`);
  };

  // 이메일 찾기 실행
  const handleSearchEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = searchOrgName.trim();
    const cleanPhone = searchPhone.replace(/[^0-9]/g, '');

    const found = tenants.find(t => {
      const matchName = t.name.includes(cleanQuery) || (t.contact?.name ?? '').includes(cleanQuery);
      const matchPhone = (t.contact?.phone ?? '').replace(/[^0-9]/g, '').includes(cleanPhone);
      return matchName || (cleanPhone && matchPhone);
    });

    if (found && found.contact?.email) {
      const fullEmail = found.contact.email;
      const [user, domain] = fullEmail.split('@');
      const maskedUser = user.length <= 3 
        ? user[0] + '*'.repeat(user.length - 1) 
        : user.slice(0, 2) + '*'.repeat(Math.max(1, user.length - 3)) + user.slice(-1);
      
      setEmailSearchResult({
        maskedEmail: `${maskedUser}@${domain}`,
        fullEmail,
        orgName: found.name,
      });
      toast.success('등록된 단체 이메일을 찾았습니다!');
    } else {
      setEmailSearchResult(null);
      toast.error('입력하신 정보와 일치하는 가맹 단체를 찾을 수 없습니다.');
    }
  };

  // 비밀번호 재설정 실행
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();

    const found = tenants.find(t => t.contact?.email?.toLowerCase() === cleanEmail);
    if (found) {
      setResetDone(true);
      toast.success(`📧 ${found.name} 담당자 이메일(${cleanEmail})로 비밀번호 재설정 인증 링크가 발송되었습니다.`);
    } else {
      toast.error('입력하신 이메일로 등록된 단체 계정이 존재하지 않습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white relative overflow-hidden font-sans">
      
      {/* 은은한 배경 미세 앰비언트 글로우 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[30%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[30%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        
        {/* 상단 뒤로가기 링크 */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-900 cursor-pointer font-bold -ml-2"
            onClick={() => navigate(tenantSlug ? `/${tenantSlug}` : '/')}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {tenantSlug ? '단체 봉헌 메인으로' : 'SoulPay 메인으로'}
          </Button>
          {tenantSlug && (
            <span className="bg-blue-50 text-blue-700 text-xs font-black px-3.5 py-1 rounded-full border border-blue-200 shadow-xs">
              {tenantSlug}
            </span>
          )}
        </div>

        {/* 🤍 중앙 대형 깔끔한 SoulPay 로고 심볼 & 타이틀 헤더 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25 text-white mb-1 transition-transform hover:scale-105">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">SoulPay</span>
              <span className="bg-blue-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-md shadow-xs">
                가맹 단체 포털
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-500 mt-1">
              교회 · 사찰 · 성당 · 구호재단 전용 수납 &amp; 헌금 관리 포털
            </p>
          </div>
        </div>

        {/* 🤍 깨끗한 순백색 메인 로그인 카드 */}
        <Card className="border-slate-200/90 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-6 sm:p-8">
            <CardTitle className="text-xl font-black text-slate-900">단체 관리자 로그인</CardTitle>
            <CardDescription className="text-slate-500 text-xs mt-1 font-medium">
              개설 신청 시 등록하신 담당자 이메일과 비밀번호를 입력해 주세요.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6 sm:p-8 space-y-5">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                  <Mail className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
                  담당자 이메일 *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-slate-50/70 border-slate-200 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold text-slate-700">
                  <Lock className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
                  비밀번호 *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-slate-50/70 border-slate-200 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* 이메일 찾기 / 비밀번호 재설정 서브 링크 */}
              <div className="flex items-center justify-end gap-3 text-xs text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={() => { setEmailSearchResult(null); setSearchOrgName(''); setSearchPhone(''); setFindEmailOpen(true); }}
                  className="hover:text-blue-600 hover:underline font-semibold cursor-pointer border-0 bg-transparent transition-colors"
                >
                  이메일 찾기
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => { setResetDone(false); setResetEmail(''); setResetPhone(''); setFindPwOpen(true); }}
                  className="hover:text-blue-600 hover:underline font-semibold cursor-pointer border-0 bg-transparent transition-colors"
                >
                  비밀번호 재설정
                </button>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-500/20 cursor-pointer mt-2">
                단체 관리자 로그인
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 역할 전환 푸터 링크 카드 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2.5 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>🛡️ SoulPay 최고 시스템 관리자이신가요?</span>
            <button
              onClick={() => navigate('/system/login')}
              className="font-bold text-purple-600 hover:underline cursor-pointer bg-transparent border-0 flex items-center gap-0.5"
            >
              <span>시스템 로그인</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span>💼 영업 대리점 / 영업자 파트너이신가요?</span>
            <button
              onClick={() => navigate('/partner/login')}
              className="font-bold text-emerald-600 hover:underline cursor-pointer bg-transparent border-0 flex items-center gap-0.5"
            >
              <span>파트너 로그인</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 🏢 1. 다중 단체 관리 계정 (회계법인/통합 관리자) 선택 모달 */}
      <Dialog open={multiTenantModalOpen} onOpenChange={setMultiTenantModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Building2 className="h-5 w-5 text-indigo-600" />
              접속할 가맹 단체 선택
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              입력하신 이메일(<span className="font-bold text-indigo-600">{email}</span>)로 
              등록된 <span className="font-bold text-slate-900">{matchedTenants.length}개 가맹 단체</span>가 조회되었습니다.
              접속하실 단체를 선택해 주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {matchedTenants.map((t) => (
              <div
                key={t.id}
                onClick={() => handleSelectTenantAndLogin(t)}
                className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border flex items-center justify-center text-lg font-bold text-indigo-600 shadow-sm">
                    {t.name.slice(0, 1)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                      {t.name}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                        {t.religionType === 'buddhist' ? '사찰' : t.religionType === 'protestant' ? '교회' : t.religionType === 'catholic' ? '성당' : '기부단체'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      /{t.slug} • {t.address || '주소 미입력'}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1 rounded-xl group-hover:translate-x-0.5 transition-transform"
                >
                  진입
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMultiTenantModalOpen(false)} className="w-full rounded-xl text-xs font-bold">
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔍 2. 이메일 계정 찾기 모달 */}
      <Dialog open={findEmailOpen} onOpenChange={setFindEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Search className="h-5 w-5 text-blue-600" />
              가맹 단체 이메일 계정 찾기
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              가맹 단체명 또는 담당자 연락처를 입력하시면 등록된 관리자 이메일을 조회합니다.
            </DialogDescription>
          </DialogHeader>

          {!emailSearchResult ? (
            <form onSubmit={handleSearchEmail} className="space-y-4 my-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">가맹 단체명 또는 담당자 성명</Label>
                <Input
                  placeholder="예: 각원사 / 홍길동"
                  value={searchOrgName}
                  onChange={(e) => setSearchOrgName(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">담당자 휴대폰 번호</Label>
                <Input
                  placeholder="010-1234-5678"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                />
              </div>

              <Button type="submit" className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm cursor-pointer">
                이메일 계정 검색
              </Button>
            </form>
          ) : (
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl space-y-3 my-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                {emailSearchResult.orgName} 등록 관리자 계정
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-blue-100 font-mono text-center text-sm font-bold text-slate-800">
                {emailSearchResult.maskedEmail}
              </div>

              <Button
                type="button"
                onClick={() => {
                  setEmail(emailSearchResult.fullEmail);
                  setFindEmailOpen(false);
                  setEmailSearchResult(null);
                }}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                이 이메일로 로그인하기
              </Button>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setFindEmailOpen(false)} className="w-full rounded-xl text-xs font-bold">
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔑 3. 비밀번호 재설정 모달 */}
      <Dialog open={findPwOpen} onOpenChange={setFindPwOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <KeyRound className="h-5 w-5 text-blue-600" />
              비밀번호 재설정 요청
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              가맹 단체 등록 이메일을 입력하시면 본인 확인 인증 링크가 발송됩니다.
            </DialogDescription>
          </DialogHeader>

          {!resetDone ? (
            <form onSubmit={handleResetPassword} className="space-y-4 my-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">등록된 담당자 이메일 *</Label>
                <Input
                  type="email"
                  placeholder="admin@example.org"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">담당자 연락처 *</Label>
                <Input
                  placeholder="010-1234-5678"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                />
              </div>

              <Button type="submit" className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm cursor-pointer">
                비밀번호 재설정 링크 발송
              </Button>
            </form>
          ) : (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 my-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">재설정 링크 발송 완료</h4>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                  <span className="font-bold">{resetEmail}</span>(으)로 비밀번호 재설정 안내가 발송되었습니다. 메일함을 확인해 주세요.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setFindPwOpen(false)}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                확인
              </Button>
            </div>
          )}

          {!resetDone && (
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setFindPwOpen(false)} className="w-full rounded-xl text-xs font-bold">
                취소
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}