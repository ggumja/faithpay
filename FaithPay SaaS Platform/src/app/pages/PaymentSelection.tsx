import { useState, useEffect } from 'react';
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
import { paymentAPI, donationAPI } from '../api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';

export default function PaymentSelection() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant, tenants, donationFormData, currentAdmin } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [agreed, setAgreed] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [password, setPassword] = useState('');
  const [birth, setBirth] = useState('');
  const [installment, setInstallment] = useState('00');
  const [isProcessing, setIsProcessing] = useState(false);

  const [pgProvider, setPgProvider] = useState<string>('');
  const [cardPaymentType, setCardPaymentType] = useState<'cert' | 'manual'>('cert');

  useEffect(() => {
    if (tenantSlug) {
      const tenant = tenants.find(t => t.slug === tenantSlug);
      if (tenant) {
        setCurrentTenant(tenant);
      }
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  useEffect(() => {
    if (currentTenant) {
      paymentAPI.getConfig(currentTenant.id).then(res => {
        if (res.success && res.data) {
          setPgProvider(res.data.pgProvider || '');
        }
      });
    }
  }, [currentTenant]);

  if (!currentTenant || !donationFormData) {
    return null;
  }

  const ft = FAITH_THEMES[currentTenant.religionType as ReligionId] ?? FAITH_THEMES.protestant;

  const pollDonationStatus = (donationId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 60) { // 3 minutes timeout
        clearInterval(interval);
        toast.error('결제 확인 시간이 초과되었습니다.');
        setIsProcessing(false);
        return;
      }
      
      try {
        const donationsRes = await donationAPI.getByTenant(currentTenant.id);
        if (donationsRes.success && donationsRes.data) {
          const donation = donationsRes.data.find(d => d.id === donationId);
          if (donation) {
            if (donation.paymentStatus === 'completed') {
              clearInterval(interval);
              toast.success('결제가 완료되었습니다.');
              navigate(`/${tenantSlug}/complete`);
            } else if (donation.paymentStatus === 'failed') {
              clearInterval(interval);
              toast.error('결제에 실패하였습니다.');
              setIsProcessing(false);
            }
          }
        }
      } catch (error) {
        console.error('Error polling donation status:', error);
      }
    }, 3000); // 3 seconds
  };

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

    // 나노 PG 인증결제 처리
    if (pgProvider === 'nanopay' && cardPaymentType === 'cert' && !donationFormData.isRecurring) {
      setIsProcessing(true);
      toast.info('결제창을 요청하고 있습니다...');
      
      try {
        // 팝업 창 미리 오픈 (팝업 차단 방지)
        const paymentWindow = window.open('about:blank', 'NanopayPayment', 'width=650,height=700,scrollbars=yes,resizable=yes');
        if (!paymentWindow) {
          toast.error('팝업 차단이 설정되어 있습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
          setIsProcessing(false);
          return;
        }

        paymentWindow.document.write('<p style="text-align:center;padding-top:40px;font-family:sans-serif;">나노페이 결제창을 불러오는 중입니다...</p>');

        const deviceType = window.innerWidth <= 768 ? 'mobile' : 'pc';
        const response = await paymentAPI.processCertRequest({
          tenantId: currentTenant.id,
          donationData: donationFormData,
          deviceType,
          payWay: 'card'
        });

        console.log("Nanopay API Response:", response);
        if (response.success && response.html) {
          toast.success('결제창이 생성되었습니다. 팝업 창에서 결제를 완료해주세요.');
          paymentWindow.document.open();
          paymentWindow.document.write(response.html);
          paymentWindow.document.close();
          pollDonationStatus(response.donationId);
        } else {
          paymentWindow.close();
          toast.error(`결제창 요청 실패: ${response.error || '알 수 없는 오류'}`);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Cert payment request error:', error);
        toast.error('결제 처리 중 오류가 발생했습니다.');
        setIsProcessing(false);
      }
      return;
    }

    // 수기결제 카드 입력값 검증
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans pb-16">
      {/* Header Banner */}
      <section className="px-4 py-8 text-white" style={{ background: ft.heroGradient }}>
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <Button
            variant="ghost"
            className="w-fit text-white hover:bg-white/10 px-3 cursor-pointer rounded-full h-10 flex items-center justify-center gap-1.5"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>이전으로</span>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">결제 수단 선택</h1>
        </div>
      </section>

      {/* Main Form Area */}
      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        
        {/* Summary Card */}
        <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-xs rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
            <CardTitle className="text-base font-extrabold">최종 봉헌 내역</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">봉헌 항목</span>
                <span className="font-bold text-zinc-850 dark:text-zinc-150">{donationFormData.itemName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">성명</span>
                <span className="font-bold text-zinc-850 dark:text-zinc-150">{donationFormData.name}</span>
              </div>
              {donationFormData.isRecurring && (
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">결제 유형</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    정기 결제 (매월 {donationFormData.recurringDay}일)
                  </span>
                </div>
              )}
            </div>
            
            <Separator className="bg-zinc-100 dark:bg-zinc-800" />
            
            <div className="flex justify-between items-center">
              <span className="text-base font-extrabold text-zinc-500 dark:text-zinc-400">총 결제 금액</span>
              <span className="text-3xl font-extrabold" style={{ color: ft.primary }}>
                {donationFormData.amount.toLocaleString()}원
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selector Card */}
        <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-xs rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
            <CardTitle className="text-base font-extrabold">결제 수단 선택</CardTitle>
            <CardDescription className="text-xs text-zinc-450 dark:text-zinc-500 font-medium">
              안전하고 투명한 금융 거래를 위해 공식 결제대행사(PG)를 거쳐 결제가 진행됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="flex flex-col gap-4">
              
              {/* Easy Payment option */}
              {!donationFormData.isRecurring && (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 transition-colors">
                  <div className="flex items-center space-x-2.5 mb-3">
                    <RadioGroupItem value="simple" id="simple" className="border-zinc-300 dark:border-zinc-700" />
                    <Label htmlFor="simple" className="flex-1 cursor-pointer font-bold text-sm">
                      간편결제
                    </Label>
                  </div>
                  {paymentMethod === 'simple' && (
                    <div className="grid grid-cols-3 gap-2.5 ml-6 animate-fade-in">
                      <Button variant="outline" className="h-16 flex-col border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer rounded-xl">
                        <Smartphone className="h-5 w-5 mb-1 text-yellow-500" />
                        <span className="text-[11px] font-bold">카카오페이</span>
                      </Button>
                      <Button variant="outline" className="h-16 flex-col border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer rounded-xl">
                        <Wallet className="h-5 w-5 mb-1 text-green-500" />
                        <span className="text-[11px] font-bold">네이버페이</span>
                      </Button>
                      <Button variant="outline" className="h-16 flex-col border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer rounded-xl">
                        <Smartphone className="h-5 w-5 mb-1 text-blue-500" />
                        <span className="text-[11px] font-bold">토스페이</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Credit Card option */}
              <div 
                className="border rounded-xl p-4 transition-all"
                style={{ 
                  borderColor: paymentMethod === 'card' ? ft.primary : 'rgba(112, 115, 124, 0.16)',
                  background: paymentMethod === 'card' && donationFormData.isRecurring ? ft.primaryBg : undefined
                }}
              >
                <div className="flex items-center space-x-2.5 mb-3">
                  <RadioGroupItem value="card" id="card" className="border-zinc-300 dark:border-zinc-700" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer font-bold text-sm flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4" />
                    <span>{donationFormData.isRecurring ? '신용카드 자동 등록 (매월 자동 청구)' : '신용/체크카드'}</span>
                  </Label>
                </div>
                
                {paymentMethod === 'card' && (
                  <div className="ml-6 space-y-4 animate-fade-in mt-4 border-t pt-4 border-zinc-100 dark:border-zinc-800">
                    {pgProvider === 'nanopay' && !donationFormData.isRecurring && (
                      <div className="flex gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-850 rounded-lg">
                        <button
                          type="button"
                          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${cardPaymentType === 'cert' ? 'bg-white dark:bg-zinc-900 shadow-xs text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-900'}`}
                          onClick={() => setCardPaymentType('cert')}
                        >
                          일반 결제창 (인증결제)
                        </button>
                        <button
                          type="button"
                          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${cardPaymentType === 'manual' ? 'bg-white dark:bg-zinc-900 shadow-xs text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-900'}`}
                          onClick={() => setCardPaymentType('manual')}
                        >
                          직접 입력 (수기결제)
                        </button>
                      </div>
                    )}
                    
                    {pgProvider === 'nanopay' && cardPaymentType === 'cert' && !donationFormData.isRecurring ? (
                      <div className="bg-zinc-50 dark:bg-zinc-900/60 p-5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center text-xs text-zinc-650 dark:text-zinc-400 flex flex-col gap-2.5 justify-center items-center">
                        <CreditCard className="h-8 w-8 text-zinc-400 dark:text-zinc-600 animate-pulse" />
                        <p className="font-bold">안전한 카드 결제창이 호출됩니다</p>
                        <p className="text-[10px] text-zinc-500 leading-relaxed max-w-sm">결제 완료 버튼을 누르시면 카드사별 안심클릭 및 모바일 App카드 결제 공식 팝업창이 열립니다.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {donationFormData.isRecurring && (
                          <div className="p-3.5 rounded-xl text-xs font-medium bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 leading-relaxed">
                            정기 결제 등록 시 기재하신 카드로 매월 지정일에 자동 결제됩니다. 언제든지 관리 메뉴에서 직접 해지하실 수 있습니다.
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="cardNumber" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">카드번호</Label>
                          <Input
                            id="cardNumber"
                            placeholder="**** **** **** ****"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            autoComplete="cc-number"
                            className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="expiry" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">유효기간</Label>
                            <Input 
                              id="expiry" 
                              value={expiry} 
                              onChange={(e) => setExpiry(e.target.value)} 
                              placeholder="MM/YY" 
                              autoComplete="cc-exp" 
                              className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="password" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">비밀번호 앞 2자리</Label>
                            <Input 
                              id="password" 
                              value={password} 
                              onChange={(e) => setPassword(e.target.value)} 
                              placeholder="**" 
                              type="password" 
                              maxLength={2} 
                              autoComplete="new-password" 
                              data-lpignore="true" 
                              className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="birth" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">생년월일 (YYMMDD) 또는 사업자번호 (10자리)</Label>
                          <Input 
                            id="birth" 
                            value={birth} 
                            onChange={(e) => setBirth(e.target.value)} 
                            placeholder="YYMMDD" 
                            maxLength={10} 
                            autoComplete="off" 
                            className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
                          />
                        </div>
                        {!donationFormData.isRecurring && (
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="installment" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">할부 개월 수</Label>
                            <Select 
                              value={installment} 
                              onValueChange={setInstallment}
                              disabled={donationFormData.amount < 50000}
                            >
                              <SelectTrigger id="installment" className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
                                <SelectValue placeholder="할부 개월 수 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="00" className="text-xs">일시불</SelectItem>
                                {donationFormData.amount >= 50000 && (
                                  <>
                                    {[...Array(11)].map((_, i) => {
                                      const months = i + 2;
                                      const value = months.toString().padStart(2, '0');
                                      return <SelectItem key={value} value={value} className="text-xs">{months}개월</SelectItem>;
                                    })}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            {donationFormData.amount < 50000 && (
                              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-medium">5만원 이상 결제 시 할부 선택이 가능합니다.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Virtual Account option */}
              {!donationFormData.isRecurring && (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 transition-colors">
                  <div className="flex items-center space-x-2.5 mb-3">
                    <RadioGroupItem value="bank" id="bank" className="border-zinc-300 dark:border-zinc-700" />
                    <Label htmlFor="bank" className="flex-1 cursor-pointer font-bold text-sm flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      <span>가상계좌 (무통장 입금)</span>
                    </Label>
                  </div>
                  {paymentMethod === 'bank' && (
                    <div className="ml-6 animate-fade-in text-xs text-zinc-500 dark:text-zinc-400 font-medium flex flex-col gap-1">
                      <p>· 입금하실 가상계좌 정보는 신청 완료 후에 화면과 알림톡으로 상세 제공됩니다.</p>
                      <p>· 발급된 가상계좌로 24시간 이내 입금하시면 결제 처리가 자동 완료됩니다.</p>
                    </div>
                  )}
                </div>
              )}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Terms Agreement Card */}
        <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-xs rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-2.5">
              <Checkbox 
                id="terms" 
                checked={agreed} 
                onCheckedChange={(checked) => setAgreed(checked as boolean)} 
                className="mt-0.5 border-zinc-300 dark:border-zinc-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white"
              />
              <Label
                htmlFor="terms"
                className="text-xs font-medium cursor-pointer leading-relaxed text-zinc-500 dark:text-zinc-400"
              >
                상기 결제 신청 내역을 최종 확인하였으며, 이에 동의합니다. 또한 개인정보 보호정책 및 서비스 이용약관에 전체 동의합니다. 정기 봉헌 설정 건은 관리자 메뉴를 통해 언제든지 자유롭게 해지 가능합니다.
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Recurring Payment Login Warning */}
        {donationFormData.isRecurring && !currentAdmin && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/50 text-amber-800 dark:text-amber-450 p-4 rounded-xl flex flex-col items-center gap-2.5 text-center">
            <p className="text-xs font-bold leading-relaxed">
              정기 봉헌(카드 자동 등록)은 회원가입/로그인 후에 신청할 수 있습니다.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/admin/login')} 
              className="h-8 text-xs font-bold rounded-lg border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 hover:bg-amber-100/10 cursor-pointer"
            >
              로그인 / 회원가입하기
            </Button>
          </div>
        )}

        {/* Submit Button */}
        <Button
          className="w-full h-14 text-sm font-bold tracking-wide rounded-xl text-white shadow-md disabled:bg-zinc-200 disabled:dark:bg-zinc-800 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer disabled:shadow-none"
          onClick={handlePayment}
          disabled={!agreed || (donationFormData.isRecurring && !currentAdmin) || isProcessing}
          style={
            (agreed && !(donationFormData.isRecurring && !currentAdmin))
              ? { backgroundColor: ft.primary }
              : {}
          }
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>결제 처리 중...</span>
            </div>
          ) : (
            `${donationFormData.amount.toLocaleString()}원 결제하기`
          )}
        </Button>

        <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-650 font-medium">
          보안인증협력사: 나이스페이먼츠 / 토스페이먼츠 / KG이니시스
        </p>

      </main>
    </div>
  );
}

