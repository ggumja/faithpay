import React, { useState } from 'react';
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
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Award,
  Zap,
  Users,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { partnerAPI } from '../../api/client';

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
        toast.success('영업 파트너 제휴 신청이 정상적으로 접수되었습니다!\n담당자가 심사 후 24시간 이내에 연락 드립니다.');
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
            <Badge className="bg-[#E8F3FF] text-[#1B64DA] border border-[#BFDBFE] font-bold px-3 py-1 text-xs rounded-full shadow-2xs">
              영업 파트너 제휴 신청
            </Badge>
          </div>
        </div>
      </header>

      {/* ── Main Body ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        
        {/* ── Left Column: Value Proposition & Key Advantages ── */}
        <div className="lg:col-span-6 space-y-8">
          
          {/* Header Title Section */}
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide px-3.5 py-1.5 rounded-full border shadow-2xs text-[#3182F6] bg-[#E8F3FF] border-[#BFDBFE]">
              <Sparkles className="h-3.5 w-3.5" />
              영업 파트너 (영업자 & 프리랜서) 모집
            </span>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#191F28] leading-[1.25] tracking-tight">
              전국 사찰 · 교회 · 재단 디지털 전환과 <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3182F6] via-[#2563EB] to-[#6366F1]">
                지속 가능한 매월 정기 수수료 수익
              </span>을 창출하세요.
            </h1>

            <p className="text-[#4E5968] text-sm sm:text-base leading-relaxed font-medium">
              SoulPay는 전국 종교 및 구호 단체를 위한 SaaS 기반 디지털 보시/헌금/후원 수납 플랫폼입니다.
              사찰, 교회, 구호재단을 가입 신청 완료하고 매월 수납되는 결제액에 대한 파트너 정산 수수료를 지속 받으실 수 있습니다.
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
              <h3 className="font-bold text-[#191F28] text-sm">체계적인 본사 영업 지원</h3>
              <p className="text-xs text-[#6B7684] leading-relaxed font-medium">
                가맹점 유치를 위한 표준 계약서, 현장 브로슈어 및 실시간 정산 포털을 전폭 지원합니다.
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
            <CardHeader className="border-b border-[#F2F4F6] p-6 sm:p-7 bg-[#FAFAFB]">
              <div className="flex items-center gap-3.5">
                <div className="p-3 text-white rounded-2xl shadow-xs bg-[#3182F6]">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-[#191F28]">
                    영업 파트너 제휴 신청서
                  </CardTitle>
                  <CardDescription className="text-[#6B7684] text-xs font-medium mt-1">
                    신청서 제출 ➔ 본사 승인 검토 ➔ 파트너 전용 계정 발급 (24시간 이내 연락)
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

            {isSubmitted && submittedInfo ? (
              <CardContent className="p-8 sm:p-10 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-[#191F28]">
                    {submittedInfo.name}님의 제휴 신청이 접수되었습니다!
                  </h3>
                  <p className="text-sm text-[#4E5968] leading-relaxed">
                    선택 구분: <strong className="text-[#191F28]">{submittedInfo.roleLabel}</strong><br />
                    본사 관리자가 접수된 신청 내용을 검토한 후<br className="hidden sm:inline" />
                    24시간 이내에 등록하신 연락처 또는 이메일로 안내 드립니다.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate('/')}
                    className="h-12 px-6 rounded-xl font-bold bg-[#3182F6] hover:bg-[#2563EB] text-white cursor-pointer"
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
                    className="h-12 px-6 rounded-xl font-bold border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6] cursor-pointer"
                  >
                    추가 신청서 작성
                  </Button>
                </div>
              </CardContent>
            ) : (
              <form onSubmit={handleSubmit}>
                <CardContent className="p-6 sm:p-7 space-y-6">
                  {/* 파트너 정보 입력 (Toss Style Inputs) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#333D4B]">성함 / 상호명 *</Label>
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
                    className="w-full font-bold h-13 text-base rounded-2xl shadow-md cursor-pointer transition-all duration-200 text-white bg-gradient-to-r from-[#3182F6] to-[#2563EB] hover:opacity-95"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>신청서 접수 처리 중...</span>
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        영업 파트너 제휴 신청서 제출
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            )}
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
