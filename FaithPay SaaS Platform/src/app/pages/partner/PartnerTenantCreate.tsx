import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useApp, Tenant } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Building2, ArrowLeft, CheckCircle2, Key, AlertTriangle, TrendingUp,
  Paperclip, Upload, FileText, X, Search, Landmark, ShieldCheck,
  Palette, UserCheck, ChevronDown, ChevronUp, FileCheck, MapPin, Mail, Phone, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { partnerAPI, Partner } from '../../api/client';
import { convertKoreanToQwerty } from '../../utils/koreanConverter';
import { openDaumPostcode } from '../../utils/daumPostcode';

const STORAGE_KEY_PG     = 'soulpay:pg_rates';
const STORAGE_KEY_MARGIN = 'soulpay:platform_margin';

function loadFeeConfig() {
  let pgCost = 1.5, platformMargin = 0.5;
  try {
    const pgs = JSON.parse(localStorage.getItem(STORAGE_KEY_PG) || '[]');
    if (pgs.length > 0) pgCost = pgs[0].rate ?? 1.5;
    const pm = parseFloat(localStorage.getItem(STORAGE_KEY_MARGIN) || '');
    if (!isNaN(pm)) platformMargin = pm;
  } catch { /* ignore */ }
  return { pgCost, platformMargin };
}

const RELIGION_PRESETS = [
  { key: 'buddhist',   label: '⛩️ 불교 (사찰/암자)',  color: '#c2410c', desc: '보시 · 축원문 · 불자' },
  { key: 'protestant', label: '⛪ 기독교 (교회)',      color: '#3D47B8', desc: '헌금 · 기도제목 · 성도' },
  { key: 'catholic',   label: '✝️ 천주교 (성당)',      color: '#1e40af', desc: '봉헌 · 미사지향 · 교우' },
  { key: 'charity',    label: '🤝 구호/사회복지',     color: '#059669', desc: '후원금 · 응원 메시지 · 후원자' },
  { key: 'general',    label: '🏛️ 일반 비영리/기타',   color: '#4b5563', desc: '기부금 · 후원글 · 기부자' },
] as const;

const POPULAR_BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', 'NH농협', '기업은행',
  '카카오뱅크', '토스뱅크', 'SC제일은행', '우체국', '수협', '새마을금고', '신협'
];

