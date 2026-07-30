import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { useApp, DonationItem } from '../context/AppContext';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif, MotifLarge } from '../components/Motif';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface FamilyMember {
  name: string;
  birthDate: string;
  calendar: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n || 0);
}

export default function DonationFlow() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTenant, setDonationFormData } = useApp();

  const [step, setStep] = useState(1);
  const [selectedItem] = useState<DonationItem | null>(location.state?.selectedItem || null);
  const [amount, setAmount] = useState<number>(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [prayerText, setPrayerText] = useState('');
  const [baptismName, setBaptismName] = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState<number>(5);

  useEffect(() => {
    if (!currentTenant) navigate('/');
  }, [currentTenant, navigate]);

  if (!currentTenant || !selectedItem) return null;

  const ft = FAITH_THEMES[currentTenant.religionType as ReligionId] ?? FAITH_THEMES.protestant;
  const totalSteps = 4;

  const chips = [10000, 50000, 100000, 300000, 500000, 1000000];

  const addFamilyMember = () => setFamilyMembers([...familyMembers, { name: '', birthDate: '', calendar: 'solar' }]);
  const removeFamilyMember = (i: number) => setFamilyMembers(familyMembers.filter((_, idx) => idx !== i));
  const updateFamilyMember = (i: number, field: keyof FamilyMember, value: string) => {
    const updated = [...familyMembers];
    updated[i][field] = value;
    setFamilyMembers(updated);
  };

  const handleNext = () => {
    if (step === 1 && amount < 1000) { toast.error('1,000원 이상 입력해주세요'); return; }
    if (step === 2 && (!name || !phone)) { toast.error('이름과 전화번호를 입력해주세요'); return; }
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate(-1);
  };

  const handleSubmit = () => {
    setDonationFormData({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      amount,
      name,
      phone,
      prayerText: prayerText || undefined,
      baptismName: baptismName || undefined,
      familyMembers: familyMembers.length > 0 ? familyMembers : undefined,
      isRecurring,
      recurringDay: isRecurring ? recurringDay : undefined,
    });
    navigate(`/${tenantSlug}/payment`);
  };

  const prayerPlaceholder =
    currentTenant.religionType === 'buddhist' ? '축원 내용을 적어주세요' :
    currentTenant.religionType === 'catholic' ? '지향을 적어주세요 (예: 부모님 강복)' :
    '기도 제목을 적어주세요';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--hm-paper)', fontFamily: 'var(--font-body)', color: 'var(--hm-ink)', paddingBottom: 64 }}>
      {/* Hero Header Banner */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '20px 16px', background: ft.heroGradient }}>
        {/* Large background motif */}
        <div style={{ position: 'absolute', top: -16, right: -16, width: 160, height: 160, opacity: 0.10, pointerEvents: 'none' }}>
          <MotifLarge kind={ft.motif} color="#fff" opacity={1} />
        </div>

        {/* Top App bar */}
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10, marginBottom: 20 }}>
          <button
            onClick={handleBack}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'oklch(1 0 0 / 0.14)', border: '1px solid oklch(1 0 0 / 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', transition: 'background 150ms ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'oklch(1 0 0 / 0.24)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'oklch(1 0 0 / 0.14)')}
          >
            <ArrowLeft size={18} color="#fff" />
          </button>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>
            {selectedItem.name}
          </h2>
          <div style={{ width: 40 }} />
        </div>

        {/* Progress stepper */}
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{ flex: 1, height: 3, borderRadius: 999, transition: 'background 300ms ease', background: i < step ? 'white' : 'oklch(1 0 0 / 0.25)' }}
              />
            ))}
          </div>
          <span style={{ fontSize: 10, color: 'oklch(1 0 0 / 0.68)', fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            {step} / {totalSteps} 단계
          </span>
        </div>
      </section>

      {/* Main Flow Content Card */}
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px 0' }}>
        <div className="hm-card hm-animate-scale-in" style={{ background: 'white', overflow: 'hidden' }}>
          
          {/* Header Title Badge */}
          <div className="px-6 pt-6 flex items-center gap-2">
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{ background: ft.primaryBg, color: ft.primary }}
            >
              <Motif kind={ft.motif} size={12} color={ft.primary} />
              <span>{selectedItem.name}</span>
            </span>
          </div>

          {/* Form Step Dispatch */}
          <div className="p-6">
            {/* ── Step 1: 금액 입력 ── */}
            {step === 1 && (
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2 font-display">
                  얼마를 봉헌하시겠어요?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 font-medium">
                  {selectedItem.description}
                </p>

                {selectedItem.amountType === 'fixed' && selectedItem.fixedAmount ? (
                  <div 
                    className="border rounded-2xl p-8 text-center"
                    style={{ background: ft.heroGradientSoft, borderColor: ft.primaryBgStrong }}
                  >
                    <span className="text-xs font-bold opacity-75 block mb-1.5" style={{ color: ft.primaryDark }}>
                      고정 봉헌 금액
                    </span>
                    <h4 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ color: ft.primaryDark }}>
                      {fmt(selectedItem.fixedAmount)}<span className="text-lg font-bold ml-1">원</span>
                    </h4>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {/* Amount Display Board */}
                    <div 
                      className="border rounded-2xl p-6"
                      style={{ background: ft.heroGradientSoft, borderColor: ft.primaryBgStrong }}
                    >
                      <span className="text-xs font-bold opacity-70 block mb-2" style={{ color: ft.primaryDark }}>
                        봉헌 금액
                      </span>
                      <div className="flex items-baseline gap-1" style={{ color: ft.primaryDark }}>
                        <span className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
                          {amount > 0 ? fmt(amount) : '0'}
                        </span>
                        <span className="font-display text-lg font-bold opacity-70">원</span>
                      </div>
                      {amount >= 10000 && (
                        <div className="text-xs font-semibold opacity-60 mt-2 tracking-wide" style={{ color: ft.primaryDark }}>
                          일금 {Math.floor(amount / 10000)}만{amount % 10000 ? ` ${fmt(amount % 10000)}` : ''}원정
                        </div>
                      )}
                    </div>

                    {/* Quick amount increment chips */}
                    <div className="flex flex-wrap gap-2">
                      {chips.map((c) => (
                        <button
                          key={c}
                          onClick={() => setAmount((amount || 0) + c)}
                          className="h-10 px-4 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
                        >
                          + {fmt(c)}원
                        </button>
                      ))}
                      <button
                        onClick={() => setAmount(0)}
                        className="h-10 px-4 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        ↺ 초기화
                      </button>
                    </div>

                    {/* Direct keyboard input field */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                        직접 입력
                      </label>
                      <div className="flex items-center gap-2 h-13 px-4 bg-zinc-100 dark:bg-zinc-850 rounded-xl border border-transparent focus-within:border-zinc-350 dark:focus-within:border-zinc-700 transition-colors">
                        <input
                          type="number"
                          value={amount || ''}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          placeholder="금액을 입력하세요"
                          className="flex-1 bg-transparent border-0 outline-none text-base font-extrabold text-zinc-900 dark:text-zinc-100"
                        />
                        <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">원</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: 신원 정보 ── */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2 font-display">
                    이름과 전화번호를 입력해주세요
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    안전한 연말정산 기부금 영수증 발급을 위해 사용됩니다.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <FPInput label="성명 *" value={name} onChange={setName} placeholder="홍길동" />
                  <FPInput label="전화번호 *" value={phone} onChange={setPhone} placeholder="010-1234-5678" type="tel" />

                  {/* ✝️ 천주교 성당 특화 서식 */}
                  {currentTenant.religionType === 'catholic' && (
                    <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-3 mt-1">
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        ✝️ 천주교 본당 전용 입력 서식
                      </span>
                      <FPInput label="세례명" value={baptismName} onChange={setBaptismName} placeholder="예: 프란치스코 / 마리아" />
                      <div>
                        <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                          미사 지향 선택 (선택)
                        </label>
                        <select 
                          className="w-full h-11 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-xs font-bold text-zinc-850 dark:text-zinc-150"
                          defaultValue="life"
                        >
                          <option value="life">생미사 (건강 / 은혜 / 축복 지향)</option>
                          <option value="memorial">위령미사 (영가 안식 지향)</option>
                          <option value="thanks">감사미사 (감사 지향)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* ⛪ 기독교 교회 특화 서식 */}
                  {currentTenant.religionType === 'protestant' && (
                    <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-3 mt-1">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        ⛪ 교회 직분 정보
                      </span>
                      <div>
                        <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                          교회 직분 선택
                        </label>
                        <select 
                          className="w-full h-11 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-xs font-bold text-zinc-850 dark:text-zinc-150"
                          defaultValue="member"
                        >
                          <option value="member">성도</option>
                          <option value="deacon">집사</option>
                          <option value="senior_deacon">권사</option>
                          <option value="elder">장로</option>
                          <option value="youth">청년/학생</option>
                          <option value="pastor">목회자/교역자</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* ⛩️ 불교 사찰 특화 서식 (가족 축원 명단) */}
                  {currentTenant.religionType === 'buddhist' && (
                    <div className="mt-2 p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-2xl">
                      <label className="block text-xs font-extrabold text-orange-950 dark:text-orange-200 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                        ⛩️ 사찰 전용 가족 축원 명단 카드 <span className="font-semibold text-orange-700 dark:text-orange-400">(선택)</span>
                      </label>
                      <p className="text-[11px] text-orange-800 dark:text-orange-300 mb-3">
                        대웅전 연등/인등 점등 및 축원카드에 기재될 가족 구성원의 생년월일을 적어주세요.
                      </p>
                      
                      <div className="flex flex-col gap-3">
                        {familyMembers.map((member, i) => (
                          <div 
                            key={i} 
                            className="rounded-2xl p-4 border flex flex-col gap-3 relative shadow-2xs"
                            style={{ background: '#fff', borderColor: ft.primaryBgStrong }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-extrabold flex items-center gap-1" style={{ color: ft.primaryDark }}>
                                축원 대상 {i + 1}
                              </span>
                              <button 
                                onClick={() => removeFamilyMember(i)} 
                                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input 
                                placeholder="성명 (예: 홍길동)" 
                                value={member.name} 
                                onChange={(e) => updateFamilyMember(i, 'name', e.target.value)}
                                className="w-full h-11 px-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-xs font-bold text-zinc-850 dark:text-zinc-150" 
                              />
                              <input 
                                placeholder="생년월일 (예: 1990-05-15)" 
                                value={member.birthDate} 
                                onChange={(e) => updateFamilyMember(i, 'birthDate', e.target.value)}
                                className="w-full h-11 px-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none text-xs font-bold text-zinc-850 dark:text-zinc-150" 
                              />
                            </div>
                            
                            <Select value={member.calendar} onValueChange={(v) => updateFamilyMember(i, 'calendar', v)}>
                              <SelectTrigger className="h-11 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="solar" className="text-xs">양력 (Solar)</SelectItem>
                                <SelectItem value="lunar" className="text-xs">음력 (Lunar)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={addFamilyMember}
                        className="w-full h-12 rounded-xl border border-dashed text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-3 bg-white/80"
                        style={{ borderColor: ft.primaryBgStrong, color: ft.primary }}
                      >
                        <Plus size={14} /> 
                        <span>가족 축원 인원 추가</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: 기도/메모 ── */}
            {step === 3 && (
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2 font-display">
                  {currentTenant.terminology.prayer}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 font-medium">
                  {selectedItem.enablePrayerField ? '작성하신 마음의 편지는 단체 관리자가 확인할 수 있습니다.' : '선택사항입니다. 적지 않으셔도 괜찮습니다.'}
                </p>
                <textarea
                  value={prayerText}
                  onChange={(e) => setPrayerText(e.target.value)}
                  placeholder={prayerPlaceholder}
                  rows={6}
                  className="w-full p-4 bg-zinc-100 dark:bg-zinc-850 rounded-xl border border-transparent focus:border-zinc-350 dark:focus:border-zinc-700 outline-none text-sm font-semibold leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-450 dark:placeholder:text-zinc-550"
                />
              </div>
            )}

            {/* ── Step 4: 결제 방식 ── */}
            {step === 4 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2 font-display">
                    결제 방식을 선택해주세요
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium font-sans">
                    정기 봉헌 설정 시 지정하신 매월 결제일에 자동으로 봉헌됩니다.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {selectedItem.allowOneTime && (
                    <RecurringOption
                      id="onetime" 
                      label={`일회성 단발 ${currentTenant.terminology.donation}`}
                      desc={`이번 한 번만 ${currentTenant.terminology.donation}을 완료합니다.`}
                      selected={!isRecurring} 
                      onClick={() => setIsRecurring(false)}
                      ft={ft}
                    />
                  )}
                  {selectedItem.allowRecurring && (
                    <RecurringOption
                      id="recurring" 
                      label={`매월 정기 ${currentTenant.terminology.donation}`}
                      desc="매월 자동으로 따뜻한 봉헌을 이어갑니다."
                      selected={isRecurring} 
                      onClick={() => setIsRecurring(true)}
                      ft={ft}
                    />
                  )}
                </div>

                {isRecurring && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                      정기 결제일 선택
                    </label>
                    <Select value={recurringDay.toString()} onValueChange={(v) => setRecurringDay(Number(v))}>
                      <SelectTrigger className="h-12 border-zinc-200 dark:border-zinc-800 text-sm font-semibold rounded-xl bg-zinc-50 dark:bg-zinc-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5" className="text-sm">매월 5일</SelectItem>
                        <SelectItem value="15" className="text-sm">매월 15일</SelectItem>
                        <SelectItem value="25" className="text-sm">매월 25일</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Offering details summary block */}
                <div 
                  className="rounded-2xl p-5 border"
                  style={{ background: ft.primaryBg, borderColor: ft.primaryBgStrong }}
                >
                  <div className="flex items-center gap-2 mb-4 border-b pb-3" style={{ borderColor: ft.primaryBgStrong }}>
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white" 
                      style={{ background: ft.primary }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24">
                        <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </div>
                    <span className="text-sm font-extrabold" style={{ color: ft.primaryDark }}>
                      봉헌 신청 정보 확인
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      [`${currentTenant.terminology.donation} 종류`, selectedItem.name],
                      ['금액', `${fmt(amount)}원`],
                      ['성명', name],
                      ['연락처', phone],
                      ...(isRecurring ? [['결제 주기', `매월 ${recurringDay}일 정기`]] : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">{k}</span>
                        <span className="font-extrabold" style={{ color: ft.primaryDark }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions CTA Button */}
          <div style={{ padding: '0 24px 24px' }}>
            <button
              onClick={step < totalSteps ? handleNext : handleSubmit}
              disabled={step === 1 && selectedItem.amountType === 'flexible' && amount < 1000}
              style={{
                width: '100%', height: 52, borderRadius: 14,
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
                letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'filter 150ms ease, transform 150ms ease',
                color: (step === 1 && selectedItem.amountType === 'flexible' && amount < 1000) ? 'var(--hm-ink-3)' : 'white',
                background: (step === 1 && selectedItem.amountType === 'flexible' && amount < 1000) ? 'var(--hm-paper-2)' : ft.heroGradient,
              }}
              onMouseEnter={e => { if (!(step === 1 && selectedItem.amountType === 'flexible' && amount < 1000)) { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
            >
              {step === 1 && selectedItem.amountType === 'fixed'
                ? '다음 단계'
                : step === 1
                ? (amount >= 1000 ? `${fmt(amount)}원 봉헌하기` : '1,000원 이상 입력해주세요')
                : step < totalSteps ? '다음 단계'
                : '결제 신청하기'}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}

function FPInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--hm-ink-3)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', height: 48, padding: '0 16px', background: 'var(--hm-paper-2)', border: '1px solid oklch(0.14 0.015 260 / 0.10)', borderRadius: 12, outline: 'none', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--hm-ink)', transition: 'border-color 150ms ease', boxSizing: 'border-box' }}
        onFocus={e => (e.target.style.borderColor = 'oklch(0.55 0.12 265)')}
        onBlur={e => (e.target.style.borderColor = 'oklch(0.14 0.015 260 / 0.10)')}
      />
    </div>
  );
}

function RecurringOption({ label, desc, selected, onClick, ft }: {
  id: string; label: string; desc: string;
  selected: boolean; onClick: () => void;
  ft: any;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left border rounded-xl p-5 flex items-center gap-4 cursor-pointer transition-all duration-200"
      style={{
        borderColor: selected ? ft.primary : 'var(--border)',
        color: selected ? '#fff' : 'inherit',
        background: selected ? ft.primary : 'var(--card)',
      }}
    >
      <div 
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          borderColor: selected ? '#fff' : 'rgba(112, 115, 124, 0.4)',
          background: selected ? '#fff' : 'transparent',
        }}
      >
        {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: ft.primary }} />}
      </div>
      <div>
        <h4 className="text-sm font-extrabold tracking-tight">{label}</h4>
        <p 
          className="text-xs mt-0.5 font-medium transition-colors"
          style={{ color: selected ? 'rgba(255,255,255,0.78)' : 'var(--fp-fg-tertiary)' }}
        >
          {desc}
        </p>
      </div>
    </button>
  );
}

