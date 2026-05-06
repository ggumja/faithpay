import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp, Tenant } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Shield,
  Building2,
  LogOut,
  Plus,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import AddTenantDialog from '../../components/AddTenantDialog';
import TenantStatsPage from './TenantStatsPage';

export default function SystemAdminDashboard() {
  const navigate = useNavigate();
  const { currentAdmin, setCurrentAdmin, tenants, addTenant, fetchTenants } = useApp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('tenants');

  useEffect(() => {
    // 통합관리자 권한 확인
    if (!currentAdmin || currentAdmin.role !== 'system_admin') {
      navigate('/admin/login');
      return;
    }
  }, [currentAdmin, navigate]);

  if (!currentAdmin || currentAdmin.role !== 'system_admin') {
    return <div>Loading...</div>;
  }

  const handleLogout = () => {
    setCurrentAdmin(null);
    toast.success('로그아웃되었습니다');
    navigate('/admin/login');
  };

  const handleTenantSelect = (tenantId: string) => {
    navigate(`/system/admin/tenant/${tenantId}`);
  };

  const handleAddTenant = (tenant: Tenant) => {
    // 단체 추가
    addTenant(tenant);
  };

  const getReligionLabel = (type: string) => {
    switch (type) {
      case 'protestant':
        return '기독교';
      case 'catholic':
        return '천주교';
      case 'buddhist':
        return '불교';
      default:
        return type;
    }
  };

  const tenantsWithPaymentStatus = tenants.map((tenant) => ({
    ...tenant,
    hasPayment: !!tenant.paymentConfig,
    isPaymentActive: tenant.paymentConfig?.isActive || false,
  }));

  const activePaymentsCount = tenantsWithPaymentStatus.filter((t) => t.isPaymentActive).length;
  const totalTenantsCount = tenants.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  FaithPay 통합관리
                </h1>
                <p className="text-sm text-muted-foreground">시스템 관리자</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold">{currentAdmin.name}</p>
                <Badge variant="secondary" className="text-xs">
                  통합관리자
                </Badge>
              </div>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                전체 단체
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{totalTenantsCount}개</div>
              <p className="text-xs text-muted-foreground mt-1">등록된 종교 단체</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                결제 활성화
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{activePaymentsCount}개</div>
              <p className="text-xs text-muted-foreground mt-1">결제 설정 완료</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                미설정 단체
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {totalTenantsCount - activePaymentsCount}개
              </div>
              <p className="text-xs text-muted-foreground mt-1">결제 설정 필요</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Layout with Sidebar */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-3">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveMenu('tenants')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeMenu === 'tenants'
                        ? 'bg-purple-100 text-purple-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Building2 className="h-5 w-5" />
                    <span>단체목록</span>
                  </button>
                  <button
                    onClick={() => setActiveMenu('stats')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeMenu === 'stats'
                        ? 'bg-purple-100 text-purple-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span>통계관리</span>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            {activeMenu === 'tenants' && (
              <>
                {/* Tenant List */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      <CardTitle>단체 목록 및 결제 상태</CardTitle>
                    </div>
                    <CardDescription>각 단체의 결제 설정 상태를 확인하세요</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>단체명</TableHead>
                            <TableHead>종교</TableHead>
                            <TableHead>연락처</TableHead>
                            <TableHead>PG사</TableHead>
                            <TableHead>MID</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead className="text-center">작업</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tenantsWithPaymentStatus.map((tenant) => (
                            <TableRow
                              key={tenant.id}
                              className="cursor-pointer hover:bg-slate-50"
                            >
                              <TableCell className="font-semibold">{tenant.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{getReligionLabel(tenant.religionType)}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{tenant.contact.phone}</TableCell>
                              <TableCell>
                                {tenant.paymentConfig?.pgProvider || (
                                  <span className="text-muted-foreground">미설정</span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {tenant.paymentConfig?.mid || (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {tenant.isPaymentActive ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    활성
                                  </Badge>
                                ) : tenant.hasPayment ? (
                                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    비활성
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    미설정
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTenantSelect(tenant.id);
                                  }}
                                >
                                  <Settings className="h-4 w-4 mr-2" />
                                  설정
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Add Tenant Button */}
                <Button
                  size="lg"
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  단체 추가
                </Button>

                {/* Add Tenant Dialog */}
                <AddTenantDialog
                  isOpen={isAddDialogOpen}
                  onClose={() => setIsAddDialogOpen(false)}
                  onAddTenant={handleAddTenant}
                />
              </>
            )}

            {activeMenu === 'stats' && (
              <TenantStatsPage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}