export default function PartnerTenantCreate() {
  const navigate = useNavigate();
  const addressDetailRef = useRef<HTMLInputElement>(null);
  const { tenants, addTenant } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myPartner, setMyPartner] = useState<Partner | null>(null);

  const [feeConfig] = useState(loadFeeConfig);
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
  const [primaryColor, setPrimaryColor] = useState('#c2410c');

  // 2. 관리자 계정 정보
  const [adminName, setAdminName] = useState('');
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

  // 접이식 섹션 토글
  const [showDocsSection, setShowDocsSection] = useState(true);
  const [showDelegateSection, setShowDelegateSection] = useState(false);

  // 파트너 세션 불러오기
  useEffect(() => {
    let sessionPartner: any = null;
    try {
      const sessionRaw =
        sessionStorage.getItem('faithpay_partner_session') ||
        localStorage.getItem('faithpay_partner_session') ||
        localStorage.getItem('soulpay_partner_session');
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

  // 종교 유형 변경 시 기본 컬러 동기화
  const handleSelectReligion = (key: typeof religionType) => {
    setReligionType(key);
    const preset = RELIGION_PRESETS.find(p => p.key === key);
    if (preset) setPrimaryColor(preset.color);
  };

  // 슬러그 한글 변환
  const handleSlugChange = (val: string) => {
    const { converted, hasKorean } = convertKoreanToQwerty(val);
    const clean = converted.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(clean);
    setSlugStatus({ checked: false, isAvailable: false, message: '' });

    if (hasKorean) {
      toast.info(`💡 한글 입력을 영문 단축 주소('${clean}')로 자동 변환하였습니다.`, {
        id: 'slug-convert-toast',
        duration: 2000,
      });
    }
  };

  // 슬러그 중복 확인
  const handleCheckDuplicateSlug = () => {
    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug) {
      toast.error('단축 주소를 입력해 주세요.');
      setSlugStatus({ checked: true, isAvailable: false, message: '🔴 단축 주소를 입력해 주세요.' });
      return;
    }
    if (cleanSlug.length < 2) {
      toast.error('단축 주소는 최소 2자 이상이어야 합니다.');
      setSlugStatus({ checked: true, isAvailable: false, message: '🔴 최소 2자 이상 입력해 주세요.' });
      return;
    }

    const isDup = tenants.some(t => t.slug?.toLowerCase() === cleanSlug);
    if (isDup) {
      toast.error(`'${cleanSlug}' 주소는 이미 사용 중입니다.`);
      setSlugStatus({
        checked: true,
        isAvailable: false,
        message: `🔴 '${cleanSlug}' 주소는 이미 다른 단체에서 사용 중입니다.`,
      });
    } else {
      toast.success(`'${cleanSlug}' 주소는 즉시 사용 가능합니다!`);
      setSlugStatus({
        checked: true,
        isAvailable: true,
        message: `🟢 '${cleanSlug}' 주소는 즉시 사용 가능합니다! (soulpay.kr/${cleanSlug})`,
      });
    }
  };

  // 파일 업로드 공통 핸들러
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (val: string | null) => void,
    setFileName: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하만 첨부 가능합니다.');
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

  // ── Guardrail 계산 ──────────────────────────────
  const partnerRate = (myPartner?.commissionRate || (myPartner as any)?.agencyRate || 0.5);
  const floorRate   = +(feeConfig.pgCost + feeConfig.platformMargin + partnerRate).toFixed(2);
  const spread      = +(Math.max(0, contractRate - floorRate)).toFixed(2);
  const isValid     = contractRate >= floorRate;
  // ─────────────────────────────────────────────────

  const backUrl = myPartner?.role === 'sales_agent' ? '/agent/dashboard' : '/partner/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('단체 명칭을 입력해 주세요.'); return; }
    if (!slug.trim()) { toast.error('고유 단축 주소(URL)를 입력해 주세요.'); return; }
    if (!adminName.trim()) { toast.error('대표 관리자 성함을 입력해 주세요.'); return; }
    if (!adminPhone.trim()) { toast.error('대표 관리자 휴대폰 번호를 입력해 주세요.'); return; }

    const isDup = tenants.some(t => t.slug?.toLowerCase() === slug.trim().toLowerCase());
    if (isDup) {
      toast.error(`'${slug}' 주소는 이미 등록된 중복 주소입니다. 다른 주소를 설정해 주세요.`);
      return;
    }

    if (!isValid) {
      toast.error(
        `계약 수수료율(${contractRate}%)이 하한선(${floorRate}%)보다 낮습니다.\n` +
        `역마진 방지를 위해 ${floorRate}% 이상으로 설정해 주세요.`
      );
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
        donation: isBuddhist ? '보시' : isCharity ? '후원금' : isGeneral ? '기부금' : '헌금',
        member: isBuddhist ? '불자' : isCatholic ? '교우' : isCharity ? '후원자' : isGeneral ? '기부자' : '성도',
        prayer: isBuddhist ? '축원문' : (isCharity || isGeneral) ? '응원 메시지' : '기도문',
      },
      bannerImages: [],
      contact: {
        phone: phone.trim() || adminPhone.trim(),
        email: email.trim(),
        name: representativeName.trim() || adminName.trim(),
      },
      adminName: adminName.trim(),
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
        `🎉 [${name}] 단체 입점 신청이 완료되었습니다!\n계약 수수료율 ${contractRate}% · 영업 순마진 +${spread}%`
      );
      navigate(backUrl);
    } catch {
      setIsSubmitting(false);
      toast.error('단체 등록 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex justify-center items-center">
      <div className="w-full max-w-3xl space-y-5">

        {/* 상단 네비게이션 & 파트너 상태 배너 */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(backUrl)} className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {myPartner?.role === 'sales_agent' ? '영업자 대시보드로 돌아가기' : '대리점 대시보드로 돌아가기'}
          </Button>
          {myPartner && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-900 rounded-full">
              <span>🏢 귀속 파트너: <strong>{myPartner.name}</strong></span>
              <span className="font-mono text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded text-[11px]">{myPartner.referralCode}</span>
            </div>
          )}
        </div>

        {/* 메인 폼 카드 */}
        <Card className="shadow-xl border-slate-200 overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-6">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500 text-slate-950 rounded-2xl shadow-md">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">가맹단체 신규 입점 신청 및 계정 개설</CardTitle>
                <CardDescription className="text-slate-300 text-xs mt-1">
                  플랫폼 표준 가맹 신청의 모든 항목(기본정보, 정산계좌, 인증서류, 세무, 관리자 계정)을 입력하여 본인 하위 단체로 즉시 귀속 등록합니다.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-7">

              {/* ──────────────── 1. 단체 유형 ──────────────── */}
              <div className="space-y-2.5">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-black">1.</span> 단체/종교 유형 선택 *
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {RELIGION_PRESETS.map(({ key, label, desc, color }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectReligion(key as any)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        religionType === key
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 text-slate-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                      }`}
                    >
                      <div className="font-bold text-xs">{label}</div>
                      <div className="text-[10.5px] text-slate-400 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ──────────────── 2. 단체 기본 정보 ──────────────── */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-black">2.</span> 단체 기본 정보 *
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">사찰/교회/단체 명칭 *</Label>
                    <Input
                      placeholder="예: 각원사 / 기쁨의교회 / 한마음복지재단"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-600">전용 단축 접속 URL *</Label>
                      <button
                        type="button"
                        onClick={handleCheckDuplicateSlug}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer border-0 bg-transparent"
                      >
                        중복 확인
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-mono">soulpay.kr/</span>
                      <Input
                        placeholder="gakwonsa"
                        value={slug}
                        onChange={e => handleSlugChange(e.target.value)}
                        className="font-mono text-xs font-bold"
                        required
                      />
                    </div>
                    {slugStatus.message && (
                      <p className={`text-[11px] ${slugStatus.isAvailable ? 'text-emerald-600 font-bold' : 'text-red-500 font-medium'}`}>
                        {slugStatus.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* 소재지 주소 (다음 우편번호 검색 연동) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>소재지 주소 *</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="주소 검색을 클릭해 주세요"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="text-xs"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openDaumPostcode(data => {
                        setAddress(data.address);
                        addressDetailRef.current?.focus();
                      })}
                      className="shrink-0 text-xs"
                    >
                      <Search className="h-3.5 w-3.5 mr-1" /> 주소 검색
                    </Button>
                  </div>
                  <Input
                    ref={addressDetailRef}
                    placeholder="상세 주소 (예: 본당 2층, 대웅전 옆 교무실 등)"
                    value={addressDetail}
                    onChange={e => setAddressDetail(e.target.value)}
                    className="text-xs mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>공식 대표 전화번호 *</span>
                    </Label>
                    <Input
                      placeholder="02-1234-5678"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>대표/담당자 이메일</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="contact@gakwonsa.kr"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">단체 소개글 / 신도 환영 인사 (선택)</Label>
                  <Textarea
                    placeholder="홈페이지 메인에 노출될 단체 소개 및 환영 인사를 입력해 주세요."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                {/* 테마 컬러 커스텀 */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Palette className="h-3.5 w-3.5 text-slate-400" />
                    <span>단체 대표 브랜드 컬러</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <Input
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-28 text-xs font-mono font-bold"
                    />
                    <span className="text-[11px] text-slate-400">수납 웹페이지 및 모바일 결제창의 메인 테마 색상으로 적용됩니다.</span>
                  </div>
                </div>
              </div>

              {/* ──────────────── 3. 정산 계좌 정보 ──────────────── */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600 font-black">3.</span> 정산 입금 수령 계좌 정보 *
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">거래 은행 *</Label>
                    <select
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {POPULAR_BANKS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-600">정산 입금 계좌번호 *</Label>
                    <Input
                      placeholder="숫자 및 하이픈(-)"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                      className="font-mono text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">예금주명 (단체명 또는 대표자명) *</Label>
                    <Input
                      placeholder={name || '단체명과 일치'}
                      value={accountHolder}
                      onChange={e => setAccountHolder(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>

                  {/* 통장 사본 파일 첨부 */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Paperclip className="h-3 w-3 text-slate-400" />
                      <span>통장 사본 첨부 (선택)</span>
                    </Label>
                    {bankbookFile ? (
                      <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                        <span className="font-semibold text-emerald-900 truncate max-w-[200px] flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-emerald-600" />
                          {bankbookFileName}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 cursor-pointer"
                          onClick={() => { setBankbookFile(null); setBankbookFileName(''); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer transition-all">
                        <Upload className="h-3.5 w-3.5 text-slate-500" />
                        <span>통장 사본 파일 첨부</span>
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
              </div>

              {/* ──────────────── 4. 세무 및 단체 증빙 서류 ──────────────── */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    <span className="text-emerald-600 font-black">4.</span> 세무 및 단체 증빙 서류
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowDocsSection(v => !v)}
                    className="text-xs font-bold text-purple-700 flex items-center gap-0.5 cursor-pointer border-0 bg-transparent"
                  >
                    {showDocsSection ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {showDocsSection ? '접기' : '상세 열기'}
                  </button>
                </div>

                {showDocsSection && (
                  <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 고유번호증 번호 & 사본 */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">고유번호증 번호 (비영리 10자리) *</Label>
                        <Input
                          placeholder="예: 240-82-12345"
                          value={uniqueNumber}
                          onChange={e => setUniqueNumber(e.target.value)}
                          className="font-mono text-xs font-bold bg-white"
                        />
                        <div className="pt-1">
                          {uniqueNumberFile ? (
                            <div className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                              <span className="font-semibold text-purple-900 truncate max-w-[180px] flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5 text-purple-600" />
                                {uniqueNumberFileName}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 cursor-pointer"
                                onClick={() => { setUniqueNumberFile(null); setUniqueNumberFileName(''); }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:border-purple-400 hover:bg-purple-50/40 cursor-pointer transition-all">
                              <Upload className="h-3.5 w-3.5 text-slate-500" />
                              <span>고유번호증 사본 첨부 (선택)</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={e => handleFileUpload(e, setUniqueNumberFile, setUniqueNumberFileName)}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* 수익사업용 사업자등록번호 & 사본 */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">수익사업 사업자등록번호 (선택)</Label>
                        <Input
                          placeholder="예: 240-81-67890 (바자회/판매 시)"
                          value={businessRegistrationNumber}
                          onChange={e => setBusinessRegistrationNumber(e.target.value)}
                          className="font-mono text-xs bg-white"
                        />
                        <div className="pt-1">
                          {businessRegistrationFile ? (
                            <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                              <span className="font-semibold text-blue-900 truncate max-w-[180px] flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                                {businessRegistrationFileName}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 cursor-pointer"
                                onClick={() => { setBusinessRegistrationFile(null); setBusinessRegistrationFileName(''); }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer transition-all">
                              <Upload className="h-3.5 w-3.5 text-slate-500" />
                              <span>사업자등록증 사본 첨부 (선택)</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={e => handleFileUpload(e, setBusinessRegistrationFile, setBusinessRegistrationFileName)}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 대표자 및 정관/인증 서류 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">대표자 성명</Label>
                        <Input
                          placeholder="성불 주지스님 / 김목사"
                          value={representativeName}
                          onChange={e => setRepresentativeName(e.target.value)}
                          className="text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">정관 / 회칙 사본</Label>
                        {bylawsFile ? (
                          <div className="flex items-center justify-between p-2 bg-slate-100 border border-slate-300 rounded-lg text-xs">
                            <span className="truncate max-w-[130px] font-semibold text-slate-800">{bylawsFileName}</span>
                            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setBylawsFile(null); setBylawsFileName(''); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1 p-2 border border-dashed border-slate-300 bg-white rounded-lg text-xs text-slate-600 cursor-pointer hover:bg-slate-50">
                            <Upload className="h-3 w-3" /> <span>정관 파일</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileUpload(e, setBylawsFile, setBylawsFileName)} />
                          </label>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">대표자 임명/재직 증명서</Label>
                        {representativeCertFile ? (
                          <div className="flex items-center justify-between p-2 bg-slate-100 border border-slate-300 rounded-lg text-xs">
                            <span className="truncate max-w-[130px] font-semibold text-slate-800">{representativeCertFileName}</span>
                            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setRepresentativeCertFile(null); setRepresentativeCertFileName(''); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1 p-2 border border-dashed border-slate-300 bg-white rounded-lg text-xs text-slate-600 cursor-pointer hover:bg-slate-50">
                            <Upload className="h-3 w-3" /> <span>임명 증명서</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileUpload(e, setRepresentativeCertFile, setRepresentativeCertFileName)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ──────────────── 5. 대리인 신청 정보 (선택 토글) ──────────────── */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="delegate-check"
                      checked={isDelegated}
                      onChange={e => setIsDelegated(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="delegate-check" className="text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-1">
                      <UserCheck className="h-4 w-4 text-indigo-600" />
                      <span>대표자 외 대리인(총무/회계/사무국장) 위임 신청인 경우 체크</span>
                    </label>
                  </div>
                </div>

                {isDelegated && (
                  <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">대리인 성명 *</Label>
                        <Input
                          placeholder="홍길동 총무 / 김간사"
                          value={delegateName}
                          onChange={e => setDelegateName(e.target.value)}
                          className="text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">대리인 연락처 *</Label>
                        <Input
                          placeholder="010-9876-5432"
                          value={delegatePhone}
                          onChange={e => setDelegatePhone(e.target.value)}
                          className="text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">위임장 사본 파일 첨부</Label>
                        {delegationLetterFile ? (
                          <div className="flex items-center justify-between p-2 bg-indigo-100/70 border border-indigo-300 rounded-lg text-xs">
                            <span className="truncate max-w-[180px] font-semibold text-indigo-950">{delegationLetterFileName}</span>
                            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setDelegationLetterFile(null); setDelegationLetterFileName(''); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-indigo-300 bg-white rounded-lg text-xs text-indigo-700 font-semibold cursor-pointer hover:bg-indigo-50">
                            <Upload className="h-3.5 w-3.5" /> <span>위임장 사본 첨부</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileUpload(e, setDelegationLetterFile, setDelegationLetterFileName)} />
                          </label>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">대리인 신분증 사본 첨부</Label>
                        {delegateIdFile ? (
                          <div className="flex items-center justify-between p-2 bg-indigo-100/70 border border-indigo-300 rounded-lg text-xs">
                            <span className="truncate max-w-[180px] font-semibold text-indigo-950">{delegateIdFileName}</span>
                            <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setDelegateIdFile(null); setDelegateIdFileName(''); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-indigo-300 bg-white rounded-lg text-xs text-indigo-700 font-semibold cursor-pointer hover:bg-indigo-50">
                            <Upload className="h-3.5 w-3.5" /> <span>대리인 신분증 사본 첨부</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileUpload(e, setDelegateIdFile, setDelegateIdFileName)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ──────────────── 6. 대표 관리자 계정 생성 ──────────────── */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-4">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span className="text-emerald-600 font-black">5.</span> 사찰 주지스님 / 교회 담임목사님 관리자 계정 생성 *
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">대표 관리자 성함 *</Label>
                    <Input
                      placeholder="성불 주지스님 / 김목사"
                      value={adminName}
                      onChange={e => setAdminName(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">대표 휴대폰 번호 *</Label>
                    <Input
                      placeholder="010-1234-5678"
                      value={adminPhone}
                      onChange={e => setAdminPhone(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">초기 임시 비밀번호</Label>
                  <Input
                    value={initialTempPassword}
                    onChange={e => setInitialTempPassword(e.target.value)}
                    className="font-mono bg-white text-center font-bold text-amber-900"
                  />
                  <p className="text-[11px] text-amber-800 mt-1">* 승인 즉시 주지스님/목사님께 해당 임시 비밀번호로 로그인 안내가 발송됩니다.</p>
                </div>
              </div>

              {/* ──────────────── 7. 가맹점 계약 수수료율 및 파트너 수익 Guardrail ──────────────── */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isValid ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-600 font-black">6.</span> 가맹단체 계약 수수료율 (%) *
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.1"
                      min={floorRate}
                      max={10}
                      value={contractRate}
                      onChange={e => setContractRate(parseFloat(e.target.value) || 0)}
                      className={`w-20 h-8 text-right font-bold text-sm bg-white ${!isValid ? 'border-red-400 text-red-600' : ''}`}
                    />
                    <span className="text-sm font-bold text-slate-600">%</span>
                  </div>
                </div>

                {/* 수수료 구조 분해 바 */}
                <div className="space-y-1.5">
                  <div className="flex h-5 rounded-lg overflow-hidden text-[9.5px] font-bold shadow-2xs">
                    <div
                      className="bg-purple-200 text-purple-800 flex items-center justify-center px-2"
                      style={{ width: `${(floorRate / Math.max(contractRate, floorRate)) * 100}%` }}
                    >
                      {myPartner?.role === 'master_agency' ? `영업자 베이스 ${floorRate}%` : `내 정산 베이스 ${floorRate}%`}
                    </div>
                    {isValid && spread > 0 && (
                      <div className="bg-emerald-400 text-emerald-900 flex items-center justify-center flex-1 px-1">
                        {myPartner?.role === 'master_agency' ? `영업 마진 +${spread}%` : `내 영업 순마진 +${spread}%`}
                      </div>
                    )}
                    {!isValid && (
                      <div className="bg-red-400 text-white flex items-center justify-center flex-1 px-1">
                        하한선 미달 ❌
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-semibold ${isValid ? 'text-slate-500' : 'text-red-600'}`}>
                      {myPartner?.role === 'master_agency'
                        ? `대리점 수수료율: ${partnerRate}% · 영업자 부여 베이스 하한선: ${floorRate}%`
                        : `내 베이스 PG 수수료(하한선): ${floorRate}% (토스 1.5% + 플랫폼 0.5% + 대리점 0.5%)`}
                    </span>
                    {isValid ? (
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {myPartner?.role === 'master_agency' ? `영업 마진 +${spread}%` : `내 영업 순마진 +${spread}%`}
                      </span>
                    ) : (
                      <span className="font-bold text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> {(floorRate - contractRate).toFixed(2)}% 부족
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </CardContent>

            <CardFooter className="bg-slate-50 p-6 border-t flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(backUrl)}>
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isValid}
                className={`font-bold px-7 h-10 ${
                  isValid ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>신청서 DB 등록 중...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    <span>가맹단체 입점 신청 완료</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
