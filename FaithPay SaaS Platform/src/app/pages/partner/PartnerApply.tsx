import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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
  PhoneCall
} from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerApply() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [role, setRole] = useState<'master_agency' | 'sales_agent'>('sales_agent');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [experience, setExperience] = useState('');
  const [memo, setMemo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email) {
      toast.error('필수 정보를 모두 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('영업 파트너 제휴 신청이 정상적으로 접수되었습니다!\n담당자가 24시간 이내에 승인 및 정산 계약 안내 연락을 드립니다.');
      navigate('/');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> FaithPay 메인으로
          </button>
          
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white font-bold">FaithPay Partner Network</Badge>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Copy & Benefits */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-3 py-1 rounded-full">
              영업 파트너 & 대리점 모집
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
              전국 사찰 · 교회 디지털 전환과 함께 <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
                지속 가능한 다계층 정기 수수료 수익
              </span>을 창출하세요.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              FaithPay는 전국 종교 단체를 위한 SaaS 기반 디지털 보시/헌금 수납 플랫폼입니다. 사찰 및 교회를 온보딩하고 매월 수납되는 결제액에 대한 파트너 정산 수수료를 받으실 수 있습니다.
            </p>
          </div>

          {/* Key Advantages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-2">
              <div className="p-2 w-fit bg-emerald-500/20 text-emerald-400 rounded-xl">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-sm">업계 최고 다계층 정산 수익</h3>
              <p className="text-xs text-slate-400 leading-normal">
                매월 신도들이 납부하는 보시/헌금 결제액에 대한 파트너 정산금이 매달 지속 지급됩니다.
              </p>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-2">
              <div className="p-2 w-fit bg-indigo-500/20 text-indigo-400 rounded-xl">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-sm">1초 현장 개설 시스템</h3>
              <p className="text-xs text-slate-400 leading-normal">
                영업자가 현장에서 주지스님/담임목사님 대신 단체 계정을 즉시 생성해 드릴 수 있습니다.
              </p>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-2">
              <div className="p-2 w-fit bg-amber-500/20 text-amber-400 rounded-xl">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-sm">투명한 파트너 대시보드</h3>
              <p className="text-xs text-slate-400 leading-normal">
                실시간 수수료 발생 로그 및 월별 정산 내역을 파트너 포털에서 투명하게 확인합니다.
              </p>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-2">
              <div className="p-2 w-fit bg-purple-500/20 text-purple-400 rounded-xl">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-sm">총판 ➔ 대리점 2단계 구조</h3>
              <p className="text-xs text-slate-400 leading-normal">
                총판(Tier-1)은 하위 영업자(Tier-2)를 모집하여 오버라이딩 수수료 수익을 창출합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-6 w-full">
          <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-2xl overflow-hidden">
            <CardHeader className="bg-slate-900 border-b border-slate-800 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 text-white rounded-xl">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">영업 파트너 제휴 신청서</CardTitle>
                  <CardDescription className="text-slate-400 text-xs mt-0.5">
                    신청서 제출 시 본사 승인 검토 후 파트너 계정이 발급됩니다.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-5">
                
                {/* 파트너 역할 선택 */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300">희망 제휴 구분 *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('master_agency')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                        role === 'master_agency'
                          ? 'bg-purple-950 border-purple-500 text-purple-200 ring-2 ring-purple-500/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Tier-1 총판 / 대리점 <br />
                      <span className="text-[11px] font-normal text-purple-400">(지역 총판 권한)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('sales_agent')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                        role === 'sales_agent'
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Tier-2 영업자 / 프리랜서 <br />
                      <span className="text-[11px] font-normal text-emerald-400">(사찰·교회 현장 개설)</span>
                    </button>
                  </div>
                </div>

                {/* 파트너 정보 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300">성함 / 법인명 *</Label>
                    <Input 
                      placeholder="홍길동 / (주)파트너스" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300">연락처 *</Label>
                    <Input 
                      placeholder="010-1234-5678" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300">이메일 *</Label>
                    <Input 
                      type="email"
                      placeholder="partner@gmail.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300">주요 영업 지역</Label>
                    <Input 
                      placeholder="예: 서울 강남구 / 경기 성남시" 
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">보유 종교 네트워크 및 경험 (선택)</Label>
                  <Textarea
                    placeholder="예: 경기 지역 사찰 10여 곳 인프라 보유, 교구 연동 경험 보유 등"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={3}
                    className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 text-xs"
                  />
                </div>

              </CardContent>

              <CardFooter className="bg-slate-900/60 p-6 border-t border-slate-800">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-extrabold h-12 text-sm shadow-lg"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> 파트너 제휴 신청서 즉시 제출하기
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 FaithPay Platform Inc. All rights reserved. 영업 제휴 문의: partner@faithpay.kr
      </footer>
    </div>
  );
}
