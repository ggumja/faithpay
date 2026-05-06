import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useApp, mockTenants } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { LayoutDashboard, Heart, Users, MessageSquare, FileText, Settings, DollarSign, Menu, Search, UserPlus, Download } from 'lucide-react';
import { toast } from 'sonner';

// Mock member data
const members = [
  {
    id: 1,
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'hong@example.com',
    baptismName: '요한',
    registeredDate: '2024-01-15',
    totalDonation: 2400000,
    lastDonation: '2026-03-28',
    recurring: true,
  },
  {
    id: 2,
    name: '김미영',
    phone: '010-2345-6789',
    email: 'kim@example.com',
    baptismName: '마리아',
    registeredDate: '2023-06-20',
    totalDonation: 1800000,
    lastDonation: '2026-03-28',
    recurring: true,
  },
  {
    id: 3,
    name: '박지민',
    phone: '010-3456-7890',
    email: 'park@example.com',
    baptismName: '프란치스코',
    registeredDate: '2025-11-10',
    totalDonation: 500000,
    lastDonation: '2026-03-27',
    recurring: false,
  },
  {
    id: 4,
    name: '이영희',
    phone: '010-4567-8901',
    email: 'lee@example.com',
    baptismName: '안나',
    registeredDate: '2024-08-03',
    totalDonation: 3200000,
    lastDonation: '2026-03-27',
    recurring: true,
  },
  {
    id: 5,
    name: '정수진',
    phone: '010-5678-9012',
    email: 'jung@example.com',
    baptismName: '요셉',
    registeredDate: '2025-02-18',
    totalDonation: 1500000,
    lastDonation: '2026-03-26',
    recurring: true,
  },
];

interface SidebarProps {
  tenantSlug?: string;
  currentPath: string;
}

function Sidebar({ tenantSlug, currentPath }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '대시보드', path: `/admin` },
    { id: 'donations', icon: Heart, label: '봉헌 내역', path: `/admin/donations` },
    { id: 'prayers', icon: MessageSquare, label: '기도문 관리', path: `/admin/prayers` },
    { id: 'menu', icon: FileText, label: '봉헌 메뉴', path: `/admin/menu` },
    { id: 'members', icon: Users, label: '회원 관리', path: `/admin/members` },
    { id: 'settlement', icon: DollarSign, label: '정산', path: `/admin/settlement` },
    { id: 'settings', icon: Settings, label: '설정', path: `/admin/settings` },
  ];

  return (
    <div className="w-64 bg-white border-r min-h-screen p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          FaithPay
        </h2>
        <p className="text-sm text-muted-foreground">관리자 대시보드</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const fullPath = `/${tenantSlug}${item.path}`;
          const isActive = currentPath === fullPath;
          return (
            <Link key={item.id} to={fullPath}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-start"
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function MemberManagement() {
  const { tenantSlug } = useParams();
  const { currentTenant, setCurrentTenant } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, setCurrentTenant]);

  if (!currentTenant) {
    return null;
  }

  const currentPath = `/${tenantSlug}/admin/members`;

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMembers = members.length;
  const recurringMembers = members.filter((m) => m.recurring).length;

  const handleExport = () => {
    toast.success('회원 목록을 엑셀로 다운로드합니다');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <Sidebar tenantSlug={tenantSlug} currentPath={currentPath} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {currentTenant.terminology.member} 관리
                </h1>
                <p className="text-muted-foreground">
                  등록된 {currentTenant.terminology.member} 정보를 조회하고 관리합니다
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 다운로드
                </Button>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  회원 추가
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  전체 {currentTenant.terminology.member}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMembers}명</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">정기 봉헌자</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{recurringMembers}명</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">이번 달 신규</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">8명</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">평균 봉헌액</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    members.reduce((sum, m) => sum + m.totalDonation, 0) / members.length
                  ).toLocaleString()}
                  원
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="이름, 전화번호, 이메일로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>{currentTenant.terminology.member} 목록</CardTitle>
              <CardDescription>
                {filteredMembers.length}명의 {currentTenant.terminology.member}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>성명</TableHead>
                    {currentTenant.religionType === 'catholic' && (
                      <TableHead>세례명</TableHead>
                    )}
                    <TableHead>전화번호</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead className="text-right">누적 봉헌액</TableHead>
                    <TableHead>최근 봉헌</TableHead>
                    <TableHead>정기 봉헌</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      {currentTenant.religionType === 'catholic' && (
                        <TableCell>{member.baptismName}</TableCell>
                      )}
                      <TableCell>{member.phone}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell>{member.registeredDate}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {member.totalDonation.toLocaleString()}원
                      </TableCell>
                      <TableCell>{member.lastDonation}</TableCell>
                      <TableCell>
                        <Badge variant={member.recurring ? 'default' : 'secondary'}>
                          {member.recurring ? '정기' : '단발'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="mt-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">회원 관리 안내</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                • {currentTenant.terminology.member} 정보는 개인정보 보호법에 따라 안전하게
                관리됩니다
              </p>
              <p>• 정기 봉헌은 매월 자동으로 결제되며, 언제든지 해지할 수 있습니다</p>
              <p>• 봉헌 내역은 투명하게 기록되고 관리됩니다</p>
              <p>
                • 가족 단위 관리 기능을 통해 여러 가족 구성원을 한 번에 관리할 수 있습니다
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}