import { useNavigate, Link } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  LayoutDashboard,
  Heart,
  Users,
  MessageSquare,
  FileText,
  Settings,
  DollarSign,
  LogOut,
  Image,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminSidebarProps {
  tenantSlug?: string;
  currentPath: string;
}

export function AdminSidebar({ tenantSlug, currentPath }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { currentAdmin, setCurrentAdmin, setCurrentTenant } = useApp();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '대시보드', path: `/admin` },
    { id: 'donations', icon: Heart, label: '봉헌 내역', path: `/admin/donations` },
    { id: 'prayers', icon: MessageSquare, label: '기도문 관리', path: `/admin/prayers` },
    { id: 'menu', icon: FileText, label: '봉헌 메뉴', path: `/admin/menu` },
    { id: 'members', icon: Users, label: '회원 관리', path: `/admin/members` },
    { id: 'settlement', icon: DollarSign, label: '정산', path: `/admin/settlement` },
    { id: 'banners', icon: Image, label: '배너 관리', path: `/admin/banners` },
    { id: 'settings', icon: Settings, label: '설정', path: `/admin/settings` },
  ];

  const handleLogout = () => {
    setCurrentAdmin(null);
    setCurrentTenant(null);
    toast.success('로그아웃되었습니다');
    navigate('/admin/login');
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'tenant_admin':
        return '단체 관리자';
      case 'finance_manager':
        return '재정 담당자';
      default:
        return '관리자';
    }
  };

  return (
    <div className="w-64 bg-white border-r min-h-screen p-6 flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          FaithPay
        </h2>
        <p className="text-sm text-muted-foreground">관리자 대시보드</p>
      </div>

      {currentAdmin && (
        <div className="mb-6 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">로그인</p>
          <p className="font-semibold text-sm">{currentAdmin.name}</p>
          <Badge variant="secondary" className="text-xs mt-1">
            {getRoleName(currentAdmin.role)}
          </Badge>
        </div>
      )}

      <nav className="space-y-2 flex-1">
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

      <Separator className="my-4" />

      <Button
        variant="ghost"
        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-3" />
        로그아웃
      </Button>
    </div>
  );
}