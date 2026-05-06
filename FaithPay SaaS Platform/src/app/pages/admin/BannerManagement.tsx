import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp, mockTenants } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Menu,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface BannerItem {
  id: string;
  url: string;
  order: number;
}

export default function BannerManagement() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { currentTenant, setCurrentTenant, currentAdmin, updateTenantBanners } = useApp();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
      // 배너 이미지를 BannerItem으로 변환
      const bannerItems: BannerItem[] = tenant.bannerImages.map((url, index) => ({
        id: `banner-${index}`,
        url,
        order: index,
      }));
      setBanners(bannerItems);
    }
  }, [tenantSlug, setCurrentTenant]);

  if (!currentTenant) {
    return <div>Loading...</div>;
  }

  if (!currentAdmin || currentAdmin.role !== 'tenant_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>이 페이지는 단체 관리자만 접근할 수 있습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentPath = location.pathname;

  const handleAddBanner = () => {
    if (!newBannerUrl.trim()) {
      toast.error('배너 이미지 URL을 입력해주세요');
      return;
    }

    // URL 유효성 검사
    try {
      new URL(newBannerUrl);
    } catch {
      toast.error('올바른 URL 형식이 아닙니다');
      return;
    }

    const newBanner: BannerItem = {
      id: `banner-${Date.now()}`,
      url: newBannerUrl,
      order: banners.length,
    };

    const updatedBanners = [...banners, newBanner];
    setBanners(updatedBanners);
    setNewBannerUrl('');
    toast.success('배너가 추가되었습니다');

    // Context 업데이트
    if (currentTenant) {
      const bannerUrls = updatedBanners.map(b => b.url);
      updateTenantBanners(currentTenant.id, bannerUrls);
      setCurrentTenant({ ...currentTenant, bannerImages: bannerUrls });
    }
  };

  const handleDeleteBanner = (id: string) => {
    setBannerToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!bannerToDelete) return;

    const updatedBanners = banners
      .filter((b) => b.id !== bannerToDelete)
      .map((b, index) => ({ ...b, order: index }));

    setBanners(updatedBanners);
    setDeleteDialogOpen(false);
    setBannerToDelete(null);
    toast.success('배너가 삭제되었습니다');

    // Context 업데이트
    if (currentTenant) {
      const bannerUrls = updatedBanners.map(b => b.url);
      updateTenantBanners(currentTenant.id, bannerUrls);
      setCurrentTenant({ ...currentTenant, bannerImages: bannerUrls });
    }
  };

  const moveBanner = (dragIndex: number, hoverIndex: number) => {
    const updatedBanners = [...banners];
    const [draggedBanner] = updatedBanners.splice(dragIndex, 1);
    updatedBanners.splice(hoverIndex, 0, draggedBanner);

    // 순서 재정렬
    const reorderedBanners = updatedBanners.map((b, index) => ({
      ...b,
      order: index,
    }));

    setBanners(reorderedBanners);

    // Context 업데이트
    if (currentTenant) {
      const bannerUrls = reorderedBanners.map(b => b.url);
      updateTenantBanners(currentTenant.id, bannerUrls);
      setCurrentTenant({ ...currentTenant, bannerImages: bannerUrls });
    }
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewDialogOpen(true);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex min-h-screen bg-slate-50">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Mobile Header */}
          <div className="lg:hidden bg-white border-b p-4 flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold">배너 관리</h1>
          </div>

          {/* Content */}
          <div className="p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <ImageIcon className="h-8 w-8" style={{ color: currentTenant.primaryColor }} />
                  <h1 className="text-3xl font-bold">배너 관리</h1>
                </div>
                <p className="text-muted-foreground">
                  메인페이지에 표시될 배너 이미지를 관리하세요
                </p>
              </div>

              {/* Add Banner Section */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>새 배너 추가</CardTitle>
                  <CardDescription>
                    배너 이미지 URL을 입력하여 추가하세요 (권장 크기: 1200x500px)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label htmlFor="banner-url" className="sr-only">
                        배너 이미지 URL
                      </Label>
                      <Input
                        id="banner-url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={newBannerUrl}
                        onChange={(e) => setNewBannerUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddBanner();
                          }
                        }}
                      />
                    </div>
                    <Button
                      onClick={handleAddBanner}
                      style={{ backgroundColor: currentTenant.primaryColor }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      추가
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Banner List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>배너 목록</CardTitle>
                      <CardDescription>
                        드래그하여 순서를 변경할 수 있습니다
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">총 {banners.length}개</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {banners.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>등록된 배너가 없습니다</p>
                      <p className="text-sm">위에서 새 배너를 추가해주세요</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {banners.map((banner, index) => (
                        <DraggableBannerItem
                          key={banner.id}
                          banner={banner}
                          index={index}
                          moveBanner={moveBanner}
                          onDelete={handleDeleteBanner}
                          onPreview={handlePreview}
                          primaryColor={currentTenant.primaryColor}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="mt-6 bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">💡 배너 이미지 가이드</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 권장 크기: 1200x500px (가로형 이미지)</li>
                    <li>• 파일 형식: JPG, PNG</li>
                    <li>• 최소 2개, 최대 5개의 배너를 권장합니다</li>
                    <li>• 드래그 앤 드롭으로 순서를 변경할 수 있습니다</li>
                    <li>• 변경 사항은 즉시 메인페이지에 반영됩니다</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>배너 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 배너를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>배너 미리보기</DialogTitle>
              <DialogDescription>
                메인페이지에 표시될 배너 이미지입니다
              </DialogDescription>
            </DialogHeader>
            {previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="배너 미리보기"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}

// Draggable Banner Item Component
interface DraggableBannerItemProps {
  banner: BannerItem;
  index: number;
  moveBanner: (dragIndex: number, hoverIndex: number) => void;
  onDelete: (id: string) => void;
  onPreview: (url: string) => void;
  primaryColor: string;
}

const ITEM_TYPE = 'BANNER';

function DraggableBannerItem({
  banner,
  index,
  moveBanner,
  onDelete,
  onPreview,
  primaryColor,
}: DraggableBannerItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveBanner(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`bg-white border rounded-lg p-4 flex items-center gap-4 cursor-move hover:border-primary transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div
        className="w-32 h-20 rounded bg-cover bg-center flex-shrink-0"
        style={{ backgroundImage: `url(${banner.url})` }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium mb-1">배너 #{index + 1}</p>
        <p className="text-xs text-muted-foreground truncate">{banner.url}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreview(banner.url)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(banner.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}