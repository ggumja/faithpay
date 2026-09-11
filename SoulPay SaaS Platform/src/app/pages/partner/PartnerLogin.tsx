import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Lock, User, Search, CheckCircle2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { partnerAPI } from '../../api/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export default function PartnerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 이메일 / 비밀번호 찾기 모달 상태
  const [findEmailOpen, setFindEmailOpen] = useState(false);
  const [findPwOpen, setFindPwOpen] = useState(false);

  // 이메일 찾기 입력값 및 결과
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [emailSearchResult, setEmailSearchResult] = useState<{ maskedEmail: string; fullEmail: string; partnerName: string } | null>(null);

  // 비밀번호 재설정 입력값 및 완료 상태
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setIsLoading(true);

    try {
      const res = await partnerAPI.login(email.trim(), password);
      if (res.success && res.data) {
        const found = res.data;
        // sessionStorage 사용 — 탭 닫힘 시 자동 파기
        sessionStorage.setItem('soulpay_partner_session', JSON.stringify(found));
        sessionStorage.setItem('faithpay_partner_session', JSON.stringify(found));
        localStorage.setItem('soulpay_partner_last_activity', Date.now().toString());
        toast.success(`${found.name}님, 환영합니다!`);
        if (found.role === 'sales_agent') {
          navigate('/agent/dashboard');
        } else {
          navigate('/partner/dashboard');
        }
        return;
      }
      toast.error(res.error ?? '이메일 또는 비밀번호가 올바르지 않습니다.');
    } catch {
      toast.error('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 파트너 이메일 찾기
  const handleSearchEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = searchName.trim();
    const cleanPhone = searchPhone.replace(/[^0-9]/g, '');

    try {
      const res = await partnerAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        const found = res.data.find(p => {
          const matchName = p.name?.includes(cleanName);
          const matchPhone = (p.phone ?? '').replace(/[^0-9]/g, '').includes(cleanPhone);
          return matchName || (cleanPhone && matchPhone);
        });

        if (found && found.email) {
          const fullEmail = found.email;
          const [user, domain] = fullEmail.split('@');
          const maskedUser = user.length <= 3 
            ? user[0] + '*'.repeat(user.length - 1) 
            : user.slice(0, 2) + '*'.repeat(Math.max(1, user.length - 3)) + user.slice(-1);
          
          setEmailSearchResult({
            maskedEmail: `${maskedUser}@${domain}`,
            fullEmail,
            partnerName: found.name,
          });
          toast.success('등록된 파트너 계정 이메일을 찾았습니다!');
          return;
        }
      }
      setEmailSearchResult(null);
      toast.error('입력하신 정보와 일치하는 영업 파트너 계정을 찾을 수 없습니다.');
    } catch {
      toast.error('조회 중 오류가 발생했습니다.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 비밀번호 재설정 이메일 발송 API (partnerAPI.resetPassword) 연동 필요
    // 현재 백엔드 엔드포인트 미구현 — 관리자 문의 안내로 대체
    toast.error('비밀번호 재설정 기능은 현재 준비 중입니다. 고객센터(support@soulpay.kr)로 문의해 주세요.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* 은은한 배경 앰비언트 글로우 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      {/* 뒤로가기 */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer border-0 bg-transparent"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 홈으로
      </button>

      {/* 카드 */}
      <div className="w-full max-w-sm relative z-10 space-y-6">
        {/* 로고 및 헤더 */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <a href="/" className="inline-block">
              <img
                src="/images/logo_soulpay.png"
                alt="SoulPay"
                style={{ height: 38, width: 'auto', objectFit: 'contain' }}
              />
            </a>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">파트너 포털 로그인</h1>
          <p className="text-xs text-slate-500 font-medium">영업 총판 · 대리점 · 에이전트 전용 접속</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">

          {/* 이메일 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">이메일</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="partner@soulpay.kr"
                autoComplete="email"
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400
                  focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all font-medium"
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400
                  focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-0 bg-transparent p-1"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 이메일 찾기 / 비밀번호 찾기 서브 링크 */}
          <div className="flex items-center justify-end gap-2.5 text-xs text-slate-500 pt-0.5">
            <button
              type="button"
              onClick={() => { setEmailSearchResult(null); setSearchName(''); setSearchPhone(''); setFindEmailOpen(true); }}
              className="hover:text-blue-600 font-medium transition-colors cursor-pointer border-0 bg-transparent"
            >
              이메일 찾기
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => { setResetDone(false); setResetEmail(''); setResetPhone(''); setFindPwOpen(true); }}
              className="hover:text-blue-600 font-medium transition-colors cursor-pointer border-0 bg-transparent"
            >
              비밀번호 재설정
            </button>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all
              disabled:opacity-60 disabled:cursor-not-allowed shadow-xs cursor-pointer border-0 mt-1"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>로그인 <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        {/* 하단 링크 */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            파트너 제휴를 원하신다면?{' '}
            <button
              onClick={() => navigate('/partner/apply')}
              className="text-blue-600 hover:text-blue-700 font-semibold transition-colors cursor-pointer border-0 bg-transparent"
            >
              제휴 신청하기 →
            </button>
          </p>
        </div>
      </div>

      {/* ── [Modal 1] 파트너 이메일 찾기 모달 ── */}
      <Dialog open={findEmailOpen} onOpenChange={setFindEmailOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-900 rounded-2xl p-6 shadow-xl">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
              <Search className="h-4 w-4" />
              <span>영업 파트너 계정 조회</span>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              파트너 이메일 찾기
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              제휴 신청 시 등록하신 파트너 성함/법인명 또는 연락처를 입력해 주세요.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSearchEmail} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">파트너 성함 또는 법인명 *</Label>
              <Input
                placeholder="예: 홍길동 / (주)파트너스"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                required
                className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl font-medium text-xs focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">연락처 *</Label>
              <Input
                placeholder="010-1234-5678"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                required
                className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl font-medium text-xs focus:border-blue-600"
              />
            </div>

            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer">
              이메일 조회하기
            </Button>
          </form>

          {/* 조회 결과 표출 */}
          {emailSearchResult && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 mt-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>[{emailSearchResult.partnerName}] 계정 조회 성공</span>
              </div>
              <p className="text-sm font-bold text-slate-900 font-mono">
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
                className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold mt-1"
              >
                이 이메일로 로그인하기
              </Button>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setFindEmailOpen(false)} className="w-full rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50">
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── [Modal 2] 파트너 비밀번호 재설정 모달 ── */}
      <Dialog open={findPwOpen} onOpenChange={setFindPwOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-900 rounded-2xl p-6 shadow-xl">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
              <KeyRound className="h-4 w-4" />
              <span>파트너 보안 인증 및 재설정</span>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              비밀번호 재설정
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              등록하신 파트너 이메일을 입력하시면 본인 인증 및 재설정 링크가 발송됩니다.
            </DialogDescription>
          </DialogHeader>

          {!resetDone ? (
            <form onSubmit={handleResetPassword} className="space-y-4 my-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">등록된 파트너 이메일 *</Label>
                <Input
                  type="email"
                  placeholder="partner@soulpay.kr"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl font-medium text-xs focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">등록된 연락처 *</Label>
                <Input
                  placeholder="010-1234-5678"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  required
                  className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl font-medium text-xs focus:border-blue-600"
                />
              </div>

              <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer">
                비밀번호 재설정 링크 발송
              </Button>
            </form>
          ) : (
            <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-xl text-center space-y-3 my-2">
              <CheckCircle2 className="h-10 w-10 text-blue-600 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">재설정 링크 발송 완료</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  <span className="font-bold text-blue-600">{resetEmail}</span>(으)로 비밀번호 재설정 안내가 발송되었습니다. 메일함을 확인해 주세요.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setFindPwOpen(false)}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                확인
              </Button>
            </div>
          )}

          {!resetDone && (
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setFindPwOpen(false)} className="w-full rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50">
                취소
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
