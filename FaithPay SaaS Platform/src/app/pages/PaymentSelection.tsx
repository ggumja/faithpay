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
import { ArrowLeft, CreditCard, Building2, Smartphone, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentSelection() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, donationFormData } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [agreed, setAgreed] = useState(false);
  const [cardNumber, setCardNumber] = useState('');

  if (!currentTenant || !donationFormData) {
    return null;
  }

  const handlePayment = () => {
    if (!agreed) {
      toast.error('결제 진행에 동의해주세요');
      return;
    }

    // 결제 처리 시뮬레이션
    toast.success('결제가 진행 중입니다...');
    
    setTimeout(() => {
      navigate(`/${tenantSlug}/complete`);
    }, 1500);
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
                {/* Simple Payment */}
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

                {/* Credit Card */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 cursor-pointer font-semibold">
                      <CreditCard className="h-4 w-4 inline mr-2" />
                      신용/체크카드
                    </Label>
                  </div>
                  {paymentMethod === 'card' && (
                    <div className="ml-6 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">카드번호</Label>
                        <Input
                          id="cardNumber"
                          placeholder="**** **** **** ****"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">유효기간</Label>
                          <Input id="expiry" placeholder="MM/YY" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC</Label>
                          <Input id="cvc" placeholder="***" type="password" maxLength={3} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Virtual Account */}
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

          {/* Submit Button */}
          <Button
            className="w-full h-14 text-lg font-semibold"
            onClick={handlePayment}
            disabled={!agreed}
            style={
              agreed
                ? { backgroundColor: currentTenant.primaryColor }
                : {}
            }
          >
            {donationFormData.amount.toLocaleString()}원 결제하기
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            PG사: 나이스페이먼츠 / 이니시스 / KG이니시스
          </p>
        </div>
      </div>
    </div>
  );
}
