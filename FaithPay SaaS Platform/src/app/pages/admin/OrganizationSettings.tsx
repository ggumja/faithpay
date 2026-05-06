import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp, mockTenants, Tenant } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '../../components/ui/separator';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

interface ScheduleItem {
  label: string;
  time: string;
}

export default function OrganizationSettings() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { currentTenant, setCurrentTenant, currentAdmin, updateTenantInfo } = useApp();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
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
      address: address.trim(),
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
      toast.success('단체 정보가 저장되었습니다');
    }, 500);
  };

  return (
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
          <h1 className="text-lg font-semibold">단체 기본정보</h1>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="h-8 w-8" style={{ color: currentTenant.primaryColor }} />
                <h1 className="text-3xl font-bold">단체 기본정보</h1>
              </div>
              <p className="text-muted-foreground">
                단체의 기본 정보를 관리하세요
              </p>
            </div>

            {/* Religion Type Info */}
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">종교 유형</p>
                    <p className="text-sm text-blue-700">{getReligionLabel(currentTenant.religionType)}</p>
                  </div>
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
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    주소 *
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="서울특별시 강남구 테헤란로 123"
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
      </div>
    </div>
  );
}