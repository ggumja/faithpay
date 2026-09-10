import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp, SidebarBanner } from '../../context/AppContext';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Menu,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Upload,
  ExternalLink,
  Sparkles,
  Megaphone,
  LayoutTemplate,
  Info,
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

interface HeroBannerItem {
  id: string;
  url: string;
  order: number;
}

export default function BannerManagement() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const {
    currentTenant,
    setCurrentTenant,
    currentAdmin,
    updateTenantBanners,
    updateTenantSidebarBanners,
    tenants,
  } = useApp();

  // 1. 메인 히어로 배너 상태
  const [banners, setBanners] = useState<HeroBannerItem[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState('');

  // 2. 사이드 광고/프로모션 배너 상태
  const [sidebarBanners, setSidebarBanners] = useState<SidebarBanner[]>([]);
  const [newSideBannerUrl, setNewSideBannerUrl] = useState('');
  const [newSideBannerTitle, setNewSideBannerTitle] = useState('');
  const [newSideBannerLink, setNewSideBannerLink] = useState('');

  // 공통 대화상자 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'hero' | 'sidebar' } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('배너 미리보기');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);

      // 메인 히어로 배너 동기화
      const bannerList = tenant.bannerImages || [];
      const bannerItems: HeroBannerItem[] = bannerList.map((url, index) => ({
        id: `hero-banner-${index}-${Date.now()}`,
        url,
        order: index,
      }));
      setBanners(bannerItems);

      // 사이드 광고/프로모션 배너 동기화
      const sideList: SidebarBanner[] = (tenant.sidebarBanners || []).map((b: any, index: number) => {
        if (typeof b === 'string') {
          return {
            id: `side-banner-${index}`,
            imageUrl: b,
            title: `프로모션 #${index + 1}`,
            linkUrl: '',
            order: index,
            enabled: true,
          };
        }
        return {
          id: b.id || `side-banner-${index}`,
          imageUrl: b.imageUrl || b.url || '',
          title: b.title || `프로모션 #${index + 1}`,
          linkUrl: b.linkUrl || '',
          order: b.order !== undefined ? b.order : index,
          enabled: b.enabled !== undefined ? b.enabled : true,
        };
      });
      setSidebarBanners(sideList);
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">단체 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  const isAuthorized = currentAdmin && (currentAdmin.role === 'tenant_admin' || currentAdmin.role === 'system_admin');
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>단체 관리자 또는 최고 관리자만 접근할 수 있습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentPath = location.pathname;

  // 이미지 압축 헬퍼
  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
      };
    });
  };

  // ══════════════════════════════════════════════════════════════
  // [탭 1] 메인 히어로 배너 핸들러
  // ══════════════════════════════════════════════════════════════
  const handleAddHeroBanner = () => {
    if (!newBannerUrl.trim()) {
      toast.error('배너 이미지 URL을 입력해주세요');
      return;
    }

    try {
      new URL(newBannerUrl);
    } catch {
      toast.error('올바른 URL 형식이 아닙니다 (https://...)');
      return;
    }

    const newBanner: HeroBannerItem = {
      id: `hero-${Date.now()}`,
      url: newBannerUrl.trim(),
      order: banners.length,
    };

    const updated = [...banners, newBanner];
    setBanners(updated);
    setNewBannerUrl('');
    toast.success('메인 히어로 배너가 추가되었습니다');

    if (currentTenant) {
      const bannerUrls = updated.map((b) => b.url);
      updateTenantBanners(currentTenant.id, bannerUrls);
      setCurrentTenant({ ...currentTenant, bannerImages: bannerUrls });
    }
  };

  const handleHeroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다');
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file, 1200, 0.8);
      const newBanner: HeroBannerItem = {
        id: `hero-upload-${Date.now()}`,
        url: compressedDataUrl,
        order: banners.length,
      };

      const updated = [...banners, newBanner];
      setBanners(updated);
      toast.success('히어로 배너 이미지가 업로드되었습니다');

      if (currentTenant) {
        const bannerUrls = updated.map((b) => b.url);
        updateTenantBanners(currentTenant.id, bannerUrls);
        setCurrentTenant({ ...currentTenant, bannerImages: bannerUrls });
      }
    } catch {
      toast.error('이미지 업로드 처리에 실패했습니다');
    }
  };

  const moveHeroBanner = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = banners[dragIndex];
    const updated = [...banners];
    updated.splice(dragIndex, 1);
    updated.splice(hoverIndex, 0, draggedItem);

    const reordered = updated.map((item, index) => ({ ...item, order: index }));
    setBanners(reordered);

    if (currentTenant) {
      const bannerUrls = reordered.map((b) => b.url);
      updateTenantBanners(currentTenant.id, bannerUrls);
      setCurrentTenant({ ...currentTenant, bannerImages: bannerUrls });
    }
  };

  // ══════════════════════════════════════════════════════════════
  // [탭 2] 사이드 광고/프로모션 배너 핸들러
  // ══════════════════════════════════════════════════════════════
  const handleAddSideBanner = () => {
    if (!newSideBannerUrl.trim()) {
      toast.error('사이드 배너 이미지 URL을 입력해주세요');
      return;
    }

    try {
      new URL(newSideBannerUrl);
    } catch {
      toast.error('올바른 이미지 URL 형식이 아닙니다 (https://...)');
      return;
    }

    if (newSideBannerLink.trim()) {
      try {
        new URL(newSideBannerLink);
      } catch {
        toast.error('올바른 링크 URL 형식이 아닙니다 (https://...)');
        return;
      }
    }

    const newBanner: SidebarBanner = {
      id: `side-${Date.now()}`,
      imageUrl: newSideBannerUrl.trim(),
      title: newSideBannerTitle.trim() || `프로모션 #${sidebarBanners.length + 1}`,
      linkUrl: newSideBannerLink.trim(),
      order: sidebarBanners.length,
      enabled: true,
    };

    const updated = [...sidebarBanners, newBanner];
    setSidebarBanners(updated);
    setNewSideBannerUrl('');
    setNewSideBannerTitle('');
    setNewSideBannerLink('');
    toast.success('사이드 광고 배너가 추가되었습니다');

    if (currentTenant) {
      updateTenantSidebarBanners(currentTenant.id, updated);
      setCurrentTenant({ ...currentTenant, sidebarBanners: updated });
    }
  };

  const handleSideFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다');
      return;
    }

    try {
      // 사이드 배너 규격 (340x148px)에 맞춰 약 680px 너비로 최적화 압축
      const compressedDataUrl = await compressImage(file, 680, 0.85);
      const newBanner: SidebarBanner = {
        id: `side-upload-${Date.now()}`,
        imageUrl: compressedDataUrl,
        title: newSideBannerTitle.trim() || file.name.replace(/\.[^/.]+$/, '') || `프로모션 #${sidebarBanners.length + 1}`,
        linkUrl: newSideBannerLink.trim(),
        order: sidebarBanners.length,
        enabled: true,
      };

      const updated = [...sidebarBanners, newBanner];
      setSidebarBanners(updated);
      setNewSideBannerTitle('');
      setNewSideBannerLink('');
      toast.success('사이드 배너 이미지가 업로드되었습니다');

      if (currentTenant) {
        updateTenantSidebarBanners(currentTenant.id, updated);
        setCurrentTenant({ ...currentTenant, sidebarBanners: updated });
      }
    } catch {
      toast.error('이미지 업로드 처리에 실패했습니다');
    }
  };

  const toggleSideBanner = (id: string, enabled: boolean) => {
    const updated = sidebarBanners.map((b) => (b.id === id ? { ...b, enabled } : b));
    setSidebarBanners(updated);

    if (currentTenant) {
      updateTenantSidebarBanners(currentTenant.id, updated);
      setCurrentTenant({ ...currentTenant, sidebarBanners: updated });
    }
    toast.success(enabled ? '배너가 활성화되었습니다' : '배너가 비활성화되었습니다');
  };

  const moveSideBanner = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = sidebarBanners[dragIndex];
    const updated = [...sidebarBanners];
    updated.splice(dragIndex, 1);
    updated.splice(hoverIndex, 0, draggedItem);

    const reordered = updated.map((item, index) => ({ ...item, order: index }));
    setSidebarBanners(reordered);

    if (currentTenant) {
      updateTenantSidebarBanners(currentTenant.id, reordered);
      setCurrentTenant({ ...currentTenant, sidebarBanners: reordered });
    }
  };

  // ══════════════════════════════════════════════════════════════
  // 공통 삭제 및 미리보기
  // ══════════════════════════════════════════════════════════════
  const handleDeleteRequest = (id: string, type: 'hero' | 'sidebar') => {
    setItemToDelete({ id, type });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'hero') {
      const updated = banners.filter((b) => b.id !== itemToDelete.id);
      const reordered = updated.map((b, i) => ({ ...b, order: i }));
      setBanners(reordered);

      if (currentTenant) {
        const urls = reordered.map((b) => b.url);
        updateTenantBanners(currentTenant.id, urls);
        setCurrentTenant({ ...currentTenant, bannerImages: urls });
      }
      toast.success('히어로 배너가 삭제되었습니다');
    } else {
      const updated = sidebarBanners.filter((b) => b.id !== itemToDelete.id);
      const reordered = updated.map((b, i) => ({ ...b, order: i }));
      setSidebarBanners(reordered);

      if (currentTenant) {
        updateTenantSidebarBanners(currentTenant.id, reordered);
        setCurrentTenant({ ...currentTenant, sidebarBanners: reordered });
      }
      toast.success('사이드 광고 배너가 삭제되었습니다');
    }

    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const openPreview = (url: string, title = '배너 미리보기') => {
    setPreviewUrl(url);
    setPreviewTitle(title);
    setPreviewDialogOpen(true);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex min-h-screen bg-slate-50">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
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

          {/* Content Body */}
          <div className="p-6 lg:p-8 overflow-x-hidden">
            <div className="w-full space-y-6 max-w-6xl">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                    배너 관리
                  </h1>
                  <Badge variant="outline" className="text-xs font-semibold text-blue-700 bg-blue-50 border-blue-200">
                    영역별 분리 관리
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5">
                  메인 상단 히어로 배너와 사이드 프로모션 광고 배너를 분리하여 독립적으로 관리하세요.
                </p>
              </div>

              {/* ═══ 배너 영역별 탭 인터페이스 ═══ */}
              <Tabs defaultValue="hero" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 h-11 bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="hero" className="gap-2 font-bold text-xs sm:text-sm">
                    <LayoutTemplate className="h-4 w-4 text-blue-600" />
                    <span>메인 히어로 배너</span>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-mono ml-0.5">
                      {banners.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="sidebar" className="gap-2 font-bold text-xs sm:text-sm">
                    <Megaphone className="h-4 w-4 text-amber-600" />
                    <span>사이드 광고 배너</span>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-mono ml-0.5">
                      {sidebarBanners.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                {/* ────────────────────────────────────────────────────────── */}
                {/* 🌟 탭 1: 메인 히어로 배너 (Hero Section Banners)           */}
                {/* ────────────────────────────────────────────────────────── */}
                <TabsContent value="hero" className="space-y-6 outline-none">
                  {/* 새 히어로 배너 추가 카드 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            새 히어로 배너 추가
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 mt-0.5">
                            메인 홈 상단 비주얼 영역에 롤링되는 대형 가로형 배너입니다. (권장 크기: 1200 × 500px)
                          </CardDescription>
                        </div>
                        <Badge className="bg-blue-600 text-white text-[11px]">권장 규격: 1200×500px</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* File Upload Zone */}
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 hover:bg-slate-50 transition-colors relative cursor-pointer group bg-slate-50/40">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleHeroFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <Upload className="h-8 w-8 text-slate-400 mb-2 group-hover:text-blue-600 transition-colors" />
                          <p className="text-sm font-semibold text-slate-700">히어로 배너 이미지 파일 드래그 또는 클릭</p>
                          <p className="text-xs text-slate-400 mt-1">JPG, PNG, GIF, WebP (최대 5MB, 자동 최적화)</p>
                        </div>

                        {/* URL Direct Input */}
                        <div className="flex flex-col justify-center border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                          <Label htmlFor="hero-banner-url" className="mb-2 text-xs font-bold text-slate-700">
                            또는 이미지 URL 직접 입력
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="hero-banner-url"
                              placeholder="https://example.com/hero-banner.jpg"
                              value={newBannerUrl}
                              onChange={(e) => setNewBannerUrl(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddHeroBanner();
                              }}
                              className="bg-white text-xs"
                            />
                            <Button
                              onClick={handleAddHeroBanner}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0 text-xs"
                            >
                              <Plus className="h-4 w-4 mr-1.5" />
                              추가
                            </Button>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-2">
                            💡 웹에 호스팅된 외부 고해상도 이미지 링크를 직접 등록할 수 있습니다.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 히어로 배너 목록 카드 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            등록된 히어로 배너 목록
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 mt-0.5">
                            드래그 앤 드롭으로 롤링되는 순서를 자유롭게 조정할 수 있습니다.
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                          총 {banners.length}개
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {banners.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <LayoutTemplate className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-sm font-semibold text-slate-600">등록된 메인 히어로 배너가 없습니다</p>
                          <p className="text-xs text-slate-400 mt-1">상단의 등록 영역을 통해 첫 번째 히어로 배너를 등록해 보세요.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {banners.map((banner, index) => (
                            <DraggableHeroBannerItem
                              key={banner.id}
                              banner={banner}
                              index={index}
                              moveBanner={moveHeroBanner}
                              onDelete={(id) => handleDeleteRequest(id, 'hero')}
                              onPreview={(url) => openPreview(url, `히어로 배너 #${index + 1}`)}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 히어로 배너 가이드 카드 */}
                  <Card className="bg-blue-50/60 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                          <p className="font-bold text-blue-900 text-sm">💡 메인 히어로 배너 운영 가이드</p>
                          <ul className="space-y-1 list-disc list-inside text-slate-600">
                            <li><strong>권장 크기:</strong> 1200 × 500px (와이드 2.4:1 비율 이미지 권장)</li>
                            <li><strong>적용 위치:</strong> Classic 템플릿 상단 롤링 배너 및 Minimal 템플릿 상단 히어로 배경</li>
                            <li><strong>권장 수량:</strong> 신도들의 가독성을 위해 2~4개 등록을 권장합니다.</li>
                            <li><strong>순서 변경:</strong> 좌측의 핸들(⋮⋮)을 잡고 위아래로 끌어다 놓으면 순서가 즉시 동기화됩니다.</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ────────────────────────────────────────────────────────── */}
                {/* 📢 탭 2: 사이드 광고/프로모션 배너 (Sidebar Promo Banners) */}
                {/* ────────────────────────────────────────────────────────── */}
                <TabsContent value="sidebar" className="space-y-6 outline-none">
                  {/* 새 사이드 배너 추가 카드 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-amber-600" />
                            새 사이드 광고/프로모션 배너 추가
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 mt-0.5">
                            메인 페이지 우측 사이드바(규격: 340 × 148px)에 노출되는 프로모션 배너입니다. 클릭 시 이동할 웹 링크를 함께 지정할 수 있습니다.
                          </CardDescription>
                        </div>
                        <Badge className="bg-amber-600 text-white text-[11px]">권장 규격: 340×148px</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* File Upload Zone */}
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-amber-200 rounded-xl p-6 hover:bg-amber-50/40 transition-colors relative cursor-pointer group bg-amber-50/20">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSideFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <Upload className="h-8 w-8 text-amber-500 mb-2 group-hover:text-amber-600 transition-colors" />
                          <p className="text-sm font-semibold text-slate-700">사이드 배너 이미지 파일 드래그 또는 클릭</p>
                          <p className="text-xs text-slate-400 mt-1">340 × 148px 비율 권장 (최대 5MB, 자동 최적화)</p>
                        </div>

                        {/* Direct Inputs */}
                        <div className="flex flex-col justify-between border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-3">
                          <div>
                            <Label htmlFor="side-banner-title" className="text-xs font-bold text-slate-700 mb-1 block">
                              배너 제목 (선택)
                            </Label>
                            <Input
                              id="side-banner-title"
                              placeholder="예: 2026 부활절 특별 새벽기도회, 교회 바자회 안내"
                              value={newSideBannerTitle}
                              onChange={(e) => setNewSideBannerTitle(e.target.value)}
                              className="bg-white text-xs h-9"
                            />
                          </div>

                          <div>
                            <Label htmlFor="side-banner-link" className="text-xs font-bold text-slate-700 mb-1 block">
                              클릭 시 이동할 링크 URL (선택)
                            </Label>
                            <Input
                              id="side-banner-link"
                              placeholder="https://example.com/event"
                              value={newSideBannerLink}
                              onChange={(e) => setNewSideBannerLink(e.target.value)}
                              className="bg-white text-xs h-9"
                            />
                          </div>

                          <div>
                            <Label htmlFor="side-banner-url" className="text-xs font-bold text-slate-700 mb-1 block">
                              또는 이미지 URL 직접 입력
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="side-banner-url"
                                placeholder="https://example.com/ad-banner-340x148.jpg"
                                value={newSideBannerUrl}
                                onChange={(e) => setNewSideBannerUrl(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSideBanner();
                                }}
                                className="bg-white text-xs h-9"
                              />
                              <Button
                                onClick={handleAddSideBanner}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 text-xs h-9"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                추가
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 사이드 배너 목록 카드 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            등록된 사이드 광고 배너 목록
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 mt-0.5">
                            사이드바에 롤링 노출될 배너의 순서와 노출 On/Off 상태를 관리합니다.
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                          총 {sidebarBanners.length}개
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {sidebarBanners.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/20">
                          <Megaphone className="h-10 w-10 text-amber-300 mx-auto mb-3" />
                          <p className="text-sm font-semibold text-slate-600">등록된 사이드 광고 배너가 없습니다</p>
                          <p className="text-xs text-slate-400 mt-1">
                            배너를 등록하지 않을 경우 기본 SoulPay 공식 안내 배너가 표출됩니다.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sidebarBanners.map((banner, index) => (
                            <DraggableSidebarBannerItem
                              key={banner.id}
                              banner={banner}
                              index={index}
                              moveBanner={moveSideBanner}
                              onToggle={(enabled) => toggleSideBanner(banner.id, enabled)}
                              onDelete={(id) => handleDeleteRequest(id, 'sidebar')}
                              onPreview={(url, title) => openPreview(url, title || `사이드 배너 #${index + 1}`)}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 사이드 배너 가이드 카드 */}
                  <Card className="bg-amber-50/60 border-amber-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                          <p className="font-bold text-amber-900 text-sm">💡 사이드 광고 배너 운영 팁</p>
                          <ul className="space-y-1 list-disc list-inside text-slate-600">
                            <li><strong>권장 규격:</strong> 340 × 148px (또는 고화질 680 × 296px, 2.3:1 비율)</li>
                            <li><strong>링크 연동:</strong> 공지 게시글, 행사 신청서, 후원 단체 웹페이지 등 링크 URL을 등록하면 신도가 배너 클릭 시 새 창으로 바로 연결됩니다.</li>
                            <li><strong>일시 중단(On/Off):</strong> 삭제하지 않고 우측 토글 스위치만 꺼두면 사이드바 노출을 일시적으로 중지할 수 있습니다.</li>
                            <li><strong>0건 시 동작:</strong> 등록된 배너가 없거나 모두 꺼진 경우, 기본 SoulPay 신도 안내 카드가 깔끔하게 표출됩니다.</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* ══ 공통 삭제 확인 대화상자 ══ */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>배너 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                선택하신 배너를 삭제하시겠습니까? 이 작업은 즉시 단체 메인 화면에 반영됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white font-bold">
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ══ 공통 배너 미리보기 대화상자 ══ */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewTitle}</DialogTitle>
              <DialogDescription>
                실제 서비스 화면에 표출되는 배너 원본 이미지입니다.
              </DialogDescription>
            </DialogHeader>
            {previewUrl && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 flex items-center justify-center p-2">
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  className="max-h-[500px] w-auto max-w-full rounded-lg object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}

// ══════════════════════════════════════════════════════════════════════
// [컴포넌트 1] 드래그 가능한 메인 히어로 배너 아이템
// ══════════════════════════════════════════════════════════════════════
interface DraggableHeroBannerItemProps {
  banner: HeroBannerItem;
  index: number;
  moveBanner: (dragIndex: number, hoverIndex: number) => void;
  onDelete: (id: string) => void;
  onPreview: (url: string) => void;
}

const HERO_ITEM_TYPE = 'HERO_BANNER';

function DraggableHeroBannerItem({
  banner,
  index,
  moveBanner,
  onDelete,
  onPreview,
}: DraggableHeroBannerItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: HERO_ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: HERO_ITEM_TYPE,
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
      className={`bg-white border rounded-xl p-3.5 flex items-center gap-4 cursor-move hover:border-blue-400 hover:shadow-xs transition-all ${
        isDragging ? 'opacity-40 scale-98' : ''
      }`}
    >
      <GripVertical className="h-5 w-5 text-slate-400 flex-shrink-0" />
      <div
        className="w-36 h-18 rounded-lg bg-cover bg-center flex-shrink-0 border border-slate-200 shadow-2xs"
        style={{ backgroundImage: `url(${banner.url})` }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[11px] font-bold px-1.5 py-0 bg-slate-50">
            순서 #{index + 1}
          </Badge>
          <span className="text-xs font-bold text-slate-800 truncate">
            메인 히어로 배너 #{index + 1}
          </span>
        </div>
        <p className="text-xs text-slate-400 truncate font-mono">
          {banner.url.startsWith('data:') ? '🖼️ 직접 업로드한 이미지 파일' : banner.url}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreview(banner.url)}
          className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600"
          title="미리보기"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(banner.id)}
          className="h-8 w-8 p-0 text-slate-400 hover:text-destructive hover:bg-rose-50"
          title="삭제"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// [컴포넌트 2] 드래그 가능한 사이드 광고/프로모션 배너 아이템
// ══════════════════════════════════════════════════════════════════════
interface DraggableSidebarBannerItemProps {
  banner: SidebarBanner;
  index: number;
  moveBanner: (dragIndex: number, hoverIndex: number) => void;
  onToggle: (enabled: boolean) => void;
  onDelete: (id: string) => void;
  onPreview: (url: string, title?: string) => void;
}

const SIDE_ITEM_TYPE = 'SIDEBAR_BANNER';

function DraggableSidebarBannerItem({
  banner,
  index,
  moveBanner,
  onToggle,
  onDelete,
  onPreview,
}: DraggableSidebarBannerItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: SIDE_ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: SIDE_ITEM_TYPE,
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
      className={`bg-white border rounded-xl p-3.5 flex items-center gap-4 cursor-move hover:border-amber-400 hover:shadow-xs transition-all ${
        isDragging ? 'opacity-40 scale-98' : ''
      } ${!banner.enabled ? 'bg-slate-50/70 opacity-60' : ''}`}
    >
      <GripVertical className="h-5 w-5 text-slate-400 flex-shrink-0" />
      {/* 340x148 비율 썸네일 */}
      <div
        className="w-32 h-14 rounded-lg bg-cover bg-center flex-shrink-0 border border-slate-200 shadow-2xs relative overflow-hidden"
        style={{ backgroundImage: `url(${banner.imageUrl})` }}
      >
        <span className="absolute top-1 right-1 bg-slate-900/70 text-white text-[9px] font-bold px-1 rounded">
          AD
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[11px] font-bold px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
            사이드 #{index + 1}
          </Badge>
          <span className="text-xs font-bold text-slate-800 truncate">
            {banner.title || `사이드 프로모션 배너 #${index + 1}`}
          </span>
          {!banner.enabled && (
            <Badge variant="secondary" className="text-[10px] text-slate-500 py-0">
              비활성 (노출중지)
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
          {banner.linkUrl ? (
            <a
              href={banner.linkUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-blue-600 hover:underline truncate font-mono text-[11px]"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{banner.linkUrl}</span>
            </a>
          ) : (
            <span className="text-[11px] text-slate-400">연결 링크 없음 (이미지만 노출)</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* On/Off Switch */}
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`switch-${banner.id}`} className="text-[11px] font-medium text-slate-500 hidden sm:inline">
            {banner.enabled ? '노출' : '숨김'}
          </Label>
          <Switch
            id={`switch-${banner.id}`}
            checked={banner.enabled}
            onCheckedChange={onToggle}
            className="cursor-pointer"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreview(banner.imageUrl, banner.title)}
          className="h-8 w-8 p-0 text-slate-600 hover:text-amber-600"
          title="미리보기"
        >
          <Eye className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(banner.id)}
          className="h-8 w-8 p-0 text-slate-400 hover:text-destructive hover:bg-rose-50"
          title="삭제"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}