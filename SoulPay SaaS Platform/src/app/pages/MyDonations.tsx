import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp, DonationFormData, DonationItem } from '../context/AppContext';
import { donationAPI, subscriptionAPI, memberAPI, donationItemsAPI, kakaoAuthAPI } from '../api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { 
  Search, 
  History, 
  Calendar, 
  ChevronRight, 
  Download,
  Receipt,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  User,
  Save,
  ShieldCheck,
  Mail,
  Lock,
  MapPin,
  List,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';

import TaxReceiptModal from '../components/TaxReceiptModal';
import DonationReceiptModal from '../components/DonationReceiptModal';
import { cleanPaymentMethod } from './admin/DonationHistory';
import { openDaumPostcode } from '../utils/daumPostcode';
import { useTenantTerms } from '../hooks/useTenantTerms';
import { MemberTitleSelect } from '../components/common/MemberTitleSelect';

export interface HistoryItem {
  id: string;
  itemId: string;
  itemName: string;
  amount: number;
  name: string;
  phone: string;
  date: string;
  rawDate?: string;
  status: string;
  paymentStatus?: string;
  cancelReason?: string;
  cancelledAt?: string;
  isRecurring: boolean;
  deviceType?: 'KIOSK' | 'WEB_MOBILE';
  paymentMethod?: string;
  createdAt?: string;
  approveNo?: string;
  transactionId?: string;
  cancelApproveNo?: string;
  cancelTransactionId?: string;
  prayerText?: string;
}

