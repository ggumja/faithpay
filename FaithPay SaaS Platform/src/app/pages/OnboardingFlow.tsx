import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif, MotifLarge } from '../components/Motif';
import { Building2, MapPin, Phone, Mail, Palette, Globe } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'religion' | 'basic' | 'branding' | 'complete';

const STEPS: Step[] = ['religion', 'basic', 'branding', 'complete'];
const STEP_LABELS = ['종교 선택', '기본 정보', '브랜딩', '완료'];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('religion');
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    religion: 'protestant' as ReligionId,
    name: '',
    slug: '',
    address: '',
    phone: '',
    email: '',
    primaryColor: '#1976d2',
    description: '',
  });

  const ft = FAITH_THEMES[formData.religion];
  const currentIndex = STEPS.indexOf(step);

  const handleSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('complete');
      toast.success('단체 등록이 완료되었습니다!');
    }, 1500);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fp-bg-subtle)', fontFamily: 'var(--font-ui)' }}>
      {/* Top header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid var(--fp-border-default)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: 'var(--fp-fg-primary)',
            display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l6-6M5 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          돌아가기
        </button>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 12px', borderRadius: 999,
          background: 'var(--fp-bg-muted)',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
          color: 'var(--fp-fg-secondary)',
        }}>FAITHPAY</div>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 64px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28, fontWeight: 800, letterSpacing: '-0.027em', margin: '0 0 8px',
          }}>단체 온보딩</h1>
          <p style={{ fontSize: 14, color: 'var(--fp-fg-secondary)', letterSpacing: '0.019em', margin: 0 }}>
            새로운 종교 단체 공간을 생성합니다
          </p>
        </div>

        {/* Step progress */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 999,
                  background: i <= currentIndex ? ft.heroGradient : 'var(--fp-bg-muted)',
                  color: i <= currentIndex ? '#fff' : 'var(--fp-fg-tertiary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                  transition: 'all 300ms var(--fp-ease-standard)',
                  border: i === currentIndex ? `2px solid ${ft.primary}` : '2px solid transparent',
                  boxShadow: i === currentIndex ? `0 0 0 3px ${ft.primaryBg}` : 'none',
                }}>
                  {i < currentIndex ? (
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                  ) : (i + 1)}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.019em',
                  color: i <= currentIndex ? ft.primary : 'var(--fp-fg-tertiary)',
                }}>{STEP_LABELS[i]}</span>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: 'var(--fp-bg-muted)', borderRadius: 999, marginTop: 8, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: `${(currentIndex / (STEPS.length - 1)) * 100}%`,
              background: ft.heroGradient,
              borderRadius: 999,
              transition: 'width 300ms var(--fp-ease-standard)',
            }} />
          </div>
        </div>

        {/* Step content */}
        <div style={{ animation: 'fp-slide-up 200ms var(--fp-ease-standard)' }}>
          {/* ── 종교 선택 ── */}
          {step === 'religion' && (
            <div>
              <div style={{
                background: '#fff', border: '1px solid var(--fp-border-strong)',
                borderRadius: 20, padding: '28px 24px',
              }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.024em', margin: '0 0 8px' }}>종교 유형 선택</h2>
                <p style={{ fontSize: 14, color: 'var(--fp-fg-secondary)', letterSpacing: '0.019em', margin: '0 0 24px', lineHeight: 1.6 }}>
                  단체에 해당하는 종교 유형을 선택해 주세요.<br />서비스 용어와 테마가 자동 구성됩니다.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(['protestant', 'buddhist', 'catholic'] as ReligionId[]).map((id) => {
                    const t = FAITH_THEMES[id];
                    const isSelected = formData.religion === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setFormData({ ...formData, religion: id })}
                        style={{
                          width: '100%', textAlign: 'left',
                          background: isSelected ? t.primary : '#fff',
                          color: isSelected ? '#fff' : 'var(--fp-fg-primary)',
                          border: `1.5px solid ${isSelected ? t.primary : 'var(--fp-border-strong)'}`,
                          borderRadius: 16, padding: '20px 20px',
                          display: 'flex', alignItems: 'center', gap: 14,
                          cursor: 'pointer',
                          transition: 'all 200ms var(--fp-ease-standard)',
                          position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-ui)',
                        }}
                      >
                        <div style={{ position: 'absolute', right: -15, top: -15, width: 100, height: 100, opacity: isSelected ? 0.16 : 0.06, color: isSelected ? '#fff' : t.primary }}>
                          <MotifLarge kind={t.motif} color="currentColor" opacity={1} />
                        </div>
                        <div style={{
                          width: 52, height: 52, borderRadius: 14,
                          background: isSelected ? 'rgba(255,255,255,0.18)' : t.primaryBg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Motif kind={t.motif} size={26} color={isSelected ? '#fff' : t.primary} />
                        </div>
                        <div style={{ flex: 1, zIndex: 1 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.018em' }}>{t.name}</div>
                          <div style={{
                            fontSize: 13, marginTop: 3, letterSpacing: '0.019em',
                            color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--fp-fg-tertiary)',
                          }}>{t.tagline}</div>
                        </div>
                        <div style={{
                          width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                          border: `2px solid ${isSelected ? '#fff' : 'var(--fp-border-bold)'}`,
                          background: isSelected ? '#fff' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSelected && <div style={{ width: 10, height: 10, borderRadius: 999, background: t.primary }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setStep('basic')}
                  style={primaryBtnStyle(ft.heroGradient)}
                >
                  다음 단계
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── 기본 정보 ── */}
          {step === 'basic' && (
            <div style={{ background: '#fff', border: '1px solid var(--fp-border-strong)', borderRadius: 20, padding: '28px 24px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.024em', margin: '0 0 8px' }}>기본 정보 입력</h2>
              <p style={{ fontSize: 14, color: 'var(--fp-fg-secondary)', letterSpacing: '0.019em', margin: '0 0 24px' }}>
                단체의 공식 정보와 접속 주소를 설정해 주세요
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <Label htmlFor="name" className="text-sm font-bold">단체 명칭</Label>
                  <div style={{ position: 'relative', marginTop: 6 }}>
                    <Building2 size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fp-fg-tertiary)' }} />
                    <Input id="name" placeholder={`예: ${ft.placeNoun}`} className="pl-10 h-12"
                      value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="slug" className="text-sm font-bold">단축 주소 (URL)</Label>
                  <div style={{ position: 'relative', marginTop: 6, display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: 12, fontSize: 13, color: 'var(--fp-fg-tertiary)', zIndex: 1 }}>faithpay.info/</div>
                    <Input id="slug" placeholder="my-church" className="h-12" style={{ paddingLeft: 104 }}
                      value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address" className="text-sm font-bold">주소</Label>
                  <div style={{ position: 'relative', marginTop: 6 }}>
                    <MapPin size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fp-fg-tertiary)' }} />
                    <Input id="address" placeholder="공식 주소를 입력하세요" className="pl-10 h-12"
                      value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <Label htmlFor="phone" className="text-sm font-bold">연락처</Label>
                    <div style={{ position: 'relative', marginTop: 6 }}>
                      <Phone size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fp-fg-tertiary)' }} />
                      <Input id="phone" placeholder="02-0000-0000" className="pl-10 h-12"
                        value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-bold">이메일</Label>
                    <div style={{ position: 'relative', marginTop: 6 }}>
                      <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fp-fg-tertiary)' }} />
                      <Input id="email" type="email" placeholder="admin@example.com" className="pl-10 h-12"
                        value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                <button onClick={() => setStep('religion')} style={ghostBtnStyle}>이전으로</button>
                <button onClick={() => setStep('branding')} style={{ ...primaryBtnStyle(ft.heroGradient), flex: 2 }}>
                  브랜딩 설정
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── 브랜딩 ── */}
          {step === 'branding' && (
            <div style={{ background: '#fff', border: '1px solid var(--fp-border-strong)', borderRadius: 20, padding: '28px 24px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.024em', margin: '0 0 8px' }}>브랜딩 및 소개</h2>
              <p style={{ fontSize: 14, color: 'var(--fp-fg-secondary)', letterSpacing: '0.019em', margin: '0 0 24px' }}>
                단체의 개성을 나타내는 색상과 소개를 설정하세요
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Palette size={16} color="var(--fp-fg-secondary)" />
                    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.014em' }}>대표 테마 색상</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {['#3D47B8', '#C16314', '#345785', '#2e7d32', '#c62828', '#37474f'].map((color) => (
                      <div
                        key={color}
                        onClick={() => setFormData({ ...formData, primaryColor: color })}
                        style={{
                          width: 44, height: 44, borderRadius: 999, cursor: 'pointer',
                          background: color,
                          border: formData.primaryColor === color ? `3px solid ${ft.primary}` : '3px solid transparent',
                          boxShadow: formData.primaryColor === color ? `0 0 0 2px #fff, 0 0 0 4px ${ft.primary}` : 'none',
                          transform: formData.primaryColor === color ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 160ms var(--fp-ease-standard)',
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      style={{ width: 44, height: 44, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, background: 'transparent' }}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-bold">단체 소개</Label>
                  <Textarea
                    id="description" className="mt-2" rows={3}
                    placeholder="단체를 소개하는 문구를 짧게 작성해 주세요"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div style={{
                  padding: '24px', borderRadius: 14,
                  border: '1.5px dashed var(--fp-border-bold)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  color: 'var(--fp-fg-tertiary)', cursor: 'pointer',
                }}>
                  <Globe size={36} style={{ opacity: 0.4 }} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>로고 및 대표 이미지 업로드 (준비 중)</div>
                  <div style={{ fontSize: 12 }}>드래그하거나 클릭하여 이미지를 추가하세요</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                <button onClick={() => setStep('basic')} style={ghostBtnStyle}>이전으로</button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  style={{ ...primaryBtnStyle(ft.heroGradient), flex: 2, opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? '생성 중...' : (
                    <>
                      공간 생성 완료
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── 완료 ── */}
          {step === 'complete' && (
            <div style={{
              background: '#fff', border: '1px solid var(--fp-border-strong)',
              borderRadius: 20, padding: '48px 28px', textAlign: 'center',
              animation: 'fp-slide-up 300ms var(--fp-ease-standard)',
            }}>
              <div style={{
                width: 88, height: 88, borderRadius: 24,
                background: ft.heroGradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'fp-ring-in 560ms var(--fp-ease-standard)',
              }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26, fontWeight: 800, letterSpacing: '-0.027em', margin: '0 0 10px',
              }}>
                새로운 모바일 헌금함이<br />생성되었습니다!
              </h2>
              <p style={{ fontSize: 14, color: 'var(--fp-fg-secondary)', letterSpacing: '0.019em', margin: '0 0 28px', lineHeight: 1.6 }}>
                이제 아래 주소로 신도들로부터 온라인 봉헌을 받으실 수 있습니다
              </p>

              <div style={{
                background: ft.primaryBg, border: `1px solid ${ft.primaryBgStrong}`,
                borderRadius: 14, padding: '20px',
                marginBottom: 28,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: ft.primaryDark, opacity: 0.75, marginBottom: 8 }}>
                  봉헌 페이지 주소
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800,
                  color: ft.primary, letterSpacing: '-0.018em', wordBreak: 'break-all',
                  marginBottom: 12,
                }}>
                  faithpay.info/{formData.slug || 'church-name'}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`faithpay.info/${formData.slug || 'church-name'}`);
                    toast.success('주소가 복사되었습니다');
                  }}
                  style={{
                    height: 36, padding: '0 16px', borderRadius: 999,
                    border: `1px solid ${ft.primaryBgStrong}`, background: '#fff',
                    color: ft.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  }}
                >URL 복사하기</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => navigate(`/${formData.slug || 'church-name'}/admin`)}
                  style={primaryBtnStyle(ft.heroGradient)}
                >
                  관리자 대시보드로 이동하기
                </button>
                <button
                  onClick={() => navigate('/')}
                  style={ghostBtnStyle}
                >메인 페이지로</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ghostBtnStyle: React.CSSProperties = {
  flex: 1, height: 52, borderRadius: 14,
  border: '1.5px solid var(--fp-border-strong)', background: '#fff',
  color: 'var(--fp-fg-primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  fontFamily: 'var(--font-ui)',
};

function primaryBtnStyle(gradient: string): React.CSSProperties {
  return {
    flex: 1, width: '100%', height: 52, borderRadius: 14,
    border: 0, background: gradient, color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-ui)', marginTop: 0,
  };
}
