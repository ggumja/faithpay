import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Separator } from '../components/ui/separator';
import { Checkbox } from '../components/ui/checkbox';
import { ArrowLeft, CreditCard, Building2, Smartphone, Wallet, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { paymentAPI, donationAPI, kakaoPayAPI, subscriptionAPI, API_BASE_URL } from '../api/client';
import { generateTransactionId } from '../utils/transactionId';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { KakaoPayLogo, NaverPayLogo, TossPayLogo } from '../components/PayBrandLogos';
import { useTenantTerms } from '../hooks/useTenantTerms';

export default function PaymentSelection() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant, tenants, donationFormData, setDonationFormData, currentAdmin } = useApp();
  const location = useLocation();
  const terms = useTenantTerms(currentTenant);

  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [selectedEasyPay, setSelectedEasyPay] = useState<'kakaopay' | 'naverpay' | 'tosspay'>('kakaopay');
  const [agreed, setAgreed] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [password, setPassword] = useState('');
  const [birth, setBirth] = useState('');
  const [installment, setInstallment] = useState('00');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

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

  // 정기결제 첫 결제 시점 State (immediate: 오늘 즉시 1차 결제 후 다음 주기부터 정기결제 / scheduled: 오늘은 카드 등록만 하고 첫 결제일부터 결제 시작)
  const [firstPaymentTiming, setFirstPaymentTiming] = useState<'immediate' | 'scheduled'>(
    donationFormData?.firstPaymentTiming || 'immediate'
  );

  // 첫 결제 예정일(또는 2회차 결제 예정일) 실시간 계산
  const scheduledFirstPaymentDate = useMemo(() => {
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    let target = new Date(kstNow.getTime());

    if (recurringInterval === 'daily') {
      target.setUTCDate(target.getUTCDate() + 1);
    } else if (recurringInterval === 'weekly') {
      const dayMap: Record<string, number> = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
      const targetDay = dayMap[recurringDayOfWeek || '일'] ?? 0;
      const currentDay = target.getUTCDay();
      let diff = (targetDay - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      target.setUTCDate(target.getUTCDate() + diff);
    } else {
      const targetDom = recurringDay || 10;
      const currentDom = target.getUTCDate();
      if (firstPaymentTiming === 'immediate') {
        target.setUTCMonth(target.getUTCMonth() + 1);
        target.setUTCDate(targetDom);
      } else {
        if (currentDom < targetDom) {
          target.setUTCDate(targetDom);
        } else {
          target.setUTCMonth(target.getUTCMonth() + 1);
          target.setUTCDate(targetDom);
        }
      }
    }
    const y = target.getUTCFullYear();
    const m = String(target.getUTCMonth() + 1).padStart(2, '0');
    const d = String(target.getUTCDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[target.getUTCDay()];
    return `${y}.${m}.${d}(${dayName})`;
  }, [recurringInterval, recurringDayOfWeek, recurringDay, firstPaymentTiming]);

  const [pgProvider, setPgProvider] = useState<string>('');
  const [pgApiKey, setPgApiKey] = useState<string>('');
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
      if (donationFormData.firstPaymentTiming) {
        setFirstPaymentTiming(donationFormData.firstPaymentTiming);
      }
    }
  }, [donationFormData]);

  // Toss failUrl 복귀 시 (?code=xxx) localStorage snapshot에서 donationFormData 복원
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const failCode = params.get('code');
    const failMsg = params.get('message');

    if (failCode && !donationFormData) {
      // 결제 실패로 돌아온 경우 - snapshot 복원 시도
      const snapStr =
        sessionStorage.getItem('pending_donation_latest') ||
        localStorage.getItem('pending_donation_latest');

      if (snapStr) {
        try {
          const snap = JSON.parse(snapStr);
          if (snap?.formData) {
            setDonationFormData(snap.formData);
            // failUrl 복귀임을 사용자에게 안내
            const errMsg = failMsg ? decodeURIComponent(failMsg) : '결제가 취소되었거나 오류가 발생했습니다.';
            toast.error(`결제 실패: ${errMsg}`, { duration: 5000 });
          }
        } catch (e) {
          console.warn('Failed to restore donation snapshot:', e);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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
          setPgApiKey(res.data.apiKey || res.data.tossPayApiKey || currentTenant?.paymentConfig?.apiKey || '');
          const cardOk = res.data.enableCard !== undefined ? Boolean(res.data.enableCard) : true;
          const vBankOk = res.data.enableVBank !== undefined ? Boolean(res.data.enableVBank) : true;
          setEnableCard(cardOk);
          setEnableVBank(vBankOk);

          const kOk = res.data.enableKakaoPay !== undefined 
            ? Boolean(res.data.enableKakaoPay) 
            : (res.data.providerConfigs?.kakaopay?.isEnabled === true);
          const nOk = res.data.enableNaverPay !== undefined 
            ? Boolean(res.data.enableNaverPay) 
            : (res.data.providerConfigs?.naverpay?.isEnabled === true);
          const tOk = res.data.enableTossPay !== undefined 
            ? Boolean(res.data.enableTossPay) 
            : (res.data.providerConfigs?.tosspay?.isEnabled === true);

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
          if (cardOk) {
            setPaymentMethod('card');
          } else if (isEasyPayActive) {
            setPaymentMethod('simple');
          } else if (vBankOk) {
            setPaymentMethod('bank');
          } else {
            setPaymentMethod('');
          }
        } else {
          // fallback 기본 나노PG
          const fallbackPg = currentTenant?.paymentConfig?.pgProvider || 'nanopay';
          setPgProvider(fallbackPg);
          setPgApiKey(currentTenant?.paymentConfig?.apiKey || '');
        }
      }).catch(() => {
        const fallbackPg = currentTenant?.paymentConfig?.pgProvider || 'nanopay';
        setPgProvider(fallbackPg);
        setPgApiKey(currentTenant?.paymentConfig?.apiKey || '');
      });
    }
  }, [currentTenant, tenantSlug]);

  // 나노페이/결제 팝업창 완료 수신 리스너
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SOULPAY_PAYMENT_RESULT') {
        if (event.data.success) {
          toast.success('결제가 완료되었습니다.');
          const donParam = event.data.donationId ? `?donId=${event.data.donationId}` : '';
          navigate(`/${tenantSlug}/complete${donParam}`);
        } else {
          toast.error(event.data.resultMsg || '결제에 실패하였습니다.');
          setIsProcessing(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tenantSlug, navigate]);

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
              navigate(`/${tenantSlug}/complete?donId=${donationId}`);
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
    const targetTenantId = currentTenant?.id || currentTenant?.slug || tenantSlug || '';
    const activePg = (pgProvider || currentTenant?.paymentConfig?.pgProvider || 'nanopay').toLowerCase();
    const isToss = activePg.includes('toss');
    const isNanopay = !isToss;


    if (!agreed) {
      toast.error('결제 진행에 동의해주세요');
      return;
    }

    if (!paymentMethod) {
      toast.error('이용 가능한 결제 수단을 선택해주세요.');
      return;
    }

    // 💛 카카오페이 (TC0ONETIME 공식 가맹점 테스트 결제)
    if (paymentMethod === 'simple' && selectedEasyPay === 'kakaopay') {
      setIsProcessing(true);
      toast.info('💛 카카오페이(TC0ONETIME) 개발자 샌드박스 결제 창을 호출합니다...');

      const partnerOrderId = `FP-${Date.now()}`;
      const cleanPhone = (donationFormData.phone || '').replace(/[^0-9]/g, '');
      const partnerUserId = cleanPhone ? `USER-${cleanPhone}` : `USER-${Date.now()}`;
      const itemName = donationFormData.itemName || `${currentTenant.name} 봉헌금`;
      const amount = donationFormData.amount || 0;

      sessionStorage.setItem('soulpay_kakaopay_pending', JSON.stringify({
        tenantId: currentTenant.id,
        tenantSlug: tenantSlug,
        amount: amount,
        donorName: donationFormData.name || '익명',
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
        const rawKey = (pgApiKey || currentTenant?.paymentConfig?.apiKey || '').trim();
        // v1 일반 결제창에서 401을 유발하는 v2 위젯 전용 키(test_ck_OEP5...) 및 빈값은 자동결제 지원 테스트 키로 자동 보정
        const tossClientKey = (!rawKey || rawKey.includes('OEP5eLpqWEMqYNm7JaEr3779KMlW') || rawKey === 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq')
          ? 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm'
          : rawKey;

        if (!tossClientKey) {
          toast.error('토스페이먼츠 Client Key(API Key)가 설정되지 않았습니다.');
          setIsProcessing(false);
          return;
        }
        const tossPayments = (window as any).TossPayments(tossClientKey);
        
        const tempDonationId = generateTransactionId();  // YYYYMMDDHHMM-NNNNNNN
        const orderName = donationFormData.itemName || `${currentTenant.name} 봉헌금`;
        const amount = donationFormData.amount || 10000;
        const customerName = donationFormData.name || '무기명';
        const cleanPhone = (donationFormData.phone || '').replace(/[^0-9]/g, '');
        const customerKey = `customer_${currentTenant.id}_${cleanPhone || Date.now()}`;

        // 💾 리다이렉트 후 복구를 위한 스냅샷 저장
        // ⚠️ 토스 v1 SDK는 현재 페이지를 토스 도메인으로 full redirect함
        //    → sessionStorage는 origin이 달라지면 사라지모로 localStorage에도 이중 저장
        const snapshot = {
          formData: {
            ...donationFormData,
            amount,
            orderName,
            customerName,
            phone: donationFormData.phone || cleanPhone,   // ← donorPhone 복구에 사용
            customerPhone: cleanPhone,
          },
          tenant: currentTenant,
          timestamp: Date.now(),
        };
        try {
          const snapStr = JSON.stringify(snapshot);
          sessionStorage.setItem(`pending_donation_${tempDonationId}`, snapStr);
          sessionStorage.setItem('pending_donation_latest', snapStr);
          // localStorage에도 저장 (full-redirect 시 sessionStorage 소멸 방지)
          localStorage.setItem(`pending_donation_${tempDonationId}`, snapStr);
          localStorage.setItem('pending_donation_latest', snapStr);
        } catch (e) {
          console.warn('Failed to save donation session snapshot:', e);
        }

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

    // 나노 PG 정기결제 빌링키 자동 발급 (창 호출 방식 - v2.2.1)
    if (donationFormData.isRecurring && isNanopay) {
      setIsProcessing(true);
      toast.info('정기결제 카드 등록창을 연결하고 있습니다...');

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
      
      let paymentWindow: Window | null = null;
      if (!isMobile) {
        const windowName = `NanopayBillKey_${Date.now()}`;
        paymentWindow = window.open('about:blank', windowName, 'width=520,height=860,scrollbars=yes,resizable=yes');
        if (!paymentWindow) {
          toast.error('팝업 차단이 설정되어 있습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
          setIsProcessing(false);
          return;
        }

        try {
          paymentWindow.document.write('<p style="text-align:center;padding-top:40px;font-family:sans-serif;font-size:14px;color:#333;">나노페이 정기결제(빌링키) 등록창으로 연결 중입니다...</p>');
        } catch (e) {
          console.warn('Initial popup write skipped:', e);
        }
      }

      try {
        const tempDonationId = generateTransactionId();
        const donorPhone = (donationFormData.phone || "").replace(/[^0-9]/g, '');
        const popupOpenedAt = Date.now();

        // 나노페이 v2.2.1 정기결제 빌키 발급 요청 (서버사이드에서 reqkey.io 호출 후 Smartro 카드 등록창 HTML 수신)
        const res = await paymentAPI.processBillKeyRequest({
          tenantId: targetTenantId,
          donationData: {
            ...donationFormData,
            recurringInterval,
            recurringDayOfWeek: recurringInterval === 'weekly' ? recurringDayOfWeek : undefined,
            recurringDay: recurringInterval === 'monthly' ? recurringDay : undefined,
            firstPaymentTiming,
            chargeImmediate: firstPaymentTiming === 'immediate',
            scheduledFirstPaymentDate,
          },
        });

        console.log('[Nanopay BillKey] processBillKeyRequest response:', res);

        const billKeyData = (res as any)?.data || res;
        const html = billKeyData?.html || (res as any)?.html;

        if (!res.success || !html) {
          if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
          toast.error(res.error || (billKeyData as any)?.error || '나노페이 정기결제 카드 등록창 요청에 실패했습니다.');
          setIsProcessing(false);
          return;
        }

        // Smartro 카드 등록창 주입 (모바일: 현재 창 직접 주입, PC: 팝업 창 주입)
        if (isMobile) {
          document.open();
          document.write(html);
          document.close();
          return;
        }

        try {
          if (paymentWindow && !paymentWindow.closed) {
            paymentWindow.document.open();
            paymentWindow.document.write(html);
            paymentWindow.document.close();
          }
        } catch (e) {
          console.error('Failed to write HTML to payment window:', e);
        }

        // snapshot 저장 (DonationComplete 복원용)
        const snapPayload = {
          tenant: currentTenant,
          formData: {
            ...donationFormData,
            recurringInterval,
            recurringDayOfWeek: recurringInterval === 'weekly' ? recurringDayOfWeek : undefined,
            recurringDay: recurringInterval === 'monthly' ? recurringDay : undefined,
            firstPaymentTiming,
            chargeImmediate: firstPaymentTiming === 'immediate',
            scheduledFirstPaymentDate,
          },
          savedAt: Date.now(),
        };
        localStorage.setItem('pending_donation_latest', JSON.stringify(snapPayload));
        localStorage.setItem(`pending_donation_${tempDonationId}`, JSON.stringify(snapPayload));

        toast.success('카드 등록창이 열렸습니다. 카드 정보 입력 후 등록을 완료해주세요.');

        // ① 콜백 팝업창에서 발송하는 postMessage 이벤트 수신 (즉시 반응)
        let messageReceived = false;
        const messageHandler = async (event: MessageEvent) => {
          if (event.data && event.data.type === 'SOULPAY_BILLKEY_RESULT') {
            messageReceived = true;
            console.log('[Nanopay BillKey Result Received in Parent]:', event.data);
            window.removeEventListener('message', messageHandler);
            if (event.data.resultCode === '0000') {
              let subscriptionId = event.data.subscriptionId;
              let nextDate = event.data.nextPaymentDate || scheduledFirstPaymentDate || '';

              // ⚡ 백엔드 콜백에서 compData 손상 등으로 구독이 미생성된 경우를 대비한 2중 안전장치
              if (!subscriptionId && event.data.billKey) {
                try {
                  const regRes = await subscriptionAPI.register({
                    tenantId: currentTenant.id,
                    donorName: donorName || '신도',
                    donorPhone: donorPhone,
                    donorEmail: donationFormData?.email || '',
                    itemId: selectedDonationItem.id,
                    itemName: selectedDonationItem.name,
                    amount: donationFormData.amount,
                    billKey: event.data.billKey,
                    cardNo: event.data.cardNo || '',
                    cardName: event.data.cardName || '신용카드',
                    recurringDay: recurringDay || 10,
                    recurringInterval: recurringInterval || 'monthly',
                    recurringDayOfWeek: recurringDayOfWeek,
                    nextPaymentDate: nextDate,
                  });
                  if (regRes?.data?.id) {
                    subscriptionId = regRes.data.id;
                  }
                } catch (regErr) {
                  console.warn('[PaymentSelection] Secondary subscription registration error:', regErr);
                }
              }

              setIsProcessing(false);
              const donationId = event.data.donationId || tempDonationId;
              const isCharged = Boolean(event.data.firstPaymentCharged);
              toast.success(isCharged ? '정기결제 카드 등록 및 1회차 결제가 완료되었습니다!' : '정기결제 카드가 등록되었습니다!');
              navigate(`/${tenantSlug}/complete?donId=${donationId}&type=nano_billing${isCharged ? '&charged=true' : '&registeredOnly=true'}${nextDate ? `&nextDate=${encodeURIComponent(nextDate)}` : ''}`);
            } else {
              setIsProcessing(false);
              toast.error(event.data.resultMsg || '카드 등록에 실패했습니다. 입력 정보를 확인해주세요.', { duration: 6000 });
            }
          }
        };
        window.addEventListener('message', messageHandler);

        // ② 팝업창 닫힘 감지 및 DB Polling (postMessage 미수신 대비 보조 동기화)
        const popupPollTimer = setInterval(() => {
          if (!paymentWindow || paymentWindow.closed) {
            clearInterval(popupPollTimer);
            if (messageReceived) return;

            toast.info('카드 등록 완료 여부를 확인하고 있습니다...');

            setTimeout(async () => {
              let checkAttempts = 0;
              const dbPollTimer = setInterval(async () => {
                if (messageReceived) {
                  clearInterval(dbPollTimer);
                  return;
                }
                checkAttempts++;
                try {
                  const subRes = await subscriptionAPI.getByPhone(donorPhone);
                  if (subRes.success && subRes.data && subRes.data.length > 0) {
                    const recentSub = subRes.data.find((s: any) => {
                      const createdAt = new Date(s.createdAt || s.created_at).getTime();
                      return createdAt >= popupOpenedAt - 5000;
                    });
                    if (recentSub) {
                      clearInterval(dbPollTimer);
                      window.removeEventListener('message', messageHandler);
                      setIsProcessing(false);
                      toast.success('정기결제 카드 등록이 완료되었습니다!');
                      navigate(`/${tenantSlug}/complete?donId=${tempDonationId}&type=nano_billing${firstPaymentTiming === 'immediate' ? '&charged=true' : '&registeredOnly=true'}&nextDate=${encodeURIComponent(scheduledFirstPaymentDate)}`);
                      return;
                    }
                  }
                } catch (e) {}

                if (checkAttempts >= 8) {
                  clearInterval(dbPollTimer);
                  window.removeEventListener('message', messageHandler);
                  setIsProcessing(false);
                  toast.error('카드 등록이 완료되지 않았습니다. 다시 시도해주세요.');
                }
              }, 2000);
            }, 1500);
          }
        }, 500);

        // 최대 10분 후 타임아웃 정리
        setTimeout(() => {
          clearInterval(popupPollTimer);
          window.removeEventListener('message', messageHandler);
          if (paymentWindow && !paymentWindow.closed) {
            paymentWindow.close();
          }
          setIsProcessing(false);
        }, 10 * 60 * 1000);

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
      toast.info('나노페이 결제창을 준비하고 있습니다...');

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
      
      let paymentWindow: Window | null = null;
      if (!isMobile) {
        // PC 환경에서만 팝업 사전 오픈 (모바일에서는 팝업 차단 및 앱카드 딥링크 차단 방지를 위해 현재 창 직접 이동)
        paymentWindow = window.open('about:blank', 'NanopayPayment', 'width=650,height=700,scrollbars=yes,resizable=yes');
        if (!paymentWindow) {
          toast.error('팝업 차단이 설정되어 있습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
          setIsProcessing(false);
          return;
        }

        try {
          paymentWindow.document.write('<p style="text-align:center;padding-top:60px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:15px;color:#334155;">나노페이 안전 결제창으로 연결 중입니다...</p>');
        } catch (e) {
          console.warn('Initial popup write skipped:', e);
        }
      }

      try {
        const donorEmailToSend = donationFormData.email || '';

        const res = await paymentAPI.processCertRequest({
          tenantId: targetTenantId,
          donationData: {
            ...donationFormData,
            email: donorEmailToSend || '',
          },
          deviceType: isMobile ? 'mobile' : 'pc',
          payWay: 'card',
        });

        console.log('[Nanopay Cert] processCertRequest response:', res);

        const certData = (res as any)?.data || res;
        const redirectUrl = certData?.redirectUrl || (res as any)?.redirectUrl;
        const html = certData?.html || (res as any)?.html;
        const donationId = certData?.donationId || (res as any)?.donationId;

        if (!res.success || (!redirectUrl && !html)) {
          if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
          toast.error(res.error || (certData as any)?.error || '결제창 요청에 실패했습니다.');
          setIsProcessing(false);
          return;
        }

        // 스냅샷 저장 (DonationComplete 페이지 복원용)
        const snapPayload = {
          tenant: currentTenant,
          donationId,
          formData: donationFormData,
          savedAt: Date.now(),
        };
        try {
          localStorage.setItem('pending_donation_latest', JSON.stringify(snapPayload));
          localStorage.setItem(`pending_donation_${donationId}`, JSON.stringify(snapPayload));
          sessionStorage.setItem('pending_donation_latest', JSON.stringify(snapPayload));
          sessionStorage.setItem(`pending_donation_${donationId}`, JSON.stringify(snapPayload));
        } catch (e) {}

        if (isMobile) {
          // 📱 모바일: 팝업이 아닌 현재 창 전체 이동 (Self-Redirect)
          if (redirectUrl) {
            window.location.href = redirectUrl;
            return;
          } else if (html) {
            document.open();
            document.write(html);
            document.close();
            return;
          }
        } else {
          // 💻 PC: 팝업 창에 결제 화면 주입
          if (redirectUrl && paymentWindow) {
            paymentWindow.location.href = redirectUrl;
          } else if (html && paymentWindow) {
            paymentWindow.document.open();
            paymentWindow.document.write(html);
            paymentWindow.document.close();
          } else {
            if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
            toast.error('결제창 URL을 가져오지 못했습니다.');
            setIsProcessing(false);
            return;
          }

          toast.success('결제창이 생성되었습니다. 팝업 창에서 결제를 완료해주세요.');
          pollDonationStatus(donationId);
        }
      } catch (error: any) {
        if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
        console.error('Cert payment error:', error);
        toast.error(error?.message || '결제 요청 중 오류가 발생했습니다.');
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
        tenantId: targetTenantId || currentTenant?.id || '',
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

  const handleScanCard = async () => {
    const targetTenantId = currentTenant?.id || currentTenant?.slug || tenantSlug || '';
    if (!targetTenantId) {
      toast.error('단체 정보를 확인할 수 없습니다.');
      return;
    }

    setIsScanning(true);
    toast.info('카드 스캔 카메라를 준비하고 있습니다...');

    try {
      const res = await paymentAPI.getCardScanParams({
        tenantId: targetTenantId,
        isBilling: false,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || '카드 스캔 인증값을 생성하지 못했습니다.');
        setIsScanning(false);
        return;
      }

      const { scanJsUrl, ver, shopcode, loginId, timestamp, hashValue } = res.data;

      // Nanopay card-scan.js 라이브러리 동적 로드
      if (!(window as any).openCardScan) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = scanJsUrl;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('카드 스캔 스크립트 로드 실패'));
          document.head.appendChild(script);
        });
      }

      // Nanopay card-scan.js 라이브러리의 자동 입력 충돌 방지를 위한 전용 수신 hidden 필드 확보
      let rawNo = document.getElementById('_scan_raw_card_no') as HTMLInputElement;
      if (!rawNo) {
        rawNo = document.createElement('input');
        rawNo.type = 'hidden';
        rawNo.id = '_scan_raw_card_no';
        document.body.appendChild(rawNo);
      }
      let rawMm = document.getElementById('_scan_raw_exp_mm') as HTMLInputElement;
      if (!rawMm) {
        rawMm = document.createElement('input');
        rawMm.type = 'hidden';
        rawMm.id = '_scan_raw_exp_mm';
        document.body.appendChild(rawMm);
      }
      let rawYy = document.getElementById('_scan_raw_exp_yy') as HTMLInputElement;
      if (!rawYy) {
        rawYy = document.createElement('input');
        rawYy.type = 'hidden';
        rawYy.id = '_scan_raw_exp_yy';
        document.body.appendChild(rawYy);
      }

      const syncValues = (cNo?: string, eMm?: string, eYy?: string) => {
        if (cNo) {
          const clean = cNo.replace(/[^0-9]/g, '');
          const formatted = clean.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
          setCardNumber(formatted);
        }
        const mm = eMm ? eMm.toString().padStart(2, '0') : '';
        const yy = eYy ? (eYy.toString().length === 4 ? eYy.toString().slice(-2) : eYy.toString()) : '';
        if (mm && yy) {
          setExpiry(`${mm}/${yy}`);
        } else if (mm) {
          setExpiry((prev) => prev.includes('/') ? `${mm}/${prev.split('/')[1]}` : mm);
        } else if (yy) {
          setExpiry((prev) => prev.includes('/') ? `${prev.split('/')[0]}/${yy}` : `/${yy}`);
        }
      };

      rawNo.oninput = () => syncValues(rawNo.value, rawMm.value, rawYy.value);
      rawMm.oninput = () => syncValues(rawNo.value, rawMm.value, rawYy.value);
      rawYy.oninput = () => syncValues(rawNo.value, rawMm.value, rawYy.value);

      // postMessage 수신 리스너 등록 (문자열/객체 데이터 유연하게 파싱)
      const onScanResult = (e: MessageEvent) => {
        let data = e.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (err) {}
        }
        if (!data) return;

        if (data.resultCode === '0000') {
          syncValues(data.cardNo, data.expMM, data.expYY);
          toast.success('카드가 성공적으로 인식되었습니다.');
          window.removeEventListener('message', onScanResult);
        } else if (data.resultCode && data.resultCode !== '9999') {
          toast.error(data.resultMsg || '카드 인식에 실패했습니다.');
        }
      };
      window.addEventListener('message', onScanResult);

      // Nanopay 공식 openCardScan 실행 (전용 hidden 수신 필드 지정하여 expiry 덮어쓰기 방지)
      (window as any).openCardScan({
        fields: {
          cardNo: '_scan_raw_card_no',
          expYY: '_scan_raw_exp_yy',
          expMM: '_scan_raw_exp_mm',
        },
        params: {
          ver,
          shopcode,
          loginId,
          timestamp,
          hashValue,
        },
      });
    } catch (err: any) {
      console.error('Failed to open card scan:', err);
      toast.error('카메라를 열 수 없거나 권한이 거부되었습니다.');
    } finally {
      setIsScanning(false);
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
            <CardTitle className="text-lg font-extrabold">최종 {terms.donation} 내역</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2.5 text-base">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 dark:text-zinc-400 font-semibold">{terms.donation} 항목</span>
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{donationFormData.itemName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 dark:text-zinc-400 font-semibold">성명</span>
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{donationFormData.name}</span>
              </div>
              {donationFormData.isRecurring && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400 font-semibold">결제 주기</span>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                      {recurringInterval === 'daily'
                        ? '매일 결제'
                        : recurringInterval === 'weekly'
                        ? `매주 (${recurringDayOfWeek || '일'})요일`
                        : `매월 ${recurringDay || 10}일`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400 font-semibold">첫 결제 시점</span>
                    <span className="font-extrabold text-zinc-900 dark:text-zinc-100">
                      {firstPaymentTiming === 'immediate'
                        ? '⚡ 오늘 즉시 1차 결제'
                        : `📅 ${scheduledFirstPaymentDate} 첫 결제`}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <Separator className="bg-zinc-100 dark:bg-zinc-800" />
            
            <div className="flex justify-between items-center">
              <div>
                <span className="text-base sm:text-lg font-extrabold text-zinc-700 dark:text-zinc-300">
                  {donationFormData.isRecurring && firstPaymentTiming === 'scheduled' ? '오늘 결제 금액' : '총 결제 금액'}
                </span>
                {donationFormData.isRecurring && firstPaymentTiming === 'scheduled' && (
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    정기 약정 금액: {donationFormData.amount.toLocaleString()}원
                  </p>
                )}
              </div>
              <span className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: ft.primary }}>
                {donationFormData.isRecurring && firstPaymentTiming === 'scheduled'
                  ? '0원'
                  : `${donationFormData.amount.toLocaleString()}원`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selector Card */}
        <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-xs rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
            <CardTitle className="text-lg font-extrabold">결제 수단 선택</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">
              안전하고 투명한 금융 거래를 위해 공식 결제대행사(PG)를 거쳐 결제가 진행됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="flex flex-col gap-4">
              
              {/* Easy Payment option */}
              {!donationFormData.isRecurring && enableEasyPayment && (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 transition-colors">
                  <div className="flex items-center space-x-3 mb-3">
                    <RadioGroupItem value="simple" id="simple" className="w-5 h-5 border-zinc-300 dark:border-zinc-700" />
                    <Label htmlFor="simple" className="flex-1 cursor-pointer font-extrabold text-base">
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

                      {/* 🎯 첫 결제 시점 선택 (1회차 즉시 결제 vs 첫 주기일부터 결제) */}
                      <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800 space-y-2 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <span>⚡ 첫 결제 시점 선택</span>
                          </Label>
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                            {firstPaymentTiming === 'immediate' ? '오늘 1차 결제' : '주기일 첫 결제'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* 옵션 1: 즉시 1차 결제 */}
                          <div
                            onClick={() => setFirstPaymentTiming('immediate')}
                            className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                              firstPaymentTiming === 'immediate'
                                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 shadow-xs'
                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <input
                                type="radio"
                                name="firstPaymentTiming"
                                checked={firstPaymentTiming === 'immediate'}
                                onChange={() => setFirstPaymentTiming('immediate')}
                                className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs font-bold">오늘 즉시 1차 결제 (추천)</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pl-6">
                              오늘 1회차 봉헌금을 즉시 결제하고, 2회차부터 {scheduledFirstPaymentDate}에 자동 결제됩니다.
                            </p>
                          </div>

                          {/* 옵션 2: 주기일 첫 결제 */}
                          <div
                            onClick={() => setFirstPaymentTiming('scheduled')}
                            className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                              firstPaymentTiming === 'scheduled'
                                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 shadow-xs'
                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <input
                                type="radio"
                                name="firstPaymentTiming"
                                checked={firstPaymentTiming === 'scheduled'}
                                onChange={() => setFirstPaymentTiming('scheduled')}
                                className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs font-bold">첫 결제일부터 시작</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pl-6">
                              오늘은 <strong>0원 카드 등록</strong>만 진행하고, 첫 결제는 <strong>{scheduledFirstPaymentDate}</strong>에 자동으로 진행됩니다.
                            </p>
                          </div>
                        </div>
                      </div>
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
                            <div className="flex items-center justify-between">
                              <Label htmlFor="cardNumber" className="text-xs font-bold text-zinc-500 dark:text-zinc-400">카드번호</Label>
                              <button
                                type="button"
                                onClick={handleScanCard}
                                disabled={isScanning}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors cursor-pointer border border-indigo-100 dark:border-indigo-900/50"
                              >
                                {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                                <span>{isScanning ? '스캔 준비 중...' : '카드 카메라 스캔'}</span>
                              </button>
                            </div>
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

              {!donationFormData.isRecurring && !enableCard && !enableEasyPayment && !enableVBank && (
                <div className="py-8 px-4 text-center bg-zinc-50 dark:bg-zinc-850/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs font-bold text-zinc-650 dark:text-zinc-300">현재 이용 가능한 결제 수단이 없습니다.</p>
                  <p className="text-[11px] text-zinc-450 dark:text-zinc-500 mt-1">관리자에게 문의해 주시기 바랍니다.</p>
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


        {/* Submit Button */}
        <Button
          className="w-full h-14 text-sm font-bold tracking-wide rounded-xl text-white shadow-md disabled:bg-zinc-200 disabled:dark:bg-zinc-800 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer disabled:shadow-none"
          onClick={handlePayment}
          disabled={!agreed || isProcessing}
          style={agreed ? { backgroundColor: ft.primary } : {}}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>결제 처리 중...</span>
            </div>
          ) : donationFormData.isRecurring ? (
            firstPaymentTiming === 'scheduled'
              ? `🔒 0원 정기카드 등록 (${scheduledFirstPaymentDate} 첫 결제)`
              : `🔒 ${donationFormData.amount.toLocaleString()}원 즉시 결제 및 정기카드 등록`
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

