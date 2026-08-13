import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useApp } from '../../context/AppContext';
import { formatPhoneNumber } from '../../utils/phoneUtils';

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
  Printer,
  X,
  Monitor,
  Smartphone,
  RotateCcw,
  RefreshCw,
  CalendarX,
} from 'lucide-react';
import { donationAPI, paymentAPI, otpAuthAPI, subscriptionAPI } from '../../api/client';
import { toast } from 'sonner';
import { PeriodRangePicker, PeriodUnit, PeriodSelection } from '../../components/PeriodRangePicker';

function numberToKorean(amount: number): string {
  if (!amount || isNaN(amount)) return '영';
  const units = ['', '만', '억', '조'];
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const subUnits = ['', '십', '백', '천'];

  let num = Math.floor(amount);
  let result = '';
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 10000;
    if (chunk > 0) {
      let chunkStr = '';
      let chunkNum = chunk;
      for (let i = 0; i < 4; i++) {
        const digit = chunkNum % 10;
        if (digit > 0) {
          const digitStr = (digit === 1 && i > 0) ? '' : digits[digit];
          chunkStr = digitStr + subUnits[i] + chunkStr;
        }
        chunkNum = Math.floor(chunkNum / 10);
      }
      result = chunkStr + units[unitIndex] + (result ? ' ' + result : '');
    }
    num = Math.floor(num / 10000);
    unitIndex++;
  }

  return result || '영';
}

export function cleanPaymentMethod(method?: string): string {
  if (!method || typeof method !== 'string') return '신용카드';
  const m = method.trim();
  if (!m) return '신용카드';

  // Card variations ("OffPG 현장 신용카드", "OffPG", "카드 인증결제", "카드결제", "card", "카드")
  if (
    m.includes('OffPG') ||
    m.includes('카드') ||
    m.toLowerCase().includes('card') ||
    m.includes('삼성') ||
    m.includes('애플')
  ) {
    return '신용카드';
  }

  // KakaoPay variations ("카카오페이 (QR/바코드)", "카카오페이 (TC0ONETIME)", "kakaopay")
  if (m.includes('카카오') || m.toLowerCase().includes('kakao')) {
    return '카카오페이';
  }

  // NaverPay variations
  if (m.includes('네이버') || m.toLowerCase().includes('naver')) {
    return '네이버페이';
  }

  // Account Transfer
  if (m.includes('계좌') || m.includes('이체')) {
    return '계좌이체';
  }

  // Virtual Account
  if (m.includes('가상')) {
    return '가상계좌';
  }

  // Recurring payment
  if (m.includes('정기') || m.includes('빌링')) {
    return '정기결제';
  }

  return m;
}

