import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Globe,
  Church,
  Home,
  Palette,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

type Step = 'religion' | 'basic' | 'branding' | 'complete';

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('religion');
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    religion: 'protestant',
    name: '',
    slug: '',
    address: '',
    phone: '',
    email: '',
    primaryColor: '#1976d2',
    description: ''
  });

  const nextStep = (next: Step) => setStep(next);
  const prevStep = (prev: Step) => setStep(prev);

  const handleSubmit = () => {
    setIsLoading(true);
    // Simulate API registration
    setTimeout(() => {
      setIsLoading(false);
      setStep('complete');
      toast.success('단체 등록이 완료되었습니다!');
    }, 1500);
  };

  const renderProgress = () => {
    const steps: Step[] = ['religion', 'basic', 'branding', 'complete'];
    const currentIndex = steps.indexOf(step);
    
    return (
      <div className="flex justify-between mb-12 max-w-md mx-auto relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 -z-10" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 -z-10 transition-all duration-300"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((s, i) => (
          <div 
            key={s} 
            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              i <= currentIndex ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'
            }`}
          >
            {i < currentIndex ? <CheckCircle2 className="h-6 w-6" /> : <span className="font-bold">{i + 1}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            FaithPay 온보딩
          </h1>
          <p className="text-slate-600 text-lg">새로운 종교 단체 공간을 생성합니다</p>
        </div>

        {renderProgress()}

        {step === 'religion' && (
          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle className="text-2xl">종교 유형 선택</CardTitle>
              <CardDescription>단체에 해당하는 종교 유형을 선택해 주세요. 서비스 용어와 환경이 자동 구성됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              {[
                { id: 'protestant', label: '개신교', icon: Church, color: 'blue' },
                { id: 'buddhist', label: '불교', icon: Building2, color: 'orange' },
                { id: 'catholic', label: '천주교', icon: Home, color: 'purple' }
              ].map((item) => (
                <div 
                  key={item.id}
                  className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:shadow-lg flex flex-col items-center gap-4 ${
                    formData.religion === item.id ? `border-blue-600 bg-blue-50 shadow-md` : 'border-slate-100 hover:border-slate-300'
                  }`}
                  onClick={() => setFormData({...formData, religion: item.id})}
                >
                  <div className={`p-4 rounded-full ${formData.religion === item.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <item.icon className="h-8 w-8" />
                  </div>
                  <span className="font-bold text-lg">{item.label}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="justify-end">
              <Button className="px-8 h-12 text-lg" onClick={() => nextStep('basic')}>
                다음 단계로 
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 'basic' && (
          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle className="text-2xl">기본 정보 입력</CardTitle>
              <CardDescription>단체의 공식 정보와 접속 주소를 설정해 주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">단체명 명칭</Label>
                  <div className="relative">
                    <Input 
                      id="name" 
                      placeholder="예: 기쁨의교회" 
                      className="pl-10 h-12"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">단축 주소 (URL)</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-slate-400 text-sm border-r pr-2">
                      faithpay.info/
                    </div>
                    <Input 
                      id="slug" 
                      placeholder="church-name" 
                      className="pl-[105px] h-12"
                      value={formData.slug}
                      onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <div className="relative">
                  <Input 
                    id="address" 
                    placeholder="공식 주소를 입력하세요" 
                    className="pl-10 h-12"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <div className="relative">
                    <Input 
                      id="phone" 
                      placeholder="010-0000-0000" 
                      className="pl-10 h-12"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <div className="relative">
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="admin@example.com" 
                      className="pl-10 h-12"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t border-slate-100 pt-6">
              <Button variant="ghost" onClick={() => prevStep('religion')}>
                이전으로
              </Button>
              <Button className="px-8 h-12 text-lg" onClick={() => nextStep('branding')}>
                브랜딩 설정
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 'branding' && (
          <Card className="shadow-xl border-none">
            <CardHeader>
              <CardTitle className="text-2xl">브랜딩 및 소개</CardTitle>
              <CardDescription>단체의 개성을 나타내는 이미지와 색상을 설정하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-slate-600" />
                  대표 테마 색상
                </Label>
                <div className="flex gap-4 flex-wrap">
                  {['#1976d2', '#ff6f00', '#7b1fa2', '#2e7d32', '#c62828', '#37474f'].map((color) => (
                    <div 
                      key={color}
                      className={`w-12 h-12 rounded-full cursor-pointer border-4 transition-all ${
                        formData.primaryColor === color ? 'border-blue-600 scale-110 shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({...formData, primaryColor: color})}
                    />
                  ))}
                  <div className="relative">
                    <Input 
                      type="color" 
                      className="w-12 h-12 p-0 rounded-full cursor-pointer border-none bg-transparent overflow-hidden" 
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">단체 한 줄 소개</Label>
                <Textarea 
                  id="description" 
                  placeholder="단체를 소개하는 문구를 짧게 작성해 주세요. (예: 주님의 사랑을 실천하는 XX교회입니다.)"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-3 text-slate-500 bg-slate-50 hover:bg-white hover:border-blue-300 transition-all cursor-pointer">
                <Globe className="h-10 w-10 text-slate-300" />
                <p className="font-medium">로고 및 대표 이미지 업로드 (준비 중)</p>
                <p className="text-sm">드래그하거나 여길 클릭하여 이미지를 추가하세요</p>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t border-slate-100 pt-6">
              <Button variant="ghost" onClick={() => prevStep('basic')}>
                이전으로
              </Button>
              <Button 
                className="px-10 h-12 text-lg font-bold bg-blue-600 shadow-lg shadow-blue-200" 
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? '생성 중...' : (
                  <>
                    공간 생성 완료
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 'complete' && (
          <Card className="shadow-2xl border-none text-center py-16 px-8 animate-in fade-in zoom-in duration-500">
            <CardHeader>
              <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8">
                <CheckCircle2 className="h-14 w-14 text-green-600" />
              </div>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                새로운 모바일 헌금함이<br />생성되었습니다!
              </CardTitle>
              <CardDescription className="text-xl pt-4 max-w-md mx-auto">
                이제 아래의 주소로 신도들로부터 온라인 봉헌을 받으실 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 inline-block w-full max-w-lg mb-8">
                <p className="text-slate-500 text-sm mb-2 uppercase tracking-widest font-bold">봉헌 페이지 주소</p>
                <p className="text-3xl font-bold font-mono text-blue-600 break-all">
                  faithpay.info/{formData.slug || 'church-name'}
                </p>
                <Button variant="outline" className="mt-4 border-slate-200 gap-2 font-bold" onClick={() => {
                  navigator.clipboard.writeText(`faithpay.info/${formData.slug || 'church-name'}`);
                  toast.success('주소가 복사되었습니다');
                }}>
                  URL 복사하기
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                className="w-full max-w-md mx-auto py-8 text-xl font-bold bg-slate-900 shadow-xl"
                onClick={() => navigate(`/${formData.slug || 'church-name'}/admin`)}
              >
                관리자 대시보드로 이동하기
              </Button>
              <Button variant="ghost" onClick={() => navigate('/')}>
                메인 페이지로
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
