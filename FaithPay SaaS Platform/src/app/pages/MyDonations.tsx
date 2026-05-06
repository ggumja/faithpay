import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp, mockTenants, DonationFormData } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  Search, 
  History, 
  Calendar, 
  ChevronRight, 
  Download,
  AlertCircle,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

// Mock history data
const mockHistory: (DonationFormData & { id: string; date: string; status: string })[] = [
  {
    id: 'DON-001',
    itemId: '1',
    itemName: '십일조',
    amount: 300000,
    name: '홍길동',
    phone: '01012345678',
    date: '2026-03-28 11:30',
    status: '결제완료',
    isRecurring: false
  },
  {
    id: 'DON-002',
    itemId: '2',
    itemName: '감사헌금',
    amount: 50000,
    name: '홍길동',
    phone: '01012345678',
    date: '2026-03-15 10:45',
    status: '결제완료',
    isRecurring: false
  },
  {
    id: 'DON-003',
    itemId: '1',
    itemName: '십일조',
    amount: 300000,
    name: '홍길동',
    phone: '01012345678',
    date: '2026-02-25 14:20',
    status: '결제완료',
    isRecurring: false
  }
];

export default function MyDonations() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant } = useApp();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [history, setHistory] = useState<typeof mockHistory>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const tenant = mockTenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, setCurrentTenant]);

  if (!currentTenant) return null;

  const handleSearch = () => {
    if (phoneNumber.length < 10) {
      toast.error('올바른 휴대폰 번호를 입력해주세요');
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setHistory(mockHistory);
      setIsAuthenticated(true);
      setIsLoading(false);
      toast.success('봉헌 내역을 불러왔습니다');
    }, 800);
  };

  const handleDownloadReceipt = (id: string) => {
    toast.success(`${id} 번호의 확인서를 다운로드합니다`);
  };

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
            onClick={() => navigate(`/${tenantSlug}`)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">내 {currentTenant.terminology.donation} 내역</h1>
            <p className="opacity-90 mt-1">{currentTenant.name}와 함께하는 소중한 나눔</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {!isAuthenticated ? (
          <Card className="shadow-md border-none">
            <CardHeader>
              <CardTitle>조회하기</CardTitle>
              <CardDescription>
                헌금 시 입력하셨던 휴대폰 번호를 입력하여 내역을 확인하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">휴대폰 번호</Label>
                <div className="relative">
                  <Input 
                    id="phone"
                    type="tel"
                    placeholder="010-0000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10 text-lg py-6"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full py-6 text-lg"
                style={{ backgroundColor: currentTenant.primaryColor }}
                onClick={handleSearch}
                disabled={isLoading}
              >
                {isLoading ? '조회 중...' : '내역 조회하기'}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white border-none shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1 font-medium">올해 총 {currentTenant.terminology.donation}</p>
                  <p className="text-2xl font-bold" style={{ color: currentTenant.primaryColor }}>
                    650,000원
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border-none shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1 font-medium">참여 횟수</p>
                  <p className="text-2xl font-bold">3회</p>
                </CardContent>
              </Card>
            </div>

            {/* History List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                최근 내역
              </h3>
              
              {history.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group border-none shadow-sm">
                  <div className="flex">
                    <div 
                      className="w-2 flex-shrink-0" 
                      style={{ backgroundColor: currentTenant.primaryColor }}
                    />
                    <div className="flex-1 p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Badge variant="outline" className="mb-1 text-xs">{item.itemName}</Badge>
                          <h4 className="text-xl font-bold">{item.amount.toLocaleString()}원</h4>
                        </div>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {item.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {item.date}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadReceipt(item.id);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          확인서
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-5 w-5" />
                  <CardTitle className="text-base font-bold">연말정산 안내</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-amber-700">
                기부금 영수증 발급을 원하시는 경우 하단의 버튼을 눌러 신청해 주세요. 
                법적 증빙 서류는 관리자 승인 후 다운로드 가능합니다.
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full bg-white border-amber-200 text-amber-800 hover:bg-amber-100 font-bold"
                  onClick={() => navigate(`/${tenantSlug}/tax-receipt`)}
                >
                  기부금 영수증 신청하기
                </Button>
              </CardFooter>
            </Card>

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => setIsAuthenticated(false)}
            >
              다른 번호로 조회하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
