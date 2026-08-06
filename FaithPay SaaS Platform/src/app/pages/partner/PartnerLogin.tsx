import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Briefcase, Eye, EyeOff, ArrowRight, ArrowLeft, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { partnerAPI } from '../../api/client';

export default function PartnerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
          localStorage.setItem('faithpay_partner_session', JSON.stringify(found));
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

  const fillDemo = async (idx: number) => {
    try {
      const res = await partnerAPI.getAll();
      if (res.success && Array.isArray(res.data) && res.data[idx]) {
        setEmail(res.data[idx].email || '');
        setPassword('fp1234');
      }
    } catch {}
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
                placeholder="partner@faithpay.kr"
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

          {/* 구분선 */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10.5px] text-slate-600">데모 계정으로 빠른 접속</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* 데모 계정 버튼 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo(0)}
              className="flex flex-col items-center gap-0.5 py-2.5 px-3 rounded-xl border border-slate-700 hover:border-emerald-600/50 hover:bg-emerald-950/30
                text-slate-400 hover:text-emerald-400 transition-all cursor-pointer bg-transparent text-left"
            >
              <span className="text-[11px] font-bold w-full">🏢 대리점 데모</span>
              <span className="text-[10px] text-slate-600 w-full font-mono">agency@faithpay.kr</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo(1)}
              className="flex flex-col items-center gap-0.5 py-2.5 px-3 rounded-xl border border-slate-700 hover:border-amber-600/50 hover:bg-amber-950/30
                text-slate-400 hover:text-amber-400 transition-all cursor-pointer bg-transparent text-left"
            >
              <span className="text-[11px] font-bold w-full">💼 영업자 데모</span>
              <span className="text-[10px] text-slate-600 w-full font-mono">agent@faithpay.kr</span>
            </button>
          </div>
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
          <p className="text-[11px] text-slate-700">
            데모 비밀번호: <span className="font-mono text-slate-500">fp1234</span>
          </p>
        </div>
      </div>
    </div>
  );
}
