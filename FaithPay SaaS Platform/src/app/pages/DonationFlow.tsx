import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { useApp, DonationItem } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { ArrowLeft, ArrowRight, Heart, User, Phone, MessageSquare, Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface FamilyMember {
  name: string;
  birthDate: string;
  calendar: string;
}

export default function DonationFlow() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTenant, setDonationFormData } = useApp();

  const [step, setStep] = useState(1);
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(
    location.state?.selectedItem || null
  );
  
  // Form data
  const [amount, setAmount] = useState<number>(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [prayerText, setPrayerText] = useState('');
  const [baptismName, setBaptismName] = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState<number>(5);

  useEffect(() => {
    if (!currentTenant) {
      navigate('/');
    }
  }, [currentTenant, navigate]);

  if (!currentTenant || !selectedItem) {
    return null;
  }

  const progress = (step / 4) * 100;

  const handleAmountClick = (value: number) => {
    setAmount(value);
  };

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { name: '', birthDate: '', calendar: 'solar' }]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...familyMembers];
    updated[index][field] = value;
    setFamilyMembers(updated);
  };

  const handleNext = () => {
    if (step === 1 && amount === 0) {
      toast.error('금액을 입력해주세요');
      return;
    }
    if (step === 2) {
      if (!name || !phone) {
        toast.error('이름과 전화번호를 입력해주세요');
        return;
      }
    }
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = () => {
    const formData = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      amount,
      name,
      phone,
      prayerText: prayerText || undefined,
      baptismName: baptismName || undefined,
      familyMembers: familyMembers.length > 0 ? familyMembers : undefined,
      isRecurring,
      recurringDay: isRecurring ? recurringDay : undefined,
    };
    
    setDonationFormData(formData);
    navigate(`/${tenantSlug}/payment`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div
        className="text-white py-8 px-4"
        style={{
          background: `linear-gradient(135deg, ${currentTenant.primaryColor} 0%, ${currentTenant.primaryColor}dd 100%)`,
        }}
      >
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              이전
            </Button>
            <span className="text-sm font-medium">
              {step} / 4 단계
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-white/30" />
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="p-2 rounded-full"
                style={{ backgroundColor: `${currentTenant.primaryColor}20` }}
              >
                <Heart className="h-5 w-5" style={{ color: currentTenant.primaryColor }} />
              </div>
              <div>
                <CardTitle>{selectedItem.name}</CardTitle>
                <CardDescription>{selectedItem.description}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Amount */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">금액을 선택해주세요</h3>
                  
                  {selectedItem.amountType === 'fixed' && selectedItem.fixedAmount ? (
                    <div className="text-center p-8 bg-slate-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">고정 금액</p>
                      <p className="text-4xl font-bold" style={{ color: currentTenant.primaryColor }}>
                        {selectedItem.fixedAmount.toLocaleString()}원
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <Button
                          variant="outline"
                          onClick={() => setAmount(amount + 1000)}
                        >
                          +1천원
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setAmount(amount + 5000)}
                        >
                          +5천원
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setAmount(amount + 10000)}
                        >
                          +1만원
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setAmount(amount + 50000)}
                        >
                          +5만원
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setAmount(amount + 100000)}
                        >
                          +10만원
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setAmount(0)}
                        >
                          초기화
                        </Button>
                      </div>
                      
                      <div className="text-center p-6 bg-slate-50 rounded-lg mb-4">
                        <p className="text-sm text-muted-foreground mb-2">선택한 금액</p>
                        <p className="text-4xl font-bold" style={{ color: currentTenant.primaryColor }}>
                          {amount.toLocaleString()}원
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>직접 입력</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="금액을 입력하세요"
                            value={amount || ''}
                            onChange={(e) => setAmount(Number(e.target.value))}
                          />
                          <span className="flex items-center text-muted-foreground">원</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {selectedItem.amountType === 'fixed' && selectedItem.fixedAmount && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setAmount(selectedItem.fixedAmount!);
                      handleNext();
                    }}
                    style={{ backgroundColor: currentTenant.primaryColor }}
                  >
                    다음 단계
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}

            {/* Step 2: Personal Info */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">신원 정보를 입력해주세요</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">
                    <User className="h-4 w-4 inline mr-2" />
                    성명 *
                  </Label>
                  <Input
                    id="name"
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline mr-2" />
                    전화번호 *
                  </Label>
                  <Input
                    id="phone"
                    placeholder="010-1234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                {currentTenant.religionType === 'catholic' && (
                  <div className="space-y-2">
                    <Label htmlFor="baptismName">세례명</Label>
                    <Input
                      id="baptismName"
                      placeholder="프란치스코"
                      value={baptismName}
                      onChange={(e) => setBaptismName(e.target.value)}
                    />
                  </div>
                )}

                {currentTenant.religionType === 'buddhist' && (
                  <div className="space-y-4">
                    <Label>가족 정보 (불교)</Label>
                    {familyMembers.map((member, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label>가족 {index + 1}</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFamilyMember(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            placeholder="이름"
                            value={member.name}
                            onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                          />
                          <Input
                            placeholder="생년월일 (예: 1990-01-01)"
                            value={member.birthDate}
                            onChange={(e) => updateFamilyMember(index, 'birthDate', e.target.value)}
                          />
                          <Select
                            value={member.calendar}
                            onValueChange={(value) => updateFamilyMember(index, 'calendar', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="solar">양력</SelectItem>
                              <SelectItem value="lunar">음력</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </Card>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={addFamilyMember}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      가족 추가
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Prayer/Message */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">
                  {currentTenant.terminology.prayer}
                  {selectedItem.enablePrayerField ? '' : ' (선택사항)'}
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="prayer">
                    <MessageSquare className="h-4 w-4 inline mr-2" />
                    {currentTenant.terminology.prayer}
                  </Label>
                  <Textarea
                    id="prayer"
                    placeholder={
                      currentTenant.religionType === 'protestant'
                        ? '가족의 건강과 평안을 기원합니다...'
                        : currentTenant.religionType === 'buddhist'
                        ? '자녀의 학업 성취를 발원합니다...'
                        : '선종하신 분들을 기억하며...'
                    }
                    value={prayerText}
                    onChange={(e) => setPrayerText(e.target.value)}
                    rows={6}
                  />
                  <p className="text-sm text-muted-foreground">
                    관리자가 {currentTenant.terminology.prayer}을(를) 확인하고 인쇄할 수 있습니다
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Recurring */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">결제 방식을 선택해주세요</h3>
                
                <RadioGroup
                  value={isRecurring ? 'recurring' : 'onetime'}
                  onValueChange={(value) => setIsRecurring(value === 'recurring')}
                >
                  {selectedItem.allowOneTime && (
                    <div className="flex items-center space-x-2 border rounded-lg p-4">
                      <RadioGroupItem value="onetime" id="onetime" />
                      <Label htmlFor="onetime" className="flex-1 cursor-pointer">
                        <div>
                          <p className="font-semibold">단발 {currentTenant.terminology.donation}</p>
                          <p className="text-sm text-muted-foreground">
                            한 번만 {currentTenant.terminology.donation}합니다
                          </p>
                        </div>
                      </Label>
                    </div>
                  )}
                  
                  {selectedItem.allowRecurring && (
                    <div className="flex items-center space-x-2 border rounded-lg p-4">
                      <RadioGroupItem value="recurring" id="recurring" />
                      <Label htmlFor="recurring" className="flex-1 cursor-pointer">
                        <div>
                          <p className="font-semibold">정기 {currentTenant.terminology.donation}</p>
                          <p className="text-sm text-muted-foreground">
                            매월 자동으로 {currentTenant.terminology.donation}합니다
                          </p>
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>

                {isRecurring && (
                  <div className="space-y-2 mt-4">
                    <Label>
                      <CalendarIcon className="h-4 w-4 inline mr-2" />
                      결제일 선택
                    </Label>
                    <Select
                      value={recurringDay.toString()}
                      onValueChange={(value) => setRecurringDay(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">매월 5일</SelectItem>
                        <SelectItem value="15">매월 15일</SelectItem>
                        <SelectItem value="25">매월 25일</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <h4 className="font-semibold mb-2">최종 확인</h4>
                  <div className="space-y-1 text-sm">
                    <p>• {currentTenant.terminology.donation} 항목: {selectedItem.name}</p>
                    <p>• 금액: {amount.toLocaleString()}원</p>
                    <p>• 성명: {name}</p>
                    <p>• 전화번호: {phone}</p>
                    {isRecurring && <p>• 정기 결제: 매월 {recurringDay}일</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {step < 4 && selectedItem.amountType === 'flexible' && (
              <Button
                className="w-full"
                onClick={handleNext}
                style={{ backgroundColor: currentTenant.primaryColor }}
              >
                다음 단계
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {step === 4 && (
              <Button
                className="w-full"
                onClick={handleSubmit}
                style={{ backgroundColor: currentTenant.primaryColor }}
              >
                결제하기
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}