import { useState } from 'react';
import { Tenant, DonationItem, ReligionType } from '../context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import {
  Plus,
  Trash2,
  Church,
  MapPin,
  Phone,
  Mail,
  Clock,
  Palette,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from './ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

interface AddTenantDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  onAddTenant: (tenant: Tenant, donationItems: DonationItem[]) => void;
}

export default function AddTenantDialog({ isOpen, onClose, onAddTenant }: AddTenantDialogProps) {
  const [step, setStep] = useState(1);

  // 기본 정보
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [religionType, setReligionType] = useState<ReligionType>('protestant');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1976d2');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerImages, setBannerImages] = useState<string[]>(['']);

  // 예배/법회/미사 시간
  const [schedules, setSchedules] = useState<Array<{ label: string; time: string }>>([
    { label: '', time: '' },
  ]);

  // 봉헌 종류
  const [donationItems, setDonationItems] = useState<DonationItem[]>([
    {
      id: '1',
      name: '',
      description: '',
      amountType: 'flexible',
      fixedAmount: undefined,
      allowRecurring: true,
      allowOneTime: true,
      enablePrayerField: true,
      enabled: true,
    },
  ]);

  const resetForm = () => {
    setStep(1);
    setName('');
    setSlug('');
    setReligionType('protestant');
    setDescription('');
    setAddress('');
    setPhone('');
    setEmail('');
    setPrimaryColor('#1976d2');
    setLogoUrl('');
    setBannerImages(['']);
    setSchedules([{ label: '', time: '' }]);
    setDonationItems([
      {
        id: '1',
        name: '',
        description: '',
        amountType: 'flexible',
        fixedAmount: undefined,
        allowRecurring: true,
        allowOneTime: true,
        enablePrayerField: true,
        enabled: true,
      },
    ]);
  };

  const generateSlug = (name: string) => {
    // 한글을 영문으로 변환하는 간단한 로직 (실제로는 더 정교한 변환 필요)
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return slug || `tenant-${Date.now()}`;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug) {
      setSlug(generateSlug(value));
    }
  };

  const getReligionLabel = (type: ReligionType) => {
    switch (type) {
      case 'protestant':
        return '기독교';
      case 'catholic':
        return '천주교';
      case 'buddhist':
        return '불교';
    }
  };

  const getTerminology = (type: ReligionType) => {
    switch (type) {
      case 'protestant':
        return { donation: '헌금', member: '성도', prayer: '기도제목' };
      case 'catholic':
        return { donation: '봉헌', member: '교우', prayer: '미사지향' };
      case 'buddhist':
        return { donation: '보시', member: '불자', prayer: '발원문' };
    }
  };

  const addSchedule = () => {
    setSchedules([...schedules, { label: '', time: '' }]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = (index: number, field: 'label' | 'time', value: string) => {
    const updated = [...schedules];
    updated[index][field] = value;
    setSchedules(updated);
  };

  const addBannerImage = () => {
    setBannerImages([...bannerImages, '']);
  };

  const removeBannerImage = (index: number) => {
    setBannerImages(bannerImages.filter((_, i) => i !== index));
  };

  const updateBannerImage = (index: number, value: string) => {
    const updated = [...bannerImages];
    updated[index] = value;
    setBannerImages(updated);
  };

  const addDonationItem = () => {
    setDonationItems([
      ...donationItems,
      {
        id: String(donationItems.length + 1),
        name: '',
        description: '',
        amountType: 'flexible',
        fixedAmount: undefined,
        allowRecurring: true,
        allowOneTime: true,
        enablePrayerField: true,
        enabled: true,
      },
    ]);
  };

  const removeDonationItem = (index: number) => {
    setDonationItems(donationItems.filter((_, i) => i !== index));
  };

  const updateDonationItem = (index: number, field: keyof DonationItem, value: any) => {
    const updated = [...donationItems];
    updated[index] = { ...updated[index], [field]: value };
    setDonationItems(updated);
  };

  const validateStep1 = () => {
    if (!name.trim()) {
      toast.error('단체명을 입력해주세요');
      return false;
    }
    if (!slug.trim()) {
      toast.error('슬러그를 입력해주세요');
      return false;
    }
    if (!address.trim()) {
      toast.error('주소를 입력해주세요');
      return false;
    }
    if (!phone.trim()) {
      toast.error('전화번호를 입력해주세요');
      return false;
    }
    if (!email.trim()) {
      toast.error('이메일을 입력해주세요');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const validSchedules = schedules.filter((s) => s.label && s.time);
    if (validSchedules.length === 0) {
      toast.error('최소 1개의 예배/법회/미사 시간을 입력해주세요');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const validItems = donationItems.filter((item) => item.name.trim());
    if (validItems.length === 0) {
      toast.error('최소 1개의 봉헌 항목을 입력해주세요');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      return;
    }

    const newTenant: Tenant = {
      id: String(Date.now()),
      slug: slug.trim(),
      name: name.trim(),
      religionType,
      primaryColor,
      logoUrl: logoUrl.trim() || 'https://images.unsplash.com/photo-1620495137036-fccf4af581bf?w=200',
      bannerImages: bannerImages.filter((img) => img.trim()),
      description: description.trim(),
      address: address.trim(),
      contact: {
        phone: phone.trim(),
        email: email.trim(),
      },
      schedule: schedules.filter((s) => s.label && s.time),
      terminology: getTerminology(religionType),
    };

    const validDonationItems = donationItems.filter((item) => item.name.trim());

    onAddTenant(newTenant, validDonationItems);
    toast.success('새 단체가 추가되었습니다!');
    resetForm();
    onClose(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Church className="h-6 w-6 text-purple-600" />
            새 단체 추가
          </DialogTitle>
          <DialogDescription>
            단체의 기본 정보와 봉헌 종류를 설정하세요 (Step {step}/3)
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-purple-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
            3
          </div>
        </div>

        <Separator />

        {/* Step 1: 기본 정보 */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg">1단계: 기본 정보 입력</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">단체명 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="예: 기쁨의교회"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">슬러그 (URL 경로) *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="예: joyful-church"
                />
                <p className="text-xs text-muted-foreground">
                  영문 소문자, 숫자, 하이픈만 사용 가능
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="religionType">종교 유형 *</Label>
                <Select value={religionType} onValueChange={(v) => setReligionType(v as ReligionType)}>
                  <SelectTrigger id="religionType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protestant">기독교</SelectItem>
                    <SelectItem value="catholic">천주교</SelectItem>
                    <SelectItem value="buddhist">불교</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">소개</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="단체 소개를 입력하세요"
                  rows={3}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  주소 *
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="서울특별시 강남구 테헤란로 123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-1" />
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
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-1" />
                  이메일 *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@example.org"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">
                  <Palette className="h-4 w-4 inline mr-1" />
                  테마 색상
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#1976d2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">로고 URL</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>배너 이미지 URL</Label>
                {bannerImages.map((banner, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={banner}
                      onChange={(e) => updateBannerImage(index, e.target.value)}
                      placeholder="https://..."
                    />
                    {bannerImages.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBannerImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBannerImage}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  배너 이미지 추가
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 예배/법회/미사 시간 */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                2단계: {getReligionLabel(religionType)} 일정 입력
              </h3>
              <p className="text-sm text-muted-foreground">
                예배, 법회, 미사 시간을 입력하세요
              </p>
            </div>

            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex gap-3 items-start">
                      <Clock className="h-5 w-5 text-muted-foreground mt-2" />
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>일정명</Label>
                          <Input
                            value={schedule.label}
                            onChange={(e) => updateSchedule(index, 'label', e.target.value)}
                            placeholder={
                              religionType === 'protestant'
                                ? '주일 1부 예배'
                                : religionType === 'catholic'
                                ? '주일미사'
                                : '일요법회'
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>시간</Label>
                          <Input
                            value={schedule.time}
                            onChange={(e) => updateSchedule(index, 'time', e.target.value)}
                            placeholder="오전 11:00"
                          />
                        </div>
                      </div>
                      {schedules.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSchedule(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addSchedule}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                일정 추가
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 봉헌 종류 */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                3단계: {getTerminology(religionType).donation} 종류 설정
              </h3>
              <p className="text-sm text-muted-foreground">
                신도들이 선택할 수 있는 봉헌 항목을 추가하세요
              </p>
            </div>

            <div className="space-y-4">
              {donationItems.map((item, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">봉헌 항목 #{index + 1}</CardTitle>
                      {donationItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDonationItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>항목명 *</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateDonationItem(index, 'name', e.target.value)}
                          placeholder={
                            religionType === 'protestant'
                              ? '십일조'
                              : religionType === 'catholic'
                              ? '교무금'
                              : '불사공양'
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>금액 타입</Label>
                        <Select
                          value={item.amountType}
                          onValueChange={(v) => updateDonationItem(index, 'amountType', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flexible">자유 금액</SelectItem>
                            <SelectItem value="fixed">고정 금액</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {item.amountType === 'fixed' && (
                        <div className="space-y-2">
                          <Label>고정 금액 (원)</Label>
                          <Input
                            type="number"
                            value={item.fixedAmount || ''}
                            onChange={(e) =>
                              updateDonationItem(index, 'fixedAmount', Number(e.target.value))
                            }
                            placeholder="10000"
                          />
                        </div>
                      )}

                      <div className="col-span-2 space-y-2">
                        <Label>설명</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateDonationItem(index, 'description', e.target.value)}
                          placeholder="봉헌 항목에 대한 설명을 입력하세요"
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.allowRecurring}
                          onChange={(e) =>
                            updateDonationItem(index, 'allowRecurring', e.target.checked)
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">정기 봉헌 허용</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.allowOneTime}
                          onChange={(e) =>
                            updateDonationItem(index, 'allowOneTime', e.target.checked)
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">일시 봉헌 허용</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.enablePrayerField}
                          onChange={(e) =>
                            updateDonationItem(index, 'enablePrayerField', e.target.checked)
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm">기도문/지향 입력 활성화</span>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addDonationItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                봉헌 항목 추가
              </Button>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <Separator />
        <div className="flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onClose(false);
            }}
          >
            취소
          </Button>

          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                이전
              </Button>
            )}

            {step < 3 ? (
              <Button type="button" onClick={handleNext}>
                다음
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
                <Save className="h-4 w-4 mr-2" />
                단체 추가
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}