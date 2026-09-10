import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Lock, Mail, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { systemAdminAPI } from '../../api/client';

export default function SystemAdminLogin() {
  const navigate = useNavigate();
  const { setCurrentAdmin } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      toast.error('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // DB에서 시스템 관리자 인증 (이메일 패턴 우회 없음)
      const res = await systemAdminAPI.login(cleanEmail, password);
      if (res.success && res.data) {
        const admin = res.data;
        setCurrentAdmin({
          id: admin.id,
          tenantId: 'system',
          email: admin.email,
          name: admin.name,
          role: 'system_admin',
        });
        toast.success(`환영합니다, ${admin.name}님!`);
        navigate('/system/admin');
        return;
      }
      toast.error(res.error ?? '이메일 또는 비밀번호가 올바르지 않습니다.');
    } catch {
      toast.error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };


  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden font-sans text-slate-900">
      
      {/* Background Subtle Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[30%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[25%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      {/* Top Bar */}
      <header className="p-6 relative z-10">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> SoulPay 메인으로
        </button>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md space-y-6">
          
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
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                SoulPay 시스템 최고 관리자
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                플랫폼 통합 대시보드 및 가맹 단체/정산 수수료 관리를 위한 전용 포털
              </p>
            </div>
          </div>

          <Card className="border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 p-6 bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-blue-600 text-xs font-bold uppercase tracking-wider">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Super Admin Authorization</span>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 mt-1">
                최고 관리자 로그인
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                발급받으신 최고 관리자 계정 정보로 로그인해 주세요.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleLogin}>
              <CardContent className="p-6 space-y-4">
                
                <div className="space-y-1.5">
                  <Label htmlFor="sys-email" className="text-xs font-bold text-slate-700">
                    관리자 이메일
                  </Label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="sys-email"
                      type="email"
                      placeholder="admin@soulpay.kr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sys-pw" className="text-xs font-bold text-slate-700">
                    비밀번호
                  </Label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="sys-pw"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 pr-10 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

              </CardContent>

              <div className="p-6 pt-0">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs cursor-pointer active:scale-[0.99] transition-all"
                >
                  {isLoading ? '인증 중...' : '최고 관리자 로그인'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Cross navigation */}
          <div className="text-center space-y-2 text-xs text-slate-500">
            <p>
              가맹 단체 관리자이신가요?{' '}
              <button
                onClick={() => navigate('/admin/login')}
                className="text-blue-600 hover:underline font-semibold cursor-pointer bg-transparent border-0"
              >
                단체 관리자 로그인 →
              </button>
            </p>
            <p>
              영업 파트너이신가요?{' '}
              <button
                onClick={() => navigate('/partner/login')}
                className="text-blue-600 hover:underline font-semibold cursor-pointer bg-transparent border-0"
              >
                파트너 포털 로그인 →
              </button>
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-400 relative z-10">
        © 2026 SoulPay Platform Inc. System Security Center
      </footer>
    </div>
  );
}
