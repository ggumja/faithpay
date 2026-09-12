import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { partnerAPI } from '../../api/client';
import { navigateToRootPortal } from '../../utils/domainUtils';

export default function PartnerApply() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState<{ name: string; roleLabel: string } | null>(null);

  // 추천인 코드 ?ref= 지원
  const refParam = searchParams.get('ref') ?? '';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [memo, setMemo] = useState('');
  const [referrerCode] = useState(refParam);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) {
      toast.error('성함, 연락처, 이메일은 필수 입력 항목입니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await partnerAPI.apply({
        role: 'sales_agent',
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        region: region.trim() || undefined,
        memo: memo.trim() || undefined,
        referrerCode: referrerCode.trim() || undefined,
      });

      if (res.success) {
        const roleLabel = '영업 파트너 (영업자/프리랜서)';
        setSubmittedInfo({ name: name.trim(), roleLabel });
        setIsSubmitted(true);
        toast.success('영업 파트너 제휴 신청이 정상적으로 접수되었습니다.\n담당자가 심사 후 24시간 이내에 안내 드립니다.');
      } else {
        toast.error(res.error || '제휴 신청 처리 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      toast.error(err?.message || '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#191F28] flex flex-col justify-between font-sans selection:bg-[#EFF6FF] selection:text-[#2563EB] antialiased">
      
      {/* ── 1. Top Navigation Bar (Consistent with Homepage) ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5E8EB]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateToRootPortal('/', navigate);
            }}
            className="flex items-center text-decoration-none cursor-pointer"
          >
            <img
              src="/images/logo_soulpay.png"
              alt="SoulPay"
              style={{ height: 32, width: 'auto', objectFit: 'contain' }}
            />
          </a>
          
          {/* Action Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigateToRootPortal('/', navigate)}
              className="text-xs sm:text-sm font-medium text-[#4E5968] hover:text-[#191F28] px-3 py-1.5 rounded-lg hover:bg-[#F2F4F6] transition-colors cursor-pointer"
            >
              홈으로
            </button>
            <button
              onClick={() => navigate('/partner/login')}
              className="text-xs sm:text-sm font-medium text-[#4E5968] hover:text-[#191F28] px-3 py-1.5 rounded-lg hover:bg-[#F2F4F6] transition-colors cursor-pointer"
            >
              영업자 로그인
            </button>
            <button
              onClick={() => navigateToRootPortal('/onboarding', navigate)}
              className="h-9 px-3.5 sm:px-4 bg-[#191F28] hover:bg-[#333D4B] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              서비스 신청
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Main Content Grid ── */}
      <main className="max-w-6xl mx-auto w-full px-5 sm:px-8 py-10 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start flex-1">
        
        {/* ── Left Column: Value Proposition & Key Advantages ── */}
        <div className="lg:col-span-6 space-y-8">
          
          {/* Section Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] border border-[#DBEAFE] text-[#1D4ED8]">
              영업 파트너 제휴 모집 (영업자 · 프리랜서)
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#191F28] leading-[1.25] tracking-tight">
              전국 사찰 · 교회 · 공익재단과 함께 성장하는 <br />
              <span className="text-[#2563EB]">
                지속 가능한 수수료 파트너십
              </span>
            </h1>

            <p className="text-[#4E5968] text-sm sm:text-base leading-relaxed font-normal">
              SoulPay는 종교 및 비영리 공익 단체를 위한 맞춤형 수납 솔루션입니다.
              단체를 유치하고 매월 안정적으로 발생하는 수납 수수료를 정기적으로 정산받으세요.
            </p>
          </div>

          {/* Advantages 2x2 Grid (Hallmark Minimal Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            <div className="p-5 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl space-y-2 hover:border-[#D1D6DB] transition-colors">
              <div className="text-xs font-bold text-[#2563EB] tracking-wide">
                수수료 정산
              </div>
              <h3 className="font-bold text-[#191F28] text-sm">
                업계 최고 수준의 정산 수익
              </h3>
              <p className="text-xs text-[#6B7684] leading-relaxed">
                매월 납부되는 헌금 및 기부금 수납액에 대해 파트너 정산금이 매달 지속 지급됩니다.
              </p>
            </div>

            <div className="p-5 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl space-y-2 hover:border-[#D1D6DB] transition-colors">
              <div className="text-xs font-bold text-[#2563EB] tracking-wide">
                현장 개설
              </div>
              <h3 className="font-bold text-[#191F28] text-sm">
                1초 현장 개설 시스템
              </h3>
              <p className="text-xs text-[#6B7684] leading-relaxed">
                영업자가 현장에서 주지스님, 담임목사님을 대신하여 단체 계정을 즉시 간편 개설합니다.
              </p>
            </div>

            <div className="p-5 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl space-y-2 hover:border-[#D1D6DB] transition-colors">
              <div className="text-xs font-bold text-[#2563EB] tracking-wide">
                투명한 로그
              </div>
              <h3 className="font-bold text-[#191F28] text-sm">
                실시간 파트너 대시보드
              </h3>
              <p className="text-xs text-[#6B7684] leading-relaxed">
                실시간 수수료 발생 현황과 월별 정산 내역을 파트너 전용 콘솔에서 투명하게 확인합니다.
              </p>
            </div>

            <div className="p-5 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl space-y-2 hover:border-[#D1D6DB] transition-colors">
              <div className="text-xs font-bold text-[#2563EB] tracking-wide">
                영업 지원
              </div>
              <h3 className="font-bold text-[#191F28] text-sm">
                체계적인 본사 자료 지원
              </h3>
              <p className="text-xs text-[#6B7684] leading-relaxed">
                가맹점 유치를 위한 표준 제안서, 브로슈어 및 단체별 맞춤 설정 도구를 지원합니다.
              </p>
            </div>
          </div>

          {/* Already have an account */}
          <div className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-[#191F28]">
                이미 파트너 계정이 있으신가요?
              </h4>
              <p className="text-xs text-[#6B7684]">
                파트너 전용 관리자 포털에서 대시보드 및 정산 내역을 확인하세요.
              </p>
            </div>
            <button 
              onClick={() => navigate('/partner/login')}
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>로그인</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>

        {/* ── Right Column: Application Form Card ── */}
        <div className="lg:col-span-6 w-full">
          <Card className="bg-white border border-[#E5E8EB] rounded-2xl shadow-none overflow-hidden">
            
            {/* Form Header */}
            <CardHeader className="border-b border-[#F2F4F6] p-6 sm:p-7 bg-[#FAFAFB]">
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-[#191F28]">
                  영업 파트너 제휴 신청서
                </CardTitle>
                <CardDescription className="text-[#6B7684] text-xs font-medium mt-1">
                  신청서 접수 ➔ 본사 심사 ➔ 파트너 계정 발급 (24시간 이내 연락)
                </CardDescription>
              </div>

              {/* Referrer Code Badge */}
              {referrerCode && (
                <div className="mt-3 flex items-center gap-2 text-xs bg-[#EFF6FF] border border-[#DBEAFE] text-[#1D4ED8] px-3 py-1.5 rounded-lg font-medium">
                  <span>추천 파트너 코드:</span>
                  <span className="font-mono font-bold">{referrerCode}</span>
                </div>
              )}
            </CardHeader>

            {isSubmitted && submittedInfo ? (
              <CardContent className="p-8 sm:p-10 text-center space-y-6">
                <div className="mx-auto w-14 h-14 bg-[#EFF6FF] text-[#2563EB] rounded-2xl flex items-center justify-center">
                  <Check className="h-7 w-7" strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-[#191F28]">
                    {submittedInfo.name}님의 신청이 접수되었습니다
                  </h3>
                  <p className="text-sm text-[#4E5968] leading-relaxed">
                    선택 구분: <strong className="text-[#191F28]">{submittedInfo.roleLabel}</strong><br />
                    본사 담당자가 내용을 확인한 후<br className="hidden sm:inline" />
                    24시간 이내에 등록하신 연락처 또는 이메일로 안내 드립니다.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                  <Button
                    onClick={() => navigate('/')}
                    className="h-11 px-5 rounded-lg font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
                  >
                    SoulPay 메인으로 이동
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSubmitted(false);
                      setName('');
                      setPhone('');
                      setEmail('');
                      setRegion('');
                      setMemo('');
                    }}
                    className="h-11 px-5 rounded-lg font-semibold border-[#D1D6DB] text-[#4E5968] hover:bg-[#F9FAFB] cursor-pointer"
                  >
                    추가 신청서 작성
                  </Button>
                </div>
              </CardContent>
            ) : (
              <form onSubmit={handleSubmit}>
                <CardContent className="p-6 sm:p-7 space-y-5">
                  {/* Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#333D4B]">성함 / 상호명 *</Label>
                      <Input 
                        placeholder="홍길동 / (주)파트너스" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-11 bg-[#F9FAFB] border-[#E5E8EB] text-[#191F28] placeholder:text-[#8B95A1] focus:bg-white focus:border-[#2563EB] rounded-lg font-normal text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#333D4B]">연락처 *</Label>
                      <Input 
                        placeholder="010-1234-5678" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="h-11 bg-[#F9FAFB] border-[#E5E8EB] text-[#191F28] placeholder:text-[#8B95A1] focus:bg-white focus:border-[#2563EB] rounded-lg font-normal text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#333D4B]">이메일 *</Label>
                      <Input 
                        type="email"
                        placeholder="partner@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 bg-[#F9FAFB] border-[#E5E8EB] text-[#191F28] placeholder:text-[#8B95A1] focus:bg-white focus:border-[#2563EB] rounded-lg font-normal text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#333D4B]">주요 영업 지역</Label>
                      <Input 
                        placeholder="예: 서울 강남구 / 경기 성남시" 
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="h-11 bg-[#F9FAFB] border-[#E5E8EB] text-[#191F28] placeholder:text-[#8B95A1] focus:bg-white focus:border-[#2563EB] rounded-lg font-normal text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#333D4B]">보유 네트워크 및 관련 경험 (선택)</Label>
                    <Textarea
                      placeholder="예: 경기 지역 사찰 10여 곳 네트워크 보유, 교구 연동 경험 보유 등"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      rows={3}
                      className="bg-[#F9FAFB] border-[#E5E8EB] text-[#191F28] placeholder:text-[#8B95A1] focus:bg-white focus:border-[#2563EB] rounded-lg text-xs leading-relaxed"
                    />
                  </div>

                </CardContent>

                {/* Submit Footer */}
                <CardFooter className="bg-[#FAFAFB] p-6 sm:p-7 border-t border-[#F2F4F6]">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full font-semibold h-12 text-sm rounded-lg cursor-pointer transition-colors text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>접수 처리 중...</span>
                      </div>
                    ) : (
                      '영업 파트너 제휴 신청하기'
                    )}
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>
        </div>

      </main>

      {/* ── 3. Minimal Footer ── */}
      <footer className="border-t border-[#E5E8EB] py-8 text-center text-xs text-[#8B95A1] bg-[#FFFFFF]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo_soulpay.png"
              alt="SoulPay"
              style={{ height: 22, width: 'auto', objectFit: 'contain' }}
            />
            <span className="text-[#6B7684]">| 제휴 문의: partner@soulpay.kr</span>
          </div>
          <div>
            © 2026 SoulPay Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

