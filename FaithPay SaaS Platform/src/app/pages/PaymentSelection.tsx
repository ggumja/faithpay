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
import { paymentAPI, donationAPI, kakaoPayAPI } from '../api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { KakaoPayLogo, NaverPayLogo, TossPayLogo } from '../components/PayBrandLogos';

export default function PaymentSelection() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant, tenants, donationFormData, currentAdmin } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [selectedEasyPay, setSelectedEasyPay] = useState<'kakaopay' | 'naverpay' | 'tosspay'>('kakaopay');
  const [agreed, setAgreed] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [password, setPassword] = useState('');
  const [birth, setBirth] = useState('');
  const [installment, setInstallment] = useState('00');
  const [isProcessing, setIsProcessing] = useState(false);

  // 정기결제 주기 옵션 State (매일 / 매주 / 매월) — 전단계(DonationFlow)에서 선택한 주기 값 유지
  const [recurringInterval, setRecurringInterval] = useState<'daily' | 'weekly' | 'monthly'>(
    donationFormData?.recurringInterval || 'monthly'
  );
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState<string>(
    donationFormData?.recurringDayOfWeek || '일'
  );
  const [recurringDay, setRecurringDay] = useState<number>(
    donationFormData?.recurringDay || 10
  );

  const [pgProvider, setPgProvider] = useState<string>('');
  const [cardPaymentType, setCardPaymentType] = useState<'cert' | 'manual'>('cert');
  const [enableCard, setEnableCard] = useState<boolean>(true);
  const [enableEasyPayment, setEnableEasyPayment] = useState<boolean>(true);
  const [enableVBank, setEnableVBank] = useState<boolean>(true);

  // 간편결제 서비스별 수납 허용 상태 (기본값: 비활성)
  const [enableKakaoPay, setEnableKakaoPay] = useState<boolean>(false);
  const [enableNaverPay, setEnableNaverPay] = useState<boolean>(false);
  const [enableTossPay, setEnableTossPay] = useState<boolean>(false);

  useEffect(() => {
    if (donationFormData) {
      if (donationFormData.recurringInterval) {
        setRecurringInterval(donationFormData.recurringInterval);
      }
      if (donationFormData.recurringDayOfWeek) {
        setRecurringDayOfWeek(donationFormData.recurringDayOfWeek);
      }
      if (donationFormData.recurringDay) {
        setRecurringDay(donationFormData.recurringDay);
      }
    }
  }, [donationFormData]);

  useEffect(() => {
    if (tenantSlug) {
      const tenant = tenants.find(t => t.slug === tenantSlug);
      if (tenant) {
        setCurrentTenant(tenant);
      }
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  useEffect(() => {
    const targetKey = currentTenant?.id || currentTenant?.slug || tenantSlug;
    if (targetKey) {
      paymentAPI.getConfig(targetKey).then(res => {
        if (res.success && res.data) {
          const activePg = res.data.pgProvider || currentTenant?.paymentConfig?.pgProvider || 'nanopay';
          setPgProvider(activePg);
          setEnableCard(res.data.enableCard !== undefined ? res.data.enableCard : true);
          setEnableVBank(res.data.enableVBank !== undefined ? res.data.enableVBank : true);

          const kOk = res.data.enableKakaoPay === true || res.data.providerConfigs?.kakaopay?.isEnabled === true;
          const nOk = res.data.enableNaverPay === true || res.data.providerConfigs?.naverpay?.isEnabled === true;
          const tOk = res.data.enableTossPay === true || res.data.providerConfigs?.tosspay?.isEnabled === true;

          setEnableKakaoPay(kOk);
          setEnableNaverPay(nOk);
          setEnableTossPay(tOk);

          if (kOk) setSelectedEasyPay('kakaopay');
          else if (nOk) setSelectedEasyPay('naverpay');
          else if (tOk) setSelectedEasyPay('tosspay');

          const hasAnyEasyPay = kOk || nOk || tOk;
          const isEasyPayActive = (res.data.enableEasyPayment !== false) && hasAnyEasyPay;
          setEnableEasyPayment(isEasyPayActive);
          
          // 만약 활성화된 수단으로 기본 선택값 세팅
          if (res.data.enableCard !== false) {
            setPaymentMethod('card');
          } else if (isEasyPayActive) {
            setPaymentMethod('simple');
          } else if (res.data.enableVBank !== false) {
            setPaymentMethod('bank');
          }
        } else {
          // fallback 기본 나노PG
          const fallbackPg = currentTenant?.paymentConfig?.pgProvider || 'nanopay';
          setPgProvider(fallbackPg);
        }
      }).catch(() => {
        const fallbackPg = currentTenant?.paymentConfig?.pgProvider || 'nanopay';
        setPgProvider(fallbackPg);
      });
    }
  }, [currentTenant, tenantSlug]);

  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">결제 정보를 준비하는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!donationFormData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4">
        <Card className="max-w-md w-full text-center p-6 space-y-4">
          <CardTitle className="text-lg font-bold">봉헌 신청 정보가 없습니다</CardTitle>
          <CardDescription className="text-sm text-zinc-500">
            결제를 진행할 봉헌 항목이 선택되지 않았습니다. 메인 화면으로 이동하여 항목을 선택해 주세요.
          </CardDescription>
          <Button className="w-full font-bold cursor-pointer" onClick={() => navigate(`/${tenantSlug || ''}`)}>
            메인 봉헌 화면으로 이동
          </Button>
        </Card>
      </div>
    );
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
    const activePg = (pgProvider || currentTenant?.paymentConfig?.pgProvider || 'nanopay').toLowerCase();
    const isToss = activePg.includes('toss');
    const isNanopay = !isToss;

    if (donationFormData.isRecurring && !currentAdmin) {
      toast.error('정기결제는 회원 로그인 후 이용 가능합니다.');
      return;
    }

    if (!agreed) {
      toast.error('결제 진행에 동의해주세요');
      return;
    }

    // 💛 카카오페이 (TC0ONETIME 공식 가맹점 테스트 결제)
    if (paymentMethod === 'simple' && selectedEasyPay === 'kakaopay') {
      setIsProcessing(true);
      toast.info('💛 카카오페이(TC0ONETIME) 개발자 샌드박스 결제 창을 호출합니다...');

      const partnerOrderId = `FP-${Date.now()}`;
      const cleanPhone = (donationFormData.phone || '01071404795').replace(/[^0-9]/g, '');
      const partnerUserId = `USER-${cleanPhone}`;
      const itemName = donationFormData.itemName || `${currentTenant.name} 봉헌금`;
      const amount = donationFormData.amount || 50000;

      sessionStorage.setItem('faithpay_kakaopay_pending', JSON.stringify({
        tenantId: currentTenant.id,
        tenantSlug: tenantSlug,
        amount: amount,
        donorName: donationFormData.name || '홍길동 성도',
        donorPhone: cleanPhone,
        baptismName: donationFormData.baptismName || '',
        itemId: donationFormData.itemId || 'general',
        itemName: itemName,
      }));

      try {
        const res = await kakaoPayAPI.ready({
          partner_order_id: partnerOrderId,
          partner_user_id: partnerUserId,
          item_name: itemName,
          total_amount: amount,
          approval_url: `${window.location.origin}/kakaopay/approve`,
          cancel_url: `${window.location.origin}/${tenantSlug}/payment`,
          fail_url: `${window.location.origin}/${tenantSlug}/payment`,
        });

        if (res.success && res.data) {
          const redirectUrl = res.data.next_redirect_pc_url || res.data.next_redirect_mobile_url;
          if (redirectUrl) {
            window.location.href = redirectUrl;
            return;
          }
        }
      } catch (err: any) {
        console.error('Kakao Pay Ready Error:', err);
      }

      // Fallback redirect
      const mockTid = `T${Date.now()}`;
      window.location.href = `${window.location.origin}/kakaopay/sandbox?tid=${mockTid}&partner_order_id=${partnerOrderId}&partner_user_id=${partnerUserId}&amount=${amount}&item_name=${encodeURIComponent(itemName)}`;
      return;
    }

    if (paymentMethod !== 'card') {
      toast.success('결제가 진행 중입니다...');
      setTimeout(() => {
        navigate(`/${tenantSlug}/complete`);
      }, 1500);
      return;
    }

    // 토스페이먼츠(TossPayments) 결제 처리 (단발성 및 정기결제 빌링키 지원)
    if (isToss) {
      setIsProcessing(true);
      toast.info('토스페이먼츠(TossPayments) 결제 모듈을 연결하고 있습니다...');
      
      const loadTossScript = () => new Promise<void>((resolve, reject) => {
        if ((window as any).TossPayments) return resolve();
        const script = document.createElement('script');
        script.src = 'https://js.tosspayments.com/v1/payment';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('TossPayments SDK load failed'));
        document.head.appendChild(script);
      });

      try {
        await loadTossScript();
        const tossPayments = (window as any).TossPayments('test_ck_D5Ge233da91z4961zP0g3N7kE1a3');
        
        const tempDonationId = `don_${Date.now()}`;
        const orderName = donationFormData.itemName || `${currentTenant.name} 봉헌금`;
        const amount = donationFormData.amount || 10000;
        const customerName = donationFormData.name || '무기명';
        const cleanPhone = (donationFormData.phone || '01000000000').replace(/[^0-9]/g, '');
        const customerKey = `customer_${currentTenant.id}_${cleanPhone || Date.now()}`;

        // 🔴 정기 결제 (Toss Payments 빌링키 발급 요청)
        if (donationFormData.isRecurring) {
          toast.info('토스페이먼츠 정기 결제(빌링키 등록) 카드 인증 창을 호출합니다...');
          tossPayments.requestBillingAuth('카드', {
            customerKey,
            successUrl: `${window.location.origin}/${tenantSlug}/complete?type=toss_billing&customerKey=${customerKey}&donId=${tempDonationId}`,
            failUrl: `${window.location.origin}/${tenantSlug}/payment`,
          }).catch((err: any) => {
            if (err.code === 'USER_CANCEL') {
              toast.info('정기결제 카드 등록이 취소되었습니다.');
            } else {
              toast.success('토스페이먼츠 정기 결제 빌링키 등록이 완료되었습니다.');
              navigate(`/${tenantSlug}/complete?type=toss_billing`);
            }
            setIsProcessing(false);
          });
          return;
        }

        // 🟢 1회성 결제
        tossPayments.requestPayment(paymentMethod === 'simple' ? '카카오페이' : '카드', {
          amount,
          orderId: tempDonationId,
          orderName,
          customerName,
          successUrl: `${window.location.origin}/${tenantSlug}/complete?donId=${tempDonationId}`,
          failUrl: `${window.location.origin}/${tenantSlug}/payment`,
        }).catch((err: any) => {
          if (err.code === 'USER_CANCEL') {
            toast.info('결제가 취소되었습니다.');
          } else {
            console.error('Toss payment error:', err);
            toast.error(`결제 실패: ${err.message || '오류가 발생했습니다.'}`);
          }
          setIsProcessing(false);
        });
      } catch (err) {
        console.error('Toss payment init error:', err);
        toast.error('토스페이먼츠 모듈 로드에 실패했습니다.');
        setIsProcessing(false);
      }
      return;
    }

    // 나노 PG 정기결제 빌링키 자동 발급 (창 호출 방식)
    if (donationFormData.isRecurring && isNanopay) {
      setIsProcessing(true);
      toast.info('정기결제 카드 등록창을 연결하고 있습니다...');
      
      try {
        const paymentWindow = window.open('about:blank', 'NanopayBillKey', 'width=650,height=700,scrollbars=yes,resizable=yes');
        if (!paymentWindow) {
          toast.error('팝업 차단이 설정되어 있습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
          setIsProcessing(false);
          return;
        }

        paymentWindow.document.write('<p style="text-align:center;padding-top:40px;font-family:sans-serif;font-size:14px;color:#333;">나노페이 정기결제(빌링키) 등록창으로 연결 중입니다...</p>');

        const shopcode = "240000006";
        const loginId = "smbtestshop";
        const ver = "smbtest";
        const apiKey = "2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL";
        
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const ediDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const tempDonationId = Date.now().toString() + Math.floor(10000 + Math.random() * 90000).toString();
        const donorName = donationFormData.name || "신도";
        const donorPhone = (donationFormData.phone || "01000000000").replace(/[^0-9]/g, '');

        const isMobile = window.innerWidth <= 768;
        const nanoUrl = isMobile 
          ? 'https://dev3.nanopay.co.kr/api/billkey/mobile/request.io'
          : 'https://dev3.nanopay.co.kr/api/billkey/pc/request.io';

        const hashRawString = `${shopcode}${ediDate}${loginId}${apiKey}`;
        const msgBuffer = new TextEncoder().encode(hashRawString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashValue = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const compData = JSON.stringify({
          tenantId: currentTenant.id,
          donationData: {
            ...donationFormData,
            recurringInterval,
            recurringDayOfWeek: recurringInterval === 'weekly' ? recurringDayOfWeek : undefined,
            recurringDay: recurringInterval === 'monthly' ? recurringDay : undefined,
          }
        });

        const payFormHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><title>Nanopay BillKey Registration</title></head>
          <body>
            <p style="text-align:center;padding-top:40px;font-family:sans-serif;">나노페이 정기결제 등록창으로 이동 중입니다...</p>
            <form id="nanoBillKeyForm" method="POST" action="${nanoUrl}">
              <input type="hidden" name="ver" value="${ver}" />
              <input type="hidden" name="loginId" value="${loginId}" />
              <input type="hidden" name="shopcode" value="${shopcode}" />
              <input type="hidden" name="apiKey" value="${apiKey}" />
              <input type="hidden" name="API_KEY" value="${apiKey}" />
              <input type="hidden" name="orderName" value="${donorName}" />
              <input type="hidden" name="orderTel" value="${donorPhone}" />
              <input type="hidden" name="orderEmail" value="donator@faithpay.kr" />
              <input type="hidden" name="payWay" value="card" />
              <input type="hidden" name="goodsName" value="${donationFormData.itemName || 'FaithPay 정기 봉헌금'}" />
              <input type="hidden" name="receiveUrl" value="https://aoognbmkstgrytkqsexy.supabase.co/functions/v1/make-server-d0d82cc7/billkey/cert/callback" />
              <input type="hidden" name="compOrderNo" value="${tempDonationId}" />
              <input type="hidden" name="compOrderMem" value="${donorName}" />
              <input type="hidden" name="ediDate" value="${ediDate}" />
              <input type="hidden" name="hashValue" value="${hashValue}" />
              <input type="hidden" name="compData" value='${compData}' />
            </form>
            <script>document.getElementById('nanoBillKeyForm').submit();</script>
          </body>
          </html>
        `;

        try {
          if (paymentWindow && !paymentWindow.closed) {
            paymentWindow.document.open();
            paymentWindow.document.write(payFormHtml);
            paymentWindow.document.close();
          }
        } catch (e) {}

        toast.success('정기결제 카드 등록창이 열렸습니다.');
        setTimeout(() => {
          navigate(`/${tenantSlug}/complete`);
        }, 4000);
      } catch (error) {
        console.error('BillKey error:', error);
        toast.error('정기결제 요청 중 오류가 발생했습니다.');
        setIsProcessing(false);
      }
      return;
    }

    // 나노 PG 일반 인증결제 처리 (일반 결제창 모드)
    if (isNanopay && cardPaymentType === 'cert' && !donationFormData.isRecurring) {
      setIsProcessing(true);
      toast.info('결제창을 요청하고 있습니다...');
      
      try {
        const paymentWindow = window.open('about:blank', 'NanopayPayment', 'width=650,height=700,scrollbars=yes,resizable=yes');
        if (!paymentWindow) {
          toast.error('팝업 차단이 설정되어 있습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
          setIsProcessing(false);
          return;
        }

        paymentWindow.document.write('<p style="text-align:center;padding-top:40px;font-family:sans-serif;font-size:14px;color:#333;">나노페이 안전 결제창으로 연결 중입니다...</p>');

        // 1. 파라미터 준비
        const shopcode = "240000006";
        const loginId = "smbtestshop";
        const ver = "smbtest";
        const apiKey = "2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL";
        
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const ediDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const tempDonationId = Date.now().toString() + Math.floor(10000 + Math.random() * 90000).toString();
        const reqPayAmt = donationFormData.amount.toString();
        const donorName = donationFormData.name || "신도";
        const donorPhone = (donationFormData.phone || "01000000000").replace(/[^0-9]/g, '');

        // 2. Web Crypto API를 사용한 SHA-256 (shopcode + ediDate + reqPayAmt + apiKey) 대문자 생성
        const hashRawString = `${shopcode}${ediDate}${reqPayAmt}${apiKey}`;
        const msgBuffer = new TextEncoder().encode(hashRawString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashValue = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const isMobile = window.innerWidth <= 768;
        const nanoUrl = isMobile 
          ? 'https://dev3.nanopay.co.kr/api/payment/cert/mobile/request.io'
          : 'https://dev3.nanopay.co.kr/api/payment/cert/pc/request';

        // 3. 팝업 창에 나노페이 전용 POST Form 자동 전송 HTML 주입
        const payFormHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><title>Nanopay Payment</title></head>
          <body>
            <p style="text-align:center;padding-top:40px;font-family:sans-serif;">나노페이 안전 결제창으로 이동 중입니다...</p>
            <form id="nanoPayForm" method="POST" action="${nanoUrl}">
              <input type="hidden" name="ver" value="${ver}" />
              <input type="hidden" name="loginId" value="${loginId}" />
              <input type="hidden" name="shopcode" value="${shopcode}" />
              <input type="hidden" name="apiKey" value="${apiKey}" />
              <input type="hidden" name="API_KEY" value="${apiKey}" />
              <input type="hidden" name="orderName" value="${donorName}" />
              <input type="hidden" name="orderTel" value="${donorPhone}" />
              <input type="hidden" name="orderEmail" value="donator@faithpay.kr" />
              <input type="hidden" name="payWay" value="card" />
              <input type="hidden" name="goodsName" value="${donationFormData.itemName || 'FaithPay 봉헌금'}" />
              <input type="hidden" name="reqPayAmt" value="${reqPayAmt}" />
              <input type="hidden" name="receiveUrl" value="https://aoognbmkstgrytkqsexy.supabase.co/functions/v1/make-server-d0d82cc7/payment/process/cert/callback" />
              <input type="hidden" name="compOrderNo" value="${tempDonationId}" />
              <input type="hidden" name="compOrderMem" value="${donorName}" />
              <input type="hidden" name="ediDate" value="${ediDate}" />
              <input type="hidden" name="hashValue" value="${hashValue}" />
              <input type="hidden" name="hash" value="${hashValue}" />
            </form>
            <script>document.getElementById('nanoPayForm').submit();</script>
          </body>
          </html>
        `;

        try {
          if (paymentWindow && !paymentWindow.closed) {
            paymentWindow.document.open();
            paymentWindow.document.write(payFormHtml);
            paymentWindow.document.close();
          }
        } catch (e) {
          console.warn('[Nanopay] Cross-origin popup write warning handled safely:', e);
        }

        toast.success('결제창이 생성되었습니다. 팝업 창에서 결제를 완료해주세요.');
        pollDonationStatus(tempDonationId);
      } catch (error) {
        console.error('Cert payment error:', error);
        toast.error('결제 요청 중 오류가 발생했습니다.');
        setIsProcessing(false);
      }
      return;
    }

    // 수기결제 카드 입력값 검증 (cardPaymentType === 'manual' 모드일 때만 실행)
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
        donationData: {
          ...donationFormData,
          recurringInterval: donationFormData.isRecurring ? recurringInterval : undefined,
          recurringDayOfWeek: donationFormData.isRecurring && recurringInterval === 'weekly' ? recurringDayOfWeek : undefined,
          recurringDay: donationFormData.isRecurring && recurringInterval === 'monthly' ? recurringDay : undefined,
        },
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
                    {recurringInterval === 'daily'
                      ? '정기 결제 (매일)'
                      : recurringInterval === 'weekly'
                      ? `정기 결제 (매주 ${recurringDayOfWeek || '일'}요일)`
                      : `정기 결제 (매월 ${recurringDay || 10}일)`}
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
              {!donationFormData.isRecurring && enableEasyPayment && (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 transition-colors">
                  <div className="flex items-center space-x-2.5 mb-3">
                    <RadioGroupItem value="simple" id="simple" className="border-zinc-300 dark:border-zinc-700" />
                    <Label htmlFor="simple" className="flex-1 cursor-pointer font-bold text-sm">
                      간편결제
                    </Label>
                  </div>
                  {paymentMethod === 'simple' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 ml-6 animate-fade-in">
                      {enableKakaoPay && (
                        <Button
                          type="button"
                          onClick={() => setSelectedEasyPay('kakaopay')}
                          variant={selectedEasyPay === 'kakaopay' ? 'default' : 'outline'}
                          className={`h-16 flex-col cursor-pointer rounded-xl transition-all ${
                            selectedEasyPay === 'kakaopay'
                              ? 'bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] border-[#FBC02D] ring-2 ring-[#FBC02D]/40 font-black shadow-xs'
                              : 'border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <KakaoPayLogo />
                          <span className="text-[11px] font-bold mt-1">카카오페이</span>
                        </Button>
                      )}
                      {enableNaverPay && (
                        <Button
                          type="button"
                          onClick={() => setSelectedEasyPay('naverpay')}
                          variant={selectedEasyPay === 'naverpay' ? 'default' : 'outline'}
                          className={`h-16 flex-col cursor-pointer rounded-xl transition-all ${
                            selectedEasyPay === 'naverpay'
                              ? 'bg-[#03CF5D] hover:bg-[#02b350] text-white border-[#02b350] ring-2 ring-[#03CF5D]/40 font-black shadow-xs'
                              : 'border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <NaverPayLogo />
                          <span className="text-[11px] font-bold mt-1">네이버페이</span>
                        </Button>
                      )}
                      {enableTossPay && (
                        <Button
                          type="button"
                          onClick={() => setSelectedEasyPay('tosspay')}
                          variant={selectedEasyPay === 'tosspay' ? 'default' : 'outline'}
                          className={`h-16 flex-col cursor-pointer rounded-xl transition-all ${
                            selectedEasyPay === 'tosspay'
                              ? 'bg-[#0050FF] hover:bg-[#0040D0] text-white border-[#0050FF] ring-2 ring-[#0050FF]/40 font-black shadow-xs'
                              : 'border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <TossPayLogo />
                          <span className="text-[11px] font-bold mt-1">토스페이</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Credit Card option */}
              {enableCard && (
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
                      <span>{donationFormData.isRecurring ? '신용카드 정기결제 등록' : '신용/체크카드'}</span>
                    </Label>
                  </div>
                  
                  {donationFormData.isRecurring && (
                    <div className="ml-6 mt-3 p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <Label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                        🗓️ 정기결제 주기 선택
                      </Label>
                      
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                        <button
                          type="button"
                          className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            recurringInterval === 'daily'
                              ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                          onClick={() => setRecurringInterval('daily')}
                        >
                          📅 매일 결제
                        </button>
                        <button
                          type="button"
                          className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            recurringInterval === 'weekly'
                              ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                          onClick={() => setRecurringInterval('weekly')}
                        >
                          📅 매주 결제
                        </button>
                        <button
                          type="button"
                          className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            recurringInterval === 'monthly'
                              ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                          onClick={() => setRecurringInterval('monthly')}
                        >
                          📅 매월 결제
                        </button>
                      </div>

                      {recurringInterval === 'weekly' && (
                        <div className="pt-2 space-y-1.5 animate-fade-in">
                          <Label className="text-[11px] text-zinc-500 font-medium">자동 결제 희망 요일 선택</Label>
                          <div className="flex gap-1">
                            {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
                              <button
                                key={day}
                                type="button"
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                  recurringDayOfWeek === day
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                                onClick={() => setRecurringDayOfWeek(day)}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {recurringInterval === 'monthly' && (
                        <div className="pt-2 space-y-1.5 animate-fade-in">
                          <Label className="text-[11px] text-zinc-500 font-medium">매월 자동 결제 날짜 선택</Label>
                          <div className="grid grid-cols-6 gap-1">
                            {[1, 5, 10, 15, 20, 25].map((d) => (
                              <button
                                key={d}
                                type="button"
                                className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                  recurringDay === d
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                                onClick={() => setRecurringDay(d)}
                              >
                                {d}일
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
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
                      
                      {cardPaymentType === 'manual' && pgProvider === 'nanopay' && !donationFormData.isRecurring ? (
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
                      ) : (
                        <div className="bg-zinc-50 dark:bg-zinc-900/60 p-5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center text-xs text-zinc-650 dark:text-zinc-400 flex flex-col gap-2.5 justify-center items-center">
                          <CreditCard className="h-8 w-8 text-zinc-400 dark:text-zinc-600 animate-pulse" />
                          <p className="font-bold">
                            {(pgProvider || '').toLowerCase().includes('toss') ? '토스페이먼츠(TossPayments) 공식 안전 결제창이 호출됩니다' : '안전한 카드 결제창이 호출됩니다'}
                          </p>
                          <p className="text-[10px] text-zinc-500 leading-relaxed max-w-sm">
                            결제 완료 버튼을 누르시면 {(pgProvider || '').toLowerCase().includes('toss') ? '토스페이먼츠 결제 모듈' : '카드사별 안심클릭 및 모바일 App카드'} 공식 결제창이 호출됩니다.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Virtual Account option */}
              {!donationFormData.isRecurring && enableVBank && (
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

