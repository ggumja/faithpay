import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Lock, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const { tenants, setCurrentAdmin, setCurrentTenant } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

    // 시스템 관리자 로그인
    if (cleanEmail === 'admin@faithpay.com' || cleanEmail === 'admin@faithpay.kr' || cleanEmail === 'system@faithpay.kr') {
      const sysAdmin = {
        id: 'system_admin',
        tenantId: 'system',
        email: cleanEmail,
        name: '시스템 관리자',
        role: 'system_admin' as const,
      };
      setCurrentAdmin(sysAdmin);
      toast.success(`환영합니다, ${sysAdmin.name}님!`);
      navigate('/system/admin');
      return;
    }

    // 가맹 단체 관리자 로그인
    const targetTenant = tenants.find(t => t.contact?.email?.toLowerCase() === cleanEmail || t.slug === tenantSlug);
    if (targetTenant) {
      const tenantAdmin = {
        id: `admin-${targetTenant.id}`,
        tenantId: targetTenant.id,
        email: cleanEmail,
        name: `${targetTenant.name} 관리자`,
        role: 'tenant_admin' as const,
      };
      setCurrentAdmin(tenantAdmin);
      setCurrentTenant(targetTenant);
      toast.success(`환영합니다, ${targetTenant.name} 관리자님!`);
      navigate(`/admin/${targetTenant.slug}`);
      return;
    }

    toast.error('등록되지 않은 관리자 이메일입니다.');
  };

  const handleQuickLogin = (adminEmail: string) => {
    setEmail(adminEmail);
    setPassword('fp1234');
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'tenant_admin':
        return '단체 관리자';
      case 'finance_manager':
        return '재정 담당자';
      case 'system_admin':
        return '시스템 관리자';
      default:
        return '회원';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(tenantSlug ? `/${tenantSlug}` : '/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tenantSlug ? '단체 홈으로' : '메인으로'}
        </Button>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FaithPay
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">관리자 로그인</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>관리자 로그인</CardTitle>
            <CardDescription>
              발급받으신 관리자 이메일과 비밀번호를 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  <Lock className="h-4 w-4 inline mr-2" />
                  비밀번호
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full font-bold">
                로그인
              </Button>
            </form>

            {/* ⚡ 테스트용 1-클릭 빠른 입력 패널 */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 block">⚡ 테스트용 1-Click 자동 입력:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setEmail('admin@faithpay.com'); setPassword('admin123'); }}
                  className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 text-xs font-bold border-0 cursor-pointer"
                >
                  🛡️ 시스템 관리자 (admin@faithpay.com)
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail('admin@faithpay.kr'); setPassword('admin123'); }}
                  className="px-2.5 py-1 rounded bg-purple-100 text-purple-800 hover:bg-purple-200 text-xs font-bold border-0 cursor-pointer"
                >
                  🛡️ 최고 관리자 (admin@faithpay.kr)
                </button>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Info Card */}
        <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-none">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">단체 관리자 권한</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 봉헌 내역 조회</li>
                  <li>• 기도문 관리</li>
                  <li>• 봉헌 메뉴 설정</li>
                  <li>• 회원 관리</li>
                  <li>• 정산 리포트</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">재정 담당자 권한</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 봉헌 내역 조회</li>
                  <li>• 정산 리포트</li>
                  <li>• 회원 정보 조회</li>
                  <li>• (제한된 권한)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}