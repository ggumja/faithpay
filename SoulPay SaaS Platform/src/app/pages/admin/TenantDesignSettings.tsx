import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp, Tenant } from '../../context/AppContext';
import { getPayPortalUrl } from '../../utils/domainUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { AdminSidebar } from '../../components/AdminSidebar';
import { TenantSettingsNav } from '../../components/admin/TenantSettingsNav';
import {
  Menu,
  Save,
  Building2,
  Upload,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  FileImage,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { RBACRouteGuard } from '../../components/RBACRouteGuard';
import { PAGE_TEMPLATES, TemplateId } from '../../theme/pageTemplates';
import { TenantQRCodeCard } from '../../components/admin/TenantQRCodeCard';

export default function TenantDesignSettings() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin, updateTenantInfo, getTenantDonationItems } = useApp();
  const donationItems = currentTenant ? getTenantDonationItems(currentTenant) : [];

  const [logoUrl, setLogoUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('classic');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const decodedSlug = tenantSlug ? decodeURIComponent(tenantSlug).trim().toLowerCase() : '';
    const tenant = tenants.find(
      (t) =>
        (t.slug && t.slug.toLowerCase() === decodedSlug) ||
        (t.id && t.id.toLowerCase() === decodedSlug) ||
        (t.name && t.name.toLowerCase() === decodedSlug) ||
        (t.slug && decodeURIComponent(t.slug).toLowerCase() === decodedSlug)
    ) || currentTenant;

    if (tenant) {
      setCurrentTenant(tenant);
      const url = tenant.logoUrl || '';
      setLogoUrl(url);
      if (url.startsWith('data:')) {
        setUploadedFileName('첨부된 로고 이미지');
      } else {
        setUploadedFileName('');
      }
      setSelectedTemplate((tenant.templateId as TemplateId) || 'classic');
    }
  }, [tenantSlug, setCurrentTenant, tenants]);

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

  const handleSave = async () => {
    const updatedTenant: Tenant = {
      ...currentTenant,
      logoUrl: logoUrl.trim(),
      templateId: selectedTemplate,
    };

    setIsSaving(true);
    try {
      await updateTenantInfo(updatedTenant);
      toast.success('디자인 및 브랜딩 설정이 성공적으로 저장되었습니다');
    } catch {
      toast.error('설정 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('로고 파일 크기는 2MB 이하여야 합니다');
      return;
    }

    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      setLogoUrl(dataUrl);
      toast.success(`로고 이미지(${file.name})가 업로드되었습니다`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setUploadedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
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
          <h1 className="text-lg font-semibold">디자인 설정</h1>
        </div>

        {/* Content */}
        <RBACRouteGuard menuId="settings">
          <div className="p-6 lg:p-8">
            <div className="w-full">
              {/* Common Settings Nav Tabs */}
              <TenantSettingsNav
                tenantSlug={tenantSlug}
                activeTab="design"
                currentPath={currentPath}
              />

              {/* 1. 🎨 봉헌 메인 랜딩 템플릿 선택 */}
              <Card className="mb-6 border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                      봉헌 메인 랜딩 템플릿 선택
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 font-semibold cursor-pointer"
                      onClick={() => window.open(getPayPortalUrl(currentTenant.slug), '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      현재 메인 랜딩 새창 미리보기
                    </Button>
                  </div>
                  <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    단체의 성격과 브랜딩에 맞는 봉헌 메인 페이지 디자인을 선택하세요. 선택 후 하단의 [저장하기] 버튼을 누르면 즉시 반영됩니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.values(PAGE_TEMPLATES)
                      .filter((tmpl) => !tmpl.hidden)
                      .map((tmpl) => {
                        const isSelected = selectedTemplate === tmpl.id;
                      return (
                        <div
                          key={tmpl.id}
                          onClick={() => setSelectedTemplate(tmpl.id)}
                          className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/30 shadow-md'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          {/* Top Badge */}
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tmpl.id === 'electric-dark'
                                ? 'bg-zinc-900 text-[#C7FF2E]'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {tmpl.badge}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                            )}
                          </div>

                          {/* Color Preview Block */}
                          <div
                            className="w-full h-20 rounded-xl mb-3 p-3 flex flex-col justify-between relative overflow-hidden"
                            style={{ backgroundColor: tmpl.previewColors.background }}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tmpl.previewColors.primary }} />
                              <div className="h-2 w-16 rounded" style={{ backgroundColor: tmpl.previewColors.cardBg }} />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="h-3 w-20 rounded" style={{ backgroundColor: tmpl.previewColors.primary }} />
                              <div className="h-4 w-12 rounded-full" style={{ backgroundColor: tmpl.previewColors.primary }} />
                            </div>
                          </div>

                          {/* Text Content */}
                          <div className="space-y-1 mb-3">
                            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1">
                              {tmpl.name}
                              {tmpl.id === 'electric-dark' && <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                            </h3>
                            <p className="text-[11px] font-medium text-slate-500">{tmpl.subtitle}</p>
                            <p className="text-xs text-slate-600 leading-relaxed pt-1 line-clamp-2">{tmpl.description}</p>
                          </div>

                          {/* Features Tags */}
                          <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100">
                            {tmpl.features.map((feat, i) => (
                              <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                ✓ {feat}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 2. 로고 이미지 설정 */}
              <Card className="mb-6 border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                    로고 이미지 설정
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    모바일 봉헌 및 영수증 화면 상단에 표출될 단체 고유 로고를 등록하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Preview */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex-shrink-0 w-24 h-24 rounded-lg border bg-slate-50 flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="단체 로고" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="text-[11px] text-rose-500 hover:text-rose-700 font-medium hover:underline cursor-pointer"
                        >
                          로고 삭제
                        </button>
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-4">
                      {/* 숨겨진 파일 인풋 (브라우저 기본 버튼 노출 방지) */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />

                      {/* 드래그 & 클릭 업로드 박스 */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 hover:bg-slate-50 transition-colors relative cursor-pointer group"
                      >
                        <Upload className="h-5 w-5 text-muted-foreground mb-1 group-hover:text-primary transition-colors" style={{ color: currentTenant.primaryColor }} />
                        {uploadedFileName ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                            <FileImage className="h-4 w-4 shrink-0" />
                            <span className="truncate max-w-xs">{uploadedFileName}</span>
                            <span className="text-[10px] text-slate-400 font-normal">(클릭하여 변경)</span>
                          </div>
                        ) : (
                          <p className="text-xs font-medium">로고 이미지 파일 선택 또는 드래그</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">최대 2MB (1:1 정사각형 권장)</p>
                      </div>

                      {/* URL 또는 파일명 표시 입력 필드 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="logo-url" className="text-xs">
                            {logoUrl.startsWith('data:') ? '첨부된 이미지 파일' : '또는 이미지 URL 직접 입력'}
                          </Label>
                          {logoUrl.startsWith('data:') && (
                            <button
                              type="button"
                              onClick={() => {
                                setLogoUrl('');
                                setUploadedFileName('');
                              }}
                              className="text-[11px] text-slate-500 hover:text-blue-600 hover:underline cursor-pointer"
                            >
                              URL 직접 입력으로 전환
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            id="logo-url"
                            value={logoUrl.startsWith('data:') ? (uploadedFileName || '첨부된 로고 이미지 파일') : logoUrl}
                            onChange={(e) => {
                              setUploadedFileName('');
                              setLogoUrl(e.target.value);
                            }}
                            readOnly={logoUrl.startsWith('data:')}
                            placeholder="https://example.com/logo.png"
                            className={`text-xs ${logoUrl.startsWith('data:') ? 'bg-slate-50 text-slate-700 font-medium cursor-default select-none pr-8' : logoUrl ? 'pr-8' : ''}`}
                          />
                          {logoUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                              title="삭제"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {logoUrl.startsWith('data:') && (
                          <p className="text-[11px] text-slate-500">
                            * 이미지가 파일 형태로 첨부되었습니다. 저장을 누르면 단체 로고로 반영됩니다.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. 📱 단체 전용 모바일 헌금·보시 QR코드 생성기 & 현장 인쇄 카드 */}
              {currentTenant && (
                <TenantQRCodeCard tenant={currentTenant} donationItems={donationItems} />
              )}

              {/* Save Button */}
              <div className="flex justify-end gap-3 mt-8">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 h-auto text-sm shadow-md transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? '저장 중...' : '디자인 설정 저장하기'}
                </Button>
              </div>
            </div>
          </div>
        </RBACRouteGuard>
      </div>
    </div>
  );
}