export function formatDonationId(rawId?: string, createdAtStr?: string): string {
  if (!rawId || typeof rawId !== 'string') {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `FP-${datePart}-00000001`;
  }

  const str = rawId.trim();
  
  // Already matches FP-YYYYMMDD-XXXXXXXX (8 digit sequence)
  if (/^FP-\d{8}-\d{8}$/.test(str)) {
    return str;
  }

  // Determine date string YYYYMMDD
  let datePart = '';
  if (createdAtStr) {
    const parsed = new Date(createdAtStr);
    if (!isNaN(parsed.getTime())) {
      datePart = parsed.toISOString().slice(0, 10).replace(/-/g, '');
    }
  }
  if (!datePart) {
    datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  // Extract numeric digits from rawId or pad to 8 digits
  const digits = str.replace(/[^0-9]/g, '');
  let seqPart = '';
  if (digits.length >= 8) {
    seqPart = digits.slice(-8);
  } else if (digits.length > 0) {
    seqPart = digits.padStart(8, '0');
  } else {
    seqPart = '00000001';
  }

  return `FP-${datePart}-${seqPart}`;
}

function normalizeDonation(d: any) {
  // 1. Created At Date handling
  const rawDate = d.createdAt || d.created_at || d.date;
  let validCreatedAt = new Date().toISOString();
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      validCreatedAt = parsed.toISOString();
    }
  }

  // 2. Name handling (무기명 if blank, empty, or includes 무명/익명)
  const rawName = d.donorName ?? d.donor_name ?? d.name;
  const nameStr = rawName ? String(rawName).trim() : '';
  const isAnon = !nameStr || nameStr === '무기명' || nameStr.includes('무명') || nameStr.includes('익명');
  const donorName = isAnon ? '무기명' : nameStr;

  // 3. Phone handling
  const rawPhone = d.donorPhone ?? d.donor_phone ?? d.phone ?? '';
  const donorPhone = String(rawPhone || '').trim();

  // 4. Item Name handling
  const rawItem = d.itemName ?? d.item_name ?? d.item;
  const itemName = (rawItem && String(rawItem).trim().length > 0) ? String(rawItem).trim() : '일반헌금/보시';

  // 5. Payment Method handling (통일된 cleanPaymentMethod 사용)
  const rawMethod = d.paymentMethod ?? d.payment_method ?? d.method;
  const paymentMethod = cleanPaymentMethod(rawMethod);

  // 6. Payment Status handling
  const rawStatus = d.paymentStatus ?? d.payment_status ?? d.status;
  let paymentStatus = (rawStatus && String(rawStatus).trim().length > 0) ? String(rawStatus).trim() : 'completed';

  // 신용카드/간편결제 등 즉시 결제 수단에서 30분 이상 경과한 'pending'(대기중) 건은 결제 미완료/이탈(failed)로 정리
  if (paymentStatus === 'pending') {
    const isInstantPayment = paymentMethod === '신용카드' || paymentMethod === '카카오페이' || paymentMethod === '네이버페이' || paymentMethod.includes('카드');
    if (isInstantPayment) {
      const createdTime = new Date(validCreatedAt).getTime();
      const nowTime = Date.now();
      const elapsedMinutes = (nowTime - createdTime) / (1000 * 60);
      if (elapsedMinutes > 30) {
        paymentStatus = 'failed';
      }
    }
  }

  // 7. Prayer Text handling
  const rawPrayer = d.prayerText ?? d.prayer_text ?? d.prayer ?? '';
  const prayerText = String(rawPrayer || '').trim();

  // 8. Amount
  const amount = Number(d.amount) || 0;

  // 9. ID normalization (FP-YYYYMMDD-XXXXXXXX 규격으로 일관화)
  const rawIdStr = String(d.id || '');
  const id = formatDonationId(rawIdStr, validCreatedAt);

  // 10. Device Type handling (KIOSK vs WEB_MOBILE)
  const rawDevice = d.deviceType ?? d.device_type ?? d.device;
  let deviceType: 'KIOSK' | 'WEB_MOBILE' = 'WEB_MOBILE';
  if (rawDevice === 'KIOSK' || rawIdStr.toUpperCase().includes('KIOSK')) {
    deviceType = 'KIOSK';
  } else if (rawDevice) {
    deviceType = String(rawDevice) as any;
  }

  return {
    ...d,
    id,
    createdAt: validCreatedAt,
    donorName,
    donorPhone,
    itemName,
    amount,
    paymentMethod,
    paymentStatus,
    prayerText,
    deviceType,
  };
}

export function assignSequentialDonationIds(list: any[]): any[] {
  if (!Array.isArray(list) || list.length === 0) return [];

  // 1. Sort donations chronologically by creation date (earliest to latest)
  const chronological = [...list].sort((a, b) => {
    const rawA = a.createdAt || a.created_at || a.date;
    const rawB = b.createdAt || b.created_at || b.date;
    const timeA = rawA ? new Date(rawA).getTime() : 0;
    const timeB = rawB ? new Date(rawB).getTime() : 0;
    return timeA - timeB;
  });

  // 2. Track sequential counter per YYYYMMDD date starting from 1 (00000001)
  const dateCounters: Record<string, number> = {};

  const processed = chronological.map((item) => {
    const rawDate = item.createdAt || item.created_at || item.date;
    let validDate = new Date();
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        validDate = parsed;
      }
    }
    const yyyymmdd = validDate.toISOString().slice(0, 10).replace(/-/g, '');

    dateCounters[yyyymmdd] = (dateCounters[yyyymmdd] || 0) + 1;
    const seqNumStr = String(dateCounters[yyyymmdd]).padStart(8, '0');
    const formattedId = `FP-${yyyymmdd}-${seqNumStr}`;

    return normalizeDonation({
      ...item,
      id: formattedId,
    });
  });

  // 3. Return sorted by creation date descending (newest first for UI table display)
  return processed.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeB - timeA;
  });
}

