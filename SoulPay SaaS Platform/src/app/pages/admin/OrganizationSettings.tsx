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
import { TenantSettingsNav } from '../../components/admin/TenantSettingsNav';
import {
  Menu,
  Save,
  Plus,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Info,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { openDaumPostcode } from '../../utils/daumPostcode';
import { RBACRouteGuard } from '../../components/RBACRouteGuard';

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

    // 업데이트할 데이터 준비
    const updatedTenant: Tenant = {
      ...currentTenant,
      name: name.trim(),
      description: description.trim(),
      address: addressDetail.trim() ? `${address.trim()} ${addressDetail.trim()}` : address.trim(),
      contact: {
        ...currentTenant.contact,
        phone: phone.trim(),
        email: email.trim(),
      },
      schedule: schedules.filter((s) => s.label.trim() && s.time.trim()),
    };

    setIsSaving(true);
    try {
      await updateTenantInfo(updatedTenant);
      toast.success('단체 기본정보가 성공적으로 저장되었습니다');
    } catch {
      toast.error('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
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
          <h1 className="text-lg font-semibold">기본정보 설정</h1>
        </div>

        {/* Content */}
        <RBACRouteGuard menuId="settings">
          <div className="p-6 lg:p-8">
            <div className="w-full">
              {/* Common Settings Nav Tabs */}
              <TenantSettingsNav
                tenantSlug={tenantSlug}
                activeTab="basic"
                currentPath={currentPath}
              />

              {/* 1. 단체 유형 정보 */}
              <Card className="mb-6 bg-blue-50/60 border-blue-200/80 dark:bg-blue-950/20 dark:border-blue-900/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-300">단체 유형</p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">{getReligionLabel(currentTenant.religionType)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. 기본 정보 */}
              <Card className="mb-6 border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                    기본 정보
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    단체의 기본 명칭과 소개글을 입력하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">단체명 *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예: 각원사"
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
                      모바일 봉헌 메인 페이지 상단에 표시될 단체 소개 문구입니다
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 3. 연락처 정보 */}
              <Card className="mb-6 border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                    연락처 정보
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    단체의 위치 및 대표 연락처를 입력하세요
                  </CardDescription>
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
                        placeholder="충청남도 천안시 동남구 각원사길 245"
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
                      placeholder="상세 주소를 입력하세요 (예: 종무소 / 2층)"
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
                        placeholder="041-561-3545"
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
                        placeholder="contact@gakwonsa.or.kr"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. 법회 / 예배 / 미사 시간 */}
              <Card className="mb-6 border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                        {currentTenant.religionType === 'protestant' && '예배 시간'}
                        {currentTenant.religionType === 'buddhist' && '법회 시간'}
                        {currentTenant.religionType === 'catholic' && '미사 시간'}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        {currentTenant.religionType === 'protestant' && '예배'}
                        {currentTenant.religionType === 'buddhist' && '법회'}
                        {currentTenant.religionType === 'catholic' && '미사'} 등의 정기 일정을 관리하세요
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddSchedule}
                      className="cursor-pointer font-semibold text-xs"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      일정 추가
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {schedules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="font-medium text-sm">등록된 정기 일정이 없습니다</p>
                      <p className="text-xs text-slate-400 mt-1">우측 상단의 "일정 추가" 버튼을 눌러 일정을 등록해주세요</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {schedules.map((schedule, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`schedule-label-${index}`} className="text-xs">
                                구분 (예: 초하루법회, 정기일요법회)
                              </Label>
                              <Input
                                id={`schedule-label-${index}`}
                                value={schedule.label}
                                onChange={(e) => handleScheduleChange(index, 'label', e.target.value)}
                                placeholder="예: 초하루 인등법회"
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
                                placeholder="예: 매월 음력 초하루 오전 10시"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSchedule(index)}
                            className="text-destructive hover:text-destructive mt-6 cursor-pointer"
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
              <div className="flex justify-end gap-3 mt-8">
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="min-w-32 bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-md"
                >
                  {isSaving ? (
                    <>저장 중...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      기본정보 저장하기
                    </>
                  )}
                </Button>
              </div>

              {/* Info Note */}
              <Card className="mt-6 bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-slate-900">
                    <Info className="h-4 w-4 text-amber-600" />
                    안내사항
                  </h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• 별표(*) 표시된 항목은 필수 입력 항목입니다</li>
                    <li>• 이메일 및 전화번호는 신도들에게 공개되는 단체 대표 연락처입니다</li>
                    <li>• 로고 및 템플릿 디자인은 상단의 [디자인] 메뉴에서 설정하실 수 있습니다</li>
                    <li>• 고유번호증 및 정산 계좌 통장사본은 상단의 [단체서류] 메뉴에서 관리하실 수 있습니다</li>
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