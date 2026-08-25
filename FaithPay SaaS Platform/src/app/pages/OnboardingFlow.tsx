import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif, MotifLarge } from '../components/Motif';
import { Building2, MapPin, Phone, Mail, Palette, Globe, Check, ArrowRight, ArrowLeft, Search, Lock, Eye, EyeOff } from 'lucide-react';
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
  });

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
          },
          adminPassword: formData.password,
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
        <section className="mb-10 max-w-lg mx-auto">
          <div className="flex justify-between items-center relative mb-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-2 flex-1 relative z-10">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2"
                  style={{
                    background: i <= currentIndex ? ft.heroGradient : undefined,
                    color: i <= currentIndex ? '#fff' : 'var(--fp-fg-tertiary)',
                    borderColor: i === currentIndex ? ft.primary : (i < currentIndex ? ft.primary : 'transparent'),
                    boxShadow: i === currentIndex ? `0 0 0 4px ${ft.primaryBg}` : 'none',
                  }}
                >
                  {i < currentIndex ? <Check size={14} /> : (i + 1)}
                </div>
                <span 
                  className="text-[10px] font-bold tracking-wide transition-colors"
                  style={{ color: i <= currentIndex ? ft.primary : 'var(--fp-fg-tertiary)' }}
                >
                  {STEP_LABELS[i]}
                </span>
              </div>
            ))}
            
            {/* Stepper Background Track bar */}
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-0">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(currentIndex / (STEPS.length - 1)) * 100}%`,
                  background: ft.heroGradient,
                }}
              />
            </div>
          </div>
        </section>

        {/* Form Step Display */}
        <div className="animate-slide-up">
          
          {/* ── Step 1: 종교 타입 선택 ── */}
          {step === 'religion' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mb-2">조직 및 모금 유형 선택</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
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
                      onClick={() => setFormData({ ...formData, religion: id })}
                      className="group text-left border rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all duration-350 relative overflow-hidden"
                      style={{
                        borderColor: isSelected ? t.primary : 'var(--border)',
                        color: isSelected ? '#fff' : 'inherit',
                        background: isSelected ? t.primary : 'var(--card)',
                      }}
                    >


                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          background: isSelected ? 'rgba(255,255,255,0.18)' : t.primaryBg,
                        }}
                      >
                        <Motif kind={t.motif} size={24} color={isSelected ? '#fff' : t.primary} />
                      </div>

                      <div className="flex-1 min-w-0 z-10">
                        <h4 className="text-base font-bold tracking-tight">{t.name}</h4>
                        <p 
                          className="text-xs mt-0.5 font-medium transition-colors"
                          style={{ color: isSelected ? 'rgba(255,255,255,0.88)' : 'var(--fp-fg-tertiary)' }}
                        >
                          {t.tagline}
                        </p>
                      </div>

                      <div 
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          borderColor: isSelected ? '#fff' : 'rgba(112, 115, 124, 0.4)',
                          background: isSelected ? '#fff' : 'transparent',
                        }}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.primary }} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep('basic')}
                className="w-full h-13 rounded-xl text-white font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 mt-4 shadow-md"
                style={{ background: ft.heroGradient }}
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
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mb-2">기본 정보 설정</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  단체명, 전용 접속 도메인 슬러그와 주요 연락 정보를 지정합니다.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">단체 명칭 *</Label>
                  <div className="relative mt-2 flex items-center">
                    <Building2 size={18} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
                    <Input 
                      id="name" 
                      name="org_name_nofill"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      placeholder={`예: 페이쓰페이 ${ft.placeNoun}`} 
                      className="pl-10 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="slug" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">단축 주소 접속 URL *</Label>
                    <span className="text-[11px] text-zinc-400 font-semibold">영문 소문자, 숫자, 하이픈(-)만 가능</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1 flex items-center">
                      <div className="absolute left-3.5 text-xs text-zinc-400 font-bold select-none">soulpay.kr/</div>
                      <Input 
                        id="slug" 
                        name="org_slug_nofill"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="my-church" 
                        className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
                        style={{ paddingLeft: '110px' }}
                        value={formData.slug} 
                        onChange={(e) => handleSlugChange(e.target.value)} 
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckSlugDuplicate}
                      className="h-12 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 text-white dark:text-zinc-900 font-bold text-xs cursor-pointer shadow-xs whitespace-nowrap transition-colors"
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
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="address" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">기본 주소 *</Label>
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
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1 flex items-center">
                      <MapPin size={18} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
                      <Input 
                        id="address" 
                        name="org_address_nofill"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="주소 검색 버튼을 누르시거나 기본 주소를 입력하세요" 
                        className="pl-10 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
                        value={formData.address} 
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => openDaumPostcode((res) => {
                        setFormData(prev => ({ ...prev, address: `[${res.zonecode}] ${res.address}` }));
                        setTimeout(() => addressDetailRef.current?.focus(), 100);
                      })}
                      className="h-12 px-4 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-100 font-bold text-xs cursor-pointer shadow-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
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
                    className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-medium text-xs mt-2 focus:ring-2 focus:ring-[#3182F6]"
                    value={formData.addressDetail} 
                    onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">공식 연락처 *</Label>
                    <div className="relative mt-2 flex items-center">
                      <Phone size={18} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
                      <Input 
                        id="phone" 
                        name="org_phone_nofill"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="02-123-4567" 
                        className="pl-10 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
                        value={formData.phone} 
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">담당자 이메일 *</Label>
                    <div className="relative mt-2 flex items-center">
                      <Mail size={18} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
                      <Input 
                        id="email" 
                        name="org_email_nofill"
                        type="email" 
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="admin@example.com" 
                        className="pl-10 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
                        value={formData.email} 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">관리자 비밀번호 *</Label>
                    <div className="relative mt-2 flex items-center">
                      <Lock size={18} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
                      <Input 
                        id="password" 
                        name="org_password_nofill"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="6자리 이상 입력" 
                        className="pl-10 pr-10 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
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
                    <Label htmlFor="passwordConfirm" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">비밀번호 확인 *</Label>
                    <div className="relative mt-2 flex items-center">
                      <Lock size={18} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
                      <Input 
                        id="passwordConfirm" 
                        name="org_password_confirm_nofill"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="비밀번호 재입력" 
                        className="pl-10 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 font-semibold"
                        value={formData.passwordConfirm} 
                        onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setStep('religion')} 
                  className="h-12 flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <ArrowLeft size={14} />
                  <span>이전으로</span>
                </button>
                <button 
                  onClick={handleNextFromBasic} 
                  className="h-12 flex-[2] rounded-xl text-white font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  style={{ background: ft.heroGradient }}
                >
                  <span>브랜딩 설정 단계로</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: 브랜딩 및 소개 ── */}
          {step === 'branding' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mb-2">브랜딩 및 소개글</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  기본 테마 색상 칩 선택 및 단체 홍보 문구를 작성합니다.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette size={15} className="text-zinc-500" />
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">브랜드 주 컬러 칩 선택</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {['#3D47B8', '#C16314', '#345785', '#2e7d32', '#c62828', '#37474f'].map((color) => {
                      const isChosen = formData.primaryColor === color;
                      return (
                        <button
                          key={color}
                          onClick={() => setFormData({ ...formData, primaryColor: color })}
                          className="w-10 h-10 rounded-full cursor-pointer transition-all duration-150"
                          style={{
                            background: color,
                            border: isChosen ? `3px solid ${ft.primary}` : '3px solid transparent',
                            boxShadow: isChosen ? '0 0 0 2px #fff, 0 0 0 4px var(--primary)' : 'none',
                            transform: isChosen ? 'scale(1.08)' : 'scale(1)',
                          }}
                        />
                      );
                    })}
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-full border-0 cursor-pointer p-0 bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">단체 소개글</Label>
                  <Textarea
                    id="description" 
                    className="mt-2 rounded-xl bg-zinc-50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 text-sm font-semibold" 
                    rows={4}
                    placeholder="단체를 신도들에게 알리는 환영 문구나 한 주 말씀 공지를 짧게 남겨주세요."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Upload Section placeholder */}
                <div className="p-6 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 flex flex-col items-center gap-2 text-center text-zinc-400">
                  <Globe size={32} className="opacity-40" />
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">단체 메인 로고 및 대표 배너 파일 (준비 중)</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">지원포맷: JPG, PNG / 권장 해상도 800 x 600</span>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setStep('basic')} 
                  className="h-12 flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <ArrowLeft size={14} />
                  <span>이전으로</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="h-12 flex-[2] rounded-xl text-white font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-60"
                  style={{ background: ft.heroGradient }}
                >
                  {isLoading ? (
                    <span>공간 생성 중...</span>
                  ) : (
                    <>
                      <span>모바일 헌금함 개설 완료</span>
                      <Check size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: 개설 신청 완료 ── */}
          {step === 'complete' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center gap-6 shadow-sm">
              <div 
                className="w-20 h-20 rounded-2xl text-white flex items-center justify-center animate-ring-in shadow-md"
                style={{ background: ft.heroGradient }}
              >
                <Check size={36} strokeWidth={2.5} />
              </div>

              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                  개설신청이 완료되었습니다.
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium max-w-sm mx-auto">
                  서류검토 후 개설이 완료됩니다. 운영팀의 확인 및 승인이 완료되면 등록하신 연락처/이메일로 안내 드리며 서비스가 즉시 활성화됩니다.
                </p>
              </div>

              {/* Shared Link Card */}
              <div 
                className="w-full rounded-2xl p-5 border text-center"
                style={{ background: ft.primaryBg, borderColor: ft.primaryBgStrong }}
              >
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-450 block mb-2" style={{ color: ft.primaryDark }}>
                  신청된 전용 URL 주소 (승인 후 활성화)
                </span>
                <h3 
                  className="font-display text-lg sm:text-xl font-extrabold tracking-tight break-all mb-4"
                  style={{ color: ft.primary }}
                >
                  soulpay.kr/{formData.slug || 'church-name'}
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`soulpay.kr/${formData.slug || 'church-name'}`);
                    toast.success('주소가 클립보드에 복사되었습니다.');
                  }}
                  className="h-10 px-5 rounded-full bg-white dark:bg-zinc-950 text-xs font-bold cursor-pointer shadow-xs border transition-colors"
                  style={{ color: ft.primary, borderColor: ft.primaryBgStrong }}
                >
                  단축 주소 복사하기
                </button>
              </div>

              <div className="flex flex-col gap-2.5 w-full mt-2">
                <button
                  onClick={() => navigate('/')}
                  className="w-full h-13 rounded-xl text-white font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-md"
                  style={{ background: ft.heroGradient }}
                >
                  메인 홈 페이지로 가기
                </button>
                <button
                  onClick={() => navigate(`/${formData.slug || 'church-name'}/admin/login`)}
                  className="w-full h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold transition-all cursor-pointer shadow-xs"
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

