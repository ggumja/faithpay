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
  FileText,
  FileCheck,
  AlertCircle,
  Download,
  Eye,
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

  // 서류 및 정산 정보 state
  const [uniqueNumber, setUniqueNumber] = useState('');
  const [uniqueNumberFile, setUniqueNumberFile] = useState('');
  const [uniqueNumberFileName, setUniqueNumberFileName] = useState('');
  const [bylawsFile, setBylawsFile] = useState('');
  const [bylawsFileName, setBylawsFileName] = useState('');
  const [bankbookFile, setBankbookFile] = useState('');
  const [bankbookFileName, setBankbookFileName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [representativeCertFile, setRepresentativeCertFile] = useState('');
  const [representativeCertFileName, setRepresentativeCertFileName] = useState('');
  const [representativeIdFile, setRepresentativeIdFile] = useState('');
  const [representativeIdFileName, setRepresentativeIdFileName] = useState('');
  
  // 대리인 서류 state
  const [isDelegated, setIsDelegated] = useState(false);
  const [delegateName, setDelegateName] = useState('');
  const [delegatePhone, setDelegatePhone] = useState('');
  const [delegationLetterFile, setDelegationLetterFile] = useState('');
  const [delegationLetterFileName, setDelegationLetterFileName] = useState('');
  const [delegateIdFile, setDelegateIdFile] = useState('');
  const [delegateIdFileName, setDelegateIdFileName] = useState('');

  const [previewDoc, setPreviewDoc] = useState<{ title: string; fileUrl: string; fileName?: string } | null>(null);

  const handleDocFileUpload = (
    setterFile: React.Dispatch<React.SetStateAction<string>>,
    setterName: React.Dispatch<React.SetStateAction<string>>,
    file: File | null
  ) => {
    if (!file) {
      setterFile('');
      setterName('');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 최대 10MB까지 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setterFile(base64);
      setterName(file.name);
      toast.success(`${file.name} 서류가 첨부되었습니다.`);
    };
    reader.readAsDataURL(file);
  };

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

      // 서류 정보 초기화
      const bInfo = tenant.businessInfo || {};
      setUniqueNumber(tenant.uniqueNumber || bInfo.uniqueNumber || '');
      setUniqueNumberFile(tenant.uniqueNumberFile || bInfo.uniqueNumberFile || '');
      setUniqueNumberFileName(bInfo.uniqueNumberFileName || (tenant.uniqueNumberFile ? '고유번호증_사본' : ''));
      setBylawsFile(bInfo.bylawsFile || '');
      setBylawsFileName(bInfo.bylawsFileName || (bInfo.bylawsFile ? '정관_회칙_사본' : ''));
      setBankbookFile(bInfo.bankbookFile || '');
      setBankbookFileName(bInfo.bankbookFileName || (bInfo.bankbookFile ? '통장_사본' : ''));
      setBankName(bInfo.bankName || '');
      setAccountNumber(bInfo.accountNumber || '');
      setAccountHolder(bInfo.accountHolder || '');
      setRepresentativeName(bInfo.representativeName || tenant.contact.name || '');
      setRepresentativeCertFile(bInfo.representativeCertFile || '');
      setRepresentativeCertFileName(bInfo.representativeCertFileName || (bInfo.representativeCertFile ? '대표자확인서류' : ''));
      setRepresentativeIdFile(bInfo.representativeIdFile || '');
      setRepresentativeIdFileName(bInfo.representativeIdFileName || (bInfo.representativeIdFile ? '대표자신분증' : ''));

      setIsDelegated(!!bInfo.isDelegated);
      setDelegateName(bInfo.delegateName || '');
      setDelegatePhone(bInfo.delegatePhone || '');
      setDelegationLetterFile(bInfo.delegationLetterFile || '');
      setDelegationLetterFileName(bInfo.delegationLetterFileName || (bInfo.delegationLetterFile ? '위임장' : ''));
      setDelegateIdFile(bInfo.delegateIdFile || '');
      setDelegateIdFileName(bInfo.delegateIdFileName || (bInfo.delegateIdFile ? '대리인신분증' : ''));
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

    // 업데이트할 데이터 준비
    const updatedTenant: Tenant = {
      ...currentTenant,
      name: name.trim(),
      description: description.trim(),
      address: addressDetail.trim() ? `${address.trim()} ${addressDetail.trim()}` : address.trim(),
      logoUrl: logoUrl.trim(),
      templateId: selectedTemplate,
      uniqueNumber: uniqueNumber.trim() || undefined,
      uniqueNumberFile: uniqueNumberFile || undefined,
      businessInfo: {
        ...(currentTenant.businessInfo || {}),
        uniqueNumber: uniqueNumber.trim() || undefined,
        uniqueNumberFile: uniqueNumberFile || undefined,
        uniqueNumberFileName: uniqueNumberFileName || undefined,
        bylawsFile: bylawsFile || undefined,
        bylawsFileName: bylawsFileName || undefined,
        bankbookFile: bankbookFile || undefined,
        bankbookFileName: bankbookFileName || undefined,
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        accountHolder: accountHolder.trim() || undefined,
        representativeName: representativeName.trim() || undefined,
        representativeCertFile: representativeCertFile || undefined,
        representativeCertFileName: representativeCertFileName || undefined,
        representativeIdFile: representativeIdFile || undefined,
        representativeIdFileName: representativeIdFileName || undefined,
        isDelegated,
        delegateName: delegateName.trim() || undefined,
        delegatePhone: delegatePhone.trim() || undefined,
        delegationLetterFile: delegationLetterFile || undefined,
        delegationLetterFileName: delegationLetterFileName || undefined,
        delegateIdFile: delegateIdFile || undefined,
        delegateIdFileName: delegateIdFileName || undefined,
      },
      contact: {
        phone: phone.trim(),
        email: email.trim(),
        name: representativeName.trim() || currentTenant.contact?.name,
      },
      schedule: schedules.filter(s => s.label.trim() && s.time.trim()),
    };

    // Context 및 서버 DB 업데이트
    await updateTenantInfo(currentTenant.id, updatedTenant);
    setIsSaving(false);
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

            {/* ── 단체 인증 및 정산 서류 관리 카드 ── */}
            <Card className="mb-6 border-indigo-100 dark:border-zinc-800 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <CardTitle className="text-base font-bold">단체 인증 및 정산 서류 관리</CardTitle>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    인증 서류
                  </span>
                </div>
                <CardDescription>
                  가입 시 미제출된 서류를 등록하거나, 변경된 단체 고유번호증/통장사본/정관 등을 갱신할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                
                {/* 1. 고유번호증 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <FileText size={15} className="text-indigo-500" />
                      종교/비영리 단체 고유번호증
                    </Label>
                    <div className="flex items-center gap-2">
                      {uniqueNumberFile ? (
                        <>
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 size={12} /> {uniqueNumberFileName || '서류 등록됨'}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setPreviewDoc({ title: '고유번호증 사본', fileUrl: uniqueNumberFile, fileName: uniqueNumberFileName })}
                          >
                            <Eye size={12} className="mr-1" /> 보기
                          </Button>
                        </>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                          미등록 (선택)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="고유번호 (예: 240-82-12345)"
                      className="h-10 text-xs font-mono font-medium"
                      value={uniqueNumber}
                      onChange={(e) => setUniqueNumber(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex-1 h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                        <Upload size={13} />
                        <span className="truncate">{uniqueNumberFileName || '고유번호증 파일 업로드'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="sr-only"
                          onChange={(e) => handleDocFileUpload(setUniqueNumberFile, setUniqueNumberFileName, e.target.files?.[0] || null)}
                        />
                      </label>
                      {uniqueNumberFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDocFileUpload(setUniqueNumberFile, setUniqueNumberFileName, null)}
                          className="h-10 w-10 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. 정관 또는 회칙 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <FileText size={15} className="text-indigo-500" />
                      정관 또는 회칙 사본
                    </Label>
                    <div className="flex items-center gap-2">
                      {bylawsFile ? (
                        <>
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 size={12} /> {bylawsFileName || '서류 등록됨'}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setPreviewDoc({ title: '정관/회칙 사본', fileUrl: bylawsFile, fileName: bylawsFileName })}
                          >
                            <Eye size={12} className="mr-1" /> 보기
                          </Button>
                        </>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                          미등록 (선택)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                      <Upload size={13} />
                      <span className="truncate">{bylawsFileName || '정관 또는 회칙 파일 첨부 (PDF, 이미지)'}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        onChange={(e) => handleDocFileUpload(setBylawsFile, setBylawsFileName, e.target.files?.[0] || null)}
                      />
                    </label>
                    {bylawsFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDocFileUpload(setBylawsFile, setBylawsFileName, null)}
                        className="h-10 w-10 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 3. 단체명의 정산 통장 사본 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                    <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <FileText size={15} className="text-indigo-500" />
                      단체명의 정산 통장 사본 및 계좌 정보
                    </Label>
                    <div className="flex items-center gap-2">
                      {bankbookFile ? (
                        <>
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 size={12} /> {bankbookFileName || '통장사본 등록됨'}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setPreviewDoc({ title: '정산 통장 사본', fileUrl: bankbookFile, fileName: bankbookFileName })}
                          >
                            <Eye size={12} className="mr-1" /> 보기
                          </Button>
                        </>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                          미등록 (선택)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                    <Input
                      placeholder="은행명 (예: 국민은행)"
                      className="h-10 text-xs"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                    <Input
                      placeholder="계좌번호 (- 제외)"
                      className="h-10 text-xs font-mono"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                    <Input
                      placeholder="예금주명 (단체명)"
                      className="h-10 text-xs"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                      <Upload size={13} />
                      <span className="truncate">{bankbookFileName || '통장 사본 파일 업로드'}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        onChange={(e) => handleDocFileUpload(setBankbookFile, setBankbookFileName, e.target.files?.[0] || null)}
                      />
                    </label>
                    {bankbookFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDocFileUpload(setBankbookFile, setBankbookFileName, null)}
                        className="h-10 w-10 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 4. 대표자 확인서류 & 5. 대표자 신분증 */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                          대표자(관리인) 확인서류
                        </Label>
                        {representativeCertFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] px-1.5 text-indigo-600"
                            onClick={() => setPreviewDoc({ title: '대표자 확인서류', fileUrl: representativeCertFile, fileName: representativeCertFileName })}
                          >
                            보기
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-1.5">재직증명서, 임명장 또는 소속증명서</p>
                      <label className="h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                        <Upload size={13} />
                        <span className="truncate">{representativeCertFileName || '확인서류 파일 업로드'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="sr-only"
                          onChange={(e) => handleDocFileUpload(setRepresentativeCertFile, setRepresentativeCertFileName, e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                          대표자 신분증 사본
                        </Label>
                        {representativeIdFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] px-1.5 text-indigo-600"
                            onClick={() => setPreviewDoc({ title: '대표자 신분증 사본', fileUrl: representativeIdFile, fileName: representativeIdFileName })}
                          >
                            보기
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-1.5">주민등록증, 운전면허증 등</p>
                      <label className="h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                        <Upload size={13} />
                        <span className="truncate">{representativeIdFileName || '신분증 사본 업로드'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="sr-only"
                          onChange={(e) => handleDocFileUpload(setRepresentativeIdFile, setRepresentativeIdFileName, e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 6. 대리인 신청 정보 및 서류 */}
                <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDelegated}
                      onChange={(e) => setIsDelegated(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-zinc-300"
                    />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      대리인 신청 및 위임 서류 관리
                    </span>
                  </label>

                  {isDelegated && (
                    <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-600 dark:text-zinc-300 mb-1 block">대리인 성명</Label>
                          <Input
                            placeholder="대리인 성명"
                            className="h-10 text-xs bg-white dark:bg-zinc-900"
                            value={delegateName}
                            onChange={(e) => setDelegateName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600 dark:text-zinc-300 mb-1 block">대리인 연락처</Label>
                          <Input
                            placeholder="대리인 연락처"
                            className="h-10 text-xs bg-white dark:bg-zinc-900"
                            value={delegatePhone}
                            onChange={(e) => setDelegatePhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs font-bold text-slate-700 dark:text-zinc-200">대리인 위임장 사본</Label>
                            {delegationLetterFile && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] px-1 text-amber-700"
                                onClick={() => setPreviewDoc({ title: '대리인 위임장', fileUrl: delegationLetterFile, fileName: delegationLetterFileName })}
                              >
                                보기
                              </Button>
                            )}
                          </div>
                          <label className="h-10 px-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                            <Upload size={13} />
                            <span className="truncate">{delegationLetterFileName || '위임장 파일 업로드'}</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="sr-only"
                              onChange={(e) => handleDocFileUpload(setDelegationLetterFile, setDelegationLetterFileName, e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs font-bold text-slate-700 dark:text-zinc-200">대리인 신분증 사본</Label>
                            {delegateIdFile && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] px-1 text-amber-700"
                                onClick={() => setPreviewDoc({ title: '대리인 신분증 사본', fileUrl: delegateIdFile, fileName: delegateIdFileName })}
                              >
                                보기
                              </Button>
                            )}
                          </div>
                          <label className="h-10 px-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                            <Upload size={13} />
                            <span className="truncate">{delegateIdFileName || '신분증 파일 업로드'}</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="sr-only"
                              onChange={(e) => handleDocFileUpload(setDelegateIdFile, setDelegateIdFileName, e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

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
                  <li>• 서류 등록은 필수가 아니며, 가입 승인 및 정산 계약 단계에서 언제든 추가/수정하실 수 있습니다</li>
                  <li>• 등록된 서류는 최고 관리자의 보안 검토용으로만 안전하게 보관됩니다</li>
                  <li>• 이메일 및 전화번호는 신도들에게 공개되는 단체 대표 연락처입니다</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </RBACRouteGuard>

      {/* 서류 미리보기 모달 */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-zinc-800">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-600 h-5 w-5" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{previewDoc.title}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setPreviewDoc(null)}
              >
                닫기
              </Button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-50 dark:bg-zinc-950 min-h-[300px]">
              {previewDoc.fileUrl.startsWith('data:image/') || previewDoc.fileUrl.startsWith('http') && (previewDoc.fileUrl.endsWith('.png') || previewDoc.fileUrl.endsWith('.jpg') || previewDoc.fileUrl.endsWith('.jpeg')) ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : previewDoc.fileUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.title}
                  className="w-full h-[60vh] rounded-lg border"
                />
              ) : (
                <div className="text-center p-8">
                  <FileCheck size={48} className="mx-auto text-indigo-500 mb-3" />
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">서류 파일이 등록되어 있습니다</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">{previewDoc.fileName || '서류 파일'}</p>
                  <a
                    href={previewDoc.fileUrl}
                    download={previewDoc.fileName || 'document'}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm hover:bg-indigo-700"
                  >
                    <Download size={14} /> 다운로드하여 열기
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}