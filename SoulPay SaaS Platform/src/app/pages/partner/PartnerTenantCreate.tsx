import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useApp, Tenant } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  ArrowLeft, Check, CheckCircle2, ShieldCheck,
  Search, Lock, MapPin, Mail, Phone, Upload, X, FileText,
  AlertTriangle, ChevronRight, Building, CreditCard, UserCheck, KeyRound
} from 'lucide-react';
import { toast } from 'sonner';
import { partnerAPI, Partner, settingsAPI } from '../../api/client';
import { convertKoreanToQwerty } from '../../utils/koreanConverter';
import { openDaumPostcode } from '../../utils/daumPostcode';

const RELIGION_PRESETS = [
  { key: 'buddhist',   label: '불교 (사찰 · 암자)',       badge: '사찰 전용', color: '#C2410C', desc: '보시 · 축원문 · 불자' },
  { key: 'protestant', label: '기독교 (교회)',           badge: '교회 전용', color: '#2563EB', desc: '헌금 · 기도제목 · 성도' },
  { key: 'catholic',   label: '천주교 (성당)',           badge: '성당 전용', color: '#1E40AF', desc: '봉헌 · 미사지향 · 교우' },
  { key: 'charity',    label: '구호 · 사회복지재단',      badge: 'NPO 재단', color: '#059669', desc: '후원금 · 응원글 · 후원자' },
  { key: 'general',    label: '비영리 공익법인 · 기타',   badge: '공익법인', color: '#4B5563', desc: '기부금 · 후원글 · 기부자' },
] as const;

const POPULAR_BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', 'NH농협', '기업은행',
  '카카오뱅크', '토스뱅크', 'SC제일은행', '우체국', '수협', '새마을금고', '신협'
];

