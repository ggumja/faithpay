import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Church, Building2, Home } from 'lucide-react';
import { useEffect } from 'react';

export default function Root() {
  const navigate = useNavigate();
  const { tenants, fetchTenants } = useApp();

  useEffect(() => {
    // 컴포넌트 마운트 시 단체 목록 가져오기
    fetchTenants();
  }, [fetchTenants]);

  const getReligionIcon = (type: string) => {
    switch (type) {
      case 'protestant':
        return <Church className="h-12 w-12" />;
      case 'buddhist':
        return <Building2 className="h-12 w-12" />;
      case 'catholic':
        return <Home className="h-12 w-12" />;
      default:
        return <Church className="h-12 w-12" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            FaithPay
          </h1>
          <p className="text-xl text-muted-foreground">
            종교 통합 봉헌 플랫폼
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            투명하고 간편한 온라인 봉헌 시스템
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            단체를 선택해주세요
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <Card
                key={tenant.id}
                className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary"
                onClick={() => navigate(`/${tenant.slug}`)}
              >
                <CardHeader className="text-center">
                  <div
                    className="mx-auto mb-4 flex items-center justify-center w-20 h-20 rounded-full"
                    style={{ backgroundColor: `${tenant.primaryColor}20` }}
                  >
                    <div style={{ color: tenant.primaryColor }}>
                      {getReligionIcon(tenant.religionType)}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{tenant.name}</CardTitle>
                  <CardDescription>
                    {tenant.religionType === 'protestant' && '기독교'}
                    {tenant.religionType === 'buddhist' && '불교'}
                    {tenant.religionType === 'catholic' && '천주교'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" style={{ backgroundColor: tenant.primaryColor }}>
                    {tenant.terminology.donation} 하기
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-purple-50 border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">관리자이신가요?</CardTitle>
              <CardDescription>
                관리자 대시보드에서 봉헌 내역, 회원 관리, 정산 등을 확인하실 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                variant="outline"
                className="font-semibold"
                onClick={() => navigate('/admin/login')}
              >
                관리자 로그인
              </Button>
              <Button
                className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 shadow-md hover:shadow-lg transition-all"
                onClick={() => navigate('/onboarding')}
              >
                우리 단체 시작하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}