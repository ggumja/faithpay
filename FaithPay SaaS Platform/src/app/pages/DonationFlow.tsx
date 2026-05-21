import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { useApp, DonationItem } from '../context/AppContext';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif, MotifLarge } from '../components/Motif';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
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
    <div style={{ minHeight: '100vh', background: 'var(--fp-bg-subtle)', fontFamily: 'var(--font-ui)' }}>
      {/* Hero header */}
      <div style={{
        background: ft.heroGradient,
        padding: '0 20px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Large motif background */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 160, height: 160, opacity: 0.12, color: '#fff' }}>
          <MotifLarge kind={ft.motif} color="#fff" opacity={1} />
        </div>

        {/* App bar */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <button
            onClick={handleBack}
            style={{
              width: 44, height: 44, border: 0, background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="11" height="20" viewBox="0 0 11 20" fill="none">
              <path d="M10 1L1 10l9 9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{
            flex: 1, textAlign: 'center',
            fontSize: 17, fontWeight: 700, letterSpacing: '-0.014em', color: '#fff',
          }}>{selectedItem.name}</div>
          <div style={{ width: 44 }} />
        </div>

        {/* Step indicator */}
        <div style={{ padding: '0 4px 24px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 999,
                background: i < step ? '#fff' : 'rgba(255,255,255,0.25)',
                transition: 'background 300ms var(--fp-ease-standard)',
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.031em', fontWeight: 700 }}>
            {step} / {totalSteps} 단계
          </div>
        </div>
      </div>

      {/* Step content */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 40px' }}>
        <div style={{
          background: '#fff',
          border: '1px solid var(--fp-border-strong)',
          borderRadius: 20,
          overflow: 'hidden',
          animation: 'fp-slide-up 200ms var(--fp-ease-standard)',
        }}>
          {/* Type badge */}
          <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 999,
              background: ft.primaryBg, color: ft.primary,
              fontSize: 12, fontWeight: 700, letterSpacing: '0.019em',
            }}>
              <Motif kind={ft.motif} size={12} color={ft.primary} />
              {selectedItem.name}
            </div>
          </div>

          <div style={{ padding: '16px 20px 24px' }}>
            {/* ── Step 1: 금액 입력 ── */}
            {step === 1 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.024em', margin: '0 0 6px' }}>
                  얼마를 봉헌하시겠어요?
                </h2>
                <p style={{ fontSize: 13, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em', margin: '0 0 20px' }}>
                  {selectedItem.description}
                </p>

                {selectedItem.amountType === 'fixed' && selectedItem.fixedAmount ? (
                  <div style={{
                    background: ft.heroGradientSoft,
                    border: `1px solid ${ft.primaryBgStrong}`,
                    borderRadius: 16, padding: '28px 20px',
                    textAlign: 'center' as const,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ft.primaryDark, opacity: 0.75, marginBottom: 8, letterSpacing: '0.019em' }}>
                      고정 봉헌 금액
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, letterSpacing: '-0.027em', color: ft.primaryDark }}>
                      {fmt(selectedItem.fixedAmount)}<span style={{ fontSize: 20, fontWeight: 700, marginLeft: 4 }}>원</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Amount display */}
                    <div style={{
                      background: ft.heroGradientSoft,
                      border: `1px solid ${ft.primaryBgStrong}`,
                      borderRadius: 16, padding: '24px 20px',
                      marginBottom: 18,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: ft.primaryDark, opacity: 0.7, marginBottom: 8, letterSpacing: '0.019em' }}>봉헌 금액</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: ft.primaryDark }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, letterSpacing: '-0.027em' }}>
                          {amount > 0 ? fmt(amount) : '0'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, opacity: 0.7 }}>원</span>
                      </div>
                      {amount >= 10000 && (
                        <div style={{ fontSize: 12, color: ft.primaryDark, opacity: 0.65, marginTop: 6, letterSpacing: '0.019em' }}>
                          일금 {Math.floor(amount / 10000)}만{amount % 10000 ? ` ${fmt(amount % 10000)}` : ''}원정
                        </div>
                      )}
                    </div>

                    {/* Quick chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 18 }}>
                      {chips.map((c) => (
                        <button
                          key={c}
                          onClick={() => setAmount((amount || 0) + c)}
                          style={{
                            height: 40, padding: '0 14px', borderRadius: 999,
                            background: '#fff', color: 'var(--fp-fg-primary)',
                            border: '1px solid var(--fp-border-strong)',
                            fontSize: 13, fontWeight: 600, letterSpacing: '0.019em',
                            cursor: 'pointer', fontFamily: 'var(--font-ui)',
                            whiteSpace: 'nowrap',
                          }}
                        >+ {fmt(c)}원</button>
                      ))}
                      <button
                        onClick={() => setAmount(0)}
                        style={{
                          height: 40, padding: '0 14px', borderRadius: 999,
                          border: '1px solid var(--fp-border-strong)', background: '#fff',
                          color: 'var(--fp-fg-secondary)', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', letterSpacing: '0.019em', fontFamily: 'var(--font-ui)',
                        }}
                      >↺ 초기화</button>
                    </div>

                    {/* Direct input */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fp-fg-secondary)', marginBottom: 6, letterSpacing: '-0.014em' }}>직접 입력</div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        height: 52, padding: '0 16px',
                        background: 'var(--fp-bg-muted)', borderRadius: 12,
                        border: '1px solid transparent',
                      }}>
                        <input
                          type="number"
                          value={amount || ''}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          placeholder="금액을 입력하세요"
                          style={{
                            flex: 1, border: 0, background: 'transparent', outline: 'none',
                            fontSize: 16, fontWeight: 600, letterSpacing: '0.006em',
                            color: 'var(--fp-fg-primary)', fontFamily: 'var(--font-ui)',
                          }}
                        />
                        <span style={{ color: 'var(--fp-fg-tertiary)', fontSize: 14, fontWeight: 600 }}>원</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Step 2: 신원 정보 ── */}
            {step === 2 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.024em', margin: '0 0 6px' }}>
                  신원 정보를 입력해주세요
                </h2>
                <p style={{ fontSize: 13, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em', margin: '0 0 20px' }}>
                  영수증 발급을 위해 필요합니다
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FPInput label="성명 *" value={name} onChange={setName} placeholder="홍길동" />
                  <FPInput label="전화번호 *" value={phone} onChange={setPhone} placeholder="010-1234-5678" type="tel" />

                  {currentTenant.religionType === 'catholic' && (
                    <FPInput label="세례명" value={baptismName} onChange={setBaptismName} placeholder="프란치스코" />
                  )}

                  {currentTenant.religionType === 'buddhist' && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fp-fg-secondary)', marginBottom: 8, letterSpacing: '-0.014em' }}>
                        가족 정보 <span style={{ fontWeight: 500, color: 'var(--fp-fg-tertiary)' }}>(선택)</span>
                      </div>
                      {familyMembers.map((member, i) => (
                        <div key={i} style={{ background: ft.primaryBg, borderRadius: 12, padding: '14px', marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: ft.primaryDark }}>가족 {i + 1}</span>
                            <button onClick={() => removeFamilyMember(i)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--fp-fg-tertiary)' }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input placeholder="이름" value={member.name} onChange={(e) => updateFamilyMember(i, 'name', e.target.value)}
                              style={inputStyle} />
                            <input placeholder="생년월일 (예: 1990-01-01)" value={member.birthDate} onChange={(e) => updateFamilyMember(i, 'birthDate', e.target.value)}
                              style={inputStyle} />
                            <Select value={member.calendar} onValueChange={(v) => updateFamilyMember(i, 'calendar', v)}>
                              <SelectTrigger style={{ height: 44 }}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="solar">양력</SelectItem>
                                <SelectItem value="lunar">음력</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={addFamilyMember}
                        style={{
                          width: '100%', height: 44, borderRadius: 12,
                          border: `1.5px dashed ${ft.primaryBgStrong}`,
                          background: 'transparent', color: ft.primary,
                          fontSize: 14, fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        <Plus size={16} /> 가족 추가
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: 기도/메모 ── */}
            {step === 3 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.024em', margin: '0 0 6px' }}>
                  {currentTenant.terminology.prayer}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em', margin: '0 0 20px' }}>
                  {selectedItem.enablePrayerField ? '관리자가 확인하고 인쇄할 수 있습니다' : '선택사항입니다'}
                </p>
                <textarea
                  value={prayerText}
                  onChange={(e) => setPrayerText(e.target.value)}
                  placeholder={prayerPlaceholder}
                  rows={6}
                  style={{
                    ...inputStyle,
                    resize: 'vertical' as const,
                    lineHeight: 1.6, paddingTop: 12, paddingBottom: 12,
                  }}
                />
              </div>
            )}

            {/* ── Step 4: 결제 방식 ── */}
            {step === 4 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.024em', margin: '0 0 6px' }}>
                  결제 방식을 선택해주세요
                </h2>
                <p style={{ fontSize: 13, color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em', margin: '0 0 20px' }}>
                  정기 설정 시 매월 자동으로 봉헌됩니다
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {selectedItem.allowOneTime && (
                    <RecurringOption
                      id="onetime" label={`단발 ${currentTenant.terminology.donation}`}
                      desc={`한 번만 ${currentTenant.terminology.donation}합니다`}
                      selected={!isRecurring} onClick={() => setIsRecurring(false)}
                      ft={ft}
                    />
                  )}
                  {selectedItem.allowRecurring && (
                    <RecurringOption
                      id="recurring" label={`정기 ${currentTenant.terminology.donation}`}
                      desc="매월 자동으로 봉헌합니다"
                      selected={isRecurring} onClick={() => setIsRecurring(true)}
                      ft={ft}
                    />
                  )}
                </div>

                {isRecurring && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fp-fg-secondary)', marginBottom: 8 }}>결제일 선택</div>
                    <Select value={recurringDay.toString()} onValueChange={(v) => setRecurringDay(Number(v))}>
                      <SelectTrigger style={{ height: 52 }}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">매월 5일</SelectItem>
                        <SelectItem value="15">매월 15일</SelectItem>
                        <SelectItem value="25">매월 25일</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Summary */}
                <div style={{
                  background: ft.primaryBg,
                  border: `1px solid ${ft.primaryBgStrong}`,
                  borderRadius: 12, padding: '16px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 999, background: ft.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ft.primaryDark }}>최종 확인</span>
                  </div>
                  {[
                    [`${currentTenant.terminology.donation} 항목`, selectedItem.name],
                    ['금액', `${fmt(amount)}원`],
                    ['성명', name],
                    ['전화번호', phone],
                    ...(isRecurring ? [['결제', `매월 ${recurringDay}일 정기`]] : []),
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                      <span style={{ color: 'var(--fp-fg-tertiary)', letterSpacing: '0.019em' }}>{k}</span>
                      <span style={{ fontWeight: 700, letterSpacing: '-0.014em', color: ft.primaryDark }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div style={{ padding: '0 20px 24px' }}>
            <button
              onClick={step < totalSteps ? handleNext : handleSubmit}
              disabled={step === 1 && selectedItem.amountType === 'flexible' && amount < 1000}
              style={{
                width: '100%', height: 56, borderRadius: 14,
                background: (step === 1 && selectedItem.amountType === 'flexible' && amount < 1000) ? '#e8e8ea' : ft.heroGradient,
                color: (step === 1 && selectedItem.amountType === 'flexible' && amount < 1000) ? 'rgba(55,56,60,0.28)' : '#fff',
                border: 0, fontSize: 16, fontWeight: 700, letterSpacing: '0.006em',
                cursor: (step === 1 && selectedItem.amountType === 'flexible' && amount < 1000) ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-ui)',
                transition: 'all 120ms var(--fp-ease-standard)',
              }}
            >
              {step === 1 && selectedItem.amountType === 'fixed'
                ? '다음 단계'
                : step === 1
                ? (amount >= 1000 ? `${fmt(amount)}원 봉헌하기` : '1,000원 이상 입력해주세요')
                : step < totalSteps ? '다음 단계'
                : '결제하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 52, padding: '0 16px',
  background: 'var(--fp-bg-muted)', borderRadius: 12,
  border: '1px solid transparent', outline: 'none',
  fontSize: 15, fontWeight: 600, letterSpacing: '0.006em',
  color: 'var(--fp-fg-primary)', fontFamily: 'var(--font-ui)',
  boxSizing: 'border-box',
};

function FPInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fp-fg-secondary)', marginBottom: 6, letterSpacing: '-0.014em' }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
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
      style={{
        width: '100%', textAlign: 'left',
        background: selected ? ft.primary : '#fff',
        border: `1.5px solid ${selected ? ft.primary : 'var(--fp-border-strong)'}`,
        borderRadius: 14, padding: '16px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', fontFamily: 'var(--font-ui)',
        transition: 'all 160ms var(--fp-ease-standard)',
        color: selected ? '#fff' : 'var(--fp-fg-primary)',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 999, flexShrink: 0,
        border: `2px solid ${selected ? '#fff' : 'var(--fp-border-bold)'}`,
        background: selected ? '#fff' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <div style={{ width: 10, height: 10, borderRadius: 999, background: ft.primary }} />}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.014em' }}>{label}</div>
        <div style={{ fontSize: 13, marginTop: 2, color: selected ? 'rgba(255,255,255,0.78)' : 'var(--fp-fg-tertiary)', letterSpacing: '0.019em' }}>{desc}</div>
      </div>
    </button>
  );
}
