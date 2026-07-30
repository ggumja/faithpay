import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp, mockAdmins, mockTenants } from '../context/AppContext';
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
  const { setCurrentAdmin, setCurrentTenant } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (tenantSlug) {
      const tenant = mockTenants.find((t) => t.slug === tenantSlug);
      if (tenant) {
        setCurrentTenant(tenant);
      }
    }
  }, [tenantSlug, setCurrentTenant]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Mock login - 이메일로 관리자 찾기
    const admin = mockAdmins.find((a) => a.email === email);

    if (!admin) {
      toast.error('등록되지 않은 이메일입니다');
      return;
    }

    // Mock password check (실제로는 서버에서 검증)
    if (password !== 'admin123') {
      toast.error('비밀번호가 올바르지 않습니다');
      return;
    }

    // 관리자 정보 저장
    setCurrentAdmin(admin);

    // 통합관리자는 시스템 관리 페이지로, 단체 관리자는 해당 단체 페이지로
    if (admin.role === 'system_admin') {
      toast.success(`환영합니다, ${admin.name}님!`);
      navigate('/system/admin');
    } else {
      // 해당 테넌트 정보 설정
      const tenant = mockTenants.find((t) => t.id === admin.tenantId);
      if (tenant) {
        setCurrentTenant(tenant);
        toast.success(`환영합니다, ${admin.name}님!`);
        navigate(`/${tenant.slug}/admin`);
      }
    }
  };

  const handleQuickLogin = (adminEmail: string) => {
    // Mock login - 이메일로 관리자 찾기
    const admin = mockAdmins.find((a) => a.email === adminEmail);

    if (!admin) {
      toast.error('등록되지 않은 이메일입니다');
      return;
    }

    // 관리자 정보 저장
    setCurrentAdmin(admin);

    // 통합관리자는 시스템 관리 페이지로, 단체 관리자는 해당 단체 페이지로
    if (admin.role === 'system_admin') {
      toast.success(`환영합니다, ${admin.name}님!`);
      navigate('/system/admin');
    } else {
      // 해당 테넌트 정보 설정
      const tenant = mockTenants.find((t) => t.id === admin.tenantId);
      if (tenant) {
        setCurrentTenant(tenant);
        toast.success(`환영합니다, ${admin.name}님!`);
        navigate(`/${tenant.slug}/admin`);
      }
    }
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

              <Button type="submit" className="w-full">
                로그인
              </Button>
            </form>
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