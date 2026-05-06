import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useApp, mockTenants } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { LayoutDashboard, Heart, Users, MessageSquare, FileText, Settings, DollarSign, Menu, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';

// Mock prayer data
const prayerRequests = [
  {
    id: 1,
    name: '홍길동',
    item: '십일조',
    prayer: '가족의 건강과 평안을 기원합니다. 특히 어머니의 빠른 쾌유를 바랍니다.',
    date: '2026-03-28',
    printed: false,
  },
  {
    id: 2,
    name: '김미영',
    item: '인등보시',
    prayer: '자녀 학업 성취 및 사업 번창을 발원합니다.',
    date: '2026-03-28',
    printed: false,
  },
  {
    id: 3,
    name: '박지민',
    item: '미사예물',
    prayer: '선종하신 조부모님을 기억하며 영면을 기원합니다.',
    date: '2026-03-28',
    printed: false,
  },
  {
    id: 4,
    name: '이영희',
    item: '감사헌금',
    prayer: '주님의 은혜에 감사하며 교회 부흥을 위해 기도합니다.',
    date: '2026-03-27',
    printed: true,
  },
  {
    id: 5,
    name: '정수진',
    item: '건축헌금',
    prayer: '새 예배당 건축이 순조롭게 진행되기를 기도합니다.',
    date: '2026-03-27',
    printed: true,
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

export default function PrayerManagement() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant } = useApp();
  const [selectedPrayers, setSelectedPrayers] = useState<number[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, setCurrentTenant]);

  if (!currentTenant) {
    return null;
  }

  const currentPath = `/${tenantSlug}/admin/prayers`;

  const filteredPrayers = prayerRequests.filter((prayer) => {
    if (filter === 'unprinted') return !prayer.printed;
    if (filter === 'printed') return prayer.printed;
    return true;
  });

  const unprintedCount = prayerRequests.filter((p) => !p.printed).length;

  const togglePrayer = (id: number) => {
    setSelectedPrayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handlePrint = (ids: number[]) => {
    if (ids.length === 0) {
      toast.error('인쇄할 항목을 선택해주세요');
      return;
    }
    toast.success(`${ids.length}개 항목을 인쇄합니다`);
    // 실제로는 인쇄 API 호출
  };

  const handleExport = () => {
    toast.success('엑셀 파일을 다운로드합니다');
    // 실제로는 파일 다운로드 API 호출
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
                  {currentTenant.terminology.prayer} 관리
                </h1>
                <p className="text-muted-foreground">
                  {currentTenant.terminology.member}들의 {currentTenant.terminology.prayer}을 확인하고 인쇄할 수 있습니다
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 다운로드
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">전체 {currentTenant.terminology.prayer}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{prayerRequests.length}건</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">미인쇄</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{unprintedCount}건</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">인쇄 완료</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {prayerRequests.length - unprintedCount}건
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">필터:</label>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="unprinted">미인쇄</SelectItem>
                      <SelectItem value="printed">인쇄 완료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => handlePrint(selectedPrayers)}
                  disabled={selectedPrayers.length === 0}
                  style={
                    selectedPrayers.length > 0
                      ? { backgroundColor: currentTenant.primaryColor }
                      : {}
                  }
                >
                  <Printer className="h-4 w-4 mr-2" />
                  선택 항목 인쇄 ({selectedPrayers.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Prayer List */}
          <Card>
            <CardHeader>
              <CardTitle>{currentTenant.terminology.prayer} 목록</CardTitle>
              <CardDescription>
                {filteredPrayers.length}개 항목
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedPrayers.length === filteredPrayers.length &&
                          filteredPrayers.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPrayers(filteredPrayers.map((p) => p.id));
                          } else {
                            setSelectedPrayers([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>성명</TableHead>
                    <TableHead>봉헌 항목</TableHead>
                    <TableHead>{currentTenant.terminology.prayer}</TableHead>
                    <TableHead>날짜</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrayers.map((prayer) => (
                    <TableRow key={prayer.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPrayers.includes(prayer.id)}
                          onCheckedChange={() => togglePrayer(prayer.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{prayer.name}</TableCell>
                      <TableCell>{prayer.item}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2 text-sm">{prayer.prayer}</p>
                      </TableCell>
                      <TableCell>{prayer.date}</TableCell>
                      <TableCell>
                        <Badge variant={prayer.printed ? 'default' : 'secondary'}>
                          {prayer.printed ? '인쇄 완료' : '미인쇄'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrint([prayer.id])}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Print Example */}
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">인쇄 예시 (50mm × 30mm 라벨)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white border-2 border-dashed border-blue-300 p-4 w-64 rounded">
                <p className="font-bold text-sm">[십일조] 홍길동</p>
                <p className="text-xs mt-1 line-clamp-2">
                  가족의 건강과 평안을 기원합니다
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}