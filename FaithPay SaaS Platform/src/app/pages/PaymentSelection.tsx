import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Separator } from '../components/ui/separator';
import { Checkbox } from '../components/ui/checkbox';
import { ArrowLeft, CreditCard, Building2, Smartphone, Wallet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { paymentAPI } from '../api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function PaymentSelection() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, donationFormData, currentAdmin } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [agreed, setAgreed] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [password, setPassword] = useState('');
  const [birth, setBirth] = useState('');
  const [installment, setInstallment] = useState('00');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!currentTenant || !donationFormData) {
    return null;
  }

  const handlePayment = async () => {
    if (donationFormData.isRecurring && !currentAdmin) {
      toast.error('정기결제는 회원 로그인 후 이용 가능합니다.');
      return;
    }

    if (!agreed) {
      toast.error('결제 진행에 동의해주세요');
      return;
    }

    if (paymentMethod !== 'card') {
      toast.success('결제가 진행 중입니다...');
      setTimeout(() => {
        navigate(`/${tenantSlug}/complete`);
      }, 1500);
      return;
    }

    if (!cardNumber || !expiry || !password || !birth) {
      toast.error('카드 정보를 모두 입력해주세요.');
      return;
    }

    const cleanExpiry = expiry.replace(/[^0-9]/g, '');
    if (cleanExpiry.length !== 4) {
      toast.error('유효기간은 4자리(MMYY)로 입력해주세요.');
      return;
    }
    const expMm = cleanExpiry.substring(0, 2);
    const expYy = cleanExpiry.substring(2, 4);

    setIsProcessing(true);
    toast.success('결제가 진행 중입니다...');

    try {
      const response = await paymentAPI.processManual({
        tenantId: currentTenant.id,
        donationData: donationFormData,
        paymentData: {
          cardNo: cardNumber.replace(/[^0-9]/g, ''),
          cardExpYy: expYy,
          cardExpMm: expMm,
          cardPw: password,
          cardHolderYmd: birth,
          installment: installment,
        }
      });

      if (response.success) {
        toast.success('결제가 완료되었습니다.');
        navigate(`/${tenantSlug}/complete`);
      } else {
        toast.error(`결제 실패: ${response.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
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
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20 mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            이전
          </Button>
          <h1 className="text-2xl font-bold">결제 수단 선택</h1>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>최종 {currentTenant.terminology.donation} 금액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">항목</span>
                  <span className="font-medium">{donationFormData.itemName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">성명</span>
                  <span className="font-medium">{donationFormData.name}</span>
                </div>
                {donationFormData.isRecurring && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">결제 유형</span>
                    <span className="font-medium text-blue-600">
                      정기 결제 (매월 {donationFormData.recurringDay}일)
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-semibold">총 금액</span>
                  <span
                    className="text-3xl font-bold"
                    style={{ color: currentTenant.primaryColor }}
                  >
                    {donationFormData.amount.toLocaleString()}원
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>결제 수단 선택</CardTitle>
              <CardDescription>
                안전한 결제를 위해 PG사(결제대행사)를 통해 진행됩니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                {!donationFormData.isRecurring && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <RadioGroupItem value="simple" id="simple" />
                      <Label htmlFor="simple" className="flex-1 cursor-pointer font-semibold">
                        간편결제
                      </Label>
                    </div>
                    {paymentMethod === 'simple' && (
                      <div className="grid grid-cols-3 gap-3 ml-6">
                        <Button variant="outline" className="h-16 flex-col">
                          <Smartphone className="h-5 w-5 mb-1" />
                          <span className="text-xs">카카오페이</span>
                        </Button>
                        <Button variant="outline" className="h-16 flex-col">
                          <Wallet className="h-5 w-5 mb-1" />
                          <span className="text-xs">네이버페이</span>
                        </Button>
                        <Button variant="outline" className="h-16 flex-col">
                          <Smartphone className="h-5 w-5 mb-1" />
                          <span className="text-xs">토스페이</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Credit Card */}
                <div className={`border rounded-lg p-4 ${donationFormData.isRecurring ? 'border-blue-500 bg-blue-50/30' : ''}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 cursor-pointer font-semibold">
                      <CreditCard className="h-4 w-4 inline mr-2" />
                      {donationFormData.isRecurring ? '신용카드 자동결제 (카드등록)' : '신용/체크카드'}
                    </Label>
                  </div>
                  {paymentMethod === 'card' && (
                    <div className="ml-6 space-y-4">
                      {donationFormData.isRecurring && (
                        <div className="bg-blue-100 p-3 rounded-md text-sm text-blue-800">
                          정기결제를 위해 결제 수단을 안전하게 등록합니다. 등록된 카드로 매월/매주 자동 결제됩니다.
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">카드번호</Label>
                        <Input
                          id="cardNumber"
                          placeholder="**** **** **** ****"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          autoComplete="cc-number"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">유효기간</Label>
                          <Input id="expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" autoComplete="cc-exp" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">비밀번호 앞 2자리</Label>
                          <Input id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="**" type="password" maxLength={2} autoComplete="new-password" data-lpignore="true" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birth">생년월일 (6자리) 또는 사업자번호 (10자리)</Label>
                        <Input id="birth" value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="YYMMDD 또는 1234567890" maxLength={10} autoComplete="off" />
                      </div>
                      {!donationFormData.isRecurring && (
                        <div className="space-y-2">
                          <Label htmlFor="installment">할부 개월 수</Label>
                          <Select 
                            value={installment} 
                            onValueChange={setInstallment}
                            disabled={donationFormData.amount < 50000}
                          >
                            <SelectTrigger id="installment">
                              <SelectValue placeholder="할부 개월 수 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="00">일시불</SelectItem>
                              {donationFormData.amount >= 50000 && (
                                <>
                                  {[...Array(11)].map((_, i) => {
                                    const months = i + 2;
                                    const value = months.toString().padStart(2, '0');
                                    return <SelectItem key={value} value={value}>{months}개월</SelectItem>;
                                  })}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          {donationFormData.amount < 50000 && (
                            <p className="text-xs text-muted-foreground mt-1">50,000원 이상 결제 시 할부 결제가 가능합니다.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!donationFormData.isRecurring && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <RadioGroupItem value="bank" id="bank" />
                      <Label htmlFor="bank" className="flex-1 cursor-pointer font-semibold">
                        <Building2 className="h-4 w-4 inline mr-2" />
                        가상계좌 (무통장입금)
                      </Label>
                    </div>
                    {paymentMethod === 'bank' && (
                      <div className="ml-6">
                        <p className="text-sm text-muted-foreground">
                          입금 계좌는 결제 완료 후 안내됩니다
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          * 24시간 내 입금 시 자동으로 완료됩니다
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-2">
                <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
                <Label
                  htmlFor="terms"
                  className="text-sm font-normal cursor-pointer leading-relaxed"
                >
                  상기 결제 진행에 동의하며, 개인정보 처리방침 및 서비스 이용약관에 동의합니다.
                  정기 결제의 경우 언제든지 해지할 수 있습니다.
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Recurring Payment Login Warning */}
          {donationFormData.isRecurring && !currentAdmin && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-lg flex flex-col items-center mb-4">
              <p className="mb-2 font-medium">정기결제(카드등록)는 회원 전용 서비스입니다.</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/login')} className="mt-1">
                로그인 / 회원가입하기
              </Button>
            </div>
          )}

          {/* Submit Button */}
          <Button
            className="w-full h-14 text-lg font-semibold"
            onClick={handlePayment}
            disabled={!agreed || (donationFormData.isRecurring && !currentAdmin) || isProcessing}
            style={
              (agreed && !(donationFormData.isRecurring && !currentAdmin))
                ? { backgroundColor: currentTenant.primaryColor }
                : {}
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                처리 중...
              </>
            ) : (
              `${donationFormData.amount.toLocaleString()}원 결제하기`
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            PG사: 나이스페이먼츠 / 이니시스 / KG이니시스
          </p>
        </div>
      </div>
    </div>
  );
}
