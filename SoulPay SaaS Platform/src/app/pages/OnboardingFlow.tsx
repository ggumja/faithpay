import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Check, ArrowRight, ArrowLeft, Search, Eye, EyeOff, FileText, Upload, Trash2, ChevronDown, ChevronUp, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { convertKoreanToQwerty } from '../utils/koreanConverter';
import { openDaumPostcode } from '../utils/daumPostcode';

type Step = 'religion' | 'basic' | 'branding' | 'complete';

const STEPS: Step[] = ['religion', 'basic', 'branding', 'complete'];
const STEP_LABELS = ['조직 유형 선택', '기본 정보', '브랜딩', '완료'];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const addressDetailRef = useRef<HTMLInputElement>(null);
  const { tenants, addTenant } = useApp();
  const [step, setStep] = useState<Step>('religion');
  const [isLoading, setIsLoading] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{ checked: boolean; isAvailable: boolean; message: string }>({
    checked: false,
    isAvailable: false,
    message: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showDocsSection, setShowDocsSection] = useState(false);

  const [formData, setFormData] = useState({
    religion: 'protestant' as ReligionId,
    name: '',
    slug: '',
    address: '',
    addressDetail: '',
    phone: '',
    email: '',
    password: '',
    passwordConfirm: '',
    primaryColor: '#1976d2',
    description: '',
    // 서류 및 정산 정보 (선택사항)
    uniqueNumber: '',
    uniqueNumberFile: '',
    uniqueNumberFileName: '',
    bylawsFile: '',
    bylawsFileName: '',
    bankbookFile: '',
    bankbookFileName: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    representativeName: '',
    representativeCertFile: '',
    representativeCertFileName: '',
    representativeIdFile: '',
    representativeIdFileName: '',
    // 대리인 신청 정보 (선택사항)
    isDelegated: false,
    delegateName: '',
    delegatePhone: '',
    delegationLetterFile: '',
    delegationLetterFileName: '',
    delegateIdFile: '',
    delegateIdFileName: '',
  });

  const handleFileUpload = (
    fieldKey: 'uniqueNumberFile' | 'bylawsFile' | 'bankbookFile' | 'representativeCertFile' | 'representativeIdFile' | 'delegationLetterFile' | 'delegateIdFile',
    fileNameKey: 'uniqueNumberFileName' | 'bylawsFileName' | 'bankbookFileName' | 'representativeCertFileName' | 'representativeIdFileName' | 'delegationLetterFileName' | 'delegateIdFileName',
    file: File | null
  ) => {
    if (!file) {
      setFormData(prev => ({ ...prev, [fieldKey]: '', [fileNameKey]: '' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 최대 10MB까지 등록 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFormData(prev => ({
        ...prev,
        [fieldKey]: base64,
        [fileNameKey]: file.name,
      }));
      toast.success(`${file.name} 파일이 첨부되었습니다.`);
    };
    reader.readAsDataURL(file);
  };

  const handleSlugChange = (val: string) => {
    const { converted, hasKorean } = convertKoreanToQwerty(val);
    setFormData(prev => ({ ...prev, slug: converted }));
    setSlugStatus({ checked: false, isAvailable: false, message: '' });

    if (hasKorean) {
      toast.info(`💡 한글 키보드 입력을 영문 주소('${converted}')로 자동 변환하였습니다.`, {
        id: 'hangul-convert-toast',
        duration: 2500,
      });
    }
  };

  const handleCheckSlugDuplicate = () => {
    const cleanSlug = formData.slug.trim().toLowerCase();
    if (!cleanSlug) {
      toast.error('단축 주소를 입력해주세요.');
      setSlugStatus({ checked: true, isAvailable: false, message: '🔴 단축 주소를 입력해 주세요.' });
      return;
    }
    if (cleanSlug.length < 2) {
      toast.error('단축 주소는 최소 2자 이상 입력해주세요.');
      setSlugStatus({ checked: true, isAvailable: false, message: '🔴 최소 2자 이상 입력해 주세요.' });
      return;
    }

    const isDup = tenants.some(t => t.slug.toLowerCase() === cleanSlug);
    if (isDup) {
      toast.error(`'${cleanSlug}' 주소는 이미 사용 중입니다.`);
      setSlugStatus({
        checked: true,
        isAvailable: false,
        message: `🔴 '${cleanSlug}' 주소는 이미 다른 단체에서 사용 중입니다. 다른 주소를 입력해 주세요.`,
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

  const handleNextFromBasic = () => {
    if (!formData.name.trim()) {
      toast.error('단체 명칭을 입력해 주세요.');
      return;
    }
    if (!formData.slug.trim()) {
      toast.error('단축 주소 접속 URL을 입력해 주세요.');
      return;
    }
    const cleanSlug = formData.slug.trim().toLowerCase();
    const isDup = tenants.some(t => t.slug.toLowerCase() === cleanSlug);
    if (isDup) {
      toast.error(`'${cleanSlug}' 주소는 이미 등록된 중복 주소입니다. 다른 주소를 설정해 주세요.`);
      setSlugStatus({
        checked: true,
        isAvailable: false,
        message: `🔴 '${cleanSlug}' 주소는 이미 다른 단체에서 사용 중입니다.`,
      });
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('공식 연락처를 입력해 주세요.');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('담당자 이메일을 입력해 주세요.');
      return;
    }
    if (!formData.password) {
      toast.error('관리자 비밀번호를 입력해 주세요.');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      toast.error('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setStep('branding');
  };

  const ft = FAITH_THEMES[formData.religion];
  const currentIndex = STEPS.indexOf(step);

  const handleSubmit = () => {
    setIsLoading(true);
    setTimeout(async () => {
      try {
        // 직접 입점신청: 플랫폼이 대리점/영업자 역할을 함
        await addTenant({
          id: `tenant-${Date.now()}`,
          slug: formData.slug || `org-${Date.now()}`,
          name: formData.name,
          religionType: formData.religion as any,
          primaryColor: formData.primaryColor,
          logoUrl: '',
          bannerImages: [],
          description: formData.description || '',
          address: formData.addressDetail ? `${formData.address.trim()} ${formData.addressDetail.trim()}` : formData.address.trim(),
          contact: {
            phone: formData.phone || '',
            email: formData.email || '',
            name: formData.representativeName || undefined,
          },
          adminPassword: formData.password,
          uniqueNumber: formData.uniqueNumber || undefined,
          uniqueNumberFile: formData.uniqueNumberFile || undefined,
          businessInfo: {
            uniqueNumber: formData.uniqueNumber || undefined,
            uniqueNumberFile: formData.uniqueNumberFile || undefined,
            uniqueNumberFileName: formData.uniqueNumberFileName || undefined,
            bylawsFile: formData.bylawsFile || undefined,
            bylawsFileName: formData.bylawsFileName || undefined,
            bankbookFile: formData.bankbookFile || undefined,
            bankbookFileName: formData.bankbookFileName || undefined,
            bankName: formData.bankName || undefined,
            accountNumber: formData.accountNumber || undefined,
            accountHolder: formData.accountHolder || undefined,
            representativeName: formData.representativeName || undefined,
            representativeCertFile: formData.representativeCertFile || undefined,
            representativeCertFileName: formData.representativeCertFileName || undefined,
            representativeIdFile: formData.representativeIdFile || undefined,
            representativeIdFileName: formData.representativeIdFileName || undefined,
            isDelegated: formData.isDelegated,
            delegateName: formData.delegateName || undefined,
            delegatePhone: formData.delegatePhone || undefined,
            delegationLetterFile: formData.delegationLetterFile || undefined,
            delegationLetterFileName: formData.delegationLetterFileName || undefined,
            delegateIdFile: formData.delegateIdFile || undefined,
            delegateIdFileName: formData.delegateIdFileName || undefined,
          },
          schedule: [],
          terminology: {
            donation: formData.religion === 'buddhist' ? '보시' : formData.religion === 'charity' ? '후원금' : formData.religion === 'general' ? '기부금' : '헌금',
            member: formData.religion === 'buddhist' ? '불자' : formData.religion === 'catholic' ? '교우' : formData.religion === 'charity' ? '후원자' : formData.religion === 'general' ? '기부자' : '성도',
            prayer: formData.religion === 'buddhist' ? '축원문' : (formData.religion === 'charity' || formData.religion === 'general') ? '응원 메시지' : '기도문',
          },
          status: 'pending',
          appliedAt: new Date().toISOString(),
          // 직접 신청 = 플랫폼이 영업 담당
          registrationSource: 'self',
          registeredByPartnerName: 'SoulPay 플랫폼',
          registeredByReferralCode: 'PLATFORM',
        } as any);
        setStep('complete');
        toast.success('단체 등록이 완료되었습니다!');
      } catch {
        toast.error('등록 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setIsLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-45 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60 px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-xs font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ArrowLeft size={16} />
          <span>돌아가기</span>
        </button>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-150 dark:bg-zinc-800 text-[10px] font-extrabold uppercase tracking-widest text-zinc-550 dark:text-zinc-400">
          SoulPay 가입신청
        </span>
        <div className="w-14" />
      </header>

      {/* Main Flow Container */}
      <main className="max-w-2xl mx-auto px-4 mt-10">
        
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            새 단체 가입신청
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            새로운 단체 및 종교 기관을 위한 전용 모금/헌금/보시/후원금 수납 공간을 구성합니다.
          </p>
        </div>

        {/* Stepper Progress Indicator */}
        <section className="mb-10 max-w-xl mx-auto px-2">
          <div className="flex justify-between items-center relative mb-4">
            {STEPS.map((s, i) => {
              const isPast = i < currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={s} className="flex flex-col items-center gap-2 flex-1 relative z-10">
                  <div 
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-200 border-2 ${
                      isCurrent
                        ? 'bg-[#191F28] dark:bg-white text-white dark:text-zinc-900 border-[#191F28] dark:border-white shadow-xs'
                        : isPast
                        ? 'bg-[#3182F6] text-white border-[#3182F6]'
                        : 'bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {isPast ? <Check size={14} strokeWidth={2.5} /> : (i + 1)}
                  </div>
                  <span 
                    className={`text-xs sm:text-[13px] tracking-tight transition-colors text-center ${
                      isCurrent
                        ? 'font-extrabold text-zinc-950 dark:text-white'
                        : isPast
                        ? 'font-bold text-zinc-700 dark:text-zinc-300'
                        : 'font-medium text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {STEP_LABELS[i]}
                  </span>
                </div>
              );
            })}
            
            {/* Stepper Background Track bar */}
            <div className="absolute top-4 sm:top-4.5 left-10 right-10 h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-0">
              <div 
                className="h-full bg-[#3182F6] rounded-full transition-all duration-300"
                style={{
                  width: `${(currentIndex / (STEPS.length - 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </section>

        {/* Form Step Display */}
        <div className="animate-slide-up">
          
          {/* ── Step 1: 조직 및 모금 유형 선택 ── */}
          {step === 'religion' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xs">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight mb-2">
                  조직 및 모금 유형 선택
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  해당되는 조직 단체 유형을 선택해 주세요. 선택에 따라 단체 고유 용어(헌금/보시/후원금/기부금)와 테마가 자동으로 사전 맵핑됩니다.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {(['protestant', 'buddhist', 'catholic', 'charity', 'general'] as ReligionId[]).map((id) => {
                  const t = FAITH_THEMES[id];
                  const isSelected = formData.religion === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormData({ ...formData, religion: id })}
                      className={`group text-left rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-2 border-[#3182F6] bg-blue-50/25 dark:bg-blue-950/20 ring-2 ring-[#3182F6]/10 shadow-xs'
                          : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/60 dark:hover:bg-zinc-850/60'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[15px] sm:text-[16px] font-bold text-zinc-950 dark:text-white tracking-tight">
                            {t.name}
                          </h4>
                        </div>
                        <p className="text-xs sm:text-[13px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
                          {t.tagline}
                        </p>
                      </div>

                      {/* Clean Modern Radio Indicator */}
                      <div 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'border-[#3182F6] bg-[#3182F6]'
                            : 'border-zinc-300 dark:border-zinc-600 bg-transparent group-hover:border-zinc-400'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setStep('basic')}
                className="w-full h-12 sm:h-13 rounded-xl bg-[#191F28] hover:bg-[#000000] text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-4 shadow-sm hover:shadow"
              >
                <span>다음 단계로</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ── Step 2: 기본 정보 입력 ── */}
          {step === 'basic' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
              {/* Dummy hidden inputs to hijack browser autofill */}
              <input type="text" name="fake_username_remember" tabIndex={-1} className="sr-only" aria-hidden="true" autoComplete="off" />
              <input type="password" name="fake_password_remember" tabIndex={-1} className="sr-only" aria-hidden="true" autoComplete="new-password" />

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight mb-2">
                  기본 정보 설정
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  단체명, 전용 접속 도메인 슬러그와 주요 연락 정보를 지정합니다.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    단체 명칭 *
                  </Label>
                  <div className="mt-1.5">
                    <Input 
                      id="name" 
                      name="org_name_nofill"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      placeholder={`예: 페이쓰페이 ${ft.placeNoun}`} 
                      className="px-3.5 h-11 sm:h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-medium text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-all"
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <Label htmlFor="slug" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      단축 주소 접속 URL *
                    </Label>
                    <span className="text-[11px] text-zinc-400 font-medium">영문 소문자, 숫자, 하이픈(-)만 가능</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center">
                      <span className="h-11 sm:h-12 px-3.5 bg-zinc-50 dark:bg-zinc-850 border border-r-0 border-zinc-200 dark:border-zinc-800 rounded-l-xl flex items-center text-xs font-bold text-zinc-500 select-none">
                        soulpay.kr/
                      </span>
                      <Input 
                        id="slug" 
                        name="org_slug_nofill"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="my-church" 
                        className="rounded-l-none h-11 sm:h-12 px-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-medium text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-all"
                        value={formData.slug} 
                        onChange={(e) => handleSlugChange(e.target.value)} 
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckSlugDuplicate}
                      className="h-11 sm:h-12 px-4 rounded-xl bg-[#191F28] hover:bg-[#000000] text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs cursor-pointer shadow-xs whitespace-nowrap transition-colors"
                    >
                      중복 확인
                    </button>
                  </div>
                  {slugStatus.checked && (
                    <p className={`text-xs font-bold mt-1.5 ${slugStatus.isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {slugStatus.message}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <Label htmlFor="address" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      기본 주소 *
                    </Label>
                    <button
                      type="button"
                      onClick={() => openDaumPostcode((res) => {
                        setFormData(prev => ({ ...prev, address: `[${res.zonecode}] ${res.address}` }));
                        setTimeout(() => addressDetailRef.current?.focus(), 100);
                      })}
                      className="text-xs font-bold text-[#3182F6] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Search size={12} />
                      <span>우편번호 검색</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      id="address" 
                      name="org_address_nofill"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="주소 검색 버튼을 누르시거나 기본 주소를 입력하세요" 
                      className="flex-1 px-3.5 h-11 sm:h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-medium text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-all"
                      value={formData.address} 
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                    />
                    <button
                      type="button"
                      onClick={() => openDaumPostcode((res) => {
                        setFormData(prev => ({ ...prev, address: `[${res.zonecode}] ${res.address}` }));
                        setTimeout(() => addressDetailRef.current?.focus(), 100);
                      })}
                      className="h-11 sm:h-12 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-bold text-xs cursor-pointer shadow-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
                    >
                      <Search size={14} />
                      <span>주소 검색</span>
                    </button>
                  </div>
                  <Input 
                    ref={addressDetailRef}
                    id="addressDetail" 
                    name="org_address_detail_nofill"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="상세 주소를 입력하세요 (예: 2층 종무소 / 101동 202호)" 
                    className="px-3.5 h-11 sm:h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-medium text-xs mt-2 text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-all"
                    value={formData.addressDetail} 
                    onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      공식 연락처 *
                    </Label>
                    <div className="mt-1.5">
                      <Input 
                        id="phone" 
                        name="org_phone_nofill"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="02-123-4567" 
                        className="px-3.5 h-11 sm:h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-medium text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-all"
                        value={formData.phone} 
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      담당자 이메일 *
                    </Label>
                    <div className="mt-1.5">
                      <Input 
                        id="email" 
                        name="org_email_nofill"
                        type="email" 
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="admin@example.com" 
                        className="px-3.5 h-11 sm:h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-medium text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-all"
                        value={formData.email} 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      관리자 비밀번호 *
                    </Label>
                    <div className="relative mt-1.5 flex items-center">
                      <Input 
                        id="password" 
                        name="org_password_nofill"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="6자리 이상 입력" 
                        className="px-3.5 pr-10 h-11 sm:h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-medium text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-all"
                        value={formData.password} 
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="passwordConfirm" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      비밀번호 확인 *
                    </Label>
                    <div className="relative mt-1.5 flex items-center">
                      <Input 
                        id="passwordConfirm" 
                        name="org_password_confirm_nofill"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="비밀번호 재입력" 
                        className="px-3.5 h-11 sm:h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-medium text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-all"
                        value={formData.passwordConfirm} 
                        onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>

                {/* ── 단체 인증 및 정산 서류 첨부 (선택사항) ── */}
                <div className="border border-indigo-150 dark:border-zinc-800 rounded-2xl p-5 bg-gradient-to-b from-indigo-50/40 to-white dark:from-zinc-850/50 dark:to-zinc-900 mt-2">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowDocsSection(!showDocsSection)}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <FileCheck size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                            단체 인증 및 정산 서류 첨부
                          </h4>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                            선택사항
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          미리 서류를 등록하시면 개설 심사가 더욱 빨라집니다. (가입 후 관리자 설정에서도 등록 가능)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      {showDocsSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>

                  {showDocsSection && (
                    <div className="mt-5 pt-4 border-t border-indigo-100 dark:border-zinc-800 space-y-4">
                      
                      {/* 1. 고유번호증 */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <FileText size={14} className="text-indigo-500" />
                            고유번호증 번호 및 사본
                          </Label>
                          {formData.uniqueNumberFileName && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Check size={12} /> {formData.uniqueNumberFileName}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="고유번호 (예: 240-82-12345)"
                            className="h-10 text-xs font-mono font-medium"
                            value={formData.uniqueNumber}
                            onChange={(e) => setFormData({ ...formData, uniqueNumber: e.target.value })}
                          />
                          <div className="flex items-center gap-2">
                            <label className="flex-1 h-10 px-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors truncate">
                              <Upload size={13} />
                              <span className="truncate">{formData.uniqueNumberFileName || '고유번호증 파일 첨부'}</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="sr-only"
                                onChange={(e) => handleFileUpload('uniqueNumberFile', 'uniqueNumberFileName', e.target.files?.[0] || null)}
                              />
                            </label>
                            {formData.uniqueNumberFile && (
                              <button
                                type="button"
                                onClick={() => handleFileUpload('uniqueNumberFile', 'uniqueNumberFileName', null)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                                title="삭제"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. 정관 또는 회칙 */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <FileText size={14} className="text-indigo-500" />
                            정관 또는 회칙 사본
                          </Label>
                          {formData.bylawsFileName && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Check size={12} /> {formData.bylawsFileName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 h-10 px-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors truncate">
                            <Upload size={13} />
                            <span className="truncate">{formData.bylawsFileName || '정관/회칙 사본 첨부 (PDF, 이미지)'}</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="sr-only"
                              onChange={(e) => handleFileUpload('bylawsFile', 'bylawsFileName', e.target.files?.[0] || null)}
                            />
                          </label>
                          {formData.bylawsFile && (
                            <button
                              type="button"
                              onClick={() => handleFileUpload('bylawsFile', 'bylawsFileName', null)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 3. 단체명의 정산 통장 사본 */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                          <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <FileText size={14} className="text-indigo-500" />
                            단체명의 정산 통장 사본 및 계좌 정보
                          </Label>
                          {formData.bankbookFileName && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Check size={12} /> {formData.bankbookFileName}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                          <Input
                            placeholder="은행명 (예: 국민은행)"
                            className="h-10 text-xs"
                            value={formData.bankName}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          />
                          <Input
                            placeholder="계좌번호 (- 제외)"
                            className="h-10 text-xs font-mono"
                            value={formData.accountNumber}
                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                          />
                          <Input
                            placeholder="예금주명 (단체명과 동일)"
                            className="h-10 text-xs"
                            value={formData.accountHolder}
                            onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 h-10 px-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors truncate">
                            <Upload size={13} />
                            <span className="truncate">{formData.bankbookFileName || '통장 사본 파일 첨부'}</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="sr-only"
                              onChange={(e) => handleFileUpload('bankbookFile', 'bankbookFileName', e.target.files?.[0] || null)}
                            />
                          </label>
                          {formData.bankbookFile && (
                            <button
                              type="button"
                              onClick={() => handleFileUpload('bankbookFile', 'bankbookFileName', null)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 4. 대표자(관리인) 확인서류 & 5. 대표자 신분증 사본 */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between mb-1.5">
                              <span>대표자(관리인) 확인서류</span>
                              {formData.representativeCertFileName && <span className="text-[10px] text-emerald-600 font-semibold truncate max-w-[100px]">첨부됨</span>}
                            </Label>
                            <p className="text-[10.5px] text-zinc-400 mb-1.5">재직/임명장 또는 소속증명서</p>
                            <label className="h-10 px-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors truncate">
                              <Upload size={13} />
                              <span className="truncate">{formData.representativeCertFileName || '확인서류 첨부'}</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="sr-only"
                                onChange={(e) => handleFileUpload('representativeCertFile', 'representativeCertFileName', e.target.files?.[0] || null)}
                              />
                            </label>
                          </div>

                          <div>
                            <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between mb-1.5">
                              <span>대표자 신분증 사본</span>
                              {formData.representativeIdFileName && <span className="text-[10px] text-emerald-600 font-semibold truncate max-w-[100px]">첨부됨</span>}
                            </Label>
                            <p className="text-[10.5px] text-zinc-400 mb-1.5">주민등록증, 운전면허증 등</p>
                            <label className="h-10 px-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors truncate">
                              <Upload size={13} />
                              <span className="truncate">{formData.representativeIdFileName || '신분증 사본 첨부'}</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="sr-only"
                                onChange={(e) => handleFileUpload('representativeIdFile', 'representativeIdFileName', e.target.files?.[0] || null)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* 6. 대리인 신청 옵션 */}
                      <div className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formData.isDelegated}
                            onChange={(e) => setFormData({ ...formData, isDelegated: e.target.checked })}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-zinc-300"
                          />
                          <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                            대표자 본인이 아닌 대리인이 신청하는 경우 체크해 주세요
                          </span>
                        </label>

                        {formData.isDelegated && (
                          <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Input
                                placeholder="대리인 성명"
                                className="h-10 text-xs bg-white dark:bg-zinc-900"
                                value={formData.delegateName}
                                onChange={(e) => setFormData({ ...formData, delegateName: e.target.value })}
                              />
                              <Input
                                placeholder="대리인 연락처"
                                className="h-10 text-xs bg-white dark:bg-zinc-900"
                                value={formData.delegatePhone}
                                onChange={(e) => setFormData({ ...formData, delegatePhone: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">대리인 위임장 사본</Label>
                                <label className="h-10 px-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer truncate">
                                  <Upload size={13} />
                                  <span className="truncate">{formData.delegationLetterFileName || '위임장 첨부'}</span>
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="sr-only"
                                    onChange={(e) => handleFileUpload('delegationLetterFile', 'delegationLetterFileName', e.target.files?.[0] || null)}
                                  />
                                </label>
                              </div>
                              <div>
                                <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">대리인 신분증 사본</Label>
                                <label className="h-10 px-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 cursor-pointer truncate">
                                  <Upload size={13} />
                                  <span className="truncate">{formData.delegateIdFileName || '대리인 신분증 첨부'}</span>
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="sr-only"
                                    onChange={(e) => handleFileUpload('delegateIdFile', 'delegateIdFileName', e.target.files?.[0] || null)}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setStep('religion')} 
                  className="h-12 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <ArrowLeft size={14} />
                  <span>이전으로</span>
                </button>
                <button 
                  type="button"
                  onClick={handleNextFromBasic} 
                  className="h-12 flex-[2] rounded-xl bg-[#191F28] hover:bg-[#000000] text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
                >
                  <span>브랜딩 설정 단계로</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: 브랜딩 및 소개 ── */}
          {step === 'branding' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xs">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight mb-2">
                  브랜딩 및 소개글
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  기본 테마 색상 칩 선택 및 단체 홍보 문구를 작성합니다.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <div className="mb-3">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      브랜드 주 색상 선택
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {['#3182F6', '#1E40AF', '#059669', '#D97706', '#DC2626', '#475569'].map((color) => {
                      const isChosen = formData.primaryColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, primaryColor: color })}
                          className="w-9 h-9 rounded-full cursor-pointer transition-all duration-150 flex items-center justify-center"
                          style={{
                            background: color,
                            boxShadow: isChosen ? '0 0 0 2px #fff, 0 0 0 4px #3182F6' : 'none',
                            transform: isChosen ? 'scale(1.05)' : 'scale(1)',
                          }}
                        >
                          {isChosen && <Check size={14} className="text-white" strokeWidth={3} />}
                        </button>
                      );
                    })}
                    <div className="relative flex items-center">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-9 h-9 rounded-full border border-zinc-200 dark:border-zinc-700 cursor-pointer p-0 bg-transparent outline-none"
                        title="직접 색상 선택"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    단체 소개글 (선택)
                  </Label>
                  <Textarea
                    id="description" 
                    className="mt-1.5 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10" 
                    rows={4}
                    placeholder="단체를 신도 및 후원자에게 알리는 환영 문구나 한 주 말씀 공지를 짧게 남겨주세요."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Upload Section placeholder */}
                <div className="p-6 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col items-center gap-1.5 text-center">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    단체 대표 로고 및 배너 이미지 (선택)
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    가입 완료 후 관리자 설정 &gt; 브랜딩 메뉴에서 언제든지 등록하실 수 있습니다.
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setStep('basic')} 
                  className="h-12 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <ArrowLeft size={14} />
                  <span>이전으로</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="h-12 flex-[2] rounded-xl bg-[#191F28] hover:bg-[#000000] text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>신청 처리 중...</span>
                    </div>
                  ) : (
                    <>
                      <span>단체 개설 신청 완료</span>
                      <Check size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: 개설 신청 완료 ── */}
          {step === 'complete' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center gap-6 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <Check size={32} strokeWidth={2.5} />
              </div>

              <div className="space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
                  개설 신청이 완료되었습니다
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium max-w-sm mx-auto">
                  운영팀의 검토 및 승인이 완료되면 등록하신 연락처/이메일로 안내 드리며, 전용 수납 서비스가 즉시 활성화됩니다.
                </p>
              </div>

              {/* Shared Link Card */}
              <div className="w-full rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/20 text-center">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block mb-1.5">
                  신청된 전용 접속 URL 주소 (승인 후 활성화)
                </span>
                <h3 className="font-mono text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 break-all mb-3">
                  soulpay.kr/{formData.slug || 'church-name'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`soulpay.kr/${formData.slug || 'church-name'}`);
                    toast.success('주소가 클립보드에 복사되었습니다.');
                  }}
                  className="h-9 px-4 rounded-xl bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer shadow-2xs border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 transition-colors"
                >
                  단축 주소 복사하기
                </button>
              </div>

              <div className="flex flex-col gap-2.5 w-full mt-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full h-12 sm:h-13 rounded-xl bg-[#191F28] hover:bg-[#000000] text-white dark:bg-white dark:text-zinc-900 font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-sm hover:shadow"
                >
                  메인 홈 페이지로 가기
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/${formData.slug || 'church-name'}/admin/login`)}
                  className="w-full h-11 sm:h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs"
                >
                  단체 관리자 로그인 페이지 확인
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

