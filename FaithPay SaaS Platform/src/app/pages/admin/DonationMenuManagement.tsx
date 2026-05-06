import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useApp, mockTenants, mockDonationItems, DonationItem } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { LayoutDashboard, Heart, Users, MessageSquare, FileText, Settings, DollarSign, Menu, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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

interface MenuItemFormProps {
  item?: DonationItem | null;
  onSave: (item: Partial<DonationItem>) => void;
  onClose: () => void;
  terminology: string;
}

function MenuItemForm({ item, onSave, onClose, terminology }: MenuItemFormProps) {
  const [formData, setFormData] = useState<Partial<DonationItem>>(
    item || {
      name: '',
      description: '',
      amountType: 'flexible',
      allowRecurring: true,
      allowOneTime: true,
      enablePrayerField: true,
      enabled: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      toast.error('항목명과 설명을 입력해주세요');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">항목명 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="십일조"
            />
          </div>
          <div className="space-y-2">
            <Label>상태</Label>
            <div className="flex items-center space-x-2 h-10">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label>{formData.enabled ? '노출' : '숨김'}</Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명 *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="수입의 1/10을 드리는 정기 헌금입니다."
            rows={3}
          />
        </div>

        <div className="space-y-3">
          <Label>결제 타입</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.allowOneTime}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allowOneTime: checked as boolean })
                }
              />
              <Label>단발 {terminology}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.allowRecurring}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allowRecurring: checked as boolean })
                }
              />
              <Label>정기 {terminology}</Label>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label>금액 설정</Label>
          <RadioGroup
            value={formData.amountType}
            onValueChange={(value) =>
              setFormData({ ...formData, amountType: value as 'fixed' | 'flexible' })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="flexible" id="flexible" />
              <Label htmlFor="flexible">자율 금액 (입력창 제공)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed">고정 금액</Label>
            </div>
          </RadioGroup>
          {formData.amountType === 'fixed' && (
            <Input
              type="number"
              placeholder="금액 입력"
              value={formData.fixedAmount || ''}
              onChange={(e) =>
                setFormData({ ...formData, fixedAmount: Number(e.target.value) })
              }
            />
          )}
        </div>

        <div className="space-y-3">
          <Label>추가 필드 활성화</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.enablePrayerField}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enablePrayerField: checked as boolean })
              }
            />
            <Label>기도제목/발원문 입력 활성화</Label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button type="submit">저장하기</Button>
      </DialogFooter>
    </form>
  );
}

export default function DonationMenuManagement() {
  const { tenantSlug } = useParams();
  const { currentTenant, setCurrentTenant } = useApp();
  const [editingItem, setEditingItem] = useState<DonationItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, setCurrentTenant]);

  if (!currentTenant) {
    return null;
  }

  const currentPath = `/${tenantSlug}/admin/menu`;
  const donationItems = mockDonationItems[currentTenant.religionType] || [];

  const handleSave = (itemData: Partial<DonationItem>) => {
    if (editingItem) {
      toast.success('봉헌 항목이 수정되었습니다');
    } else {
      toast.success('새로운 봉헌 항목이 추가되었습니다');
    }
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (itemId: string) => {
    toast.success('봉헌 항목이 삭제되었습니다');
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: DonationItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
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
                  {currentTenant.terminology.donation} 항목 관리
                </h1>
                <p className="text-muted-foreground">
                  {currentTenant.terminology.member}에게 보이는 {currentTenant.terminology.donation} 메뉴를 관리합니다
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    새 항목 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? '봉헌 항목 수정' : '새 봉헌 항목 추가'}
                    </DialogTitle>
                    <DialogDescription>
                      {currentTenant.terminology.donation} 항목의 정보를 입력해주세요
                    </DialogDescription>
                  </DialogHeader>
                  <MenuItemForm
                    item={editingItem}
                    onSave={handleSave}
                    onClose={() => {
                      setIsDialogOpen(false);
                      setEditingItem(null);
                    }}
                    terminology={currentTenant.terminology.donation}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Menu Items */}
          <div className="grid grid-cols-1 gap-6">
            {donationItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{item.name}</CardTitle>
                        <Badge variant={item.enabled ? 'default' : 'secondary'}>
                          {item.enabled ? '노출' : '숨김'}
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {item.description}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">결제 타입</p>
                      <div className="flex gap-2">
                        {item.allowOneTime && <Badge variant="outline">단발</Badge>}
                        {item.allowRecurring && <Badge variant="outline">정기</Badge>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">금액 설정</p>
                      <Badge variant="outline">
                        {item.amountType === 'fixed'
                          ? `고정: ${item.fixedAmount?.toLocaleString()}원`
                          : '자율 금액'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">기도문 입력</p>
                      <Badge variant="outline">
                        {item.enablePrayerField ? '활성화' : '비활성화'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">상태</p>
                      <Badge variant={item.enabled ? 'default' : 'secondary'}>
                        {item.enabled ? '사용 중' : '사용 안 함'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info */}
          <Card className="mt-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">안내</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• 봉헌 항목은 신도 페이지에서 선택할 수 있는 메뉴입니다</p>
              <p>• '숨김' 상태로 설정하면 신도 페이지에 표시되지 않습니다</p>
              <p>• 정기 봉헌은 매월 자동으로 결제되는 구독 방식입니다</p>
              <p>• 고정 금액과 자율 금액을 선택할 수 있습니다</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}