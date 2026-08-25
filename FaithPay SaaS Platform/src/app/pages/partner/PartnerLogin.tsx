import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Briefcase, Eye, EyeOff, ArrowRight, ArrowLeft, Lock, User, Search, CheckCircle2, KeyRound } from 'lucide-react';
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
      const res = await partnerAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        const found = res.data.find(a => a.email?.toLowerCase() === email.toLowerCase());
        if (found) {
          // sessionStorage 사용 — 탭 닫힘 시 자동 파기
          sessionStorage.setItem('faithpay_partner_session', JSON.stringify(found));
          toast.success(`${found.name}님, 환영합니다!`);
          if (found.role === 'sales_agent') {
            navigate('/agent/dashboard');
          } else {
            navigate('/partner/dashboard');
          }
          return;
        }
      }
      toast.error('등록된 파트너 계정을 찾을 수 없거나 비밀번호가 올바르지 않습니다.');
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

  // 파트너 비밀번호 재설정
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();

    try {
      const res = await partnerAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        const found = res.data.find(p => p.email?.toLowerCase() === cleanEmail);
        if (found) {
          setResetDone(true);
          toast.success(`📧 ${found.name} 파트너님의 이메일(${cleanEmail})로 비밀번호 재설정 링크가 발송되었습니다.`);
          return;
        }
      }
      toast.error('입력하신 이메일로 등록된 파트너 계정이 존재하지 않습니다.');
    } catch {
      toast.error('비밀번호 재설정 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* 배경 그래디언트 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      {/* 뒤로가기 */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-[12.5px] transition-colors cursor-pointer border-0 bg-transparent"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 홈으로
      </button>

      {/* 카드 */}
      <div className="w-full max-w-sm relative">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 mb-4">
            <Briefcase className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-[22px] font-black text-white tracking-tight">파트너 포털 로그인</h1>
          <p className="text-[12.5px] text-slate-500 mt-1.5">영업 대리점 · 영업자 전용 접속</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">

          {/* 이메일 */}
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide">이메일</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="partner@soulpay.kr"
                autoComplete="email"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-white placeholder:text-slate-600
                  focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-[13px] text-white placeholder:text-slate-600
                  focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer border-0 bg-transparent"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 이메일 찾기 / 비밀번호 찾기 서브 링크 */}
          <div className="flex items-center justify-end gap-2.5 text-[11.5px] text-slate-500 pt-0.5">
            <button
              type="button"
              onClick={() => { setEmailSearchResult(null); setSearchName(''); setSearchPhone(''); setFindEmailOpen(true); }}
              className="hover:text-emerald-400 font-medium transition-colors cursor-pointer border-0 bg-transparent"
            >
              이메일 찾기
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={() => { setResetDone(false); setResetEmail(''); setResetPhone(''); setFindPwOpen(true); }}
              className="hover:text-emerald-400 font-medium transition-colors cursor-pointer border-0 bg-transparent"
            >
              비밀번호 재설정
            </button>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[13.5px] font-bold transition-all
              disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 cursor-pointer border-0 mt-1"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>로그인 <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        {/* 하단 링크 */}
        <div className="mt-5 text-center space-y-2">
          <p className="text-[12px] text-slate-600">
            파트너 등록을 원하신다면?{' '}
            <button
              onClick={() => navigate('/partner/apply')}
              className="text-emerald-500 hover:text-emerald-400 font-semibold transition-colors cursor-pointer border-0 bg-transparent"
            >
              제휴 신청하기 →
            </button>
          </p>
          <p className="text-[11px] text-slate-600">
            초기 비밀번호: <span className="font-mono text-emerald-400 font-bold">admin1234!</span>
          </p>
        </div>
      </div>

      {/* ── [Modal 1] 파트너 이메일 찾기 모달 ── */}
      <Dialog open={findEmailOpen} onOpenChange={setFindEmailOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Search className="h-4 w-4" />
              <span>영업 파트너 계정 조회</span>
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              파트너 이메일 찾기
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              제휴 신청 시 등록하신 파트너 성함/법인명 또는 연락처를 입력해 주세요.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSearchEmail} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">파트너 성함 또는 법인명 *</Label>
              <Input
                placeholder="예: 홍길동 / (주)파트너스"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                required
                className="h-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 rounded-xl font-medium text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">연락처 *</Label>
              <Input
                placeholder="010-1234-5678"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                required
                className="h-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 rounded-xl font-medium text-xs"
              />
            </div>

            <Button type="submit" className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer">
              이메일 조회하기
            </Button>
          </form>

          {/* 조회 결과 표출 */}
          {emailSearchResult && (
            <div className="p-4 bg-slate-800/80 border border-emerald-500/40 rounded-2xl space-y-2 mt-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>[{emailSearchResult.partnerName}] 계정 조회 성공</span>
              </div>
              <p className="text-sm font-bold text-white font-mono">
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
                className="w-full h-9 bg-emerald-600 text-white rounded-lg text-xs font-bold mt-1"
              >
                이 이메일로 로그인하기
              </Button>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setFindEmailOpen(false)} className="w-full rounded-xl text-xs font-bold bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── [Modal 2] 파트너 비밀번호 재설정 모달 ── */}
      <Dialog open={findPwOpen} onOpenChange={setFindPwOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <KeyRound className="h-4 w-4" />
              <span>파트너 보안 인증 및 재설정</span>
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              비밀번호 재설정
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              등록하신 파트너 이메일을 입력하시면 본인 인증 및 재설정 링크가 발송됩니다.
            </DialogDescription>
          </DialogHeader>

          {!resetDone ? (
            <form onSubmit={handleResetPassword} className="space-y-4 my-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">등록된 파트너 이메일 *</Label>
                <Input
                  type="email"
                  placeholder="partner@soulpay.kr"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="h-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 rounded-xl font-medium text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">등록된 연락처 *</Label>
                <Input
                  placeholder="010-1234-5678"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  required
                  className="h-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 rounded-xl font-medium text-xs"
                />
              </div>

              <Button type="submit" className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer">
                비밀번호 재설정 링크 발송
              </Button>
            </form>
          ) : (
            <div className="p-5 bg-slate-800/80 border border-emerald-500/50 rounded-2xl text-center space-y-3 my-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
              <div>
                <h4 className="font-bold text-white text-sm">재설정 링크 발송 완료</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  <span className="font-bold text-emerald-400">{resetEmail}</span>(으)로 비밀번호 재설정 안내가 발송되었습니다. 메일함을 확인해 주세요.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setFindPwOpen(false)}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
              >
                확인
              </Button>
            </div>
          )}

          {!resetDone && (
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setFindPwOpen(false)} className="w-full rounded-xl text-xs font-bold bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                취소
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
