import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Menu,
  Heart,
  Search,
  Download,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Receipt,
  Loader2,
} from 'lucide-react';
import { donationAPI, paymentAPI, otpAuthAPI, subscriptionAPI } from '../../api/client';
import { toast } from 'sonner';

export default function DonationHistory() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();


  const [donations, setDonations] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  // 1초 SMS OTP 모달 & 세션 State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const itemsPerPage = 10;

  const handleSendOtp = async () => {
    if (!otpPhone || otpPhone.length < 10) {
      toast.error('올바른 휴대폰 번호를 입력해 주세요.');
      return;
    }
    setIsOtpLoading(true);
    try {
      const res = await otpAuthAPI.sendOtp(otpPhone);
      if (res.success) {
        setIsOtpSent(true);
        toast.success(res.data?.message || '1초 SMS 인증번호가 발송되었습니다.');
      } else {
        toast.error(res.error || '인증번호 발송 실패');
      }
    } catch (e) {
      toast.error('인증번호 발송 중 오류가 발생했습니다.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      toast.error('4자리 인증번호를 입력해 주세요.');
      return;
    }
    setIsOtpLoading(true);
    try {
      const res = await otpAuthAPI.verifyOtp(otpPhone, otpCode);
      if (res.success && res.data) {
        setIsOtpVerified(true);
        setShowOtpModal(false);
        setSubscriptions(res.data.subscriptions || []);
        setDonations(res.data.donations || []);
        toast.success('본인 인증이 완료되었습니다. 내역 및 정기결제를 확인하세요.');
      } else {
        toast.error(res.error || '인증번호가 올바르지 않습니다.');
      }
    } catch (e) {
      toast.error('인증 검증 중 오류가 발생했습니다.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleUpdateSubStatus = async (subId: string, newStatus: 'paused' | 'cancelled' | 'active') => {
    const labelMap = { paused: '일시정지', cancelled: '해지', active: '재개' };
    if (!window.confirm(`정말 정기결제를 ${labelMap[newStatus]}하시겠습니까?`)) return;

    try {
      const res = await subscriptionAPI.updateStatus(subId, newStatus);
      if (res.success && res.data) {
        toast.success(`정기결제가 ${labelMap[newStatus]} 처리되었습니다.`);
        setSubscriptions(prev => prev.map(s => s.id === subId ? res.data!.subscription : s));
      } else {
        toast.error(`처리 실패: ${res.error}`);
      }
    } catch (e) {
      toast.error('처리 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, tenants, setCurrentTenant]);


  useEffect(() => {
    const fetchDonations = async () => {
      if (currentTenant) {
        setIsLoading(true);
        try {
          const res = await donationAPI.getByTenant(currentTenant.id);
          if (res.success && res.data) {
            const mapped = res.data.map(d => ({
              id: d.id,
              date: d.createdAt ? d.createdAt.split('T')[0] : '2026-03-28',
              time: d.createdAt ? d.createdAt.split('T')[1]?.slice(0, 5) : '14:30',
              name: d.donorName,
              phone: d.donorPhone,
              item: d.itemName,
              amount: d.amount,
              method: d.paymentMethod || '카드',
              status: d.paymentStatus || 'completed',
              prayer: d.prayerText || '',
            }));
            setDonations(mapped);
          } else {
            setDonations([]);
          }
        } catch (error) {
          console.error(error);
          setDonations([]);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchDonations();
  }, [currentTenant]);

  if (!currentTenant) {
    return <div>Loading...</div>;
  }

  if (!currentAdmin && !isOtpVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <CardHeader className="text-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="mx-auto w-12 h-12 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 font-bold text-xl">
              🔒
            </div>
            <CardTitle className="text-xl font-bold">1초 SMS 본인인증</CardTitle>
            <CardDescription className="text-xs text-zinc-500 mt-1">
              신도님의 개인정보 및 보시/헌금 내역 보호를 위해 4자리 SMS 핀으로 본인확인을 진행합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {!isOtpSent ? (
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500">휴대폰 번호</label>
                <Input
                  placeholder="01012345678"
                  value={otpPhone}
                  onChange={(e) => setOtpPhone(e.target.value)}
                  className="h-11 rounded-xl bg-zinc-50 font-semibold"
                />
                <Button
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-white cursor-pointer shadow-xs"
                  onClick={handleSendOtp}
                  disabled={isOtpLoading}
                >
                  {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  1초 인증번호 받기
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500">카카오톡/문자 4자리 인증번호</label>
                <Input
                  placeholder="4자리 숫자 입력 (테스트: 1234)"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={4}
                  className="h-11 rounded-xl bg-zinc-50 font-bold text-center tracking-widest text-lg"
                />
                <p className="text-[11px] text-indigo-600 font-medium text-center">· 테스트용 코드 '1234'를 입력하시면 즉시 내역이 조회됩니다.</p>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl cursor-pointer"
                    onClick={() => setIsOtpSent(false)}
                  >
                    재발송
                  </Button>
                  <Button
                    className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-white cursor-pointer shadow-xs"
                    onClick={handleVerifyOtp}
                    disabled={isOtpLoading}
                  >
                    {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    인증 및 내역 조회
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPath = location.pathname;

  // Filter donations
  const filteredDonations = donations.filter((donation) => {
    const nameStr = donation.donorName || '';
    const phoneStr = donation.donorPhone || '';
    
    const matchesSearch =
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phoneStr.includes(searchTerm);
      
    const matchesStatus = statusFilter === 'all' || donation.paymentStatus === statusFilter;
    const matchesMethod = methodFilter === 'all' || donation.paymentMethod === methodFilter;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const dDate = new Date(donation.createdAt).toISOString().split('T')[0];
      if (startDate && endDate) {
        matchesDate = dDate >= startDate && dDate <= endDate;
      } else if (startDate) {
        matchesDate = dDate >= startDate;
      } else if (endDate) {
        matchesDate = dDate <= endDate;
      }
    }

    return matchesSearch && matchesStatus && matchesMethod && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDonations = filteredDonations.slice(startIndex, endIndex);

  // Statistics
  const totalAmount = filteredDonations.reduce((sum, d) => sum + d.amount, 0);
  const completedCount = filteredDonations.filter((d) => d.paymentStatus === 'completed').length;
  const pendingCount = filteredDonations.filter((d) => d.paymentStatus === 'pending').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">완료</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">대기중</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">실패</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">취소됨</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleExport = () => {
    // CSV export logic would go here
    alert('CSV 다운로드 기능은 데모입니다');
  };

  const handleViewDetail = (donation: any) => {
    setSelectedDonation(donation);
  };

  const handlePrintReceipt = (donation: any) => {
    alert(`${donation.id} 영수증 출력 (데모)`);
  };

  const handleCancelPayment = async (donationId: string) => {
    if (!window.confirm('정말 결제를 취소하시겠습니까?')) return;
    
    setIsCancelling(true);
    try {
      const res = await paymentAPI.cancelPayment(currentTenant.id, donationId);
      if (res.success) {
        alert('결제가 취소되었습니다.');
        setSelectedDonation(null);
        // refresh data
        const refreshRes = await donationAPI.getByTenant(currentTenant.id);
        if (refreshRes.success && refreshRes.data) {
          setDonations(refreshRes.data);
        }
      } else {
        alert(`취소 실패: ${res.error}`);
      }
    } catch (e) {
      alert('취소 중 오류가 발생했습니다.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b p-4 flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">봉헌 내역</h1>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="h-8 w-8" style={{ color: currentTenant.primaryColor }} />
                  <h1 className="text-3xl font-bold">보시/봉헌 내역 및 정기결제 관리</h1>
                </div>
                <p className="text-muted-foreground">보시 및 헌금 내역을 조회하고 정기결제를 직접 중단/관리하세요</p>
              </div>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs py-2.5 px-4 flex items-center gap-2 cursor-pointer"
                onClick={() => setShowOtpModal(true)}
              >
                🔒 1초 SMS 본인인증하기
              </Button>
            </div>

            {/* Subscriptions Self-Management Section */}
            {subscriptions.length > 0 && (
              <div className="mb-8 border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-indigo-950 dark:text-indigo-200 mb-1 flex items-center gap-2">
                  <span>⚡ 내 정기결제 셀프 관리</span>
                  <Badge className="bg-indigo-600 text-white text-[10px]">본인인증 완료</Badge>
                </h3>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-4">매월 자동 청구되는 보시/헌금 정기결제를 직접 일시정지하거나 즉시 해지하실 수 있습니다.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subscriptions.map(sub => (
                    <div key={sub.id} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-base">{sub.itemName}</h4>
                          <Badge className={sub.status === 'active' ? 'bg-green-100 text-green-800' : sub.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}>
                            {sub.status === 'active' ? '🟢 이용 중' : sub.status === 'paused' ? '🟡 일시정지' : '🔴 해지 완료'}
                          </Badge>
                        </div>
                        <div className="text-xs text-zinc-500 space-y-1">
                          <p>· 결제 금액: <span className="font-bold text-zinc-900 dark:text-zinc-100">{sub.amount.toLocaleString()}원</span> (매월 {sub.recurringDay}일)</p>
                          <p>· 등록 카드: {sub.cardName} ({sub.cardNo})</p>
                          <p>· 신청 일시: {new Date(sub.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {sub.status !== 'cancelled' && (
                        <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          {sub.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer"
                              onClick={() => handleUpdateSubStatus(sub.id, 'paused')}
                            >
                              🟡 다음 달 쉬기 (일시정지)
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs border-green-300 text-green-700 hover:bg-green-50 cursor-pointer"
                              onClick={() => handleUpdateSubStatus(sub.id, 'active')}
                            >
                              🟢 정기결제 재개
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1 text-xs cursor-pointer"
                            onClick={() => handleUpdateSubStatus(sub.id, 'cancelled')}
                          >
                            🔴 정기결제 중단 (해지)
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1초 SMS OTP Authentication Modal */}
            {showOtpModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <Card className="max-w-md w-full rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                      <span>🔒 1초 SMS 본인인증</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      비회원 신도의 개인정보 보호를 위해 휴대폰 4자리 핀으로 본인확인을 진행합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {!isOtpSent ? (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-500">휴대폰 번호</label>
                        <Input
                          placeholder="01012345678"
                          value={otpPhone}
                          onChange={(e) => setOtpPhone(e.target.value)}
                          className="h-11 rounded-xl bg-zinc-50 font-semibold"
                        />
                        <Button
                          className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-white cursor-pointer"
                          onClick={handleSendOtp}
                          disabled={isOtpLoading}
                        >
                          {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          1초 인증번호 받기
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-500">카카오톡/문자 4자리 인증번호</label>
                        <Input
                          placeholder="4자리 숫자 입력 (테스트: 1234)"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          maxLength={4}
                          className="h-11 rounded-xl bg-zinc-50 font-bold text-center tracking-widest text-lg"
                        />
                        <p className="text-[11px] text-indigo-600 font-medium text-center">· 테스트용 코드 '1234'를 입력하시면 즉시 인증됩니다.</p>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            className="flex-1 h-11 rounded-xl cursor-pointer"
                            onClick={() => setIsOtpSent(false)}
                          >
                            재발송
                          </Button>
                          <Button
                            className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-white cursor-pointer"
                            onClick={handleVerifyOtp}
                            disabled={isOtpLoading}
                          >
                            {isOtpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            인증 및 내역 조회
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="pt-3 border-t text-right">
                      <Button variant="ghost" size="sm" onClick={() => setShowOtpModal(false)} className="text-xs cursor-pointer">
                        닫기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    총 봉헌액
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: currentTenant.primaryColor }}>
                    {totalAmount.toLocaleString()}원
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredDonations.length}건
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    완료
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{completedCount}건</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    정상 처리된 봉헌
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    대기중
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{pendingCount}건</div>
                  <p className="text-xs text-muted-foreground mt-1">입금 대기</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle>검색 및 필터</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="이름, 전화번호, 봉헌번호 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="pending">대기중</SelectItem>
                      <SelectItem value="failed">실패</SelectItem>
                      <SelectItem value="cancelled">취소됨</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="결제방법" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 방법</SelectItem>
                      <SelectItem value="카드">카드</SelectItem>
                      <SelectItem value="계좌이체">계좌이체</SelectItem>
                      <SelectItem value="가상계좌">가상계좌</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    엑셀 다운로드
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      시작일
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      종료일
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>봉헌 목록</CardTitle>
                <CardDescription>
                  {filteredDonations.length}건의 봉헌 내역이 조회되었습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>봉헌번호</TableHead>
                        <TableHead>일시</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>봉헌항목</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                        <TableHead>결제방법</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-center">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : currentDonations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            조회된 봉헌 내역이 없습니다
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentDonations.map((donation) => {
                          const createdDate = new Date(donation.createdAt);
                          const dateStr = createdDate.toLocaleDateString();
                          const timeStr = createdDate.toLocaleTimeString();

                          return (
                            <TableRow key={donation.id}>
                              <TableCell className="font-mono text-sm">
                                {donation.id}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{dateStr}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {timeStr}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{donation.donorName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {donation.donorPhone}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{donation.itemName}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {donation.amount.toLocaleString()}원
                              </TableCell>
                              <TableCell>{donation.paymentMethod}</TableCell>
                              <TableCell>{getStatusBadge(donation.paymentStatus)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2 justify-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewDetail(donation)}
                                    title="상세보기"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handlePrintReceipt(donation)}
                                    title="영수증 출력"
                                  >
                                    <Receipt className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                      {startIndex + 1}-{Math.min(endIndex, filteredDonations.length)} /{' '}
                      {filteredDonations.length}건
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => setCurrentPage(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detail Modal */}
            {selectedDonation && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setSelectedDonation(null)}
              >
                <Card
                  className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CardHeader>
                    <CardTitle>봉헌 상세 정보</CardTitle>
                    <CardDescription>{selectedDonation.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">봉헌자</p>
                        <p className="font-semibold">{selectedDonation.donorName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">연락처</p>
                        <p className="font-semibold">{selectedDonation.donorPhone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">봉헌 항목</p>
                        <p className="font-semibold">{selectedDonation.itemName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">금액</p>
                        <p className="font-semibold text-lg">
                          {selectedDonation.amount.toLocaleString()}원
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">결제 방법</p>
                        <p className="font-semibold">{selectedDonation.paymentMethod}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">상태</p>
                        <div className="mt-1">{getStatusBadge(selectedDonation.paymentStatus)}</div>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">봉헌 일시</p>
                        <p className="font-semibold">
                          {new Date(selectedDonation.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {selectedDonation.prayerText && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">기도 제목</p>
                        <p className="p-3 bg-slate-50 rounded-lg">{selectedDonation.prayerText}</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      {selectedDonation.paymentStatus === 'completed' && selectedDonation.paymentMethod === 'card' && (
                        <Button 
                          variant="destructive" 
                          onClick={() => handleCancelPayment(selectedDonation.id)}
                          disabled={isCancelling}
                        >
                          {isCancelling ? '취소 중...' : '결제 취소'}
                        </Button>
                      )}
                      <Button
                        className="flex-1"
                        onClick={() => handlePrintReceipt(selectedDonation)}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        영수증 출력
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedDonation(null)}>
                        닫기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
