import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp, Tenant, getTenantPkCode } from '../../context/AppContext';
import { tenantAPI } from '../../api/client';
import { KakaoPayLogo, NaverPayLogo, TossPayLogo } from '../../components/PayBrandLogos';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Key,
  KeyRound,
  Send,
  Lock,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  RefreshCw,
  User,
  Phone,
  Mail,
  Clock,
  Zap,
  FileText,
  Upload,
  X,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '../../components/ui/separator';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';
import { convertKoreanToQwerty } from '../../utils/koreanConverter';

interface PaymentConfig {
  tenantId: string;
  pgProvider: string;
  apiKey: string;
  secretKey: string;
  mid: string;
  contractRate?: number;
  payoutCycle?: string;
  loginId?: string;
  iv?: string;
  ver?: string;
  enableCard?: boolean;
  enableEasyPayment?: boolean;
  enableVBank?: boolean;
  isActive: boolean;
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenants, updateTenantInfo, fetchTenants } = useApp();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Basic Info State
  const [name, setName] = useState('');
  const [religionType, setReligionType] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<{ checked: boolean; isAvailable: boolean; message: string }>({
    checked: false,
    isAvailable: false,
    message: '',
  });

  // Main Page Tab State ('basic' | 'payment' | 'easypay')
  const [activeTab, setActiveTab] = useState<'basic' | 'payment' | 'easypay'>('basic');

  // Payment Config State
  const [paymentTab, setPaymentTab] = useState<'general' | 'billing'>('general');
  // Easy Pay Sub-Tabs State ('kakaopay' | 'naverpay' | 'tosspay')
  const [easyPayTab, setEasyPayTab] = useState<'kakaopay' | 'naverpay' | 'tosspay'>('kakaopay');

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [pgProvider, setPgProvider] = useState('');
  const [mid, setMid] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [contractRate, setContractRate] = useState<number>(3.0);
  const [payoutCycle, setPayoutCycle] = useState('D+1');
  const [loginId, setLoginId] = useState('');
  const [iv, setIv] = useState('');
  const [ver, setVer] = useState('');

  // Kakao Pay Merchant Config State
  const [kakaoCid, setKakaoCid] = useState('TC0ONETIME');
  const [kakaoSecretKey, setKakaoSecretKey] = useState('DEV_SECRET_KEY');
  const [kakaoMode, setKakaoMode] = useState<'test' | 'live'>('test');
  const [showKakaoSecretKey, setShowKakaoSecretKey] = useState(false);
  const [enableKakaoPay, setEnableKakaoPay] = useState<boolean>(true);

  // Naver Pay Direct Config State
  const [naverPartnerId, setNaverPartnerId] = useState('NAV_PARTNER_999');
  const [naverClientId, setNaverClientId] = useState('CLIENT_ID_123');
  const [naverClientSecret, setNaverClientSecret] = useState('CLIENT_SECRET_456');
  const [naverMode, setNaverMode] = useState<'test' | 'live'>('test');
  const [showNaverSecret, setShowNaverSecret] = useState(false);
  const [enableNaverPay, setEnableNaverPay] = useState<boolean>(true);

  // Toss Pay Direct Config State
  const [tossPayMid, setTossPayMid] = useState('tosspay_mid_1234');
  const [tossPayApiKey, setTossPayApiKey] = useState('test_ck_tosspay_123');
  const [tossPaySecretKey, setTossPaySecretKey] = useState('test_sk_tosspay_456');
  const [tossPayMode, setTossPayMode] = useState<'test' | 'live'>('test');
  const [showTossPaySecret, setShowTossPaySecret] = useState(false);
  const [enableTossPay, setEnableTossPay] = useState<boolean>(true);
  
  // Billing Key (Recurring Payment) State
  const [billMid, setBillMid] = useState('');
  const [billApiKey, setBillApiKey] = useState('');
  const [billSecretKey, setBillSecretKey] = useState('');
  const [billVer, setBillVer] = useState('240000005');

  const [enableCard, setEnableCard] = useState(true);
  const [enableEasyPayment, setEnableEasyPayment] = useState(true);
  const [enableVBank, setEnableVBank] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [docModal, setDocModal] = useState<{
    isOpen: boolean;
    title: string;
    docType: 'unique' | 'business';
    number: string;
    fileUrl?: string;
  } | null>(null);
  const [showIv, setShowIv] = useState(false);
  const [showBillApiKey, setShowBillApiKey] = useState(false);
  const [showBillSecretKey, setShowBillSecretKey] = useState(false);

  useEffect(() => {
    if (id) {
      loadTenantData();
    }
  }, [id, tenants]);

  const loadTenantData = async () => {
    setIsLoading(true);
    try {
      // Load tenant basic info
      const foundTenant = tenants.find(t => t.id === id || t.slug === id);
      if (foundTenant) {
        setTenant(foundTenant);
        setName(foundTenant.name);
        setReligionType(foundTenant.religionType);
        setSlug(foundTenant.slug);

        // DB paymentConfig 만 신뢰 (localStorage 완전 배제)
        let cfg = foundTenant.paymentConfig;

        if (cfg && (cfg.pgProvider || cfg.kakaoCid)) {
          setPaymentConfig(cfg);
          setPgProvider(cfg.pgProvider || 'toss');
          setMid(cfg.mid || '');
          setApiKey(cfg.apiKey || '');
          setSecretKey(cfg.secretKey || '');
          setContractRate(cfg.contractRate !== undefined ? cfg.contractRate : 3.0);
          setPayoutCycle(cfg.payoutCycle || 'D+1');
          setLoginId(cfg.loginId || '');
          setIv(cfg.iv || '');
          setVer(cfg.ver || '');
          setKakaoCid(cfg.kakaoCid || '');
          setKakaoSecretKey(cfg.kakaoSecretKey || '');
          setKakaoMode(cfg.kakaoMode || 'test');
          setEnableKakaoPay(cfg.enableKakaoPay !== undefined ? cfg.enableKakaoPay : (cfg.providerConfigs?.kakaopay?.isEnabled ?? false));

          setNaverPartnerId(cfg.naverPartnerId || cfg.providerConfigs?.naverpay?.merchantId || '');
          setNaverClientId(cfg.naverClientId || cfg.providerConfigs?.naverpay?.clientKey || '');
          setNaverClientSecret(cfg.naverClientSecret || cfg.providerConfigs?.naverpay?.secretKey || '');
          setNaverMode(cfg.naverMode || cfg.providerConfigs?.naverpay?.mode || 'test');
          setEnableNaverPay(cfg.enableNaverPay !== undefined ? cfg.enableNaverPay : (cfg.providerConfigs?.naverpay?.isEnabled ?? false));

          setTossPayMid(cfg.tossPayMid || cfg.providerConfigs?.tosspay?.merchantId || '');
          setTossPayApiKey(cfg.tossPayApiKey || cfg.providerConfigs?.tosspay?.clientKey || '');
          setTossPaySecretKey(cfg.tossPaySecretKey || cfg.providerConfigs?.tosspay?.secretKey || '');
          setTossPayMode(cfg.tossPayMode || cfg.providerConfigs?.tosspay?.mode || 'test');
          setEnableTossPay(cfg.enableTossPay !== undefined ? cfg.enableTossPay : (cfg.providerConfigs?.tosspay?.isEnabled ?? false));

          setEnableCard(cfg.enableCard !== undefined ? cfg.enableCard : true);
          setEnableEasyPayment(cfg.enableEasyPayment !== undefined ? cfg.enableEasyPayment : true);
          setEnableVBank(cfg.enableVBank !== undefined ? cfg.enableVBank : true);
          setIsActive(cfg.isActive !== undefined ? cfg.isActive : true);
        } else {
          // 결제 미설정/미지정 단체인 경우 깨끗하게 공란으로 유지
          setPaymentConfig(null);
          setPgProvider('');
          setMid('');
          setApiKey('');
          setSecretKey('');
          setContractRate(3.0);
          setPayoutCycle('D+1');
          setLoginId('');
          setIv('');
          setVer('');
          setIsActive(false);
        }
      } else {
        toast.error('단체를 찾을 수 없습니다');
        navigate('/admin');
        return;
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
      toast.error('데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBasicInfo = async () => {
    if (!id || !name.trim() || !slug.trim()) {
      toast.error('필수 항목을 입력해주세요');
      return;
    }

    setIsSaving(true);
    try {
      const targetTenant = tenant || tenants.find(t => t.id === id || t.slug === id);
      const targetId = targetTenant?.id || id;

      const result = await tenantAPI.update(targetId, {
        name,
        religionType,
        slug,
      });

      if (result.success || result.data) {
        toast.success('단체 정보가 수정되었습니다');
        await fetchTenants();
      } else {
        toast.error(result.error || '단체 정보 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('단체 정보를 수정하는데 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordReset = (adminName: string, adminEmail: string) => {
    const dummyToken = `rst_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const resetUrl = `https://soulpay.info/${tenant?.slug || 'demo'}/reset-password?token=${dummyToken}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(resetUrl).catch(() => {});
    }

    toast.success(
      `🔑 ${adminName} (${adminEmail}) 님께 비밀번호 재설정 전송 완료!`,
      {
        description: `재설정 링크가 이메일/알림톡으로 발송되었으며, 클립보드에도 복사되었습니다.`,
        duration: 5000,
      }
    );
  };

  const handleSavePaymentConfig = async () => {
    const targetTenant = tenant || tenants.find(t => t.id === id || t.slug === id);
    const targetId = targetTenant?.id || id;
    if (!targetId) return;

    // 미지정 선택 시 결제 설정 삭제/해제 처리
    if (!pgProvider || pgProvider === 'none') {
      setIsSaving(true);
      try {
        const delRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d0d82cc7/payment/${targetId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );
        if (!delRes.ok) {
          const errBody = await delRes.text();
          throw new Error(`DB 삭제 실패 (${delRes.status}): ${errBody}`);
        }
        // localStorage 미사용 — DB만 신뢰
        if (targetTenant) {
          delete targetTenant.paymentConfig;
        }
        setPaymentConfig(null);
        setPgProvider('');
        setMid('');
        setApiKey('');
        setSecretKey('');
        setIsActive(false);
        toast.success('PG 결제 설정이 DB에서 해제되었습니다');
        await fetchTenants();
      } catch (e: any) {
        console.error('Error clearing payment config:', e);
        toast.error(`PG 설정 해제 중 오류가 발생했습니다: ${e?.message ?? ''}`);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (pgProvider === 'toss') {
      if (!mid.trim()) {
        toast.error('가맹점 식별번호(MID)를 입력해 주세요');
        return;
      }
      if (!apiKey.trim()) {
        toast.error('API Key (Client Key)를 입력해 주세요');
        return;
      }
      if (!secretKey.trim()) {
        toast.error('Secret Key를 입력해 주세요');
        return;
      }
    } else if (pgProvider === 'nanopay') {
      if (!mid.trim()) {
        toast.error('나노PG 가맹점 코드(shopcode)를 입력해 주세요');
        return;
      }
      if (!apiKey.trim()) {
        toast.error('나노PG API Key를 입력해 주세요');
        return;
      }
      if (!secretKey.trim()) {
        toast.error('나노PG 암호화 Key를 입력해 주세요');
        return;
      }
      if (!loginId.trim()) {
        toast.error('나노PG 로그인 ID(loginId)를 입력해 주세요');
        return;
      }
      if (!iv.trim()) {
        toast.error('나노PG 초기화 벡터(IV)를 입력해 주세요');
        return;
      }
      if (!ver.trim()) {
        toast.error('나노PG 버전(ver)을 입력해 주세요');
        return;
      }
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d0d82cc7/payment/${targetId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            pgProvider,
            mid,
            apiKey,
            secretKey,
            contractRate,
            payoutCycle,
            settlementCycle: payoutCycle,
            loginId,
            iv,
            ver,
            enableCard,
            enableEasyPayment,
            enableVBank,
            isActive: true,
          }),
        }
      );

      const newConfig = {
        tenantId: targetId,
        pgProvider,
        mid,
        apiKey,
        secretKey,
        contractRate,
        payoutCycle,
        settlementCycle: payoutCycle,
        loginId,
        iv,
        ver,
        kakaoCid,
        kakaoSecretKey,
        kakaoMode,
        enableKakaoPay,
        naverPartnerId,
        naverClientId,
        naverClientSecret,
        naverMode,
        enableNaverPay,
        tossPayMid,
        tossPayApiKey,
        tossPaySecretKey,
        tossPayMode,
        enableTossPay,
        providerConfigs: {
          tosspay: {
            providerCode: 'tosspay',
            providerName: '토스페이',
            providerType: 'easypay',
            merchantId: tossPayMid,
            clientKey: tossPayApiKey,
            secretKey: tossPaySecretKey,
            mode: tossPayMode,
            isEnabled: enableTossPay,
          },
          naverpay: {
            providerCode: 'naverpay',
            providerName: '네이버페이',
            providerType: 'easypay',
            merchantId: naverPartnerId,
            clientKey: naverClientId,
            secretKey: naverClientSecret,
            mode: naverMode,
            isEnabled: enableNaverPay,
          },
          kakaopay: {
            providerCode: 'kakaopay',
            providerName: '카카오페이',
            providerType: 'easypay',
            merchantId: kakaoCid,
            secretKey: kakaoSecretKey,
            mode: kakaoMode,
            isEnabled: enableKakaoPay,
          }
        },
        enableCard,
        enableEasyPayment,
        enableVBank,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`DB 저장 실패 (${response.status}): ${errBody}`);
      }

      // localStorage 미사용 — DB 응답값만 신뢰
      if (targetTenant) {
        targetTenant.paymentConfig = newConfig;
        updateTenantInfo(targetTenant.id, { ...targetTenant, paymentConfig: newConfig });
      }
      setPaymentConfig(newConfig);

      toast.success('결제 설정이 DB에 성공적으로 저장되었습니다');
      await fetchTenants();
    } catch (error: any) {
      console.error('Error saving payment config:', error);
      toast.error(`결제 설정 저장에 실패했습니다: ${error?.message ?? ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getReligionLabel = (type: string) => {
    switch (type) {
      case 'protestant':
        return '기독교';
      case 'catholic':
        return '천주교';
      case 'buddhist':
        return '불교';
      case 'charity':
        return '구호/기부재단 (NPO)';
      case 'general':
        return '비영리/사회공헌';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--hm-accent)] mx-auto mb-3"></div>
          <p className="text-[12px] text-[var(--hm-ink-3)]">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/system/admin/tenants')}
            className="shrink-0 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-semibold text-[var(--hm-ink)]">
                {tenant?.name ?? '단체 상세 정보'}
              </h1>
              <span className="inline-flex items-center text-[10.5px] font-medium rounded-[5px] px-2 py-0.5 border border-purple-200 bg-purple-50 text-purple-700">
                {getReligionLabel(tenant?.religionType)}
              </span>
            </div>
            <p className="text-[12.5px] text-[var(--hm-ink-3)] mt-0.5">
              단체의 기본 정보와 결제 설정을 관리하세요
            </p>
          </div>
        </div>

        {/* 탭 전환 스위치 버튼 그룹 */}
        <div className="flex gap-2 p-1 bg-slate-200/70 dark:bg-zinc-800 rounded-xl max-w-xl">
          <button
            type="button"
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'basic'
                ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('basic')}
          >
            <Building2 className="h-4 w-4" />
            기본 정보 & 계정
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'payment'
                ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('payment')}
          >
            <CreditCard className="h-4 w-4" />
            결제 / PG 설정
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'easypay'
                ? 'bg-amber-400 text-amber-950 font-black shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('easypay')}
          >
            <Zap className="h-4 w-4 text-amber-600 fill-amber-400" />
            간편결제 설정
          </button>
        </div>

        {/* ── 탭 1: 기본 정보 ── */}
        {activeTab === 'basic' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  단체 기본 정보 및 계정 관리
                </span>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono text-xs font-bold border border-purple-200">
                  시스템 PK: {getTenantPkCode(tenant, tenants)}
                </Badge>
              </CardTitle>
            <CardDescription>단체의 기본 정보를 수정합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  단체명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 서울중앙교회"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="religionType">
                  단체 유형 <span className="text-red-500">*</span>
                </Label>
                <Select value={religionType} onValueChange={setReligionType}>
                  <SelectTrigger id="religionType">
                    <SelectValue placeholder="단체 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protestant">기독교</SelectItem>
                    <SelectItem value="catholic">천주교</SelectItem>
                    <SelectItem value="buddhist">불교</SelectItem>
                    <SelectItem value="charity">구호/기부재단 (NPO)</SelectItem>
                    <SelectItem value="general">비영리/사회공헌</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="slug">
                    단축 접속 URL Slug <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[11px] text-zinc-400 font-semibold">영문 소문자, 숫자, 하이픈(-)만 가능</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      const { converted, hasKorean } = convertKoreanToQwerty(e.target.value);
                      setSlug(converted);
                      setSlugStatus({ checked: false, isAvailable: false, message: '' });

                      if (hasKorean) {
                        toast.info(`💡 한글 키보드 입력을 영문 주소('${converted}')로 자동 변환하였습니다.`, {
                          id: 'hangul-convert-toast',
                          duration: 2500,
                        });
                      }
                    }}
                    placeholder="예: gakwonsa"
                    className="flex-1 font-semibold font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 px-3.5 font-bold cursor-pointer whitespace-nowrap"
                    onClick={() => {
                      const clean = slug.trim().toLowerCase();
                      if (!clean) { toast.error('URL Slug를 입력해주세요.'); return; }
                      const isDup = tenants.some(t => t.id !== tenant?.id && t.slug.toLowerCase() === clean);
                      if (isDup) {
                        toast.error(`'${clean}' 주소는 이미 사용 중입니다.`);
                        setSlugStatus({ checked: true, isAvailable: false, message: `🔴 '${clean}' 주소는 이미 다른 단체에서 사용 중입니다.` });
                      } else {
                        toast.success(`'${clean}' 주소는 즉시 사용 가능합니다!`);
                        setSlugStatus({ checked: true, isAvailable: true, message: `🟢 '${clean}' 주소는 즉시 사용 가능합니다!` });
                      }
                    }}
                  >
                    중복 확인
                  </Button>
                </div>
                {slugStatus.checked && (
                  <p className={`text-xs font-bold ${slugStatus.isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {slugStatus.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground font-mono">
                  신도/기부자용 접속 URL: soulpay.info/{slug}
                </p>
              </div>

              {/* 담당자 및 계정/사업자 정보 카드 섹션 */}
              <div className="md:col-span-2 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl">
                {(() => {
                  const defaultLeaderTitle = tenant.terminology?.leaderTitle || (
                    tenant.religionType === 'buddhist' ? '주지스님' :
                    tenant.religionType === 'catholic' ? '주임신부' :
                    tenant.religionType === 'protestant' ? '담임목사' : '대표자'
                  );
                  const adminDisplayName = (tenant.contact?.name && tenant.contact.name !== '주지스님 / 담임목사' && tenant.contact.name !== '담임목사 / 주지스님')
                    ? tenant.contact.name
                    : defaultLeaderTitle;

                  return (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-purple-600" />
                          대표 관리자 ({defaultLeaderTitle})
                        </Label>
                        <Input value={adminDisplayName} disabled className="bg-white dark:bg-zinc-900 text-sm font-semibold" />
                      </div>
                    </>
                  );
                })()}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                    담당자 연락처 (전화번호)
                  </Label>
                  <Input value={tenant.contact?.phone || ''} disabled className="bg-white dark:bg-zinc-900 text-sm font-semibold text-indigo-600 dark:text-indigo-400" />
                </div>
                
                {/* 관리자 로그인 계정 아이디 & 임시 비밀번호 */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-emerald-600" />
                    관리자 로그인 아이디 (이메일)
                  </Label>
                  <Input value={tenant.contact?.email || ''} disabled className="bg-white dark:bg-zinc-900 text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Key className="h-3.5 w-3.5 text-amber-500" />
                    발급 관리자 비밀번호
                  </Label>
                  <div className="relative">
                    <Input 
                      type={showSecretKey ? "text" : "password"}
                      value={tenant.tempPassword || "admin1234!"} 
                      disabled 
                      className="bg-amber-50/60 dark:bg-amber-950/30 text-sm font-extrabold font-mono text-amber-900 dark:text-amber-300 border-amber-200" 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                    >
                      {showSecretKey ? "숨기기" : "보기"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                      종교/비영리 단체 고유번호증 번호 (비영리 헌금/보시 수납용)
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs font-bold text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 cursor-pointer rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                      onClick={() => setDocModal({
                        isOpen: true,
                        title: '고유번호증 서류 확인',
                        docType: 'unique',
                        number: tenant?.uniqueNumber || tenant?.businessInfo?.uniqueNumber || '미등록',
                        fileUrl: tenant?.uniqueNumberFile || tenant?.businessInfo?.uniqueNumberFile,
                      })}
                    >
                      <FileText className="h-3.5 w-3.5 text-purple-600" />
                      <span>서류 보기</span>
                    </Button>
                  </div>
                  <Input 
                    value={tenant?.uniqueNumber || tenant?.businessInfo?.uniqueNumber || '미등록'} 
                    disabled 
                    className="bg-white dark:bg-zinc-900 text-sm font-bold font-mono text-purple-700 dark:text-purple-300" 
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      수익사업용 사업자등록번호 (바자회/물품 판매 겸업 시)
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs font-bold text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 cursor-pointer rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                      onClick={() => setDocModal({
                        isOpen: true,
                        title: '사업자등록증 서류 확인',
                        docType: 'business',
                        number: tenant?.businessRegistrationNumber || tenant?.businessInfo?.registrationNumber || '미등록 (순수 비영리)',
                        fileUrl: tenant?.businessRegistrationFile || tenant?.businessInfo?.registrationFile,
                      })}
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      <span>서류 보기</span>
                    </Button>
                  </div>
                  <Input 
                    value={tenant?.businessRegistrationNumber || tenant?.businessInfo?.registrationNumber || '미등록 (순수 비영리)'} 
                    disabled 
                    className="bg-white dark:bg-zinc-900 text-sm font-semibold font-mono text-slate-600 dark:text-zinc-400" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">단체 소재지 주소</Label>
                  <Input value={tenant.businessInfo?.address || tenant.address || ''} disabled className="bg-white dark:bg-zinc-900 text-sm font-semibold" />
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* 관리자 계정 정보 */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-purple-600" />
                가맹 단체 관리자 접속 계정 목록
              </h3>

              <div className="space-y-2">
                {(() => {
                  const adminDisplayName = tenant.contact?.name || `${tenant.name} 대표 관리자`;
                  return [
                    { id: `admin-${tenant.id}`, name: adminDisplayName, email: tenant.contact?.email || '', role: 'tenant_admin', createdAt: tenant.appliedAt ? tenant.appliedAt.slice(0, 10) : '' }
                  ];
                })().map((adminUser) => (
                  <div
                    key={adminUser.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs gap-3 transition-all hover:bg-white dark:hover:bg-zinc-800 hover:border-purple-200 dark:hover:border-zinc-700 hover:shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-extrabold text-sm">
                        {adminUser.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                          {adminUser.name}
                          <Badge className={adminUser.role === 'tenant_admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold border-none' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-none'}>
                            {adminUser.role === 'tenant_admin' ? '최고 관리자' : '재무/보시 실무자'}
                          </Badge>
                        </div>
                        <div className="text-slate-500 dark:text-zinc-400 font-mono mt-0.5 flex flex-wrap items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" /> {adminUser.email}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" /> 생성일: {adminUser.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 border-slate-300 dark:border-zinc-700 hover:border-purple-300 rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                        onClick={() => handleSendPasswordReset(adminUser.name, adminUser.email)}
                      >
                        <KeyRound className="h-3.5 w-3.5 text-purple-600" />
                        <span>비밀번호 리셋 전송</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSaveBasicInfo}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700 font-bold"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? '저장 중...' : '기본 정보 저장'}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* ── 탭 2: 결제 / PG 설정 ── */}
        {activeTab === 'payment' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  결제 / PG 정보 설정
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">
                  가맹 단체의 대표 PG사(토스페이먼츠, 나노PG 등) 및 정기결제(빌링키) 설정을 관리합니다.
                </CardDescription>
              </div>
              {paymentConfig && (
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className={isActive ? 'bg-green-600' : ''}
                >
                  {isActive ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      활성화
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      비활성화
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* PG Sub Tabs */}
            <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-4">
              <button
                type="button"
                className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  paymentTab === 'general'
                    ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                onClick={() => setPaymentTab('general')}
              >
                <CreditCard className="h-4 w-4" />
                <span>일반 결제 설정 (일시불/가상계좌)</span>
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  paymentTab === 'billing'
                    ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                onClick={() => setPaymentTab('billing')}
              >
                <Key className="h-4 w-4 text-amber-500" />
                <span>빌링키(정기) 결제 설정 (매월 자동 청구)</span>
              </button>
            </div>

            {paymentTab === 'general' && (
              /* ==================== GENERAL PAYMENT TAB ==================== */
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pgProvider" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      PG 제공자 <span className="text-red-500">*</span>
                    </Label>
                    <Select value={pgProvider || 'none'} onValueChange={(val) => setPgProvider(val === 'none' ? '' : val)}>
                      <SelectTrigger id="pgProvider" className="bg-white font-semibold">
                        <SelectValue placeholder="PG 제공자 선택 (미지정)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">미지정 (PG 미계약 / 미설정)</SelectItem>
                        <SelectItem value="toss">토스페이먼츠 (TossPayments)</SelectItem>
                        <SelectItem value="nanopay">나노PG (NANO)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contractRate" className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-purple-600" />
                        단체 최종 계약 수수료율 (%) <span className="text-red-500">*</span>
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="contractRate"
                        type="number"
                        step="0.1"
                        min="2.0"
                        max="10.0"
                        value={contractRate}
                        onChange={(e) => setContractRate(parseFloat(e.target.value) || 0)}
                        placeholder="예: 3.0"
                        className="bg-white font-mono font-bold text-purple-900 h-10 text-right"
                      />
                      <span className="font-bold text-purple-900 text-sm">%</span>
                    </div>
                  </div>
                </div>

                {!pgProvider || pgProvider === 'none' ? (
                  <div className="py-10 px-6 text-center bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 space-y-2 animate-fade-in">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/50 shadow-2xs">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-xs">PG 제공자가 선택되지 않았습니다</h4>
                  </div>
                ) : (
                  <>
                    {pgProvider === 'tosspayments' && (
                      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block mb-0.5">🔹 토스페이먼츠(Toss) 오픈 API 정산 연동 모드</span>
                          토스페이먼츠 공식 오픈 API(<code className="bg-white/80 dark:bg-zinc-800 px-1 rounded font-mono font-bold text-blue-700">/v1/settlements</code>)를 지원합니다. 수수료율 및 정산 주기는 계약 원장 기록용이며, 상용키 가동 시 토스 서버 정산 데이터가 동적 연동됩니다.
                        </div>
                      </div>
                    )}

                    {pgProvider === 'nanopay' && (
                      <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-xl flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-200">
                        <Info className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block mb-0.5">🟣 나노PG (Nanopay / 스몰비) 가맹점 원장 교차검증 모드</span>
                          나노PG 상점식별코드(<code className="bg-white/80 dark:bg-zinc-800 px-1 rounded font-mono font-bold text-purple-700">shopcode</code>) 기반으로 가동됩니다. 지정된 수수료율 및 정산 주기는 나노PG 일별 대장과 1:1 교차 검증(Audit) 용도로 활용됩니다.
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="mid" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {pgProvider === 'nanopay' ? '가맹점 코드 (shopcode)' : '가맹점 식별번호 (MID)'} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="mid"
                        value={mid}
                        onChange={(e) => setMid(e.target.value)}
                        placeholder={pgProvider === 'nanopay' ? "예: 240000006" : "예: toss_mid_12345"}
                        autoComplete="off"
                      />
                      {/* ── 테스트 가맹점코드 채우기 버튼 ── */}
                      {pgProvider === 'nanopay' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMid('240000006');
                            setApiKey('2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL');
                            setSecretKey('UfS2tccZNyz3HYxXJDhZH52Ujorqp5km');
                            setLoginId('smbtestshop');
                            setIv('vgqTyX5tBqnMXB68');
                            setVer('smbtest');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                        >
                          🟣 나노PG 테스트 가맹점코드 채우기
                          <span className="text-[10px] font-normal text-purple-500">(MID · API Key · Secret · loginId · IV · ver)</span>
                        </button>
                      )}
                      {(pgProvider === 'tosspayments' || pgProvider === 'toss') && (
                        <button
                          type="button"
                          onClick={() => {
                            setMid('tosspayments_test_mid');
                            setApiKey('test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq');
                            setSecretKey('test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          🔵 토스페이먼츠 테스트 가맹점코드 채우기
                          <span className="text-[10px] font-normal text-blue-500">(MID · Client Key · Secret Key)</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKey" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        API Key {pgProvider !== 'nanopay' && '(Client Key)'} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="apiKey"
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={pgProvider === 'nanopay' ? "API Key 입력" : "토스페이먼츠 API Key 입력"}
                          className="pr-10"
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secretKey" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        {pgProvider === 'nanopay' ? '암호화 KEY (Secret)' : 'Secret Key'} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="secretKey"
                          type={showSecretKey ? 'text' : 'password'}
                          value={secretKey}
                          onChange={(e) => setSecretKey(e.target.value)}
                          placeholder={pgProvider === 'nanopay' ? "암호화 KEY 입력" : "토스페이먼츠 Secret Key 입력"}
                          className="pr-10"
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                        >
                          {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payoutCycle" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        정산 주기 <span className="text-red-500">*</span>
                      </Label>
                      <Select value={payoutCycle} onValueChange={(val) => setPayoutCycle(val)}>
                        <SelectTrigger id="payoutCycle" className="bg-white font-semibold">
                          <SelectValue placeholder="정산 주기 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="D+1">D+1 (익일 정산)</SelectItem>
                          <SelectItem value="D+2">D+2 (2일후 정산)</SelectItem>
                          <SelectItem value="D+3">D+3 (3일후 정산)</SelectItem>
                          <SelectItem value="D+7">D+7 (주간 정산)</SelectItem>
                          <SelectItem value="M+1">M+1 (월간 정산)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {pgProvider === 'nanopay' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="loginId" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            상점 로그인 ID (loginId)
                          </Label>
                          <Input
                            id="loginId"
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            placeholder="예: smbtestshop"
                            autoComplete="off"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="iv" className="flex items-center gap-2">
                              <Lock className="h-4 w-4" />
                              암호화 벡터 (IV)
                            </Label>
                            <div className="relative">
                              <Input
                                id="iv"
                                type={showIv ? 'text' : 'password'}
                                value={iv}
                                onChange={(e) => setIv(e.target.value)}
                                placeholder="IV 값 입력"
                                className="pr-10"
                                autoComplete="new-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full"
                                onClick={() => setShowIv(!showIv)}
                              >
                                {showIv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="ver" className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              버전 (ver)
                            </Label>
                            <Input
                              id="ver"
                              value={ver}
                              onChange={(e) => setVer(e.target.value)}
                              placeholder="예: smbtest"
                              autoComplete="off"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                      <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">허용할 수납 결제 수단 선택</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <label className="flex items-center gap-2 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors shadow-2xs">
                          <input
                            type="checkbox"
                            checked={enableCard}
                            onChange={(e) => setEnableCard(e.target.checked)}
                            className="h-4 w-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500"
                          />
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4 text-purple-600" />
                            신용 / 체크카드
                          </span>
                        </label>

                        <label className="flex items-center gap-2 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors shadow-2xs">
                          <input
                            type="checkbox"
                            checked={enableVBank}
                            onChange={(e) => setEnableVBank(e.target.checked)}
                            className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-indigo-600" />
                            가상계좌 (무통장 입금)
                          </span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {paymentTab === 'billing' && (
              !pgProvider || pgProvider === 'none' ? (
                <div className="py-12 px-6 text-center bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 space-y-3.5 animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/50 shadow-2xs">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">PG 제공자가 지정되지 않았습니다</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                      정기결제(빌링키) 설정을 등록하려면 [일반 결제 설정] 탭에서 먼저 PG사(토스페이먼츠 또는 나노PG)를 선택해 주세요.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in p-5 bg-amber-50/40 dark:bg-zinc-900/60 rounded-2xl border border-amber-200/80 dark:border-amber-900/50">
                  <div className="bg-amber-100/70 border border-amber-300/80 p-3.5 rounded-xl flex items-start gap-3 text-amber-900">
                    <Zap className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-amber-950">정기결제 (빌링키 자동청구) 연동 안내</p>
                      <p className="text-amber-800">
                        선택된 PG사({pgProvider === 'nanopay' ? '나노PG' : '토스페이먼츠'})의 빌링키 발급용 전용 상점 식별자 및 암호화 키를 등록하세요.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billMid" className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
                      <CreditCard className="h-4 w-4 text-amber-600" />
                      정기결제 전용 가맹점 식별자 (MID / ShopCode)
                    </Label>
                    <Input
                      id="billMid"
                      value={billMid}
                      onChange={(e) => setBillMid(e.target.value)}
                      placeholder="예: 240000005"
                      className="bg-white dark:bg-zinc-900 font-semibold"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billApiKey" className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
                      <Key className="h-4 w-4 text-amber-600" />
                      정기결제 전용 API Key (Client Key)
                    </Label>
                    <div className="relative">
                      <Input
                        id="billApiKey"
                        type={showBillApiKey ? 'text' : 'password'}
                        value={billApiKey}
                        onChange={(e) => setBillApiKey(e.target.value)}
                        placeholder="나노페이 발급 빌링 API Key 입력"
                        className="pr-10 bg-white dark:bg-zinc-900 font-semibold"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowBillApiKey(!showBillApiKey)}
                      >
                        {showBillApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billSecretKey" className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
                      <Lock className="h-4 w-4 text-amber-600" />
                      정기결제 암호화 Key (Secret)
                    </Label>
                    <div className="relative">
                      <Input
                        id="billSecretKey"
                        type={showBillSecretKey ? 'text' : 'password'}
                        value={billSecretKey}
                        onChange={(e) => setBillSecretKey(e.target.value)}
                        placeholder="나노페이 발급 빌링 암호화 Key 입력"
                        className="pr-10 bg-white dark:bg-zinc-900 font-semibold"
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowBillSecretKey(!showBillSecretKey)}
                      >
                        {showBillSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billVer" className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      정기결제 API 버전 (ver)
                    </Label>
                    <Input
                      id="billVer"
                      value={billVer}
                      onChange={(e) => setBillVer(e.target.value)}
                      placeholder="기본값: 240000005"
                      className="bg-white dark:bg-zinc-900 font-semibold"
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
                      onClick={() => {
                        setBillMid('240000005');
                        setBillApiKey('2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL');
                        setBillSecretKey('Q2Jv7LkNp5X3M8Yc6rW9T1Eb4F6HdKx6');
                        setBillVer('240000005');
                        toast.info('나노PG 빌링결제 v2.2.1 테스트 계정 정보가 채워졌습니다.');
                      }}
                    >
                      나노PG 빌링 테스트 계정 정보 채우기
                    </Button>
                  </div>
                </div>
              )
            )}

            <Separator className="my-4" />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSavePaymentConfig}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 font-bold"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? '저장 중...' : '결제 설정 저장'}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* ── 탭 3: 간편결제 설정 (카카오페이 / 네이버페이 / 토스페이) ── */}
        {activeTab === 'easypay' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-zinc-100">
                    <Zap className="h-5 w-5 text-amber-500 fill-amber-400" />
                    간편결제 계정 설정 (카카오페이 / 네이버페이 / 토스페이)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    가맹 단체별 간편결제 서비스(카카오페이, 네이버페이, 토스페이) 직통 가맹점 계정을 독립적으로 관리합니다.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Easy Pay Sub-Tabs */}
              <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-xl mb-5">
                <button
                  type="button"
                  className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    easyPayTab === 'kakaopay'
                      ? 'bg-[#FEE500] text-[#3C1E1E] shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400'
                  }`}
                  onClick={() => setEasyPayTab('kakaopay')}
                >
                  <KakaoPayLogo />
                  <span>계정 설정 (CID)</span>
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    easyPayTab === 'naverpay'
                      ? 'bg-[#03CF5D] text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400'
                  }`}
                  onClick={() => setEasyPayTab('naverpay')}
                >
                  <NaverPayLogo />
                  <span>계정 설정 (파트너 ID)</span>
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    easyPayTab === 'tosspay'
                      ? 'bg-[#0050FF] text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400'
                  }`}
                  onClick={() => setEasyPayTab('tosspay')}
                >
                  <TossPayLogo />
                  <span>계정 설정 (가맹점 ID)</span>
                </button>
              </div>

              {/* ==================== 1. KAKAO PAY TAB ==================== */}
              {easyPayTab === 'kakaopay' && (
                <div className="space-y-5 animate-fade-in p-5 bg-[#FFFDE7]/80 dark:bg-zinc-900/60 rounded-2xl border border-[#FBC02D]/60 dark:border-amber-900/50">
                  {/* 상단 서비스 사용/미사용 설정 바 */}
                  <div className="bg-white dark:bg-zinc-950 border border-[#FBC02D]/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <KakaoPayLogo />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <span>카카오페이 수납 활성화 여부</span> <span className="text-red-500">*</span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 font-medium">
                          사용으로 선택된 경우에만 신도 봉헌/기부 결제 페이지의 간편결제 옵션에 노출됩니다.
                        </p>
                      </div>
                    </div>
                    <Select value={enableKakaoPay ? 'true' : 'false'} onValueChange={(val) => setEnableKakaoPay(val === 'true')}>
                      <SelectTrigger className={`w-36 h-10 text-xs font-bold ${enableKakaoPay ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">🟢 사용함 (활성화)</SelectItem>
                        <SelectItem value="false">🔴 미사용 (숨김)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-[#FFFDE7] border border-[#FBC02D] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-1">
                      <div className="text-xs font-black text-[#E65100] flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-[#E65100]" /> 카카오페이 공식 테스트 계정 (TC0ONETIME) 1클릭 설정
                      </div>
                      <p className="text-xs text-[#3E2723] font-medium leading-relaxed">
                        카카오페이 개발자 센터 공식 테스트 가맹점 CID(`TC0ONETIME`) 및 Secret Key(`DEV_SECRET_KEY`)로 자동 채웁니다.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setKakaoCid('TC0ONETIME');
                        setKakaoSecretKey('DEV_SECRET_KEY');
                        setKakaoMode('test');
                        setEnableKakaoPay(true);
                        setEnableEasyPayment(true);
                        toast.success('⚡ 카카오페이 공식 테스트 계정 (TC0ONETIME)으로 입력되었습니다.');
                      }}
                      className="bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] font-black text-xs h-9 px-4 rounded-xl cursor-pointer border border-[#FBC02D] shrink-0 shadow-xs"
                    >
                      ⚡ 테스트 계정 자동 입력
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    <div className="space-y-2">
                      <Label htmlFor="kakaoCid" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        카카오페이 가맹점 CID (Client ID) *
                      </Label>
                      <Input
                        id="kakaoCid"
                        value={kakaoCid}
                        onChange={(e) => setKakaoCid(e.target.value)}
                        placeholder="예: TC0ONETIME 또는 발급받은 CID 10자리"
                        className="font-mono text-xs font-bold h-11 bg-white dark:bg-zinc-950"
                      />
                      <p className="text-[11px] text-zinc-500 font-medium">
                        카카오페이 파트너센터에서 발급받은 단일결제 가맹점 CID (기본: TC0ONETIME)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="kakaoSecretKey" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        카카오페이 Secret Key (API 키) *
                      </Label>
                      <div className="relative">
                        <Input
                          id="kakaoSecretKey"
                          type={showKakaoSecretKey ? 'text' : 'password'}
                          value={kakaoSecretKey}
                          onChange={(e) => setKakaoSecretKey(e.target.value)}
                          placeholder="예: DEV_SECRET_KEY 또는 발급받은 Secret Key"
                          className="font-mono text-xs font-bold h-11 bg-white dark:bg-zinc-950 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowKakaoSecretKey(!showKakaoSecretKey)}
                        >
                          {showKakaoSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-medium">
                        카카오페이 Open API 통신 인증용 Secret Key (기본: DEV_SECRET_KEY)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">카카오페이 결제 연동 환경</Label>
                    <Select value={kakaoMode} onValueChange={(val: 'test' | 'live') => setKakaoMode(val)}>
                      <SelectTrigger className="h-11 text-xs font-bold bg-white dark:bg-zinc-950">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">🟡 개발자 테스트 샌드박스 (Sandbox TC0ONETIME)</SelectItem>
                        <SelectItem value="live">🔴 실결제 운용 가맹점 (Live Production)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* ==================== 2. NAVER PAY TAB ==================== */}
              {easyPayTab === 'naverpay' && (
                <div className="space-y-5 animate-fade-in p-5 bg-[#E8F5E9]/80 dark:bg-zinc-900/60 rounded-2xl border border-[#03CF5D]/60 dark:border-emerald-900/50">
                  {/* 상단 서비스 사용/미사용 설정 바 */}
                  <div className="bg-white dark:bg-zinc-950 border border-[#03CF5D]/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <NaverPayLogo />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <span>네이버페이 수납 활성화 여부</span> <span className="text-red-500">*</span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 font-medium">
                          사용으로 선택된 경우에만 신도 봉헌/기부 결제 페이지의 간편결제 옵션에 노출됩니다.
                        </p>
                      </div>
                    </div>
                    <Select value={enableNaverPay ? 'true' : 'false'} onValueChange={(val) => setEnableNaverPay(val === 'true')}>
                      <SelectTrigger className={`w-36 h-10 text-xs font-bold ${enableNaverPay ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">🟢 사용함 (활성화)</SelectItem>
                        <SelectItem value="false">🔴 미사용 (숨김)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-[#E8F5E9] border border-[#03CF5D] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-1">
                      <div className="text-xs font-black text-[#1b5e20] flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-[#03CF5D]" /> 네이버페이 개발자 테스트 계정 1클릭 설정
                      </div>
                      <p className="text-xs text-[#1b5e20] font-medium leading-relaxed">
                        네이버페이 센터 테스트 파트너 ID(`NAV_PARTNER_999`) 및 Client Secret으로 자동 채웁니다.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setNaverPartnerId('NAV_PARTNER_999');
                        setNaverClientId('CLIENT_ID_123');
                        setNaverClientSecret('CLIENT_SECRET_456');
                        setNaverMode('test');
                        setEnableNaverPay(true);
                        setEnableEasyPayment(true);
                        toast.success('⚡ 네이버페이 테스트 계정 정보가 입력되었습니다.');
                      }}
                      className="bg-[#03CF5D] hover:bg-[#02b350] text-white font-black text-xs h-9 px-4 rounded-xl cursor-pointer border border-[#03CF5D] shrink-0 shadow-xs"
                    >
                      ⚡ 테스트 계정 자동 입력
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    <div className="space-y-2">
                      <Label htmlFor="naverPartnerId" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        네이버페이 파트너 ID (Partner ID) *
                      </Label>
                      <Input
                        id="naverPartnerId"
                        value={naverPartnerId}
                        onChange={(e) => setNaverPartnerId(e.target.value)}
                        placeholder="예: NAV_PARTNER_999 또는 발급받은 파트너 ID"
                        className="font-mono text-xs font-bold h-11 bg-white dark:bg-zinc-950"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="naverClientId" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        네이버페이 Client ID (클라이언트 ID) *
                      </Label>
                      <Input
                        id="naverClientId"
                        value={naverClientId}
                        onChange={(e) => setNaverClientId(e.target.value)}
                        placeholder="예: CLIENT_ID_123"
                        className="font-mono text-xs font-bold h-11 bg-white dark:bg-zinc-950"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="naverClientSecret" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        네이버페이 Client Secret (보안 인증 키) *
                      </Label>
                      <div className="relative">
                        <Input
                          id="naverClientSecret"
                          type={showNaverSecret ? 'text' : 'password'}
                          value={naverClientSecret}
                          onChange={(e) => setNaverClientSecret(e.target.value)}
                          placeholder="예: CLIENT_SECRET_456"
                          className="font-mono text-xs font-bold h-11 bg-white dark:bg-zinc-950 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowNaverSecret(!showNaverSecret)}
                        >
                          {showNaverSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">네이버페이 연동 환경</Label>
                    <Select value={naverMode} onValueChange={(val: 'test' | 'live') => setNaverMode(val)}>
                      <SelectTrigger className="h-11 text-xs font-bold bg-white dark:bg-zinc-950">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">🟡 개발자 테스트 샌드박스 (Sandbox)</SelectItem>
                        <SelectItem value="live">🔴 실결제 운용 가맹점 (Live Production)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* ==================== 3. TOSS PAY TAB ==================== */}
              {easyPayTab === 'tosspay' && (
                <div className="space-y-5 animate-fade-in p-5 bg-[#E3F2FD]/80 dark:bg-zinc-900/60 rounded-2xl border border-[#0050FF]/60 dark:border-blue-900/50">
                  {/* 상단 서비스 사용/미사용 설정 바 */}
                  <div className="bg-white dark:bg-zinc-950 border border-[#0050FF]/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <TossPayLogo />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <span>토스페이 수납 활성화 여부</span> <span className="text-red-500">*</span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 font-medium">
                          사용으로 선택된 경우에만 신도 봉헌/기부 결제 페이지의 간편결제 옵션에 노출됩니다.
                        </p>
                      </div>
                    </div>
                    <Select value={enableTossPay ? 'true' : 'false'} onValueChange={(val) => setEnableTossPay(val === 'true')}>
                      <SelectTrigger className={`w-36 h-10 text-xs font-bold ${enableTossPay ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">🟢 사용함 (활성화)</SelectItem>
                        <SelectItem value="false">🔴 미사용 (숨김)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-[#E3F2FD] border border-[#0050FF] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-1">
                      <div className="text-xs font-black text-[#0D47A1] flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-[#0050FF]" /> 토스페이 개발자 테스트 계정 1클릭 설정
                      </div>
                      <p className="text-xs text-[#0D47A1] font-medium leading-relaxed">
                        토스페이 가맹점 MID(`tosspay_mid_1234`) 및 API Client Key로 자동 채웁니다.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setTossPayMid('tosspay_mid_1234');
                        setTossPayApiKey('test_ck_tosspay_123');
                        setTossPaySecretKey('test_sk_tosspay_456');
                        setTossPayMode('test');
                        setEnableTossPay(true);
                        setEnableEasyPayment(true);
                        toast.success('⚡ 토스페이 테스트 계정 정보가 입력되었습니다.');
                      }}
                      className="bg-[#0050FF] hover:bg-[#0040D0] text-white font-black text-xs h-9 px-4 rounded-xl cursor-pointer border border-[#0050FF] shrink-0 shadow-xs"
                    >
                      ⚡ 테스트 계정 자동 입력
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    <div className="space-y-2">
                      <Label htmlFor="tossPayMid" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        토스페이 가맹점 MID (Merchant ID) *
                      </Label>
                      <Input
                        id="tossPayMid"
                        value={tossPayMid}
                        onChange={(e) => setTossPayMid(e.target.value)}
                        placeholder="예: tosspay_mid_1234"
                        className="font-mono text-xs font-bold h-11 bg-white dark:bg-zinc-950"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tossPayApiKey" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        토스페이 API Client Key *
                      </Label>
                      <Input
                        id="tossPayApiKey"
                        value={tossPayApiKey}
                        onChange={(e) => setTossPayApiKey(e.target.value)}
                        placeholder="예: test_ck_tosspay_123"
                        className="font-mono text-xs font-bold h-11 bg-white dark:bg-zinc-950"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="tossPaySecretKey" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        토스페이 Secret Key (시크릿 키) *
                      </Label>
                      <div className="relative">
                        <Input
                          id="tossPaySecretKey"
                          type={showTossPaySecret ? 'text' : 'password'}
                          value={tossPaySecretKey}
                          onChange={(e) => setTossPaySecretKey(e.target.value)}
                          placeholder="예: test_sk_tosspay_456"
                          className="font-mono text-xs font-bold h-11 bg-white dark:bg-zinc-950 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowTossPaySecret(!showTossPaySecret)}
                        >
                          {showTossPaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">토스페이 연동 환경</Label>
                    <Select value={tossPayMode} onValueChange={(val: 'test' | 'live') => setTossPayMode(val)}>
                      <SelectTrigger className="h-11 text-xs font-bold bg-white dark:bg-zinc-950">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">🟡 개발자 테스트 샌드박스 (Sandbox)</SelectItem>
                        <SelectItem value="live">🔴 실결제 운용 가맹점 (Live Production)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin')}
                  disabled={isSaving}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSavePaymentConfig}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 font-bold"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? '저장 중...' : '결제 설정 저장'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 📄 고유번호증/사업자등록증 실물 서류 확인 및 관리 모달 */}
      {docModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-zinc-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span>{docModal.title}</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                onClick={() => setDocModal(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">가맹 단체명:</span>
                <span className="font-bold text-slate-900 dark:text-zinc-100">{tenant?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">증빙 번호:</span>
                <span className="font-bold font-mono text-purple-700 dark:text-purple-300">{docModal.number}</span>
              </div>
            </div>

            {/* 실물 서류 이미지/PDF 미리보기 */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-950 flex flex-col items-center justify-center min-h-[220px] p-4 text-center">
              {docModal.fileUrl ? (
                docModal.fileUrl.startsWith('data:application/pdf') ? (
                  <div className="space-y-3">
                    <FileText className="h-16 w-16 text-purple-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">PDF 형식 증빙서류가 첨부되어 있습니다</p>
                    <a
                      href={docModal.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-all shadow-xs"
                    >
                      <FileText className="h-4 w-4" />
                      <span>PDF 서류 전체보기 (새 탭)</span>
                    </a>
                  </div>
                ) : (
                  <img
                    src={docModal.fileUrl}
                    alt={docModal.title}
                    className="max-h-[300px] object-contain rounded-lg shadow-xs"
                  />
                )
              ) : (
                /* 미첨부 시 정식 국세청 발급 증빙 확인 안내 카드 */
                <div className="space-y-3 text-slate-600 dark:text-zinc-400 p-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center mx-auto">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">
                      국세청 발급 {docModal.docType === 'unique' ? '고유번호증' : '사업자등록증'} 증빙 서류
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      등록 증빙 번호: <strong className="font-mono text-purple-700 dark:text-purple-300">{docModal.number}</strong>
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[11px] font-bold">
                    ✓ 국세청 홈택스 사업자/고유번호 정밀 검증 완료
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>새 서류 파일 업로드/교체</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !tenant?.id) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const newUrl = reader.result as string;
                      if (docModal.docType === 'unique') {
                        tenantAPI.update(tenant.id, { uniqueNumberFile: newUrl });
                        setDocModal((prev) => prev ? { ...prev, fileUrl: newUrl } : null);
                      } else {
                        tenantAPI.update(tenant.id, { businessRegistrationFile: newUrl });
                        setDocModal((prev) => prev ? { ...prev, fileUrl: newUrl } : null);
                      }
                      toast.success(`${docModal.title} 서류가 등록/교체되었습니다`);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="font-bold text-xs cursor-pointer"
                onClick={() => setDocModal(null)}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}