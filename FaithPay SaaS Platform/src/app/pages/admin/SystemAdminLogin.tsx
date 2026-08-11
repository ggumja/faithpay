import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ShieldCheck, Lock, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function SystemAdminLogin() {
  const navigate = useNavigate();
  const { setCurrentAdmin } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      toast.error('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      // 최고 시스템 관리자 이메일 검증
      if (
        cleanEmail === 'admin@faithpay.com' ||
        cleanEmail === 'admin@faithpay.kr' ||
        cleanEmail === 'system@faithpay.kr' ||
        cleanEmail.startsWith('admin') ||
        cleanEmail.startsWith('system')
      ) {
        const sysAdmin = {
          id: 'system_admin',
          tenantId: 'system',
          email: cleanEmail,
          name: '시스템 최고 관리자',
          role: 'system_admin' as const,
        };
        setCurrentAdmin(sysAdmin);
        toast.success(`환영합니다, FaithPay 최고 관리자님!`);
        navigate('/system/admin');
        return;
      }

      toast.error('등록된 최고 시스템 관리자 계정이 아닙니다.');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-purple-500 selection:text-white relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      {/* Top Bar */}
      <header className="p-6 relative z-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> FaithPay 메인으로
        </button>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-xl shadow-purple-600/20 mb-2">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              FaithPay 시스템 최고 관리자
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              플랫폼 통합 대시보드 및 가맹 단체/정산 수수료 관리를 위한 전용 포털
            </p>
          </div>

          <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-2xl backdrop-blur-md rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 p-6 bg-slate-900">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <KeyRound className="h-4 w-4" />
                <span>Super Admin Authorization</span>
              </div>
              <CardTitle className="text-lg font-bold text-white mt-1">
                최고 관리자 로그인
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                발급받으신 최고 관리자 계정 정보로 로그인해 주세요.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleLogin}>
              <CardContent className="p-6 space-y-5">
                
                <div className="space-y-1.5">
                  <Label htmlFor="sys-email" className="text-xs font-bold text-slate-300">
                    관리자 이메일
                  </Label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      id="sys-email"
                      type="email"
                      placeholder="admin@faithpay.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sys-pw" className="text-xs font-bold text-slate-300">
                    비밀번호
                  </Label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      id="sys-pw"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 h-12 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 rounded-xl font-medium"
                    />
                  </div>
                </div>

              </CardContent>

              <div className="p-6 pt-0">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  최고 관리자 로그인
                </Button>
              </div>
            </form>
          </Card>

          {/* Cross navigation */}
          <div className="mt-6 text-center space-y-2 text-xs text-slate-400">
            <p>
              가맹 단체 관리자이신가요?{' '}
              <button
                onClick={() => navigate('/admin/login')}
                className="text-purple-400 hover:underline font-bold cursor-pointer bg-transparent border-0"
              >
                단체 관리자 로그인 →
              </button>
            </p>
            <p>
              영업 파트너이신가요?{' '}
              <button
                onClick={() => navigate('/partner/login')}
                className="text-emerald-400 hover:underline font-bold cursor-pointer bg-transparent border-0"
              >
                파트너 포털 로그인 →
              </button>
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-500 relative z-10">
        © 2026 FaithPay Platform Inc. System Security Center
      </footer>
    </div>
  );
}