export default function PartnerTenantCreate() {
  const navigate = useNavigate();
  const addressDetailRef = useRef<HTMLInputElement>(null);
  const { tenants, addTenant } = useApp();

  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myPartner, setMyPartner] = useState<Partner | null>(null);

  const [feeConfig, setFeeConfig] = useState({ pgCost: 1.5, platformMargin: 0.5 });
  useEffect(() => {
    settingsAPI.getAll().then(res => {
      if (!res.success || !res.data) return;
      const { pg_rates, platform_margin } = res.data;
      let pgCost = 1.5, platformMargin = 0.5;
      if (Array.isArray(pg_rates) && pg_rates.length > 0) pgCost = pg_rates[0].rate ?? 1.5;
      if (platform_margin !== undefined) { const pm = parseFloat(String(platform_margin)); if (!isNaN(pm)) platformMargin = pm; }
      setFeeConfig({ pgCost, platformMargin });
    }).catch(() => {});
  }, []);
  const [contractRate, setContractRate] = useState(3.0);

  // 1. 단체 유형 및 기본 정보
  const [religionType, setReligionType] = useState<'buddhist' | 'protestant' | 'catholic' | 'charity' | 'general'>('buddhist');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<{ checked: boolean; isAvailable: boolean; message: string }>({
    checked: false,
    isAvailable: false,
    message: '',
  });

  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');

  // 2. 관리자 계정 정보
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [initialTempPassword, setInitialTempPassword] = useState(() => `fp${Math.floor(100000 + Math.random() * 900000)}`);

  // 3. 정산 계좌 정보
  const [bankName, setBankName] = useState('국민은행');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankbookFile, setBankbookFile] = useState<string | null>(null);
  const [bankbookFileName, setBankbookFileName] = useState('');

  // 4. 세무 및 인증 서류
  const [uniqueNumber, setUniqueNumber] = useState('');
  const [uniqueNumberFile, setUniqueNumberFile] = useState<string | null>(null);
  const [uniqueNumberFileName, setUniqueNumberFileName] = useState('');

  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('');
  const [businessRegistrationFile, setBusinessRegistrationFile] = useState<string | null>(null);
  const [businessRegistrationFileName, setBusinessRegistrationFileName] = useState('');

  const [bylawsFile, setBylawsFile] = useState<string | null>(null);
  const [bylawsFileName, setBylawsFileName] = useState('');

  const [representativeName, setRepresentativeName] = useState('');
  const [representativeCertFile, setRepresentativeCertFile] = useState<string | null>(null);
  const [representativeCertFileName, setRepresentativeCertFileName] = useState('');
  const [representativeIdFile, setRepresentativeIdFile] = useState<string | null>(null);
  const [representativeIdFileName, setRepresentativeIdFileName] = useState('');

  // 5. 대리인 신청 정보
  const [isDelegated, setIsDelegated] = useState(false);
  const [delegateName, setDelegateName] = useState('');
  const [delegatePhone, setDelegatePhone] = useState('');
  const [delegationLetterFile, setDelegationLetterFile] = useState<string | null>(null);
  const [delegationLetterFileName, setDelegationLetterFileName] = useState('');
  const [delegateIdFile, setDelegateIdFile] = useState<string | null>(null);
  const [delegateIdFileName, setDelegateIdFileName] = useState('');

  // 파트너 세션 로드
  useEffect(() => {
    let sessionPartner: any = null;
    try {
      const sessionRaw =
        sessionStorage.getItem('soulpay_partner_session') ||
        sessionStorage.getItem('faithpay_partner_session') ||
        localStorage.getItem('soulpay_partner_session') ||
        localStorage.getItem('faithpay_partner_session');
      if (sessionRaw) {
        sessionPartner = JSON.parse(sessionRaw);
      }
    } catch {}

    const sessionPartnerId = sessionPartner?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    partnerAPI.getById(sessionPartnerId).then(res => {
      if (res.success && res.data) {
        setMyPartner({
          ...res.data,
          role: sessionPartner?.role ?? res.data.role,
          name: sessionPartner?.name ?? res.data.name,
        });
      } else if (sessionPartner) {
        setMyPartner(sessionPartner);
      } else {
        partnerAPI.getAll().then(allRes => {
          const all = allRes.success && Array.isArray(allRes.data) ? allRes.data : [];
          if (all.length > 0) {
            setMyPartner(all[0]);
          }
        });
      }
    });
  }, []);

  const handleSelectReligion = (key: typeof religionType) => {
    setReligionType(key);
    const preset = RELIGION_PRESETS.find(p => p.key === key);
    if (preset) setPrimaryColor(preset.color);
  };

  const handleSlugChange = (val: string) => {
    const { converted, hasKorean } = convertKoreanToQwerty(val);
    const clean = converted.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(clean);
    setSlugStatus({ checked: false, isAvailable: false, message: '' });

    if (hasKorean) {
      toast.info(`영문 주소('${clean}')로 자동 변환되었습니다.`, { id: 'slug-convert-toast', duration: 1800 });
    }
  };

  const handleCheckDuplicateSlug = () => {
    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug) {
      toast.error('단축 주소를 입력해 주세요.');
      setSlugStatus({ checked: true, isAvailable: false, message: '단축 주소를 입력해 주세요.' });
      return;
    }
    if (cleanSlug.length < 2) {
      toast.error('단축 주소는 최소 2자 이상이어야 합니다.');
      setSlugStatus({ checked: true, isAvailable: false, message: '최소 2자 이상 입력해 주세요.' });
      return;
    }

    const isDup = tenants.some(t => t.slug?.toLowerCase() === cleanSlug);
    if (isDup) {
      toast.error(`'${cleanSlug}' 주소는 이미 등록되어 있습니다.`);
      setSlugStatus({
        checked: true,
        isAvailable: false,
        message: `'${cleanSlug}' 주소는 이미 다른 단체에서 사용 중입니다.`,
      });
    } else {
      toast.success(`'${cleanSlug}' 주소는 즉시 사용 가능합니다.`);
      setSlugStatus({
        checked: true,
        isAvailable: true,
        message: `'${cleanSlug}' 주소 사용 가능 (soulpay.kr/${cleanSlug})`,
      });
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (val: string | null) => void,
    setFileName: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하만 가능합니다.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFile(reader.result as string);
      toast.success(`${file.name} 서류 첨부 완료`);
    };
    reader.readAsDataURL(file);
  };

  // Guardrail 계산
  const partnerRate = (myPartner?.commissionRate || (myPartner as any)?.agencyRate || 0.5);
  const floorRate   = +(feeConfig.pgCost + feeConfig.platformMargin + partnerRate).toFixed(2);
  const spread      = +(Math.max(0, contractRate - floorRate)).toFixed(2);
  const isValid     = contractRate >= floorRate;

  const backUrl = myPartner?.role === 'sales_agent' ? '/agent/dashboard' : '/partner/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('단체 명칭을 입력해 주세요.'); setActiveTab(1); return; }
    if (!slug.trim()) { toast.error('고유 단축 주소(URL)를 입력해 주세요.'); setActiveTab(1); return; }
    if (!address.trim()) { toast.error('소재지 주소를 입력해 주세요.'); setActiveTab(1); return; }
    if (!phone.trim()) { toast.error('공식 대표 전화번호를 입력해 주세요.'); setActiveTab(1); return; }
    if (!accountNumber.trim()) { toast.error('정산 계좌번호를 입력해 주세요.'); setActiveTab(2); return; }
    if (!adminName.trim()) { toast.error('대표 관리자 성함을 입력해 주세요.'); setActiveTab(3); return; }
    if (!adminEmail.trim()) { toast.error('관리자 이메일을 입력해 주세요.'); setActiveTab(3); return; }
    if (!adminPhone.trim()) { toast.error('대표 관리자 휴대폰 번호를 입력해 주세요.'); setActiveTab(3); return; }

    const isDup = tenants.some(t => t.slug?.toLowerCase() === slug.trim().toLowerCase());
    if (isDup) {
      toast.error(`'${slug}' 주소는 이미 등록된 중복 주소입니다. 다른 주소를 설정해 주세요.`);
      setActiveTab(1);
      return;
    }

    if (!isValid) {
      toast.error(`계약 수수료율(${contractRate}%)이 하한선(${floorRate}%)보다 낮습니다.`);
      setActiveTab(3);
      return;
    }

    setIsSubmitting(true);
    const isBuddhist = religionType === 'buddhist';
    const isCatholic = religionType === 'catholic';
    const isCharity  = religionType === 'charity';
    const isGeneral  = religionType === 'general';

    const fullAddress = addressDetail ? `${address.trim()} ${addressDetail.trim()}` : address.trim();

    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      religionType,
      primaryColor,
      address: fullAddress || '소재지 미등록',
      phone: phone.trim() || adminPhone.trim() || '02-0000-0000',
      description: description.trim() || (isBuddhist
        ? '부처님의 자비와 지혜로 평화와 행복을 찾는 도량입니다.'
        : isCatholic
        ? '사랑과 나눔이 함께하는 따뜻한 공동체입니다.'
        : '은혜와 나눔이 넘치는 따뜻한 공동체입니다.'),
      terminology: {
        donation: isBuddhist ? '보시' : isCatholic ? '봉헌' : isCharity ? '후원금' : isGeneral ? '기부금' : '헌금',
        member: isBuddhist ? '불자' : isCatholic ? '교우' : isCharity ? '후원자' : isGeneral ? '기부자' : '성도',
        prayer: isBuddhist ? '축원문' : isCatholic ? '미사지향' : (isCharity || isGeneral) ? '응원 메시지' : '기도문',
      },
      bannerImages: [],
      contact: {
        phone: phone.trim() || adminPhone.trim(),
        email: adminEmail.trim() || email.trim(),
        name: representativeName.trim() || adminName.trim(),
      },
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim(),
      adminPhone: adminPhone.trim(),
      adminPassword: initialTempPassword,
      contractRate,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      uniqueNumber: uniqueNumber.trim() || undefined,
      uniqueNumberFile: uniqueNumberFile || undefined,
      businessRegistrationNumber: businessRegistrationNumber.trim() || undefined,
      businessRegistrationFile: businessRegistrationFile || undefined,
      businessInfo: {
        uniqueNumber: uniqueNumber.trim() || undefined,
        uniqueNumberFile: uniqueNumberFile || undefined,
        uniqueNumberFileName: uniqueNumberFileName || undefined,
        registrationNumber: businessRegistrationNumber.trim() || undefined,
        registrationFile: businessRegistrationFile || undefined,
        registrationFileName: businessRegistrationFileName || undefined,
        bylawsFile: bylawsFile || undefined,
        bylawsFileName: bylawsFileName || undefined,
        bankName: bankName || undefined,
        accountNumber: accountNumber.trim() || undefined,
        accountHolder: accountHolder.trim() || name.trim() || undefined,
        bankbookFile: bankbookFile || undefined,
        bankbookFileName: bankbookFileName || undefined,
        representativeName: representativeName.trim() || adminName.trim() || undefined,
        representativeCertFile: representativeCertFile || undefined,
        representativeCertFileName: representativeCertFileName || undefined,
        representativeIdFile: representativeIdFile || undefined,
        representativeIdFileName: representativeIdFileName || undefined,
        isDelegated,
        delegateName: isDelegated ? delegateName.trim() : undefined,
        delegatePhone: isDelegated ? delegatePhone.trim() : undefined,
        delegationLetterFile: isDelegated ? delegationLetterFile || undefined : undefined,
        delegationLetterFileName: isDelegated ? delegationLetterFileName || undefined : undefined,
        delegateIdFile: isDelegated ? delegateIdFile || undefined : undefined,
        delegateIdFileName: isDelegated ? delegateIdFileName || undefined : undefined,
        address: fullAddress,
      },
      paymentConfig: {
        tenantId: `tenant-${Date.now()}`,
        pgProvider: 'tosspayments',
        apiKey: 'test_ck_docs',
        secretKey: 'test_sk_docs',
        mid: 'toss_test_mid',
        devMode: true,
        isActive: true,
        updatedAt: new Date().toISOString(),
      },
      registrationSource: myPartner?.role === 'master_agency' ? 'agency' : 'agent',
      registeredByPartnerId: myPartner?.id,
      registeredByPartnerName: myPartner?.name,
      registeredByReferralCode: myPartner?.referralCode,
      referralCode: myPartner?.referralCode,
    };

    try {
      await addTenant(newTenant);
      setIsSubmitting(false);
      toast.success(
        `[${name}] 단체 입점 신청이 완료되었습니다.\n계약 수수료율 ${contractRate}% (영업 마진 +${spread}%)`
      );
      navigate(backUrl);
    } catch {
      setIsSubmitting(false);
      toast.error('단체 등록 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#191F28] flex flex-col justify-between font-sans antialiased">
      
      {/* ── 1. Bank-grade Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5E8EB]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(backUrl)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#4E5968] hover:text-[#191F28] transition-colors p-1.5 rounded-lg hover:bg-[#F2F4F6] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>대시보드로</span>
            </button>
            <div className="h-4 w-px bg-[#E5E8EB]" />
            <a href="/" className="flex items-center">
              <img
                src="/images/logo_soulpay.png"
                alt="SoulPay"
                style={{ height: 28, width: 'auto', objectFit: 'contain' }}
              />
            </a>
            <span className="hidden sm:inline-flex items-center text-xs font-bold text-[#4E5968] bg-[#F2F4F6] px-2.5 py-1 rounded-md">
              원스탑 가맹 개설 창구
            </span>
          </div>

          <div className="flex items-center gap-2">
            {myPartner && (
              <div className="flex items-center gap-2 text-xs bg-[#EFF6FF] border border-[#DBEAFE] text-[#1D4ED8] px-3 py-1.5 rounded-lg font-medium">
                <span className="hidden sm:inline text-[#6B7684]">담당 영업자:</span>
                <strong className="font-semibold text-[#191F28]">{myPartner.name}</strong>
                <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-[#DBEAFE] font-bold">
                  {myPartner.referralCode}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. Bank Security Notice Bar ── */}
      <div className="bg-[#FFFFFF] border-b border-[#E5E8EB] py-2.5 px-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-[#6B7684]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
            <span className="font-medium text-[#333D4B]">
              본 페이지는 토스페이먼츠 PG 정식 심사 기준에 맞춘 공식 가맹점 접수 창구입니다.
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px] font-mono text-[#8B95A1]">
            <span>PCI-DSS 준수</span>
            <span>·</span>
            <span>256-bit SSL 금융 암호화</span>
            <span>·</span>
            <span>실시간 가맹 심사 연동</span>
          </div>
        </div>
      </div>

      {/* ── 3. Main Form Container ── */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 flex-1">
        
        {/* Page Title & Guide */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191F28] tracking-tight">
            가맹단체 신규 입점 신청 및 계정 개설
          </h1>
          <p className="text-[#4E5968] text-sm mt-1.5 leading-relaxed">
            사찰, 교회, 복지재단 현장에서 기본 정보부터 정산 계좌, 인증 서류, 관리자 계정까지 원스탑으로 등록합니다.
          </p>
        </div>

        {/* 3-Step Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          {[
            { step: 1, title: '단체 기본 정보', desc: '종교 유형 · 명칭 · 주소', icon: Building },
            { step: 2, title: '정산 계좌 및 세무 서류', desc: '은행 계좌 · 고유번호증', icon: CreditCard },
            { step: 3, title: '관리자 계정 및 계약', desc: '대표 계정 · 수수료 마진', icon: KeyRound },
          ].map(({ step, title, desc, icon: Icon }) => {
            const isActive = activeTab === step;
            const isCompleted = activeTab > step;
            return (
              <button
                key={step}
                type="button"
                onClick={() => setActiveTab(step as 1 | 2 | 3)}
                className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]'
                    : isCompleted
                    ? 'bg-[#F9FAFB] border-[#D1D6DB] text-[#333D4B]'
                    : 'bg-white border-[#E5E8EB] text-[#8B95A1] hover:border-[#D1D6DB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    isActive ? 'bg-[#2563EB] text-white' : isCompleted ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F2F4F6] text-[#6B7684]'
                  }`}>
                    STEP 0{step}
                  </span>
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-[#2563EB]" strokeWidth={3} />
                  ) : (
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#2563EB]' : 'text-[#8B95A1]'}`} />
                  )}
                </div>
                <div className={`font-bold text-xs sm:text-sm ${isActive ? 'text-[#191F28]' : 'text-[#333D4B]'}`}>
                  {title}
                </div>
                <div className="hidden sm:block text-[11px] text-[#8B95A1] mt-0.5 truncate">
                  {desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Form Card ── */}
        <form onSubmit={handleSubmit} className="bg-white border border-[#E5E8EB] rounded-2xl overflow-hidden">
          
          <div className="p-6 sm:p-8 space-y-8">
            
            {/* ════════ STEP 1. 단체 기본 정보 ════════ */}
            {activeTab === 1 && (
              <div className="space-y-6">
                
                <div className="border-b border-[#F2F4F6] pb-4">
                  <h2 className="text-lg font-bold text-[#191F28] flex items-center gap-2">
                    <Building className="h-5 w-5 text-[#2563EB]" />
                    <span>단체 유형 및 기본 정보</span>
                  </h2>
                  <p className="text-xs text-[#6B7684] mt-1">
                    단체에 맞는 전용 용어와 온라인 모금 페이지의 기본 정보를 설정합니다.
                  </p>
                </div>

                {/* 종교/단체 유형 선택 */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-bold text-[#333D4B]">
                    단체 / 종교 유형 선택 *
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {RELIGION_PRESETS.map(({ key, label, badge, desc }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectReligion(key as any)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                          religionType === key
                            ? 'border-[#2563EB] bg-[#EFF6FF]/60 ring-1 ring-[#2563EB] text-[#191F28]'
                            : 'border-[#E5E8EB] hover:border-[#D1D6DB] bg-white text-[#4E5968]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#E5E8EB] text-[#6B7684] font-medium">
                            {badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8B95A1] mt-1">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 단체 명칭 & 단축 URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#333D4B]">사찰 / 교회 / 단체 명칭 *</Label>
                    <Input
                      placeholder="예: 각원사 / 사랑의교회 / 한마음복지재단"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="h-11 bg-[#F9FAFB] border-[#E5E8EB] focus:bg-white focus:border-[#2563EB] text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-[#333D4B]">전용 단축 접속 URL *</Label>
                      <button
                        type="button"
                        onClick={handleCheckDuplicateSlug}
                        className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer border-none bg-transparent"
                      >
                        중복 확인
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#8B95A1] font-mono px-2 py-2.5 bg-[#F2F4F6] rounded-lg border border-[#E5E8EB]">
                        soulpay.kr/
                      </span>
                      <Input
                        placeholder="gakwonsa"
                        value={slug}
                        onChange={e => handleSlugChange(e.target.value)}
                        className="h-11 font-mono text-sm font-semibold bg-[#F9FAFB] border-[#E5E8EB] focus:bg-white focus:border-[#2563EB]"
                        required
                      />
                    </div>
                    {slugStatus.message && (
                      <p className={`text-[11px] mt-1 ${slugStatus.isAvailable ? 'text-[#2563EB] font-semibold' : 'text-red-600 font-medium'}`}>
                        {slugStatus.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* 소재지 주소 (다음 우편번호 연동) */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-[#333D4B] flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#6B7684]" />
                    <span>소재지 주소 *</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="주소 검색 버튼을 눌러 도로명 주소를 입력하세요"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="h-11 bg-[#F9FAFB] border-[#E5E8EB] text-sm"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openDaumPostcode(data => {
                        setAddress(data.address);
                        addressDetailRef.current?.focus();
                      })}
                      className="h-11 px-4 text-xs font-semibold border-[#D1D6DB] hover:bg-[#F2F4F6] shrink-0 cursor-pointer"
                    >
                      <Search className="h-3.5 w-3.5 mr-1" /> 주소 검색
                    </Button>
                  </div>
                  <Input
                    ref={addressDetailRef}
                    placeholder="상세 주소 입력 (예: 본당 2층, 대웅전 옆 종무소 등)"
                    value={addressDetail}
                    onChange={e => setAddressDetail(e.target.value)}
                    className="h-11 bg-[#F9FAFB] border-[#E5E8EB] text-sm"
                  />
                </div>

                {/* 대표 연락처 & 이메일 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#333D4B] flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-[#6B7684]" />
                      <span>공식 대표 전화번호 *</span>
                    </Label>
                    <Input
                      placeholder="02-1234-5678"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="h-11 bg-[#F9FAFB] border-[#E5E8EB] text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#333D4B] flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-[#6B7684]" />
                      <span>대표 공식 이메일 (선택)</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="contact@gakwonsa.kr"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="h-11 bg-[#F9FAFB] border-[#E5E8EB] text-sm"
                    />
                  </div>
                </div>

                {/* 단체 소개글 */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-bold text-[#333D4B]">단체 소개 및 환영 인사 (선택)</Label>
                  <Textarea
                    placeholder="신도와 후원자가 접속했을 때 모금 페이지 상단에 노출될 소개글입니다."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    className="bg-[#F9FAFB] border-[#E5E8EB] text-xs leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      if (!name.trim() || !slug.trim() || !address.trim() || !phone.trim()) {
                        toast.error('필수 항목(명칭, 단축 URL, 주소, 대표전화)을 모두 입력해 주세요.');
                        return;
                      }
                      setActiveTab(2);
                    }}
                    className="h-11 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg cursor-pointer"
                  >
                    다음 단계 (정산 계좌 및 서류) <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

              </div>
            )}

            {/* ════════ STEP 2. 정산 계좌 & 세무 증빙 서류 ════════ */}
            {activeTab === 2 && (
              <div className="space-y-6">
                
                <div className="border-b border-[#F2F4F6] pb-4">
                  <h2 className="text-lg font-bold text-[#191F28] flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-[#2563EB]" />
                    <span>정산 입금 계좌 및 세무 증빙 서류</span>
                  </h2>
                  <p className="text-xs text-[#6B7684] mt-1">
                    신도들의 봉헌금 및 기부금이 안전하게 정산 입금될 공식 단체 명의 계좌와 증빙을 등록합니다.
                  </p>
                </div>

                {/* 계좌 정보 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#333D4B]">거래 은행 *</Label>
                    <select
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full h-11 rounded-lg border border-[#E5E8EB] bg-[#F9FAFB] px-3 text-sm focus:outline-none focus:border-[#2563EB]"
                    >
                      {POPULAR_BANKS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold text-[#333D4B]">정산 입금 계좌번호 *</Label>
                    <Input
                      placeholder="하이픈(-) 없이 숫자만 입력"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                      className="h-11 font-mono text-sm bg-[#F9FAFB] border-[#E5E8EB] focus:bg-white focus:border-[#2563EB]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#333D4B]">예금주명 (단체명 또는 대표자명) *</Label>
                    <Input
                      placeholder={name || '단체명과 일치'}
                      value={accountHolder}
                      onChange={e => setAccountHolder(e.target.value)}
                      className="h-11 bg-[#F9FAFB] border-[#E5E8EB] text-sm"
                      required
                    />
                  </div>

                  {/* 통장 사본 파일 첨부 */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#333D4B]">통장 사본 첨부 (선택)</Label>
                    {bankbookFile ? (
                      <div className="flex items-center justify-between p-2.5 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg text-xs">
                        <span className="font-semibold text-[#1D4ED8] truncate max-w-[200px] flex items-center gap-1.5">
                          <FileText className="h-4 w-4" />
                          {bankbookFileName}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-[#6B7684] hover:text-red-600"
                          onClick={() => { setBankbookFile(null); setBankbookFileName(''); }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-1.5 h-11 border border-dashed border-[#D1D6DB] rounded-lg text-xs font-semibold text-[#4E5968] hover:border-[#2563EB] hover:bg-[#EFF6FF]/40 cursor-pointer transition-all bg-[#F9FAFB]">
                        <Upload className="h-3.5 w-3.5 text-[#6B7684]" />
                        <span>통장 사본 파일 선택 (10MB 이하)</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={e => handleFileUpload(e, setBankbookFile, setBankbookFileName)}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 세무 증빙 서류 (고유번호증 / 사업자등록증) */}
                <div className="pt-3 border-t border-[#F2F4F6] space-y-4">
                  <div className="text-xs font-bold text-[#333D4B]">
                    세무 및 비영리 단체 증빙
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 고유번호증 */}
                    <div className="space-y-1.5 p-4 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB]">
                      <Label className="text-xs font-semibold text-[#333D4B]">고유번호증 번호 (비영리 10자리)</Label>
                      <Input
                        placeholder="예: 240-82-12345"
                        value={uniqueNumber}
                        onChange={e => setUniqueNumber(e.target.value)}
                        className="h-10 font-mono text-xs bg-white"
                      />
                      <div className="pt-1.5">
                        {uniqueNumberFile ? (
                          <div className="flex items-center justify-between p-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg text-xs">
                            <span className="font-semibold text-[#1D4ED8] truncate max-w-[180px] flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              {uniqueNumberFileName}
                            </span>
                            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setUniqueNumberFile(null); setUniqueNumberFileName(''); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 py-2 border border-dashed border-[#D1D6DB] rounded-lg text-xs font-semibold text-[#4E5968] bg-white hover:border-[#2563EB] cursor-pointer">
                            <Upload className="h-3.5 w-3.5" /> <span>고유번호증 사본 파일</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileUpload(e, setUniqueNumberFile, setUniqueNumberFileName)} />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* 수익사업 사업자등록증 */}
                    <div className="space-y-1.5 p-4 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB]">
                      <Label className="text-xs font-semibold text-[#333D4B]">수익사업 사업자등록번호 (선택)</Label>
                      <Input
                        placeholder="예: 240-81-67890 (바자회/물품 판매 시)"
                        value={businessRegistrationNumber}
                        onChange={e => setBusinessRegistrationNumber(e.target.value)}
                        className="h-10 font-mono text-xs bg-white"
                      />
                      <div className="pt-1.5">
                        {businessRegistrationFile ? (
                          <div className="flex items-center justify-between p-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg text-xs">
                            <span className="font-semibold text-[#1D4ED8] truncate max-w-[180px] flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              {businessRegistrationFileName}
                            </span>
                            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setBusinessRegistrationFile(null); setBusinessRegistrationFileName(''); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 py-2 border border-dashed border-[#D1D6DB] rounded-lg text-xs font-semibold text-[#4E5968] bg-white hover:border-[#2563EB] cursor-pointer">
                            <Upload className="h-3.5 w-3.5" /> <span>사업자등록증 사본 파일</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileUpload(e, setBusinessRegistrationFile, setBusinessRegistrationFileName)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 대표자 성명 & 정관 사본 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#333D4B]">대표자 성명 (스님 / 담임목사 / 이사장)</Label>
                      <Input
                        placeholder="대표자 실명 입력"
                        value={representativeName}
                        onChange={e => setRepresentativeName(e.target.value)}
                        className="h-10 text-sm bg-[#F9FAFB]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#333D4B]">정관 / 회칙 사본 첨부 (선택)</Label>
                      {bylawsFile ? (
                        <div className="flex items-center justify-between p-2 bg-[#F2F4F6] border border-[#E5E8EB] rounded-lg text-xs">
                          <span className="truncate max-w-[180px] font-semibold text-[#191F28]">{bylawsFileName}</span>
                          <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setBylawsFile(null); setBylawsFileName(''); }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-1.5 h-10 border border-dashed border-[#D1D6DB] bg-[#F9FAFB] rounded-lg text-xs font-semibold text-[#4E5968] cursor-pointer hover:border-[#2563EB]">
                          <Upload className="h-3.5 w-3.5" /> <span>정관 / 회칙 파일 선택</span>
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileUpload(e, setBylawsFile, setBylawsFileName)} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* 대리인 신청 체크박스 토글 */}
                <div className="pt-3 border-t border-[#F2F4F6] space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="delegate-check"
                      checked={isDelegated}
                      onChange={e => setIsDelegated(e.target.checked)}
                      className="w-4 h-4 text-[#2563EB] rounded cursor-pointer"
                    />
                    <label htmlFor="delegate-check" className="text-xs font-bold text-[#191F28] cursor-pointer flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-[#2563EB]" />
                      <span>대표자 외 대리인(총무스님 / 부목사 / 사무국장) 위임 신청인 경우 체크</span>
                    </label>
                  </div>

                  {isDelegated && (
                    <div className="p-4 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-[#333D4B]">대리인 성명 *</Label>
                          <Input
                            placeholder="홍길동 총무 / 김간사"
                            value={delegateName}
                            onChange={e => setDelegateName(e.target.value)}
                            className="h-10 text-sm bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-[#333D4B]">대리인 연락처 *</Label>
                          <Input
                            placeholder="010-9876-5432"
                            value={delegatePhone}
                            onChange={e => setDelegatePhone(e.target.value)}
                            className="h-10 text-sm bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-[#333D4B]">위임장 사본 파일 첨부</Label>
                        {delegationLetterFile ? (
                          <div className="flex items-center justify-between p-2 bg-white border border-[#E5E8EB] rounded-lg text-xs">
                            <span className="truncate max-w-[200px] font-semibold text-[#191F28]">{delegationLetterFileName}</span>
                            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setDelegationLetterFile(null); setDelegationLetterFileName(''); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 h-10 border border-dashed border-[#D1D6DB] bg-white rounded-lg text-xs font-semibold text-[#4E5968] cursor-pointer hover:border-[#2563EB]">
                            <Upload className="h-3.5 w-3.5" /> <span>위임장 서류 첨부</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileUpload(e, setDelegationLetterFile, setDelegationLetterFileName)} />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab(1)}
                    className="h-11 px-5 border-[#D1D6DB] text-[#4E5968] cursor-pointer"
                  >
                    이전 단계
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!accountNumber.trim() || !accountHolder.trim()) {
                        toast.error('정산 계좌번호와 예금주명을 입력해 주세요.');
                        return;
                      }
                      setActiveTab(3);
                    }}
                    className="h-11 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg cursor-pointer"
                  >
                    다음 단계 (관리자 계정 및 계약) <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

              </div>
            )}

            {/* ════════ STEP 3. 관리자 계정 & 계약 수수료율 ════════ */}
            {activeTab === 3 && (
              <div className="space-y-6">
                
                <div className="border-b border-[#F2F4F6] pb-4">
                  <h2 className="text-lg font-bold text-[#191F28] flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-[#2563EB]" />
                    <span>단체 관리자 계정 생성 및 가맹 계약 수수료율</span>
                  </h2>
                  <p className="text-xs text-[#6B7684] mt-1">
                    단체 대표 관리자의 로그인 계정을 발급하고, 역마진 없는 적정 계약 수수료율을 지정합니다.
                  </p>
                </div>

                {/* 관리자 계정 생성 */}
                <div className="p-5 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl space-y-4">
                  <div className="text-xs font-bold text-[#191F28] flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[#2563EB]" />
                    <span>사찰 주지스님 / 교회 담임목사님 로그인 계정 *</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#333D4B]">대표 관리자 성함 *</Label>
                      <Input
                        placeholder="성불 주지스님 / 김목사"
                        value={adminName}
                        onChange={e => setAdminName(e.target.value)}
                        className="h-11 bg-white text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#333D4B]">로그인 이메일 (아이디) *</Label>
                      <Input
                        type="email"
                        placeholder="admin@gakwonsa.kr"
                        value={adminEmail}
                        onChange={e => setAdminEmail(e.target.value)}
                        className="h-11 bg-white text-sm font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#333D4B]">대표 휴대폰 번호 *</Label>
                      <Input
                        placeholder="010-1234-5678"
                        value={adminPhone}
                        onChange={e => setAdminPhone(e.target.value)}
                        className="h-11 bg-white text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-semibold text-[#333D4B] flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-[#6B7684]" />
                      <span>초기 로그인 임시 비밀번호 *</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={initialTempPassword}
                        onChange={e => setInitialTempPassword(e.target.value)}
                        className="h-11 font-mono bg-white font-bold text-sm text-[#191F28]"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInitialTempPassword(`fp${Math.floor(100000 + Math.random() * 900000)}`)}
                        className="h-11 px-4 text-xs font-semibold border-[#D1D6DB] bg-white hover:bg-[#F2F4F6] shrink-0"
                      >
                        난수 재발급
                      </Button>
                    </div>
                    <p className="text-[11px] text-[#8B95A1] mt-1">
                      입점 완료 즉시 관리자 이메일({adminEmail || '입력하신 이메일'})과 휴대폰으로 로그인 접속 정보가 전송됩니다.
                    </p>
                  </div>
                </div>

                {/* 가맹점 계약 수수료율 및 금융 가드레일 바 */}
                <div className="p-5 bg-white border border-[#E5E8EB] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#191F28]">
                        가맹단체 계약 수수료율 (%) *
                      </div>
                      <div className="text-[11px] text-[#6B7684] mt-0.5">
                        토스 PG 원가({feeConfig.pgCost}%) + 본사 플랫폼 마진({feeConfig.platformMargin}%) + 파트너 베이스({partnerRate}%)
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="0.1"
                        min={floorRate}
                        max={10}
                        value={contractRate}
                        onChange={e => setContractRate(parseFloat(e.target.value) || 0)}
                        className={`w-24 h-11 text-right font-bold text-base bg-[#F9FAFB] border-[#E5E8EB] focus:bg-white focus:border-[#2563EB] ${
                          !isValid ? 'border-red-400 text-red-600' : 'text-[#191F28]'
                        }`}
                      />
                      <span className="text-base font-bold text-[#333D4B]">%</span>
                    </div>
                  </div>

                  {/* 금융 가드레일 분해 바 */}
                  <div className="space-y-2 pt-1">
                    <div className="flex h-6 rounded-lg overflow-hidden text-[10px] font-bold">
                      <div
                        className="bg-[#E5E8EB] text-[#4E5968] flex items-center justify-center px-2"
                        style={{ width: `${(floorRate / Math.max(contractRate, floorRate)) * 100}%` }}
                      >
                        원가 베이스 하한선 {floorRate}%
                      </div>
                      {isValid && spread > 0 && (
                        <div className="bg-[#2563EB] text-white flex items-center justify-center flex-1 px-1">
                          영업 마진 +{spread}%
                        </div>
                      )}
                      {!isValid && (
                        <div className="bg-red-500 text-white flex items-center justify-center flex-1 px-1">
                          하한선 미달 (역마진 경고)
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B7684]">
                        기준 하한선: <strong className="text-[#191F28]">{floorRate}%</strong>
                      </span>
                      {isValid ? (
                        <span className="font-bold text-[#2563EB] flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          영업 순마진 +{spread}% 확보 완료
                        </span>
                      ) : (
                        <span className="font-bold text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          {(floorRate - contractRate).toFixed(2)}% 부족 (상향 필요)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab(2)}
                    className="h-11 px-5 border-[#D1D6DB] text-[#4E5968] cursor-pointer"
                  >
                    이전 단계
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className={`h-11 px-8 font-semibold rounded-lg text-white cursor-pointer transition-colors ${
                      isValid ? 'bg-[#2563EB] hover:bg-[#1D4ED8]' : 'bg-[#D1D6DB] text-[#8B95A1] cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>가맹점 심사 등록 중...</span>
                      </div>
                    ) : (
                      '가맹단체 입점 및 계정 발급 완료'
                    )}
                  </Button>
                </div>

              </div>
            )}

          </div>

        </form>

      </main>

      {/* ── 4. Bank Footer ── */}
      <footer className="border-t border-[#E5E8EB] py-8 text-xs text-[#8B95A1] bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo_soulpay.png"
              alt="SoulPay"
              style={{ height: 20, width: 'auto', objectFit: 'contain' }}
            />
            <span>| 가맹점 지원센터 1588-0000 (평일 09:00 ~ 18:00)</span>
          </div>
          <div>
            © 2026 SoulPay Platform. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}