import { useTenantTerms } from '../../hooks/useTenantTerms';

export default function DonationHistory() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();
  const terms = useTenantTerms(currentTenant?.orgType);

  const [donations, setDonations] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [recurringCancelModalDonation, setRecurringCancelModalDonation] = useState<any | null>(null);

  // 1초 SMS OTP 모달 & 세션 State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // Filter states
  const [showFailed, setShowFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');

  // 🚀 Hot-Cold Hybrid: Default initial view is Today (당일 실시간 Hot Data 모드)
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>('daily');
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return {
      unit: 'daily',
      startDate: todayStart,
      endDate: todayEnd,
      label: `🔥 오늘 (${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일)`,
    };
  });

  // Check if current view is Today mode
  const isTodayMode = useMemo(() => {
    if (!periodSelection || !periodSelection.startDate || !periodSelection.endDate) return false;
    const now = new Date();
    const s = periodSelection.startDate;
    const e = periodSelection.endDate;
    return (
      s.getFullYear() === now.getFullYear() &&
      s.getMonth() === now.getMonth() &&
      s.getDate() === now.getDate() &&
      e.getFullYear() === now.getFullYear() &&
      e.getMonth() === now.getMonth() &&
      e.getDate() === now.getDate()
    );
  }, [periodSelection]);

  // Quick period presets
  const setQuickPeriod = (type: 'today' | 'this_week' | 'this_month' | 'all') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = '';
    let unit: PeriodUnit = 'daily';

    if (type === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `🔥 오늘 (${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일)`;
      unit = 'daily';
    } else if (type === 'this_week') {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset, 0, 0, 0, 0);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
      start = monday;
      end = sunday;
      label = `📅 이번 주 (${monday.getMonth() + 1}/${monday.getDate()} ~ ${sunday.getMonth() + 1}/${sunday.getDate()})`;
      unit = 'weekly';
    } else if (type === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `🗓️ 이번 달 (${now.getFullYear()}년 ${now.getMonth() + 1}월 전체)`;
      unit = 'monthly';
    } else if (type === 'all') {
      start = new Date(2020, 0, 1, 0, 0, 0, 0);
      end = new Date(2030, 11, 31, 23, 59, 59, 999);
      label = `📊 전체 기간`;
      unit = 'yearly';
    }

    setPeriodUnit(unit);
    setPeriodSelection({
      unit,
      startDate: start,
      endDate: end,
      label,
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [receiptDonation, setReceiptDonation] = useState<any>(null);
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
        setDonations(assignSequentialDonationIds(res.data.donations || []));
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
            setDonations(assignSequentialDonationIds(res.data));
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

  // ⚡ 1. 당일 실시간 핫 갱신 (Hot Real-time Polling)
  // 오늘(Today) 선택 모드일 때만 15초 마다 실시간 신규 결제 자동 수신!
  useEffect(() => {
    if (!currentTenant || !isTodayMode) return;

    const interval = setInterval(async () => {
      try {
        const res = await donationAPI.getByTenant(currentTenant.id);
        if (res.success && res.data) {
          setDonations(assignSequentialDonationIds(res.data));
        }
      } catch (e) {
        console.error('Real-time polling error:', e);
      }
    }, 15000); // 15s quiet background poll when today mode active

    return () => clearInterval(interval);
  }, [currentTenant, isTodayMode]);

  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">단체 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
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

  // 미래 정기결제 결제대기 목록 (미래 자동 결제 예정건)
  const recurringPendingDonations = donations.filter((donation) => {
    return donation.isRecurring && (donation.paymentStatus === 'pending' || donation.paymentStatus === 'scheduled');
  });

  // Filter donations (실제 승인/입금/취소 결제 내역만 포함)
  const filteredDonations = donations.filter((donation) => {
    // 미래 정기결제 대기건은 실제 결제 내역 테이블에서 분리 제외
    if (donation.isRecurring && (donation.paymentStatus === 'pending' || donation.paymentStatus === 'scheduled')) {
      return false;
    }

    // 결제실패(이탈) 건은 showFailed 체크박스가 켜져있거나 상태필터가 'failed'일 때만 목록에 포함
    if (!showFailed && statusFilter !== 'failed' && donation.paymentStatus === 'failed') {
      return false;
    }

    const nameStr = donation.donorName || '';
    const phoneStr = donation.donorPhone || '';
    
    const matchesSearch =
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phoneStr.includes(searchTerm);
      
    const matchesStatus = statusFilter === 'all' || donation.paymentStatus === statusFilter;
    const matchesMethod = methodFilter === 'all' || donation.paymentMethod === methodFilter;
    const matchesDevice = deviceFilter === 'all' || donation.deviceType === deviceFilter;
    
    let matchesDate = true;
    if (periodSelection && periodSelection.startDate && periodSelection.endDate) {
      const dDate = new Date(donation.createdAt);
      if (!isNaN(dDate.getTime())) {
        const start = new Date(periodSelection.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(periodSelection.endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = dDate >= start && dDate <= end;
      }
    }

    return matchesSearch && matchesStatus && matchesMethod && matchesDevice && matchesDate;
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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-semibold">결제완료</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-semibold">결제대기</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 font-semibold">결제실패</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 font-semibold">결제취소</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleExport = () => {
    if (filteredDonations.length === 0) {
      toast.error('다운로드할 봉헌 내역이 없습니다.');
      return;
    }

    const headers = ['봉헌번호', '일시', '접수기기', '봉헌자', '연락처', '봉헌항목', '금액', '결제방법', '결제상태', '기도제목/메모'];
    
    const rows = filteredDonations.map(d => {
      const createdDate = d.createdAt ? new Date(d.createdAt).toLocaleString() : `${d.date || ''} ${d.time || ''}`;
      const statusKorean = d.paymentStatus === 'completed' ? '결제완료' 
        : d.paymentStatus === 'pending' ? '결제대기' 
        : d.paymentStatus === 'cancelled' ? '결제취소' 
        : d.paymentStatus === 'failed' ? '결제실패' : (d.paymentStatus || d.status);
      
      const cleanPrayer = (d.prayerText || d.prayer || '').replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
      const donorPhoneFormatted = d.donorPhone ? formatPhoneNumber(d.donorPhone) : (d.phone ? formatPhoneNumber(d.phone) : '');
      const deviceStr = d.deviceType === 'KIOSK' ? '키오스크' : '모바일/웹';

      return [
        `"${d.id || ''}"`,
        `"${createdDate}"`,
        `"${deviceStr}"`,
        `"${d.donorName || d.name || ''}"`,
        `"${donorPhoneFormatted}"`,
        `"${d.itemName || d.item || ''}"`,
        d.amount || 0,
        `"${d.paymentMethod || d.method || '신용카드'}"`,
        `"${statusKorean}"`,
        `"${cleanPrayer}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const tenantName = currentTenant?.name || 'FaithPay';
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${tenantName}_봉헌내역_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${filteredDonations.length}건의 봉헌 내역이 엑셀(CSV)로 다운로드되었습니다.`);
  };

  const handleViewDetail = (donation: any) => {
    setSelectedDonation(donation);
  };

  const handlePrintReceipt = (donation: any) => {
    setReceiptDonation(donation);
  };

  const checkIsRecurring = (donation: any) => {
    if (!donation) return false;
    if (donation.isSubscription || donation.subscriptionId || donation.subscription_id || donation.is_subscription) return true;
    const method = String(donation.paymentMethod || donation.method || '');
    const type = String(donation.paymentType || donation.payment_type || '');
    const item = String(donation.itemName || donation.item || '');
    return method.includes('정기') || method.includes('빌링') || type.includes('recurring') || item.includes('정기');
  };

  const handleCancelPayment = (donation: any) => {
    const targetDonation = typeof donation === 'string' ? donations.find(d => d.id === donation) : donation;
    if (!targetDonation) return;

    if (checkIsRecurring(targetDonation)) {
      setRecurringCancelModalDonation(targetDonation);
    } else {
      if (window.confirm(`[${targetDonation.donorName || '무기명'}] 성도님의 결제(${(targetDonation.amount || 0).toLocaleString()}원)를 취소하시겠습니까?`)) {
        executeCancelPayment(targetDonation.id, false);
      }
    }
  };

  const executeCancelPayment = async (donationId: string, cancelSubscriptionAlso: boolean = false) => {
    setIsCancelling(true);
    try {
      const res = await paymentAPI.cancelPayment(currentTenant.id, donationId);
      if (res.success) {
        if (cancelSubscriptionAlso && recurringCancelModalDonation) {
          const subId = recurringCancelModalDonation.subscriptionId || recurringCancelModalDonation.subscription_id;
          if (subId) {
            await subscriptionAPI.updateStatus(subId, 'cancelled');
          }
        }

        toast.success(
          cancelSubscriptionAlso
            ? '해당 결제건이 취소되었으며, 향후 정기결제 스케줄도 해지되었습니다.'
            : '해당 결제건만 정상적으로 취소되었습니다.'
        );
        setSelectedDonation(null);
        setRecurringCancelModalDonation(null);

        // refresh data
        const refreshRes = await donationAPI.getByTenant(currentTenant.id);
        if (refreshRes.success && refreshRes.data) {
          setDonations(assignSequentialDonationIds(refreshRes.data));
        }
      } else {
        toast.error(`취소 실패: ${res.error}`);
      }
    } catch (e) {
      toast.error('취소 처리 중 오류가 발생했습니다.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
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
          <div className="w-full">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="h-8 w-8" style={{ color: currentTenant.primaryColor }} />
                  <h1 className="text-3xl font-bold">{terms.donationHistory} 관리</h1>
                </div>
                <p className="text-muted-foreground">{terms.donationHistory}을 조회하고 정기결제를 직접 관리하세요</p>
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
                        결제완료
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{completedCount}건</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        정상 승인된 봉헌
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        결제대기
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600">{pendingCount}건</div>
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
                          <SelectValue placeholder="결제상태" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 상태</SelectItem>
                          <SelectItem value="completed">결제완료</SelectItem>
                          <SelectItem value="pending">결제대기</SelectItem>
                          <SelectItem value="failed">결제실패</SelectItem>
                          <SelectItem value="cancelled">결제취소</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={methodFilter} onValueChange={setMethodFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="결제방법" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 결제방법</SelectItem>
                          <SelectItem value="신용카드">신용카드</SelectItem>
                          <SelectItem value="계좌이체">계좌이체</SelectItem>
                          <SelectItem value="가상계좌">가상계좌</SelectItem>
                          <SelectItem value="카카오페이">카카오페이</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="접수 기기" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 기기</SelectItem>
                          <SelectItem value="WEB_MOBILE">📱 모바일/웹</SelectItem>
                          <SelectItem value="KIOSK">🖥️ 키오스크</SelectItem>
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

                    {/* Hot-Cold Hybrid Data Loading Control Banner */}
                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {isTodayMode ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>🔥 당일 실시간 핫 서빙 모드 (DB 과부하 0%, 15초 자동 갱신 중)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-xl">
                            <span>📦 과거 내역 온디맨드(On-Demand) 정적 조회 모드 (실시간 동기화 오프, DB 서버 보호)</span>
                          </div>
                        )}

                        {/* Quick Preset Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setQuickPeriod('today')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              isTodayMode
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                            }`}
                          >
                            🔥 오늘 (실시간)
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickPeriod('this_week')}
                            className="px-3 py-1 text-xs font-semibold bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                          >
                            📅 이번 주
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickPeriod('this_month')}
                            className="px-3 py-1 text-xs font-semibold bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                          >
                            🗓️ 이번 달
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickPeriod('all')}
                            className="px-3 py-1 text-xs font-semibold bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                          >
                            📊 전체 보기
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          기간 상세 지정 (일별, 주별, 월별, 년별)
                        </span>
                        <PeriodRangePicker
                          unit={periodUnit}
                          onUnitChange={setPeriodUnit}
                          selection={periodSelection}
                          onSelectionChange={setPeriodSelection}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showFailed}
                          onChange={(e) => setShowFailed(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          ⚠️ 결제실패(중도이탈) 내역도 포함하여 함께 보기
                        </span>
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {showFailed ? '· 결제 미완료 이탈 건이 목록에 함께 노출 중입니다.' : '· 기본 설정: 결제 성공/정상 대기 내역만 표시 중'}
                      </span>
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
                            <TableHead>기기</TableHead>
                            <TableHead>이름</TableHead>
                            <TableHead>봉헌항목</TableHead>
                            <TableHead className="text-right">금액</TableHead>
                            <TableHead>결제방법</TableHead>
                            <TableHead>결제상태</TableHead>
                            <TableHead className="text-center">작업</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                              </TableCell>
                            </TableRow>
                          ) : currentDonations.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                조회된 봉헌 내역이 없습니다
                              </TableCell>
                            </TableRow>
                          ) : (
                            currentDonations.map((donation) => {
                              const createdDate = new Date(donation.createdAt);
                              const isValidDate = !isNaN(createdDate.getTime());
                              const dateStr = isValidDate ? createdDate.toLocaleDateString('ko-KR') : '-';
                              const timeStr = isValidDate ? createdDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
                              const isAnonymous = !donation.donorName || donation.donorName === '무기명';
                              const isKiosk = donation.deviceType === 'KIOSK';

                              return (
                                <TableRow key={donation.id}>
                                  <TableCell className="font-mono text-xs font-semibold text-slate-700">
                                    {donation.id}
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-medium text-slate-900">{dateStr}</div>
                                      <div className="text-muted-foreground text-xs">
                                        {timeStr}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {isKiosk ? (
                                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 font-semibold gap-1 text-[11px] py-0.5 px-2">
                                        <Monitor className="h-3 w-3" /> 키오스크
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-semibold gap-1 text-[11px] py-0.5 px-2">
                                        <Smartphone className="h-3 w-3" /> 모바일/웹
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">
                                        {isAnonymous ? (
                                          <Badge variant="outline" className="text-zinc-500 bg-zinc-50 border-zinc-200 text-xs font-normal">
                                            무기명
                                          </Badge>
                                        ) : (
                                          donation.donorName
                                        )}
                                      </div>
                                      {donation.donorPhone ? (
                                        <div className="text-xs text-muted-foreground">
                                          {formatPhoneNumber(donation.donorPhone)}
                                        </div>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                  <TableCell>{donation.itemName || '일반헌금/보시'}</TableCell>
                                  <TableCell className="text-right font-bold">
                                    {(donation.amount || 0).toLocaleString()}원
                                  </TableCell>
                                  <TableCell>{donation.paymentMethod || '신용카드'}</TableCell>
                                  <TableCell>{getStatusBadge(donation.paymentStatus)}</TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                        onClick={() => handleViewDetail(donation)}
                                        title="상세보기"
                                      >
                                        <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                        상세
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                        onClick={() => handlePrintReceipt(donation)}
                                        title="영수증 출력"
                                      >
                                        <Receipt className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                        영수증
                                      </Button>
                                      {donation.paymentStatus === 'completed' ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 px-2 text-xs font-bold border-red-200 text-red-600 bg-red-50/70 hover:bg-red-100 hover:text-red-700 cursor-pointer"
                                          onClick={() => handleCancelPayment(donation.id)}
                                          disabled={isCancelling}
                                          title="결제 취소 요청"
                                        >
                                          <RotateCcw className="h-3.5 w-3.5 mr-1 text-red-500" />
                                          {isCancelling ? '취소 중...' : '결제 취소'}
                                        </Button>
                                      ) : donation.paymentStatus === 'cancelled' ? (
                                        <span className="text-[11px] font-semibold text-slate-400 px-2 py-1 bg-slate-100 rounded-md">
                                          취소 완료
                                        </span>
                                      ) : null}
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
                        <p className="font-semibold">
                          {!selectedDonation.donorName || selectedDonation.donorName === '무기명' ? (
                            <Badge variant="outline" className="text-zinc-500 bg-zinc-50 border-zinc-200 text-xs font-normal">
                              무기명
                            </Badge>
                          ) : (
                            selectedDonation.donorName
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">연락처</p>
                        <p className="font-semibold">{selectedDonation.donorPhone ? formatPhoneNumber(selectedDonation.donorPhone) : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">봉헌 항목</p>
                        <p className="font-semibold">{selectedDonation.itemName || '일반헌금/보시'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">금액</p>
                        <p className="font-semibold text-lg">
                          {(selectedDonation.amount || 0).toLocaleString()}원
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">결제 방법</p>
                        <p className="font-semibold">{selectedDonation.paymentMethod || '신용카드'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">상태</p>
                        <div className="mt-1">{getStatusBadge(selectedDonation.paymentStatus)}</div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">접수 기기</p>
                        <div className="mt-1">
                          {selectedDonation.deviceType === 'KIOSK' ? (
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 font-semibold gap-1 text-xs">
                              <Monitor className="h-3.5 w-3.5" /> 키오스크 (KIOSK)
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-semibold gap-1 text-xs">
                              <Smartphone className="h-3.5 w-3.5" /> 모바일/웹 (Mobile)
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">봉헌 일시</p>
                        <p className="font-semibold">
                          {!isNaN(new Date(selectedDonation.createdAt).getTime()) ? new Date(selectedDonation.createdAt).toLocaleString('ko-KR') : '-'}
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
                      {selectedDonation.paymentStatus === 'completed' && (
                        <Button 
                          variant="destructive" 
                          onClick={() => handleCancelPayment(selectedDonation.id)}
                          disabled={isCancelling}
                          className="gap-1.5"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {isCancelling ? '취소 중...' : '결제 취소 요청'}
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

            {/* Recurring Payment Cancel Options Modal */}
            {recurringCancelModalDonation && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
                onClick={() => setRecurringCancelModalDonation(null)}
              >
                <Card
                  className="max-w-md w-full rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-xl">
                          <RotateCcw className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold">정기결제 취소 범위 선택</CardTitle>
                          <CardDescription className="text-xs">
                            {recurringCancelModalDonation.id} ({recurringCancelModalDonation.donorName || '무기명'})
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setRecurringCancelModalDonation(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                      선택하신 수납건은 <span className="font-bold text-indigo-600 dark:text-indigo-400">정기 자동 결제</span> 내역입니다. 처리할 취소 방식을 선택해 주세요.
                    </p>

                    <div className="space-y-3">
                      {/* Option 1: Only current transaction */}
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={() => executeCancelPayment(recurringCancelModalDonation.id, false)}
                        className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <RefreshCw className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center justify-between">
                              <span>이번 1건만 결제 취소</span>
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">스케줄 유지</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                              이번 달 발생한 결제건({(recurringCancelModalDonation.amount || 0).toLocaleString()}원)만 취소하고, 다음 달 정기결제 스케줄은 그대로 유지합니다.
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Option 2: Current + Future Schedule Cancel */}
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={() => executeCancelPayment(recurringCancelModalDonation.id, true)}
                        className="w-full text-left p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <CalendarX className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-sm text-red-900 dark:text-red-300 flex items-center justify-between">
                              <span>이번 건 취소 + 정기결제 해지</span>
                              <span className="text-xs text-red-600 font-semibold">스케줄 완전 해지</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                              이번 결제건을 취소함과 동시에 앞으로 예정된 정기결제(구독) 스케줄도 함께 해지(취소) 처리합니다.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRecurringCancelModalDonation(null)}
                        className="text-xs text-slate-500"
                      >
                        닫기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Printable Receipt Modal */}
            {receiptDonation && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
                onClick={() => setReceiptDonation(null)}
              >
                <div
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <style>{`
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #printable-receipt, #printable-receipt * {
                        visibility: visible !important;
                      }
                      #printable-receipt {
                        position: fixed !important;
                        left: 50% !important;
                        top: 50% !important;
                        transform: translate(-50%, -50%) !important;
                        width: 100% !important;
                        max-width: 600px !important;
                        margin: 0 !important;
                        padding: 30px !important;
                        box-shadow: none !important;
                        border: 2px solid #000 !important;
                        background: #fff !important;
                        color: #000 !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                    }
                  `}</style>

                  {/* Modal Action Header (no-print) */}
                  <div className="flex justify-between items-center pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800 no-print">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-indigo-600" />
                      <span>봉헌/보시 영수증</span>
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1 rounded-xl cursor-pointer"
                        onClick={() => window.print()}
                      >
                        <Printer className="h-4 w-4" />
                        프린트 / PDF 출력
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setReceiptDonation(null)}
                        className="h-8 w-8 rounded-xl cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Receipt Ticket Container (printable) */}
                  <div id="printable-receipt" className="bg-white text-zinc-900 p-6 rounded-xl border border-zinc-200 space-y-6">
                    {/* Organization & Receipt Header */}
                    <div className="text-center pb-4 border-b-2 border-zinc-900">
                      <p className="text-xs font-bold text-indigo-600 tracking-wider mb-1">{currentTenant?.name || 'FaithPay'}</p>
                      <h2 className="text-2xl font-black text-zinc-900 tracking-tight">봉 헌 / 보 시  영 수 증</h2>
                      <p className="text-[11px] text-zinc-500 mt-1">OFFICIAL DONATION RECEIPT</p>
                    </div>

                    {/* Metadata */}
                    <div className="flex justify-between text-xs text-zinc-600 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                      <div>
                        <span className="font-semibold text-zinc-500">영수증 번호: </span>
                        <span className="font-mono font-bold text-zinc-900">{receiptDonation.id}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-500">발행일시: </span>
                        <span className="font-bold text-zinc-900">{new Date(receiptDonation.createdAt || Date.now()).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>

                    {/* Receipt Details Table */}
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium">봉 헌 자</span>
                        <span className="col-span-2 font-bold text-zinc-900">{receiptDonation.donorName || receiptDonation.name} 님</span>
                      </div>
                      <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium">연 락 처</span>
                        <span className="col-span-2 font-semibold text-zinc-800">{formatPhoneNumber(receiptDonation.donorPhone || receiptDonation.phone || '')}</span>
                      </div>
                      <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium">봉 헌 항 목</span>
                        <span className="col-span-2 font-bold text-indigo-700">{receiptDonation.itemName || receiptDonation.item}</span>
                      </div>
                      <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium">결 제 수 단</span>
                        <span className="col-span-2 font-medium text-zinc-800">{receiptDonation.paymentMethod || receiptDonation.method || '신용카드'} (정상 처리)</span>
                      </div>
                      <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium">접 수 채 널</span>
                        <span className="col-span-2 font-medium text-zinc-800">
                          {receiptDonation.deviceType === 'KIOSK' ? '현장 키오스크 (KIOSK)' : '온라인 모바일/웹 (Mobile)'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 py-3 bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 items-center">
                        <span className="text-indigo-900 font-bold">봉 헌 금 액</span>
                        <div className="col-span-2">
                          <p className="text-xs text-indigo-700 font-semibold mb-0.5">
                            일금 {numberToKorean(receiptDonation.amount || 0)}원정
                          </p>
                          <p className="text-xl font-black text-indigo-950">
                            ₩ {(receiptDonation.amount || 0).toLocaleString()} 원
                          </p>
                        </div>
                      </div>
                      {(receiptDonation.prayerText || receiptDonation.prayer) && (
                        <div className="py-3 border-b border-zinc-100">
                          <span className="text-zinc-500 font-medium block mb-1">기도 / 축원 내용</span>
                          <p className="text-xs text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 italic">
                            "{receiptDonation.prayerText || receiptDonation.prayer}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Gratitude Statement & Stamp Seal */}
                    <div className="pt-4 border-t-2 border-zinc-900 text-center relative">
                      <p className="text-xs font-semibold text-zinc-700 leading-relaxed">
                        위 금액을 정성 어린 봉헌/보시금으로 정히 수령하였습니다.<br />
                        소중한 마음과 기도가 함께 하기를 기원합니다.
                      </p>
                      
                      <div className="mt-6 flex items-center justify-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-zinc-500">{new Date(receiptDonation.createdAt || Date.now()).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          <p className="text-sm font-bold text-zinc-900 mt-1">{currentTenant?.name || 'FaithPay (페이쓰페이)'}</p>
                        </div>

                        {/* Stamp SVG */}
                        <div className="w-14 h-14 rounded-full border-2 border-red-600 text-red-600 flex flex-col items-center justify-center text-[10px] font-black leading-tight transform -rotate-12 select-none shadow-xs">
                          <span>{currentTenant?.name?.slice(0, 4) || 'Faith'}</span>
                          <span className="text-[8px]">인 영</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
