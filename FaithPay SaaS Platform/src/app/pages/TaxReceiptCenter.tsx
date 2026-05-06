import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp, mockTenants } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  FileText, 
  Send, 
  ArrowLeft,
  CheckCircle2,
  Info,
  User,
  CreditCard,
  History
} from 'lucide-react';
import { toast } from 'sonner';

export default function TaxReceiptCenter() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant } = useApp();
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '', // RRNo
    address: '',
    phone: '',
    email: '',
    note: ''
  });

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, setCurrentTenant]);

  if (!currentTenant) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.registrationNumber || !formData.address) {
      toast.error('필수 정보를 모두 입력해주세요');
      return;
    }

    setIsLoading(true);
    // Simulate submission
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      toast.success('기부금 영수증 신청이 완료되었습니다');
    }, 1200);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg border-none text-center py-8">
          <CardHeader>
            <div className="mx-auto bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">신청 완료!</CardTitle>
            <CardDescription className="text-lg pt-2 leading-relaxed">
              기부금 영수증 발급 신청이 정상적으로 접수되었습니다. 
              관리자 승인 후 입력하신 이메일로 안내해 드립니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 rounded-lg p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">신청자</span>
                <span className="font-semibold">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">신청일자</span>
                <span className="font-semibold">2026-04-05</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">처리상태</span>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">검토 중</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              className="w-full py-6 text-lg"
              style={{ backgroundColor: currentTenant.primaryColor }}
              onClick={() => navigate(`/${tenantSlug}/my-donations`)}
            >
              내 내역으로 돌아가기
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/${tenantSlug}`)}>
              메인으로
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <div 
        className="text-white py-12 px-4 shadow-lg mb-8"
        style={{ backgroundColor: currentTenant.primaryColor }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate(`/${tenantSlug}/my-donations`)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">기부금 영수증 신청</h1>
            <p className="opacity-90 mt-1">연말정산을 위한 법적 증빙 서류 발급</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle>발급 정보 입력</CardTitle>
            <CardDescription>
              국세청 연동 및 법적 효력 증빙을 위해 정확한 정보를 입력해 주세요.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      성함 *
                    </Label>
                    <Input 
                      id="name" 
                      placeholder="홍길동"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rrno" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      주민등록번호 *
                    </Label>
                    <Input 
                      id="rrno" 
                      placeholder="000000-0000000"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})}
                      type="password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">주소 *</Label>
                  <Input 
                    id="address" 
                    placeholder="서울특별시 강남구..."
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">현재 거주 중인 주민등록상 주소를 입력해 주세요.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">연락처</Label>
                    <Input 
                      id="phone" 
                      placeholder="010-0000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="example@mail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">추가 요청사항</Label>
                  <Textarea 
                    id="note" 
                    placeholder="관리자에게 전달할 메모가 있다면 작성해 주세요."
                    rows={3}
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-800 border border-blue-100">
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">안내사항</p>
                  <p className="opacity-90 leading-relaxed">
                    입력하신 정보는 오직 기부금 영수증 발행 목적으로만 사용되며 개인정보처리방침에 따라 안전하게 보호됩니다. 
                    신청 후 발급까지는 영업일 기준 약 1~3일이 소요될 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit"
                className="w-full py-6 text-lg font-bold shadow-lg transition-transform hover:scale-[1.01]"
                style={{ backgroundColor: currentTenant.primaryColor }}
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    영수증 발급 신청하기
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="mt-8 flex justify-center gap-6 text-sm text-muted-foreground">
          <button className="hover:text-primary transition-colors flex items-center gap-1">
            <History className="h-4 w-4" />
            이전 신청 내역 보기
          </button>
          <span className="text-slate-300">|</span>
          <button className="hover:text-primary transition-colors flex items-center gap-1">
            <FileText className="h-4 w-4" />
            발급 가이드 보기
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple Badge component mockup if not already in UI folder
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );
}
