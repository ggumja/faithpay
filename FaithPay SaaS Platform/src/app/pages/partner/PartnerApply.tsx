import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Briefcase,
  TrendingUp,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Award,
  Zap,
  PhoneCall,
  Users,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerApply() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // URL ?type=agency|agent, ?ref=코드 지원
  const typeParam = searchParams.get('type');
  const refParam = searchParams.get('ref') ?? '';

  const [role, setRole] = useState<'master_agency' | 'sales_agent'>(
    typeParam === 'agency' ? 'master_agency' : 'sales_agent'
  );

  // type 파라미터가 바뀌면 역할 동기화
  useEffect(() => {
    if (typeParam === 'agency') setRole('master_agency');
    else if (typeParam === 'agent') setRole('sales_agent');
  }, [typeParam]);

  const isAgencyMode = role === 'master_agency';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [memo, setMemo] = useState('');
  const [referrerCode] = useState(refParam);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email) {
      toast.error('필수 정보를 모두 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const roleLabel = isAgencyMode ? '영업 대리점' : '영업자';
      toast.success(`${roleLabel} 제휴 신청이 정상적으로 접수되었습니다!\n담당자가 24시간 이내에 연락 드립니다.`);
      navigate('/');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#191F28] flex flex-col justify-between font-sans selection:bg-[#E8F3FF] selection:text-[#3182F6]">
      
      {/* ── Top Header (Clean Toss Style Sticky Header) ── */}
      <header className="border-b border-[#E5E8EB] bg-white/90 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-1.5 text-sm font-bold text-[#4E5968] hover:text-[#191F28] cursor-pointer transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>SoulPay 메인으로</span>
          </button>
          
          <div className="flex items-center gap-2">
            {isAgencyMode ? (
              <Badge className="bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] font-bold px-3 py-1 text-xs rounded-full shadow-2xs">
                대리점 전용 신청
              </Badge>
            ) : (
              <Badge className="bg-[#E8F3FF] text-[#1B64DA] border border-[#BFDBFE] font-bold px-3 py-1 text-xs rounded-full shadow-2xs">
                영업자 전용 신청
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Body ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        
        {/* ── Left Column: Value Proposition & Key Advantages ── */}
        <div className="lg:col-span-6 space-y-8">
          
          {/* Header Title Section */}
          <div className="space-y-4">
            <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide px-3.5 py-1.5 rounded-full border shadow-2xs ${
              isAgencyMode
                ? 'text-[#7E22CE] bg-[#F3E8FF] border-[#E9D5FF]'
                : 'text-[#3182F6] bg-[#E8F3FF] border-[#BFDBFE]'
            }`}>
              <Sparkles className="h-3.5 w-3.5" />
              {isAgencyMode ? '영업 대리점 (Tier-1) 모집' : '영업자 & 프리랜서 모집'}
            </span>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#191F28] leading-[1.25] tracking-tight">
              {isAgencyMode ? (
                <>
                  소속 영업자 네트워크 구성과 함께 <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7E22CE] via-[#9333EA] to-[#3182F6]">
                    오버라이딩 다계층 수수료 수익
                  </span>을 창출하세요.
                </>  
              ) : (
                <>
                  전국 사찰 · 교회 · 재단 디지털 전환과 <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3182F6] via-[#2563EB] to-[#6366F1]">
                    지속 가능한 매월 정기 수수료 수익
                  </span>을 창출하세요.
                </>
              )}
            </h1>

            <p className="text-[#4E5968] text-sm sm:text-base leading-relaxed font-medium">
              {isAgencyMode
                ? 'SoulPay 영업 대리점(Tier-1)은 하위 영업자(Tier-2)를 직접 모집·관리하며 오버라이딩 수수료 수익 구조를 갖습니다. 법인 및 전문 팀 단위 신청을 지원합니다.'
                : 'SoulPay는 전국 종교 및 구호 단체를 위한 SaaS 기반 디지털 보시/헌금/후원 수납 플랫폼입니다. 사찰, 교회, 구호재단을 가입 신청 완료하고 매월 수납되는 결제액에 대한 파트너 정산 수수료를 지속 받으실 수 있습니다.'}
            </p>
          </div>

          {/* Key Advantages 2x2 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-5 bg-white border border-[#E5E8EB] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] space-y-2.5 hover:border-[#3182F6]/40 transition-all duration-200">
              <div className="p-2.5 w-fit bg-[#E8F3FF] text-[#3182F6] rounded-xl font-bold">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#191F28] text-sm">업계 최고 다계층 정산 수익</h3>
              <p className="text-xs text-[#6B7684] leading-relaxed font-medium">
                매월 신도 및 후원자가 납부하는 결제액에 대해 파트너 정산금이 매달 지속 지급됩니다.
              </p>
            </div>

            <div className="p-5 bg-white border border-[#E5E8EB] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] space-y-2.5 hover:border-[#3182F6]/40 transition-all duration-200">
              <div className="p-2.5 w-fit bg-[#E8F3FF] text-[#3182F6] rounded-xl font-bold">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#191F28] text-sm">1초 현장 개설 시스템</h3>
              <p className="text-xs text-[#6B7684] leading-relaxed font-medium">
                영업자가 현장에서 주지스님/담임목사님 대신 단체 계정을 즉시 생성해 드릴 수 있습니다.
              </p>
            </div>

            <div className="p-5 bg-white border border-[#E5E8EB] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] space-y-2.5 hover:border-[#3182F6]/40 transition-all duration-200">
              <div className="p-2.5 w-fit bg-[#FEF3C7] text-[#D97706] rounded-xl font-bold">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#191F28] text-sm">투명한 파트너 대시보드</h3>
              <p className="text-xs text-[#6B7684] leading-relaxed font-medium">
                실시간 수수료 발생 로그 및 월별 정산 내역을 파트너 포털에서 투명하게 확인합니다.
              </p>
            </div>

            <div className="p-5 bg-white border border-[#E5E8EB] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] space-y-2.5 hover:border-[#3182F6]/40 transition-all duration-200">
              <div className="p-2.5 w-fit bg-[#F3E8FF] text-[#7E22CE] rounded-xl font-bold">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#191F28] text-sm">대리점 ➔ 영업자 2단계 구조</h3>
              <p className="text-xs text-[#6B7684] leading-relaxed font-medium">
                대리점(Tier-1)은 하위 영업자(Tier-2)를 모집하여 오버라이딩 수수료 수익을 창출합니다.
              </p>
            </div>
          </div>

          {/* Already have an account Banner */}
          <div className="p-5 bg-white border border-[#E5E8EB] rounded-2xl flex items-center justify-between shadow-2xs">
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
              className="text-xs font-bold text-[#3182F6] hover:text-[#1B64DA] flex items-center gap-1 cursor-pointer whitespace-nowrap bg-[#E8F3FF] px-3.5 py-2 rounded-xl transition-colors"
            >
              <span>로그인</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* ── Right Column: Toss Style Application Form Card ── */}
        <div className="lg:col-span-6 w-full">
          <Card className="bg-white border border-[#E5E8EB] rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.06)] overflow-hidden transition-all">
            
            {/* Form Header */}
            <CardHeader className={`border-b border-[#F2F4F6] p-6 sm:p-7 ${
              isAgencyMode ? 'bg-[#FAF5FF]' : 'bg-[#FAFAFB]'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`p-3 text-white rounded-2xl shadow-xs ${
                  isAgencyMode ? 'bg-[#9333EA]' : 'bg-[#3182F6]'
                }`}>
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-[#191F28]">
                    {isAgencyMode ? '영업 대리점 (Tier-1) 신청서' : '영업자 (Tier-2) 신청서'}
                  </CardTitle>
                  <CardDescription className="text-[#6B7684] text-xs font-medium mt-1">
                    {isAgencyMode
                      ? '신청서 제출 ➔ 본사 심사 ➔ 대리점 계정 발급 (24시간 이내 연락)'
                      : '신청서 제출 ➔ 본사 승인 검토 ➔ 파트너 전용 계정 발급'}
                  </CardDescription>
                </div>
              </div>

              {/* Referrer Code Badge */}
              {referrerCode && (
                <div className="mt-4 flex items-center gap-2 text-xs bg-[#E8F3FF] border border-[#BFDBFE] text-[#1B64DA] px-3.5 py-2 rounded-xl font-medium">
                  <span>추천 파트너 코드:</span>
                  <span className="font-mono font-bold text-[#3182F6]">{referrerCode}</span>
                </div>
              )}
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 sm:p-7 space-y-6">
                
                {/* 파트너 역할 선택 Toggle */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#333D4B]">희망 제휴 구분 *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('master_agency')}
                      className={`p-3.5 rounded-2xl border text-xs font-bold text-center cursor-pointer transition-all duration-200 ${
                        role === 'master_agency'
                          ? 'bg-[#F3E8FF] border-[#9333EA] text-[#6B21A8] shadow-xs ring-2 ring-[#9333EA]/20'
                          : 'bg-[#F9FAFB] border-[#E5E8EB] text-[#6B7684] hover:bg-[#F2F4F6]'
                      }`}
                    >
                      Tier-1 대리점 <br />
                      <span className="text-[11px] font-medium text-[#7E22CE] mt-0.5 block">
                        (영업자 모집 + 오버라이딩)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('sales_agent')}
                      className={`p-3.5 rounded-2xl border text-xs font-bold text-center cursor-pointer transition-all duration-200 ${
                        role === 'sales_agent'
                          ? 'bg-[#E8F3FF] border-[#3182F6] text-[#1B64DA] shadow-xs ring-2 ring-[#3182F6]/20'
                          : 'bg-[#F9FAFB] border-[#E5E8EB] text-[#6B7684] hover:bg-[#F2F4F6]'
                      }`}
                    >
                      Tier-2 영업자 / 프리랜서 <br />
                      <span className="text-[11px] font-medium text-[#3182F6] mt-0.5 block">
                        (사찰·교회·재단 현장 개설)
                      </span>
                    </button>
                  </div>
                </div>

                {/* 파트너 정보 입력 (Toss Style Inputs) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#333D4B]">성함 / 법인명 *</Label>
                    <Input 
                      placeholder="홍길동 / (주)파트너스" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12 bg-[#F9FAFB] border-[#E5E8EB] text-[#191F28] placeholder:text-[#8B95A1] focus:bg-white focus:border-[#3182F6] rounded-xl font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#333D4B]">연락처 *</Label>
                    <Input 
                      placeholder="010-1234-5678" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="h-12 bg-[#F9FAFB] border-[#E5E8EB] text-[#191F28] placeholder:text-[#8B95A1] focus:bg-white focus:border-[#3182F6] rounded-xl font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#333D4B]">담당자 이메일 *</Label>
                    <Input 
                      type="email"
                      placeholder="partner@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 bg-[#F9FAFB] border-[#E5E8EB] text-[#191F28] placeholder:text-[#8B95A1] focus:bg-white focus:border-[#3182F6] rounded-xl font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#333D4B]">주요 영업 지역</Label>
                    <Input 
                      placeholder="예: 서울 강남구 / 경기 성남시" 
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="h-12 bg-[#F9FAFB] border-[#E5E8EB] text-[#191F28] placeholder:text-[#8B95A1] focus:bg-white focus:border-[#3182F6] rounded-xl font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#333D4B]">보유 네트워크 및 관련 경험 (선택)</Label>
                  <Textarea
                    placeholder="예: 경기 지역 사찰 10여 곳 네트워크 보유, 교구 연동 경험 보유 등"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={3}
                    className="bg-[#F9FAFB] border-[#E5E8EB] text-[#191F28] placeholder:text-[#8B95A1] focus:bg-white focus:border-[#3182F6] rounded-xl text-xs leading-relaxed"
                  />
                </div>

              </CardContent>

              {/* Submit Footer */}
              <CardFooter className="bg-[#FAFAFB] p-6 sm:p-7 border-t border-[#F2F4F6]">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className={`w-full font-bold h-13 text-base rounded-2xl shadow-md cursor-pointer transition-all duration-200 text-white ${
                    isAgencyMode
                      ? 'bg-gradient-to-r from-[#9333EA] to-[#6366F1] hover:opacity-95'
                      : 'bg-gradient-to-r from-[#3182F6] to-[#2563EB] hover:opacity-95'
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  {isAgencyMode ? '영업 대리점 제휴 신청서 제출' : '영업자 제휴 신청서 제출'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E5E8EB] py-8 text-center text-xs text-[#8B95A1] bg-white">
        © 2026 SoulPay Platform Inc. All rights reserved. 영업 제휴 문의: partner@soulpay.kr
      </footer>
    </div>
  );
}
