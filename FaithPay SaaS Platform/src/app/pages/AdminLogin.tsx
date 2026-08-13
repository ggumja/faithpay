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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    // 최고 시스템 관리자 이메일 입력 시 시스템 로그인 페이지 안내
    if (cleanEmail === 'admin@faithpay.com' || cleanEmail === 'admin@faithpay.kr' || cleanEmail === 'system@faithpay.kr') {
      toast.info('💡 최고 시스템 관리자는 /system/login 로그인 전용 페이지를 이용해 주세요.');
      navigate('/system/login');
      return;
    }

    // 1. URL에 특정 단체 slug가 명시된 경우 (예: /gakwonsa/admin/login)
    if (tenantSlug) {
      const urlTenant = tenants.find(t => t.slug === tenantSlug);
      if (urlTenant) {
        const tenantAdmin = {
          id: `admin-${urlTenant.id}`,
          tenantId: urlTenant.id,
          email: cleanEmail,
          name: `${urlTenant.name} 관리자`,
          role: cleanEmail.includes('finance') ? ('finance_manager' as const) : ('tenant_admin' as const),
        };
        setCurrentAdmin(tenantAdmin);
        setCurrentTenant(urlTenant);
        toast.success(`환영합니다, ${urlTenant.name} 관리자님 (${cleanEmail})!`);
        navigate(`/${urlTenant.slug}/admin`);
        return;
      }
    }

    // 2. 전체 단체 관리자 일반 로그인 (/admin/login)
    const targetTenant = tenants.find(t => {
      const primaryEmail = t.contact?.email?.toLowerCase() || '';
      const defaultTenantEmail = `info@${t.slug}.or.kr`.toLowerCase();
      const defaultFaithpayEmail = `${t.slug}@faithpay.or.kr`.toLowerCase();
      const financeEmail = `finance@${t.slug}.or.kr`.toLowerCase();

      return (
        (primaryEmail && cleanEmail === primaryEmail) ||
        cleanEmail === defaultTenantEmail ||
        cleanEmail === defaultFaithpayEmail ||
        cleanEmail === financeEmail ||
        cleanEmail.includes(t.slug.toLowerCase())
      );
    }) || tenants[0]; // 등록 단체 또는 기본 단체 매칭

    if (targetTenant) {
      const tenantAdmin = {
        id: `admin-${targetTenant.id}`,
        tenantId: targetTenant.id,
        email: cleanEmail,
        name: `${targetTenant.name} 관리자`,
        role: cleanEmail.includes('finance') ? ('finance_manager' as const) : ('tenant_admin' as const),
      };
      setCurrentAdmin(tenantAdmin);
      setCurrentTenant(targetTenant);
      toast.success(`환영합니다, ${targetTenant.name} 관리자님 (${cleanEmail})!`);
      navigate(`/${targetTenant.slug}/admin`);
      return;
    }

    toast.error('등록되지 않은 가맹 단체 관리자 이메일입니다.');
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
            {tenantSlug ? '단체 봉헌 메인으로' : 'FaithPay 메인으로'}
          </Button>
          {tenantSlug && (
            <span className="bg-blue-50 text-blue-700 text-xs font-black px-3.5 py-1 rounded-full border border-blue-200 shadow-xs">
              {tenantSlug}
            </span>
          )}
        </div>

        {/* 🤍 중앙 대형 깔끔한 FaithPay 로고 심볼 & 타이틀 헤더 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25 text-white mb-1 transition-transform hover:scale-105">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">FaithPay</span>
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
            <span>🛡️ FaithPay 최고 시스템 관리자이신가요?</span>
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

      {/* ── [Modal 1] 가맹 단체 이메일 찾기 모달 ── */}
      <Dialog open={findEmailOpen} onOpenChange={setFindEmailOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
              <Search className="h-4 w-4" />
              <span>가맹 단체 계정 조회</span>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              담당자 이메일 찾기
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              개설 신청 시 등록하신 단체 명칭 또는 담당자 연락처를 입력해 주세요.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSearchEmail} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">단체 명칭 또는 담당자 성명 *</Label>
              <Input
                placeholder="예: 각원사 / 홍길동"
                value={searchOrgName}
                onChange={(e) => setSearchOrgName(e.target.value)}
                required
                className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">담당자 연락처 *</Label>
              <Input
                placeholder="010-1234-5678"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                required
                className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
              />
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm cursor-pointer">
              이메일 조회하기
            </Button>
          </form>

          {/* 조회 결과 표출 */}
          {emailSearchResult && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2 mt-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>[{emailSearchResult.orgName}] 계정 조회 성공</span>
              </div>
              <p className="text-sm font-bold text-blue-700 font-mono">
                {emailSearchResult.maskedEmail}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEmail(emailSearchResult.fullEmail);
                  setFindEmailOpen(false);
                  toast.success('조회된 이메일이 입력창에 자동 반영되었습니다.');
                }}
                className="w-full h-9 bg-blue-600 text-white rounded-lg text-xs font-bold mt-1"
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

      {/* ── [Modal 2] 가맹 단체 비밀번호 재설정 모달 ── */}
      <Dialog open={findPwOpen} onOpenChange={setFindPwOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
              <KeyRound className="h-4 w-4" />
              <span>보안 인증 및 재설정</span>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              비밀번호 재설정
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