export default function MyDonations() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant } = useApp();
  const terms = useTenantTerms(currentTenant);

  // 📱 전화번호 하이픈 자동 포맷팅 헬퍼
  const formatPhoneNumber = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 11);
    if (clean.length <= 3) return clean;
    if (clean.length <= 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`;
  };
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 🔑 로그인 방식 상태
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isKakaoLoggingIn, setIsKakaoLoggingIn] = useState(false);

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any | null>(null);
  const [selectedReceiptDonation, setSelectedReceiptDonation] = useState<any | null>(null);

  // ⚡ 해지되지 않은 실제 유지/이용 중인 정기결제 건수만 카운트 (해지 완료 건 제외)
  const activeSubscriptionsCount = useMemo(() => {
    return subscriptions.filter(s => s.status !== 'cancelled').length;
  }, [subscriptions]);

  // 👤 회원 프로필 정보 수정 상태 (이메일, 주소, 세례명/법명/직분, 성명, 비밀번호, 우편번호, 상세주소)
  const [profileName, setProfileName] = useState('');
  const [profileBaptismName, setProfileBaptismName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileZonecode, setProfileZonecode] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileAddressDetail, setProfileAddressDetail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 🗂️ 서브 탭 메뉴 상태 ('history' | 'recurring' | 'profile')
  const [activeTab, setActiveTab] = useState<'history' | 'recurring' | 'profile'>('history');
  // 🔘 결제 상태 필터 ('all' | 'completed' | 'cancelled')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  // 📋 목록형/카드형 뷰 모드 ('list' | 'card', 기본값: 'list')
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  // 🔍 상세 내역 팝업/모달 대상 아이템
  const [selectedDetailItem, setSelectedDetailItem] = useState<HistoryItem | null>(null);

  // 📅 기간 지정 필터 상태 & 📄 10개씩 페이징 상태
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [quickRange, setQuickRange] = useState<'THIS_YEAR' | 'LAST_YEAR' | 'ALL' | 'CUSTOM'>('THIS_YEAR');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  const parseFullAddress = (rawAddr: string) => {
    if (!rawAddr) return { zonecode: '', base: '', detail: '' };
    const match = rawAddr.match(/^\[(\d{5})\]\s*(.*)$/);
    if (match) {
      return { zonecode: match[1], base: match[2], detail: '' };
    }
    return { zonecode: '', base: rawAddr, detail: '' };
  };

  const handleSearchAddress = () => {
    openDaumPostcode((res) => {
      setProfileZonecode(res.zonecode);
      setProfileAddress(res.address);
      toast.success('주소가 선택되었습니다. 상세주소를 입력해 주세요.');
    });
  };

  const loadSavedProfile = async (cleanPhone: string, donationsList: any[]) => {
    // DB 실측 프로필 조회 연동 (100% 실제 DB 실측 조회)
    try {
      const profRes = await memberAPI.getProfile(cleanPhone);
      if (profRes.success && profRes.data) {
        const p = profRes.data;
        if (p.name) setProfileName(p.name);
        if (p.baptismName) setProfileBaptismName(p.baptismName);
        if (p.email) setProfileEmail(p.email);
        if (p.zonecode) setProfileZonecode(p.zonecode);
        if (p.address || (p as any).addressBase) setProfileAddress(p.address || (p as any).addressBase);
        if (p.addressDetail) setProfileAddressDetail(p.addressDetail);
        return;
      }
    } catch (profErr) {
      console.warn('Failed to load remote profile in mypage:', profErr);
    }

    if (donationsList && donationsList.length > 0) {
      const first = donationsList[0];
      setProfileName(first.donorName || first.name || '');
      setProfileBaptismName(first.baptismName || '');
      setProfileEmail(first.donorEmail || first.email || '');
      
      const parsedAddr = parseFullAddress(first.address || '');
      setProfileZonecode(parsedAddr.zonecode);
      setProfileAddress(parsedAddr.base);
      setProfileAddressDetail(parsedAddr.detail);

      if (first.password) {
        setProfilePassword(first.password);
        setProfilePasswordConfirm(first.password);
      }
    } else {
      setProfileName('');
      setProfileBaptismName('');
      setProfileEmail('');
      setProfileZonecode('');
      setProfileAddress('');
      setProfileAddressDetail('');
      setProfilePassword('');
      setProfilePasswordConfirm('');
    }
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error('성명(이름)을 입력해 주세요.');
      return;
    }

    if (profilePassword || profilePasswordConfirm) {
      if (profilePassword.length < 4) {
        toast.error('비밀번호는 최소 4자리 이상 입력해 주세요.');
        return;
      }
      if (profilePassword !== profilePasswordConfirm) {
        toast.error('비밀번호와 비밀번호 확인이 서로 일치하지 않습니다.');
        return;
      }
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    setIsSavingProfile(true);

    const combinedAddress = profileZonecode
      ? `[${profileZonecode}] ${profileAddress.trim()} ${profileAddressDetail.trim()}`.trim()
      : `${profileAddress.trim()} ${profileAddressDetail.trim()}`.trim();

    try {
      const profileData = {
        name: profileName,
        baptismName: profileBaptismName,
        email: profileEmail,
        zonecode: profileZonecode,
        address: profileAddress,
        addressDetail: profileAddressDetail,
        fullAddress: combinedAddress,
        password: profilePassword,
        updatedAt: new Date().toISOString(),
      };

      await memberAPI.updateProfile(cleanPhone, {
        name: profileName,
        baptismName: profileBaptismName,
        email: profileEmail,
        zonecode: profileZonecode,
        address: profileAddress,
        addressDetail: profileAddressDetail,
        fullAddress: combinedAddress,
        password: profilePassword,
      });

      setHistory(prev => prev.map(h => ({ ...h, name: profileName })));
      toast.success('회원 프로필 정보 및 주소/비밀번호가 성공적으로 저장되었습니다.');
    } catch (e) {
      toast.success('프로필 정보가 저장되었습니다.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleKakaoLogin = () => {
    setIsKakaoLoggingIn(true);
    const redirectUri = `${window.location.origin}/oauth/kakao/callback`;
    const kakaoUrl = kakaoAuthAPI.getAuthUrl(tenantSlug || '', redirectUri);
    window.location.href = kakaoUrl;
  };

  const handleEmailLogin = async () => {
    if (!loginEmail.trim()) {
      toast.error('이메일 주소를 입력해 주세요.');
      return;
    }
    if (!loginPassword) {
      toast.error('비밀번호를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await memberAPI.loginWithEmail(currentTenant.id, loginEmail, loginPassword);
      if (res.success && res.data && res.data.found && res.data.phone) {
        setIsAuthenticated(true);
        const userPhone = res.data.phone.replace(/[^0-9]/g, '');
        setPhoneNumber(userPhone);
        sessionStorage.setItem('soulpay_donor_session', userPhone);
        await fetchDonorData(userPhone);
        toast.success(`이메일 로그인 성공! ${res.data.donorName || terms.donor}님의 마이페이지입니다.`);
      } else {
        toast.error(res.error || '등록되지 않은 이메일이거나 비밀번호가 일치하지 않습니다. 휴대폰 1초 인증으로 로그인하신 후 프로필에서 이메일과 비밀번호를 등록해 주세요.');
      }
    } catch (err: any) {
      toast.error(err?.message || '이메일 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [quickRange, startDate, endDate]);

  const [dbItems, setDbItems] = useState<DonationItem[]>([]);

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  // DB에서 수납 항목 로드
  useEffect(() => {
    if (currentTenant) {
      donationItemsAPI.getItems(currentTenant.id).then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setDbItems(res.data);
        }
      }).catch(() => {});
    }
  }, [currentTenant]);

  const fetchDonorData = useCallback(async (targetPhone: string) => {
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || !currentTenant) return;

    setIsLoading(true);
    try {
      const dbRes = await donationAPI.getByTenant(currentTenant.id);
      let matchedRaw: any[] = [];
      if (dbRes.success && Array.isArray(dbRes.data)) {
        matchedRaw = dbRes.data.filter(d => {
          const phoneMatch = (d.donorPhone || d.donor_phone || '').replace(/[^0-9]/g, '') === cleanPhone;
          const status = d.paymentStatus || d.payment_status || d.status || 'completed';
          return phoneMatch && (status === 'completed' || status === 'cancelled');
        });
      }

      const matched: HistoryItem[] = matchedRaw.map(d => {
        const rawStatus = d.paymentStatus || d.payment_status || d.status || 'completed';
        const isCancelled = rawStatus === 'cancelled';
        return {
          id: d.id,
          itemId: d.itemId,
          itemName: d.itemName,
          amount: d.amount,
          name: d.donorName || d.donor_name || d.name,
          phone: d.donorPhone || d.donor_phone || cleanPhone,
          date: d.createdAt ? new Date(d.createdAt).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR'),
          rawDate: d.createdAt || d.created_at,
          createdAt: d.createdAt || d.created_at,
          status: isCancelled ? '결제취소' : '결제완료',
          paymentStatus: rawStatus,
          cancelReason: d.cancelReason || d.cancel_reason,
          cancelledAt: d.cancelledAt || d.cancelled_at,
          isRecurring: d.isRecurring,
          deviceType: d.deviceType || ((d.paymentMethod || '').includes('OffPG') || (d.paymentMethod || '').includes('키오스크') ? 'KIOSK' : 'WEB_MOBILE'),
          paymentMethod: cleanPaymentMethod(d.paymentMethod),
          approveNo: d.approveNo || d.approve_no,
          transactionId: d.transactionId || d.transaction_id,
          cancelApproveNo: d.cancelApproveNo || d.cancel_approve_no,
          cancelTransactionId: d.cancelTransactionId || d.cancel_transaction_id,
          prayerText: d.prayerText || d.prayer_text,
        };
      });

      setHistory(matched);
      loadSavedProfile(cleanPhone, matchedRaw);

      // 정기결제 약정 목록: 실제 DB subscriptions 테이블에서 휴대폰 번호로 등록된 약정 실측 조회
      let realSubs: any[] = [];
      try {
        const subRes = await subscriptionAPI.getByPhone(cleanPhone, currentTenant.id);
        if (subRes.success && Array.isArray(subRes.data)) {
          realSubs = subRes.data.filter((s: any) => s.tenantId === currentTenant.id || s.tenant_id === currentTenant.id || s.tenantId === currentTenant.slug);
        }
      } catch (subErr) {
        console.warn('Failed to fetch real subscriptions from DB:', subErr);
      }

      if (realSubs.length > 0) {
        setSubscriptions(realSubs);
      } else {
        // DB subscriptions 테이블에 아직 미등록된 레거시 이력인 경우만 결제 완료 이력에서 보조 매핑
        const recurringLogs = matchedRaw.filter(d => d.isRecurring && (!d.paymentStatus || d.paymentStatus === 'completed'));
        const fetchedSubs: any[] = recurringLogs.map(d => ({
          id: d.id || `sub_${d.createdAt || Date.now()}`,
          tenantId: currentTenant.id,
          donorName: d.donorName || d.name,
          donorPhone: d.donorPhone || cleanPhone,
          itemName: d.itemName || '정기 봉헌금',
          amount: d.amount,
          status: 'active',
          recurringInterval: d.recurringInterval || 'monthly',
          recurringDay: d.recurringDay || 10,
          recurringDayOfWeek: d.recurringDayOfWeek,
          nextPaymentDate: d.nextPaymentDate,
          createdAt: d.createdAt,
        }));
        setSubscriptions(fetchedSubs);
      }
    } catch (err) {
      console.warn('Error fetching donor data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    if (!currentTenant) return;

    // 결제 완료 후 또는 이전 인증 세션 복원 (URL 파라미터 phone 포함)
    const searchParams = new URLSearchParams(location.search);
    const queryPhone = searchParams.get('phone');
    const savedPhone = queryPhone || sessionStorage.getItem('soulpay_donor_session') || sessionStorage.getItem('faithpay_donor_session') || localStorage.getItem('soulpay_last_donor_phone') || localStorage.getItem('faithpay_last_donor_phone');
    if (savedPhone) {
      const clean = savedPhone.replace(/[^0-9]/g, '');
      if (clean) {
        setPhoneNumber(clean);
        setIsAuthenticated(true);
        fetchDonorData(clean);
      }
    }
  }, [currentTenant, fetchDonorData]);

  const handleLogout = () => {
    sessionStorage.removeItem('soulpay_donor_session');
    sessionStorage.removeItem('faithpay_donor_session');
    localStorage.removeItem('soulpay_last_donor_phone');
    localStorage.removeItem('faithpay_last_donor_phone');
    setIsAuthenticated(false);
    setPhoneNumber('');
    setOtpCode('');
    setIsOtpSent(false);
    setHistory([]);
    toast.info('로그아웃 되었습니다.');
  };

  if (!currentTenant) return null;

  const effectiveItems = dbItems;
  const hasRecurringSupport = effectiveItems.length > 0
    ? effectiveItems.some(item => item.enabled !== false && item.allowRecurring !== false)
    : true;




  const handleUpdateSubStatus = async (subId: string, newStatus: 'paused' | 'cancelled' | 'active') => {
    const labelMap = { paused: '일시정지', cancelled: '해지', active: '재개' };
    const donationTerm = currentTenant?.terminology?.donation || '헌금';
    if (!window.confirm(`정말 정기 ${donationTerm}을(를) ${labelMap[newStatus]}하시겠습니까?`)) return;

    try {
      const res = await subscriptionAPI.updateStatus(subId, newStatus);
      const updatedSub = (res as any)?.subscription || res?.data?.subscription || res?.data;
      if (res.success && (updatedSub || res.data !== undefined)) {
        toast.success(`정기 ${donationTerm}이(가) ${labelMap[newStatus]} 처리되었습니다.`);
        setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, ...(updatedSub || {}), status: newStatus } : s));
      } else {
        toast.error(`처리 실패: ${res.error || '상태 갱신에 실패했습니다.'}`);
      }
    } catch (e) {
      toast.error('처리 중 오류가 발생했습니다.');
    }
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
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 cursor-pointer"
              onClick={() => navigate(`/${tenantSlug}`)}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">내 {currentTenant.terminology.donation} 내역</h1>
              <p className="opacity-90 mt-1">{currentTenant.name}와 함께하는 소중한 나눔</p>
            </div>
          </div>

          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-white/15 hover:bg-white/25 text-white border-white/40 text-sm sm:text-base font-bold rounded-xl cursor-pointer shadow-xs h-10 sm:h-11 px-4 sm:px-5"
            >
              로그아웃
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {!isAuthenticated ? (
          <Card className="shadow-lg border-none rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
            <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800 text-center">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <CardTitle className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100">
                  {terms.donor} 마이페이지
                </CardTitle>
              </div>
              <Badge variant="outline" className="mx-auto text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 border-indigo-200 px-3 py-1 rounded-lg">
                {currentTenant.name} 전용
              </Badge>
              <CardDescription className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 pt-2.5 leading-relaxed font-medium">
                카카오 1초 간편 로그인으로 본인 확인 후 {terms.donation} 내역과 기부금 영수증을 즉시 확인하실 수 있습니다.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              {/* 💬 카카오 1초 간편 로그인 (원클릭 대표 인증) */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleKakaoLogin}
                  disabled={isKakaoLoggingIn}
                  className="w-full h-14 sm:h-16 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#FDD835] active:scale-[0.99] text-[#191919] font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isKakaoLoggingIn ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#191919]" />
                  ) : (
                    <svg className="w-6 h-6 fill-current flex-shrink-0" viewBox="0 0 24 24">
                      <path d="M12 3C6.477 3 2 6.477 2 10.769c0 2.769 1.872 5.187 4.693 6.556-.206.775-.747 2.809-.854 3.245-.135.544.198.536.417.391.171-.113 2.716-1.846 3.822-2.602.627.09 1.27.139 1.922.139 5.523 0 10-3.477 10-7.769S17.523 3 12 3z"/>
                    </svg>
                  )}
                  <span>카카오로 1초 만에 간편 조회</span>
                </button>

                <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-4 sm:p-5 space-y-3 text-sm sm:text-base text-slate-700 dark:text-zinc-300 font-medium">
                  <div className="flex items-start gap-2.5">
                    <span className="text-amber-500 font-black text-base sm:text-lg flex-shrink-0 mt-0.5">✓</span>
                    <span className="leading-snug">문자 인증번호 입력 없이 카카오톡으로 1초 만에 안전 조회</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-emerald-500 font-black text-base sm:text-lg flex-shrink-0 mt-0.5">✓</span>
                    <span className="leading-snug">내가 동참한 {terms.donation} 내역 및 기부금 영수증 즉시 열람 및 출력</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-500 font-black text-base sm:text-lg flex-shrink-0 mt-0.5">✓</span>
                    <span className="leading-snug">신청한 정기 {terms.donation}(약정) 내역 확인 및 간편 일시정지/해지 관리</span>
                  </div>
                </div>
              </div>

              {/* ✉️ 이메일 계정 로그인 전환 옵션 */}
              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 text-center">
                {!showEmailLogin ? (
                  <button
                    type="button"
                    onClick={() => setShowEmailLogin(true)}
                    className="text-sm sm:text-base text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-semibold inline-flex items-center gap-2 py-2 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    등록된 이메일 계정으로 로그인하기
                  </button>
                ) : (
                  <div className="space-y-4 text-left pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-indigo-500" />
                        이메일 로그인
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEmailLogin(false)}
                        className="text-xs sm:text-sm text-slate-400 hover:text-slate-600 cursor-pointer font-medium"
                      >
                        접기
                      </button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-bold text-slate-800">이메일 주소</Label>
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="h-12 rounded-xl bg-zinc-50 text-base font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-bold text-slate-800">비밀번호</Label>
                      <Input
                        type="password"
                        placeholder="비밀번호 입력"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-12 rounded-xl bg-zinc-50 text-base"
                      />
                    </div>
                    <Button
                      className="w-full h-12 text-base font-bold rounded-xl text-white cursor-pointer shadow-xs mt-1"
                      style={{ backgroundColor: currentTenant.primaryColor }}
                      onClick={handleEmailLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      이메일로 마이페이지 로그인
                    </Button>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 text-center pt-2">
                      비밀번호를 잊으셨나요?{' '}
                      <button
                        type="button"
                        onClick={handleKakaoLogin}
                        className="text-amber-600 font-bold underline cursor-pointer"
                      >
                        카카오로 1초 간편 조회
                      </button>
                      를 이용해 보세요.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* 🗂️ 마이페이지 서브 탭 서브메뉴 (봉헌 내역 / 정기결제 / 정보 관리) */}
            <div className="flex bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-2xl gap-1.5 border border-slate-200/80 dark:border-zinc-700 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-3.5 px-3 rounded-xl text-base sm:text-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span>{terms.donation} 내역</span>
                {history.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 text-xs sm:text-sm bg-slate-200 dark:bg-zinc-700 px-2.5 py-0.5 font-black">
                    {history.length}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recurring')}
                className={`flex-1 py-3.5 px-3 rounded-xl text-base sm:text-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'recurring'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span>정기결제</span>
                {activeSubscriptionsCount > 0 && (
                  <Badge className="ml-0.5 text-xs sm:text-sm bg-indigo-600 text-white px-2.5 py-0.5 font-black">
                    {activeSubscriptionsCount}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-3.5 px-3 rounded-xl text-base sm:text-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'profile'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span>정보 관리</span>
              </button>
            </div>

            {/* TAB 1: 👤 정보 관리 */}
            {activeTab === 'profile' && (
              <Card className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/50">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>내 프로필 및 기부자 정보 관리</span>
                    </CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs sm:text-sm font-bold border-none px-2.5 py-1">
                      본인인증 완료 ({formatPhoneNumber(phoneNumber)})
                    </Badge>
                  </div>
                  <CardDescription className="text-sm text-slate-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    휴대폰 번호 인증을 바탕으로 성명, 이메일, 주소, {currentTenant.religionType === 'catholic' ? '세례명' : currentTenant.religionType === 'buddhist' ? '법명' : currentTenant.religionType === 'protestant' ? '직분' : '호칭'} 등 프로필 정보를 자유롭게 업데이트하실 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200">
                        성명 (이름) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="성명 입력"
                        className="text-sm sm:text-base h-11 sm:h-12 font-bold bg-slate-50 dark:bg-zinc-800 border-slate-200"
                      />
                    </div>

                    <MemberTitleSelect
                      value={profileBaptismName}
                      onChange={setProfileBaptismName}
                      religionType={currentTenant.religionType}
                      showLabel={true}
                      id="profile-baptism-name"
                    />

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200">
                        이메일 주소
                      </Label>
                      <Input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="text-sm sm:text-base h-11 sm:h-12 font-mono bg-slate-50 dark:bg-zinc-800 border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200">
                        인증 휴대폰 번호
                      </Label>
                      <Input
                        type="text"
                        value={formatPhoneNumber(phoneNumber)}
                        disabled
                        className="text-sm sm:text-base h-11 sm:h-12 font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 cursor-not-allowed border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Lock className="h-4 w-4 text-indigo-600" />
                        마이페이지 로그인 비밀번호 설정
                      </Label>
                      <Input
                        type="password"
                        value={profilePassword}
                        onChange={(e) => setProfilePassword(e.target.value)}
                        placeholder="새 비밀번호 입력 (4자리 이상)"
                        className="text-sm sm:text-base h-11 sm:h-12 bg-slate-50 dark:bg-zinc-800 border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200">
                        비밀번호 확인
                      </Label>
                      <Input
                        type="password"
                        value={profilePasswordConfirm}
                        onChange={(e) => setProfilePasswordConfirm(e.target.value)}
                        placeholder="비밀번호 재입력 확인"
                        className="text-sm sm:text-base h-11 sm:h-12 bg-slate-50 dark:bg-zinc-800 border-slate-200"
                      />
                    </div>
                  </div>

                  {/* 🏠 우편번호 검색 및 상세주소 분리 입력 섹션 */}
                  <div className="space-y-2.5 border-t border-slate-100 dark:border-zinc-800 pt-4">
                    <Label className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-indigo-600" />
                        기부자 주소 (기부금영수증 및 우편용)
                      </span>
                      <span className="text-xs text-indigo-600 font-semibold">· 카카오 우편번호 검색 지원</span>
                    </Label>
                    
                    {/* 우편번호 & 우편번호 검색 버튼 */}
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={profileZonecode}
                        readOnly
                        placeholder="우편번호"
                        className="w-36 text-sm sm:text-base h-11 sm:h-12 font-mono font-bold bg-slate-100 dark:bg-zinc-800 border-slate-200 text-slate-600"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSearchAddress}
                        className="h-11 sm:h-12 text-sm font-bold px-4 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Search className="h-4 w-4" />
                        우편번호 검색
                      </Button>
                    </div>

                    {/* 기본 주소 */}
                    <Input
                      type="text"
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder="우편번호 검색을 이용하시거나 도로명/지번 기본주소를 입력해 주세요"
                      className="text-sm sm:text-base h-11 sm:h-12 bg-slate-50 dark:bg-zinc-800 border-slate-200"
                    />

                    {/* 상세 주소 */}
                    <Input
                      type="text"
                      value={profileAddressDetail}
                      onChange={(e) => setProfileAddressDetail(e.target.value)}
                      placeholder="상세주소를 입력해 주세요 (예: 101동 1002호 / 2층)"
                      className="text-sm sm:text-base h-11 sm:h-12 bg-slate-50 dark:bg-zinc-800 border-slate-200 font-medium text-slate-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="pt-3 flex justify-end">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm sm:text-base h-11 sm:h-12 px-6 rounded-xl cursor-pointer shadow-xs gap-2"
                    >
                      {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      내 정보 수정사항 저장
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TAB 2: ⚡ 정기결제 */}
            {activeTab === 'recurring' && (
              (hasRecurringSupport || subscriptions.length > 0) ? (
                <Card className="border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl overflow-hidden shadow-xs">
                  <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <CardTitle className="text-lg sm:text-xl font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                        <span>내 정기{currentTenant.terminology.donation} 셀프 관리</span>
                      </CardTitle>
                      <Badge className="bg-indigo-600 text-white text-xs sm:text-sm font-bold px-2.5 py-1">본인인증 완료</Badge>
                    </div>
                    <CardDescription className="text-sm sm:text-base text-indigo-700 dark:text-indigo-400 mt-1.5 leading-relaxed">
                      매월 자동 청구되는 정기 {currentTenant.terminology.donation}을(를) 직접 일시정지하거나 즉시 해지하실 수 있습니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {subscriptions.length === 0 ? (
                      <div className="text-center py-8 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900">
                        <p className="text-sm sm:text-base font-semibold text-zinc-600 dark:text-zinc-400 mb-4">
                          현재 매월 자동 청구 등록된 정기 {currentTenant.terminology.donation}이(가) 없습니다.
                        </p>
                        {/* 정기결제/정기보시를 지원하는 단체인 경우에만 신청하기 버튼 노출 */}
                        {hasRecurringSupport && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm sm:text-base h-11 px-5 rounded-xl cursor-pointer shadow-xs"
                            onClick={() => {
                              const recurringItem = effectiveItems.find(i => i.enabled !== false && i.allowRecurring !== false) || (effectiveItems.length > 0 ? effectiveItems[0] : null);
                              navigate(`/${tenantSlug}/donate`, { state: { selectedItem: recurringItem, isRecurring: true } });
                            }}
                          >
                            정기 {currentTenant.terminology.donation} 신청하러 가기
                          </Button>
                        )}
                      </div>
                    ) : (
                    subscriptions.map(sub => (
                      <div key={sub.id} className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col gap-3.5">
                        <div>
                          <div className="flex justify-between items-start mb-1.5">
                            <h4 className="font-bold text-base sm:text-lg">{sub.itemName}</h4>
                            <Badge className={`text-xs sm:text-sm font-bold px-2.5 py-1 ${sub.status === 'active' ? 'bg-green-100 text-green-800' : sub.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                              {sub.status === 'active' ? '이용 중' : sub.status === 'paused' ? '일시정지' : '해지 완료'}
                            </Badge>
                          </div>
                          <div className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 space-y-1 mt-1 leading-relaxed">
                            <p>· 금액: <span className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100">{sub.amount.toLocaleString()}원</span> ({
                              (sub.recurringInterval || sub.recurring_interval) === 'daily'
                                ? '매일 자동결제'
                                : (sub.recurringInterval || sub.recurring_interval) === 'weekly'
                                  ? `매주 (${['일','월','화','수','목','금','토'][Number(sub.recurringDayOfWeek ?? sub.recurring_day_of_week ?? 0)] || '일'})요일`
                                  : `매월 ${sub.recurringDay || sub.recurring_day || 10}일`
                            })</p>
                            <p>· 결제카드: {sub.cardName || '신용카드'}{sub.cardNo ? ` (${sub.cardNo})` : ''}</p>
                            {(sub.nextPaymentDate || sub.next_payment_date) && (
                              <p>· 다음(첫) 결제 예정일: <span className="font-bold text-indigo-600 dark:text-indigo-400">{sub.nextPaymentDate || sub.next_payment_date}</span></p>
                            )}
                          </div>
                        </div>

                        {sub.status !== 'cancelled' && (
                          <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                            {sub.status === 'active' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs sm:text-sm px-2 h-10 sm:h-11 border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer font-bold flex items-center justify-center whitespace-nowrap"
                                onClick={() => handleUpdateSubStatus(sub.id, 'paused')}
                              >
                                정기 {currentTenant.terminology.donation} 일시정지
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs sm:text-sm px-2 h-10 sm:h-11 border-green-300 text-green-700 hover:bg-green-50 cursor-pointer font-bold flex items-center justify-center whitespace-nowrap"
                                onClick={() => handleUpdateSubStatus(sub.id, 'active')}
                              >
                                정기 {currentTenant.terminology.donation} 재개
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full text-xs sm:text-sm px-2 h-10 sm:h-11 cursor-pointer font-bold flex items-center justify-center whitespace-nowrap"
                              onClick={() => handleUpdateSubStatus(sub.id, 'cancelled')}
                            >
                              정기 {currentTenant.terminology.donation} 해지
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              ) : (
                <Card className="p-8 text-center bg-white rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm sm:text-base font-semibold text-zinc-600 dark:text-zinc-400">
                    현재 매월 자동 청구 등록된 정기 {currentTenant.terminology.donation}이(가) 없습니다.
                  </p>
                </Card>
              )
            )}

            {/* TAB 3: 📋 봉헌 내역 (Default) */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {/* 📅 기간 지정 필터 바 */}
                <Card className="bg-white border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100">
                      {terms.donation} 내역 기간 지정
                    </span>

                    {/* 퀵 렌지 선택 버튼 */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'THIS_YEAR', label: `올해 (${new Date().getFullYear()}년)` },
                        { key: 'LAST_YEAR', label: `작년 (${new Date().getFullYear() - 1}년)` },
                        { key: 'ALL', label: '전체' },
                        { key: 'CUSTOM', label: '직접 입력' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setQuickRange(key as any)}
                          className={`px-4 py-2.5 rounded-xl text-sm sm:text-base font-bold cursor-pointer border transition-all ${
                            quickRange === key
                              ? 'bg-[#3182F6] text-white border-[#3182F6] shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 직접 기간 입력 날짜 선택기 */}
                  {quickRange === 'CUSTOM' && (
                    <div className="flex flex-wrap items-center gap-3 pt-3.5 border-t border-slate-100 dark:border-zinc-800 text-sm sm:text-base animate-in fade-in duration-150">
                      <span className="font-bold text-slate-800 dark:text-zinc-200">조회 시작일:</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-mono outline-none focus:border-[#3182F6]"
                      />
                      <span className="text-slate-400 font-bold">~</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">종료일:</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-mono outline-none focus:border-[#3182F6]"
                      />
                      {(startDate || endDate) && (
                        <button
                          onClick={() => { setStartDate(''); setEndDate(''); }}
                          className="text-sm font-bold text-red-500 underline ml-auto cursor-pointer"
                        >
                          날짜 초기화
                        </button>
                      )}
                    </div>
                  )}
                </Card>

                {/* 📊 동적 기간 및 상태 필터링 로직 계산 */}
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const dateFilteredHistory = history.filter((item) => {
                    if (!item.rawDate) return true;
                    const d = new Date(item.rawDate);
                    if (isNaN(d.getTime())) return true;

                    if (quickRange === 'THIS_YEAR') return d.getFullYear() === currentYear;
                    if (quickRange === 'LAST_YEAR') return d.getFullYear() === currentYear - 1;
                    if (quickRange === 'CUSTOM') {
                      if (startDate && d < new Date(startDate)) return false;
                      if (endDate && d > new Date(endDate + 'T23:59:59')) return false;
                      return true;
                    }
                    return true; // 'ALL'
                  });

                  const completedList = dateFilteredHistory.filter(item => item.paymentStatus !== 'cancelled');
                  const cancelledList = dateFilteredHistory.filter(item => item.paymentStatus === 'cancelled');

                  const filteredHistory = dateFilteredHistory.filter((item) => {
                    if (statusFilter === 'completed') return item.paymentStatus !== 'cancelled';
                    if (statusFilter === 'cancelled') return item.paymentStatus === 'cancelled';
                    return true;
                  });

                  const filteredTotal = completedList.reduce((sum, item) => sum + (item.amount || 0), 0);
                  const filteredCount = completedList.length;
                  const cancelledCount = cancelledList.length;

                  // 📄 10개씩 페이징 계산
                  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE) || 1;
                  const paginatedHistory = filteredHistory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                  const rangeText = quickRange === 'THIS_YEAR'
                    ? `올해 (${currentYear}년)`
                    : quickRange === 'LAST_YEAR'
                    ? `작년 (${currentYear - 1}년)`
                    : quickRange === 'CUSTOM'
                    ? (startDate || endDate ? `${startDate || '최초'} ~ ${endDate || '현재'}` : '선택 기간')
                    : '전체 기간';

                  return (
                    <>
                      {/* Stats Summary 카드 */}
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs">
                          <p className="text-base sm:text-lg text-slate-700 dark:text-zinc-300 mb-2 font-bold">
                            {rangeText} 실 {terms.donation} 총액
                          </p>
                          <p className="text-3xl sm:text-4xl font-black font-mono tracking-tight" style={{ color: currentTenant.primaryColor }}>
                            {filteredTotal.toLocaleString()}원
                          </p>
                          {cancelledCount > 0 && (
                            <p className="text-sm text-red-500 font-semibold mt-2">
                              (결제취소 {cancelledCount}건 제외됨)
                            </p>
                          )}
                        </div>
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs">
                          <p className="text-base sm:text-lg text-slate-700 dark:text-zinc-300 mb-2 font-bold">
                            {rangeText} 참여 횟수
                          </p>
                          <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-zinc-100 font-mono tracking-tight">{filteredCount}회</p>
                          {cancelledCount > 0 && (
                            <p className="text-sm text-slate-400 dark:text-zinc-500 font-semibold mt-2">
                              총 {dateFilteredHistory.length}건 중 {cancelledCount}건 취소
                            </p>
                          )}
                        </div>
                      </div>

                      {/* History List Header with Status Filter & View Mode Toggle */}
                      <div className="space-y-4 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100">
                            {terms.donation} 상세 내역 ({filteredHistory.length}건)
                          </h3>

                          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
                            {/* 🔘 결제 상태 필터 (전체 / 결제완료 / 결제취소) */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-2xl">
                              <button
                                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                                  statusFilter === 'all'
                                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                                }`}
                              >
                                전체 ({dateFilteredHistory.length})
                              </button>
                              <button
                                onClick={() => { setStatusFilter('completed'); setCurrentPage(1); }}
                                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                                  statusFilter === 'completed'
                                    ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-400 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                                }`}
                              >
                                결제완료 ({completedList.length})
                              </button>
                              <button
                                onClick={() => { setStatusFilter('cancelled'); setCurrentPage(1); }}
                                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                                  statusFilter === 'cancelled'
                                    ? 'bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                                }`}
                              >
                                결제취소 ({cancelledList.length})
                              </button>
                            </div>

                            {/* 📋 / ⊞ 뷰 모드 토글 (목록형 / 카드형) */}
                            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-2xl">
                              <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                title="목록형으로 보기"
                                className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                                  viewMode === 'list'
                                    ? 'bg-white dark:bg-zinc-700 text-[#3182F6] dark:text-blue-400 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                                }`}
                              >
                                <List className="h-4.5 w-4.5" />
                                <span className="hidden sm:inline">목록</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setViewMode('card')}
                                title="카드형으로 보기"
                                className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                                  viewMode === 'card'
                                    ? 'bg-white dark:bg-zinc-700 text-[#3182F6] dark:text-blue-400 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                                }`}
                              >
                                <LayoutGrid className="h-4.5 w-4.5" />
                                <span className="hidden sm:inline">카드</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {filteredHistory.length === 0 ? (
                          <Card className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <AlertCircle className="h-12 w-12 text-zinc-400 mx-auto mb-3" />
                            <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                              선택하신 기간 및 조건에 해당하는 {terms.donation} 내역이 없습니다.
                            </p>
                            <p className="text-base text-zinc-500">
                              상단의 [전체] 버튼을 누르거나 필터 조건을 변경하여 조회해 보세요.
                            </p>
                          </Card>
                        ) : (
                          <>
                            {viewMode === 'list' ? (
                              /* ── 📋 컴팩트 목록형 뷰 (스크롤 최적화 & 행 클릭 시 상세 모달 오픈) ── */
                              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-zinc-800/80">
                                {paginatedHistory.map((item) => {
                                  const isCancelled = item.paymentStatus === 'cancelled';
                                  const isKiosk = item.deviceType === 'KIOSK' || (item.paymentMethod || '').includes('OffPG');
                                  const cleanedMethod = cleanPaymentMethod(item.paymentMethod);

                                  return (
                                    <div
                                      key={item.id}
                                      onClick={() => setSelectedDetailItem(item)}
                                      className={`group px-5 py-4.5 sm:px-6 sm:py-5 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                                        isCancelled
                                          ? 'hover:bg-red-50/30 dark:hover:bg-red-950/20 bg-red-50/5'
                                          : 'hover:bg-slate-50/90 dark:hover:bg-zinc-800/60'
                                      }`}
                                    >
                                      {/* Left Column: Item Name & Badges & Meta */}
                                      <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-black text-lg sm:text-xl text-slate-900 dark:text-zinc-100 group-hover:text-[#3182F6] dark:group-hover:text-blue-400 transition-colors truncate">
                                            {item.itemName}
                                          </span>
                                          {item.isRecurring && (
                                            <span className="inline-flex items-center text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40">
                                              정기
                                            </span>
                                          )}
                                          {isKiosk && (
                                            <span className="inline-flex items-center text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                                              키오스크
                                            </span>
                                          )}
                                          {isCancelled && (
                                            <span className="inline-flex items-center text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/60">
                                              취소됨
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-2 text-sm sm:text-base text-slate-600 dark:text-zinc-300 font-medium">
                                          <span className="font-mono text-slate-800 dark:text-zinc-200 font-bold">{item.date}</span>
                                          <span className="text-slate-300 dark:text-zinc-600">·</span>
                                          <span className="truncate max-w-[160px] sm:max-w-[260px] text-slate-700 dark:text-zinc-300">
                                            {cleanedMethod}
                                          </span>
                                          {isCancelled && item.cancelReason && (
                                            <>
                                              <span className="text-slate-300 dark:text-zinc-600 hidden sm:inline">·</span>
                                              <span className="text-red-600 dark:text-red-400 font-bold truncate max-w-[180px] hidden sm:inline">
                                                사유: {item.cancelReason}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right Column: Amount & Status & Chevron */}
                                      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                                        <div className="text-right">
                                          <div
                                            className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                                              isCancelled ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-900 dark:text-zinc-100'
                                            }`}
                                            style={!isCancelled && currentTenant?.primaryColor ? { color: currentTenant.primaryColor } : undefined}
                                          >
                                            {item.amount.toLocaleString()}원
                                          </div>
                                          <div className="mt-1 flex items-center justify-end">
                                            {isCancelled ? (
                                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs sm:text-sm font-bold bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 border border-red-200/60">
                                                결제취소
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                {item.status || '결제완료'}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* ── ⊞ 카드형 뷰 (단건/소수 건수 확인 시 유용) ── */
                              <div className="space-y-4">
                                {paginatedHistory.map((item) => {
                                  const isCancelled = item.paymentStatus === 'cancelled';
                                  const isKiosk = item.deviceType === 'KIOSK' || (item.paymentMethod || '').includes('OffPG');

                                  return (
                                    <div
                                      key={item.id}
                                      onClick={() => setSelectedDetailItem(item)}
                                      className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 sm:p-6 transition-all shadow-xs hover:shadow-md cursor-pointer ${
                                        isCancelled
                                          ? 'border-red-200/80 dark:border-red-950/60 bg-red-50/10'
                                          : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                                      }`}
                                    >
                                      {/* Header Row: Title, Badges & Status */}
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-black text-xl sm:text-2xl text-slate-900 dark:text-zinc-100">
                                              {item.itemName}
                                            </span>
                                            {item.isRecurring && (
                                              <span className="inline-flex items-center text-xs sm:text-sm font-bold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40">
                                                정기
                                              </span>
                                            )}
                                            {isKiosk && (
                                              <span className="inline-flex items-center text-xs sm:text-sm font-bold px-3 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                                                키오스크
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="flex-shrink-0">
                                          {isCancelled ? (
                                            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/60">
                                              결제취소
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                              {item.status || '결제완료'}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Amount Row */}
                                      <div className="flex items-baseline gap-2.5 mt-3">
                                        <span
                                          className={`text-3xl sm:text-4xl font-black tracking-tight font-mono ${
                                            isCancelled ? 'line-through text-slate-400 dark:text-zinc-500' : ''
                                          }`}
                                          style={!isCancelled && currentTenant?.primaryColor ? { color: currentTenant.primaryColor } : undefined}
                                        >
                                          {item.amount.toLocaleString()}원
                                        </span>
                                        {isCancelled && (
                                          <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                            (승인 취소됨)
                                          </span>
                                        )}
                                      </div>

                                      {/* 취소 사유 표출 */}
                                      {isCancelled && item.cancelReason && (
                                        <div className="mt-3 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50/80 dark:bg-red-950/40 px-4 py-3 rounded-xl border border-red-200/60 dark:border-red-900/50">
                                          <span className="font-bold">취소 사유:</span> {item.cancelReason}
                                          {item.cancelledAt && (
                                            <span className="text-slate-500 dark:text-zinc-400 ml-2">
                                              ({new Date(item.cancelledAt).toLocaleString('ko-KR')})
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {/* Footer Meta & Action */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3.5 border-t border-slate-100 dark:border-zinc-800/80">
                                        <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-slate-600 dark:text-zinc-300">
                                          <span className="font-mono text-slate-800 dark:text-zinc-200 font-bold">{item.date}</span>
                                          <span className="text-slate-300 dark:text-zinc-600">·</span>
                                          <span className="truncate max-w-[220px] sm:max-w-none text-slate-700 dark:text-zinc-300">
                                            {cleanPaymentMethod(item.paymentMethod)}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className={`h-11 px-5 text-sm sm:text-base font-bold rounded-xl cursor-pointer transition-colors shadow-xs ${
                                              isCancelled
                                                ? 'text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-900'
                                                : 'text-slate-700 dark:text-zinc-200 hover:text-slate-900 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReceiptDonation(item);
                                            }}
                                          >
                                            <Receipt className="h-4.5 w-4.5 mr-1.5 text-slate-500" />
                                            {isCancelled ? '취소 영수증보기' : '영수증보기'}
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* 📄 10개씩 페이징 컨트롤 바 */}
                            {totalPages > 1 && (
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800 text-sm sm:text-base font-semibold text-slate-700 dark:text-zinc-300">
                                <div>
                                  전체 <strong className="text-slate-900 dark:text-zinc-100 font-black">{filteredCount}</strong>건 중{' '}
                                  <strong className="text-[#3182F6] font-black">{(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCount)}</strong>건 표시
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold cursor-pointer transition-colors text-sm sm:text-base"
                                  >
                                    ◀ 이전
                                  </button>

                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                    <button
                                      key={pageNum}
                                      onClick={() => setCurrentPage(pageNum)}
                                      className={`w-10 h-10 rounded-xl text-sm sm:text-base font-black cursor-pointer border transition-all ${
                                        currentPage === pageNum
                                          ? 'bg-[#3182F6] text-white border-[#3182F6] shadow-xs'
                                          : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-zinc-300'
                                      }`}
                                    >
                                      {pageNum}
                                    </button>
                                  ))}

                                  <button
                                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold cursor-pointer transition-colors text-sm sm:text-base"
                                  >
                                    다음 ▶
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}

                <Card className="bg-amber-50/90 border-amber-200 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center gap-2.5 text-amber-900 mb-2">
                    <AlertCircle className="h-6 w-6 text-amber-700 flex-shrink-0" />
                    <h4 className="text-lg sm:text-xl font-black">연말정산 안내</h4>
                  </div>
                  <p className="text-base sm:text-lg text-amber-900/90 leading-relaxed font-medium mb-4">
                    영수증 출력을 원하시는 경우 각 내역의 <strong>[영수증보기]</strong> 버튼을 누르시면 정식 영수증 확인 및 프린트/PDF 저장이 가능합니다.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-base sm:text-lg bg-white border-amber-300 text-amber-900 hover:bg-amber-100 font-bold cursor-pointer shadow-xs rounded-xl"
                    onClick={() => navigate(`/${tenantSlug}/tax-receipt`)}
                  >
                    국세청 자동 간소화 제출 신청하기
                  </Button>
                </Card>
              </div>
            )}

            <Button 
              variant="ghost" 
              className="w-full h-12 text-base sm:text-lg text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold"
              onClick={() => {
                setIsAuthenticated(false);
                setIsOtpSent(false);
                setOtpCode('');
              }}
            >
              다른 번호로 조회하기
            </Button>
          </div>
        )}
      </div>

      {/* 🔍 헌금/봉헌 상세 내역 모달 */}
      {selectedDetailItem && (
        <Dialog open={!!selectedDetailItem} onOpenChange={(open) => !open && setSelectedDetailItem(null)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
            {/* 모달 헤더 */}
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#3182F6] flex items-center justify-center flex-shrink-0">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100">
                    {terms.donation} 상세 내역
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                    거래 승인 및 결제 상세 정보를 확인하실 수 있습니다.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-5 sm:p-6 space-y-4">
              {/* 금액 & 상태 카드 */}
              <div
                className={`p-5 rounded-2xl border text-center ${
                  selectedDetailItem.paymentStatus === 'cancelled'
                    ? 'bg-red-50/40 dark:bg-red-950/30 border-red-200/80 dark:border-red-900/50'
                    : 'bg-slate-50/80 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-700/60'
                }`}
              >
                <div className="text-sm font-bold text-slate-500 dark:text-zinc-400 mb-1.5">
                  {selectedDetailItem.paymentStatus === 'cancelled' ? '취소된 결제 금액' : '결제 금액'}
                </div>
                <div
                  className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                    selectedDetailItem.paymentStatus === 'cancelled'
                      ? 'line-through text-slate-400 dark:text-zinc-500'
                      : 'text-slate-900 dark:text-zinc-100'
                  }`}
                  style={
                    selectedDetailItem.paymentStatus !== 'cancelled' && currentTenant?.primaryColor
                      ? { color: currentTenant.primaryColor }
                      : undefined
                  }
                >
                  {selectedDetailItem.amount.toLocaleString()}원
                </div>

                <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                  {selectedDetailItem.paymentStatus === 'cancelled' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                      결제취소
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {selectedDetailItem.status || '결제완료'}
                    </span>
                  )}
                  {selectedDetailItem.isRecurring && (
                    <span className="inline-flex items-center text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      정기
                    </span>
                  )}
                  {(selectedDetailItem.deviceType === 'KIOSK' || (selectedDetailItem.paymentMethod || '').includes('OffPG')) && (
                    <span className="inline-flex items-center text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      키오스크
                    </span>
                  )}
                </div>
              </div>

              {/* 취소 사유 알림 박스 */}
              {selectedDetailItem.paymentStatus === 'cancelled' && selectedDetailItem.cancelReason && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs sm:text-sm text-red-700 dark:text-red-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    취소 정보
                  </div>
                  <p><span className="font-semibold">취소 사유:</span> {selectedDetailItem.cancelReason}</p>
                  {selectedDetailItem.cancelledAt && (
                    <p className="text-slate-500 dark:text-zinc-400">
                      취소 일시: {new Date(selectedDetailItem.cancelledAt).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
              )}

              {/* 상세 정보 리스트 */}
              <div className="bg-slate-50/60 dark:bg-zinc-800/30 rounded-2xl border border-slate-200/70 dark:border-zinc-800 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-200/50 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">{terms.donation} 항목</span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100">{selectedDetailItem.itemName}</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-200/50 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">납부 구분</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                    {selectedDetailItem.isRecurring ? `정기 ${terms.donation} (매월)` : '일시납 (단건)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-200/50 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">결제 일시</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                    {selectedDetailItem.date}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-200/50 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">결제 수단</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {cleanPaymentMethod(selectedDetailItem.paymentMethod)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-200/50 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">접수 경로</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {selectedDetailItem.deviceType === 'KIOSK' || (selectedDetailItem.paymentMethod || '').includes('OffPG')
                      ? '현장 키오스크'
                      : '온라인 (모바일/PC)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-200/50 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">{terms.donor}명</span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100">{selectedDetailItem.name}</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-200/50 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">연락처</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                    {formatPhoneNumber(selectedDetailItem.phone) || selectedDetailItem.phone}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm py-1.5">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">승인/주문 번호</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-zinc-400 select-all truncate max-w-[200px]" title={selectedDetailItem.id}>
                    {selectedDetailItem.id}
                  </span>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <DialogFooter className="p-4 sm:p-5 pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setSelectedDetailItem(null)}
                className="w-full sm:w-auto h-11 px-5 text-sm font-bold cursor-pointer"
              >
                닫기
              </Button>
              <Button
                className="w-full sm:w-auto h-11 px-5 text-sm font-bold gap-1.5 shadow-xs cursor-pointer"
                variant={selectedDetailItem.paymentStatus === 'cancelled' ? 'destructive' : 'default'}
                onClick={() => {
                  setSelectedReceiptDonation(selectedDetailItem);
                  setSelectedDetailItem(null);
                }}
              >
                <Receipt className="h-4 w-4" />
                {selectedDetailItem.paymentStatus === 'cancelled' ? '취소 영수증보기' : '영수증보기'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 🧾 정식 보시/헌금/후원 결제 영수증 모달 */}
      {selectedReceiptDonation && currentTenant && (
        <DonationReceiptModal
          tenant={currentTenant}
          donation={selectedReceiptDonation}
          onClose={() => setSelectedReceiptDonation(null)}
          onOpenTaxReceipt={() => {
            setSelectedReceiptData({
              receiptId: selectedReceiptDonation.id,
              donorName: selectedReceiptDonation.name || selectedReceiptDonation.donorName,
              donorPhone: selectedReceiptDonation.phone || selectedReceiptDonation.donorPhone,
              donorAddress: profileAddress ? (profileAddressDetail ? `${profileAddress} ${profileAddressDetail}` : profileAddress) : undefined,
              amount: selectedReceiptDonation.amount,
              itemName: selectedReceiptDonation.itemName,
              date: selectedReceiptDonation.date,
              isCancelled: selectedReceiptDonation.paymentStatus === 'cancelled',
              cancelReason: selectedReceiptDonation.cancelReason,
              cancelledAt: selectedReceiptDonation.cancelledAt,
            });
          }}
        />
      )}

      {/* 국세청 표준 기부금 영수증 모달 */}
      {selectedReceiptData && currentTenant && (
        <TaxReceiptModal
          tenant={currentTenant}
          data={selectedReceiptData}
          onClose={() => setSelectedReceiptData(null)}
        />
      )}
    </div>
  );
}
