import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp, Tenant } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Menu,
  Settings,
  Save,
  Plus,
  Trash2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Info,
  Upload,
  Search,
  ShieldCheck,
  Palette,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { openDaumPostcode } from '../../utils/daumPostcode';
import { Separator } from '../../components/ui/separator';
import { RBACRouteGuard } from '../../components/RBACRouteGuard';
import { PAGE_TEMPLATES, TemplateId } from '../../theme/pageTemplates';

interface ScheduleItem {
  label: string;
  time: string;
}

export default function OrganizationSettings() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin, updateTenantInfo } = useApp();
  
  // Form state
  const addressDetailRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('classic');
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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

      // 폼 초기화
      setName(tenant.name);
      setDescription(tenant.description);
      setAddress(tenant.address);
      setPhone(tenant.contact.phone);
      setEmail(tenant.contact.email);
      setLogoUrl(tenant.logoUrl || '');
      setSelectedTemplate((tenant.templateId as TemplateId) || 'classic');
      setSchedules([...tenant.schedule]);
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

  const getReligionLabel = (type: string) => {
    switch (type) {
      case 'protestant':
        return '기독교 (개신교)';
      case 'catholic':
        return '천주교';
      case 'buddhist':
        return '불교';
      default:
        return type;
    }
  };

  const handleAddSchedule = () => {
    setSchedules([...schedules, { label: '', time: '' }]);
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (index: number, field: 'label' | 'time', value: string) => {
    const updated = [...schedules];
    updated[index][field] = value;
    setSchedules(updated);
  };

  const handleSave = async () => {
    // 유효성 검사
    if (!name.trim()) {
      toast.error('단체명을 입력해주세요');
      return;
    }
    if (!address.trim()) {
      toast.error('주소를 입력해주세요');
      return;
    }
    if (!phone.trim()) {
      toast.error('전화번호를 입력해주세요');
      return;
    }
    if (!email.trim()) {
      toast.error('이메일을 입력해주세요');
      return;
    }

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('올바른 이메일 형식이 아닙니다');
      return;
    }

    setIsSaving(true);

    // 업데이트할 데이터 준비
    const updatedTenant: Tenant = {
      ...currentTenant,
      name: name.trim(),
      description: description.trim(),
      address: addressDetail.trim() ? `${address.trim()} ${addressDetail.trim()}` : address.trim(),
      logoUrl: logoUrl.trim(),
      templateId: selectedTemplate,
      contact: {
        phone: phone.trim(),
        email: email.trim(),
      },
      schedule: schedules.filter(s => s.label.trim() && s.time.trim()),
    };

    // Context 업데이트
    updateTenantInfo(currentTenant.id, updatedTenant);
    setCurrentTenant(updatedTenant);

    setTimeout(() => {
      setIsSaving(false);
      toast.success('단체 기본정보가 저장되었습니다');
    }, 500);
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

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      setLogoUrl(dataUrl);
      toast.success('로고 이미지가 업로드 되었습니다');
    };
    reader.readAsDataURL(file);
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
          <h1 className="text-lg font-semibold">단체 기본정보</h1>
        </div>

        {/* Content */}
        <RBACRouteGuard menuId="settings">
          <div className="p-6 lg:p-8">
          <div className="w-full">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="h-8 w-8" style={{ color: currentTenant.primaryColor }} />
                <h1 className="text-3xl font-bold">단체 기본정보</h1>
              </div>
              <p className="text-muted-foreground">
                단체의 기본 정보 및 주소, 연락처, 안내 일정을 관리하세요
              </p>
            </div>

            {/* Religion Type Info */}
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">단체 유형</p>
                    <p className="text-sm text-blue-700">{getReligionLabel(currentTenant.religionType)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 🎨 Page Design Template Selection */}
            <Card className="mb-6 border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-blue-600" />
                    <CardTitle>봉헌 메인 랜딩 템플릿 선택</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 font-semibold"
                    onClick={() => window.open(`/${currentTenant.slug}`, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    현재 메인 랜딩 새창으로 미리보기
                  </Button>
                </div>
                <CardDescription>
                  단체의 성격과 브랜딩에 맞는 봉헌 메인 페이지 디자인을 선택하세요. 선택 후 하단의 [저장하기] 버튼을 누르면 즉시 반영됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.values(PAGE_TEMPLATES).map((tmpl) => {
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

            {/* Basic Information */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  <CardTitle>기본 정보</CardTitle>
                </div>
                <CardDescription>단체의 기본 정보를 입력하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">단체명 *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 기쁨의교회"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">단체 소개</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="단체를 소개하는 간단한 설명을 입력하세요"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    메인 페이지에 표시될 단체 소개 문구입니다
                  </p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <Label>로고 이미지 설정</Label>
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Preview */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg border bg-slate-50 flex items-center justify-center overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="단체 로고" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-4">
                      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 hover:bg-slate-50 transition-colors relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Upload className="h-5 w-5 text-muted-foreground mb-1 group-hover:text-primary transition-colors" style={{ color: currentTenant.primaryColor }} />
                        <p className="text-xs font-medium">로고 이미지 파일 선택 또는 드래그</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">최대 2MB (1:1 비율 권장)</p>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="logo-url" className="text-xs">또는 이미지 URL 직접 입력</Label>
                        <Input
                          id="logo-url"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  <CardTitle>연락처 정보</CardTitle>
                </div>
                <CardDescription>단체의 연락처를 입력하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      주소 *
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs font-bold text-[#3182F6] hover:bg-blue-50 cursor-pointer"
                      onClick={() => openDaumPostcode((res) => {
                        setAddress(`[${res.zonecode}] ${res.address}`);
                        setTimeout(() => addressDetailRef.current?.focus(), 100);
                      })}
                    >
                      <Search className="h-3.5 w-3.5 mr-1" />
                      우편번호 검색
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="서울특별시 강남구 테헤란로 123"
                      className="flex-1 font-semibold"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 px-3.5 font-bold cursor-pointer whitespace-nowrap"
                      onClick={() => openDaumPostcode((res) => {
                        setAddress(`[${res.zonecode}] ${res.address}`);
                        setTimeout(() => addressDetailRef.current?.focus(), 100);
                      })}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      주소 검색
                    </Button>
                  </div>
                  <Input
                    ref={addressDetailRef}
                    id="addressDetail"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="상세 주소를 입력하세요 (예: 2층 종무소 / 101동 202호)"
                    className="h-10 text-xs font-medium focus:ring-2 focus:ring-[#3182F6]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      전화번호 *
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="02-1234-5678"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      이메일 *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@example.org"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Information */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      <CardTitle>
                        {currentTenant.religionType === 'protestant' && '예배 시간'}
                        {currentTenant.religionType === 'buddhist' && '법회 시간'}
                        {currentTenant.religionType === 'catholic' && '미사 시간'}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      {currentTenant.religionType === 'protestant' && '예배'}
                      {currentTenant.religionType === 'buddhist' && '법회'}
                      {currentTenant.religionType === 'catholic' && '미사'} 등의 일정을 관리하세요
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddSchedule}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>등록된 일정이 없습니다</p>
                    <p className="text-sm">위의 "추가" 버튼을 눌러 일정을 추가해주세요</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schedules.map((schedule, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`schedule-label-${index}`} className="text-xs">
                              구분 (예: 주일예배, 새벽기도)
                            </Label>
                            <Input
                              id={`schedule-label-${index}`}
                              value={schedule.label}
                              onChange={(e) => handleScheduleChange(index, 'label', e.target.value)}
                              placeholder="예: 주일 1부 예배"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`schedule-time-${index}`} className="text-xs">
                              시간
                            </Label>
                            <Input
                              id={`schedule-time-${index}`}
                              value={schedule.time}
                              onChange={(e) => handleScheduleChange(index, 'time', e.target.value)}
                              placeholder="예: 매주 일요일 오전 9시"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSchedule(index)}
                          className="text-destructive hover:text-destructive mt-6"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>



            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button
                size="lg"
                onClick={handleSave}
                disabled={isSaving}
                style={{ backgroundColor: currentTenant.primaryColor }}
                className="min-w-32"
              >
                {isSaving ? (
                  <>저장 중...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    저장하기
                  </>
                )}
              </Button>
            </div>

            {/* Info Note */}
            <Card className="mt-6 bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  안내사항
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 별표(*) 표시된 항목은 필수 입력 항목입니다</li>
                  <li>• 변경된 정보는 메인 페이지에 즉시 반영됩니다</li>
                  <li>• 종교 유형은 변경할 수 없습니다 (초기 설정값 유지)</li>
                  <li>• 이메일은 신도들에게 공개되는 연락처입니다</li>
                  <li>• 예배/법회/미사 시간은 여러 개 등록할 수 있습니다</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </RBACRouteGuard>
    </div>
  </div>
);
}