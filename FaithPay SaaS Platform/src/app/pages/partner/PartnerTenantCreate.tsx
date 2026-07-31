import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp, Tenant } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Building2, 
  ArrowLeft, 
  CheckCircle2, 
  Key, 
  ShieldCheck, 
  Sparkles,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { partnerAPI } from '../../api/client';

export default function PartnerTenantCreate() {
  const navigate = useNavigate();
  const { addTenant } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [religionType, setReligionType] = useState<'buddhist' | 'protestant' | 'catholic'>('buddhist');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [initialTempPassword, setInitialTempPassword] = useState(() => `fp${Math.floor(100000 + Math.random() * 900000)}`);

  const handleSlugChange = (val: string) => {
    // 알파벳, 숫자, 하이픈만 허용
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !adminName || !adminPhone) {
      toast.error('필수 정보를 모두 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    const isBuddhist = religionType === 'buddhist';
    const isCatholic = religionType === 'catholic';

    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name,
      slug,
      religionType,
      primaryColor: isBuddhist ? '#c2410c' : isCatholic ? '#1e40af' : '#2563eb',
      address: address || '서울특별시 종로구 인사동길 45',
      phone: phone || '02-1234-5678',
      description: isBuddhist 
        ? '부처님의 자비와 지혜로 평화와 행복을 찾는 도량입니다.' 
        : '사랑과 나눔이 함께하는 따뜻한 공동체입니다.',
      terminology: {
        donation: isBuddhist ? '보시' : '헌금',
        member: isBuddhist ? '불자' : isCatholic ? '교우' : '성도',
        prayer: isBuddhist ? '축원문' : '기도문',
      },
      bannerImages: [],
      paymentConfig: {
        tenantId: `tenant-${Date.now()}`,
        pgProvider: 'tosspayments',
        apiKey: 'test_ck_docs',
        secretKey: 'test_sk_docs',
        mid: 'toss_test_mid',
        isActive: true,
        updatedAt: new Date().toISOString(),
      },
    };

    setTimeout(() => {
      addTenant(newTenant);
      setIsSubmitting(false);
      toast.success(
        `[${name}] 계정이 즉시 개설되었습니다!\n영업자(${adminName} 님) 귀속 등록이 완료되었습니다.`
      );
      navigate('/partner/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex justify-center items-center">
      <div className="w-full max-w-2xl">
        
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/partner/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> 파트너 대시보드로 돌아가기
          </Button>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
            영업자 전용 빠른 개설 모듈
          </span>
        </div>

        <Card className="shadow-xl border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">사찰 · 교회 단체 계정 신규 개설</CardTitle>
                <CardDescription className="text-slate-300 text-xs mt-0.5">
                  현장에서 1분 만에 단체 계정을 생성하고 본인 하위 영업 영업체로 즉시 귀속시킵니다.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-6">
              
              {/* 1. 종교 유형 선택 */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">종교 유형 선택 *</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setReligionType('buddhist')}
                    className={`p-3.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      religionType === 'buddhist'
                        ? 'bg-orange-50 border-orange-500 text-orange-950 ring-2 ring-orange-400/20'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    ⛩️ 불교 (사찰/암자)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReligionType('protestant')}
                    className={`p-3.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      religionType === 'protestant'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-400/20'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    ⛪ 기독교 (교회)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReligionType('catholic')}
                    className={`p-3.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      religionType === 'catholic'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-400/20'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    ✝️ 천주교 (성당)
                  </button>
                </div>
              </div>

              {/* 2. 단체 기본 정보 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">사찰/교회 이름 *</Label>
                  <Input 
                    placeholder="예: 각원사 / 기쁨의교회" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">고유 도메인 슬러그 (URL) *</Label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-mono">faithpay.kr/</span>
                    <Input 
                      placeholder="gakwonsa" 
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">소재지 주소</Label>
                  <Input 
                    placeholder="서울특별시 종로구 인사동길 45" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">대표 연락처</Label>
                  <Input 
                    placeholder="02-1234-5678" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* 3. 단체 대표 관리자 (주지스님/목사님) 정보 */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-4">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-600" /> 사찰 주지스님 / 교회 담임목사님 관리자 계정 생성
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">대표 관리자 성함 *</Label>
                    <Input 
                      placeholder="성불 주지스님 / 김목사" 
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">대표 휴대폰 번호 *</Label>
                    <Input 
                      placeholder="010-1234-5678" 
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">초기 임시 비밀번호</Label>
                  <Input 
                    value={initialTempPassword}
                    onChange={(e) => setInitialTempPassword(e.target.value)}
                    className="font-mono bg-white text-center font-bold text-amber-900"
                  />
                  <p className="text-[11px] text-amber-800 mt-1">
                    * 현장에서 승인 즉시 주지스님/목사님께 해당 임시 비밀번호가 안내됩니다.
                  </p>
                </div>
              </div>

            </CardContent>

            <CardFooter className="bg-slate-50 p-6 border-t flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/partner/dashboard')}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
                <CheckCircle2 className="w-4 h-4 mr-2" /> 1초 계정 즉시 생성 완료
              </Button>
            </CardFooter>
          </form>
        </Card>

      </div>
    </div>
  );
}
