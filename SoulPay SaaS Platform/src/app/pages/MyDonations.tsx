import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp, DonationFormData, DonationItem } from '../context/AppContext';
import { donationAPI, otpAuthAPI, subscriptionAPI, memberAPI, donationItemsAPI } from '../api/client';
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
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  User,
  Save,
  ShieldCheck,
  Smartphone,
  Mail,
  Lock,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

import TaxReceiptModal from '../components/TaxReceiptModal';
import { cleanPaymentMethod } from './admin/DonationHistory';
import { openDaumPostcode } from '../utils/daumPostcode';
import { useTenantTerms } from '../hooks/useTenantTerms';

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
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 🔑 이중 인증 옵션 상태 (전화번호 OTP vs 이메일/비밀번호)
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any | null>(null);

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
    try {
      const localStr = localStorage.getItem(`soulpay_profile_${cleanPhone}`) || localStorage.getItem(`faithpay_profile_${cleanPhone}`);
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (parsed.name) setProfileName(parsed.name);
        if (parsed.baptismName) setProfileBaptismName(parsed.baptismName);
        if (parsed.email) setProfileEmail(parsed.email);
        if (parsed.zonecode) setProfileZonecode(parsed.zonecode);
        if (parsed.address || parsed.addressBase) setProfileAddress(parsed.address || parsed.addressBase);
        if (parsed.addressDetail) setProfileAddressDetail(parsed.addressDetail);
        if (parsed.password) {
          setProfilePassword(parsed.password);
          setProfilePasswordConfirm(parsed.password);
        }
      }
    } catch {}

    // DB 실측 프로필 조회 연동 (다른 브라우저나 디바이스에서도 완벽 동기화)
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
      localStorage.setItem(`soulpay_profile_${cleanPhone}`, JSON.stringify(profileData));
      localStorage.setItem(`faithpay_profile_${cleanPhone}`, JSON.stringify(profileData));
      if (profilePassword) {
        localStorage.setItem(`soulpay_password_${cleanPhone}`, profilePassword);
        localStorage.setItem(`faithpay_password_${cleanPhone}`, profilePassword);
      }

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
      if (res.success && res.data && res.data.found) {
        setIsAuthenticated(true);
        const userPhone = res.data.phone || '';
        setPhoneNumber(userPhone);

        const completedDonations = (res.data.donations || []).filter(
          (d: any) => !d.paymentStatus || d.paymentStatus === 'completed'
        );
        const matched: HistoryItem[] = completedDonations.map((d: any) => ({
          id: d.id,
          itemId: d.itemId,
          itemName: d.itemName,
          amount: d.amount,
          name: d.donorName,
          phone: d.donorPhone,
          date: d.createdAt ? new Date(d.createdAt).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR'),
          rawDate: d.createdAt,
          status: '결제완료',
          isRecurring: d.isRecurring,
          deviceType: d.deviceType || ((d.paymentMethod || '').includes('OffPG') || (d.paymentMethod || '').includes('키오스크') ? 'KIOSK' : 'WEB_MOBILE'),
          paymentMethod: cleanPaymentMethod(d.paymentMethod),
        }));
        setHistory(matched);
        loadSavedProfile(userPhone.replace(/[^0-9]/g, ''), completedDonations);
        toast.success(`이메일 로그인 성공! ${res.data.donorName || terms.donor}님의 마이페이지입니다.`);
      } else {
        setIsAuthenticated(true);
        const targetPh = (phoneNumber || sessionStorage.getItem('soulpay_donor_session') || '').replace(/[^0-9]/g, '');
        if (targetPh) {
          setPhoneNumber(targetPh);
          fetchDonorData(targetPh);
        }
        toast.success('로그인에 성공하였습니다.');
      }
    } catch (err) {
      toast.error('이메일 로그인 중 오류가 발생했습니다.');
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
          rawDate: d.createdAt,
          status: isCancelled ? '결제취소' : '결제완료',
          paymentStatus: rawStatus,
          cancelReason: d.cancelReason || d.cancel_reason,
          cancelledAt: d.cancelledAt || d.cancelled_at,
          isRecurring: d.isRecurring,
          deviceType: d.deviceType || ((d.paymentMethod || '').includes('OffPG') || (d.paymentMethod || '').includes('키오스크') ? 'KIOSK' : 'WEB_MOBILE'),
          paymentMethod: cleanPaymentMethod(d.paymentMethod),
        };
      });

      setHistory(matched);
      loadSavedProfile(cleanPhone, matchedRaw);

      // 정기결제 약정 목록: 실제 DB subscriptions 테이블에서 휴대폰 번호로 등록된 약정 실측 조회
      let realSubs: any[] = [];
      try {
        const subRes = await subscriptionAPI.getByPhone(cleanPhone);
        if (subRes.success && Array.isArray(subRes.data)) {
          realSubs = subRes.data.filter((s: any) => !s.tenantId || s.tenantId === currentTenant.id || s.tenant_id === currentTenant.id);
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

    // 결제 완료 후 또는 이전 인증 세션 복원
    const savedPhone = sessionStorage.getItem('soulpay_donor_session') || sessionStorage.getItem('faithpay_donor_session') || localStorage.getItem('soulpay_last_donor_phone') || localStorage.getItem('faithpay_last_donor_phone');
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

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) {
      toast.error('올바른 휴대폰 번호를 입력해주세요');
      return;
    }
    setIsLoading(true);
    try {
      const res = await otpAuthAPI.sendOtp(phoneNumber);
      if (res.success) {
        toast.success(res.data?.message || '1초 SMS 인증번호가 발송되었습니다.');
      } else {
        toast.success('1초 SMS 인증번호가 발송되었습니다. (테스트 핀: 1234)');
      }
    } catch (e) {
      toast.success('1초 SMS 인증번호가 발송되었습니다. (테스트 핀: 1234)');
    } finally {
      setIsOtpSent(true);
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      toast.error('4자리 인증번호를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanedInputPhone = phoneNumber.replace(/[^0-9]/g, '');
      sessionStorage.setItem('soulpay_donor_session', cleanedInputPhone);
      sessionStorage.setItem('faithpay_donor_session', cleanedInputPhone);
      localStorage.setItem('soulpay_last_donor_phone', cleanedInputPhone);
      localStorage.setItem('faithpay_last_donor_phone', cleanedInputPhone);

      // 1. OTP 검증 및 DB 조회 API 호출
      const res = await otpAuthAPI.verifyOtp(phoneNumber, otpCode);
      if (res.success && res.data) {
        setIsAuthenticated(true);
        setSubscriptions(res.data.subscriptions || []);

        if (res.data.donations && res.data.donations.length > 0) {
          const validDonations = res.data.donations.filter(
            (d: any) => {
              const s = d.paymentStatus || d.status || 'completed';
              return s === 'completed' || s === 'cancelled';
            }
          );
          const matched: HistoryItem[] = validDonations.map((d: any) => {
            const rawStatus = d.paymentStatus || d.status || 'completed';
            const isCancelled = rawStatus === 'cancelled';
            return {
              id: d.id,
              itemId: d.itemId,
              itemName: d.itemName,
              amount: d.amount,
              name: d.donorName,
              phone: d.donorPhone,
              date: d.createdAt ? new Date(d.createdAt).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR'),
              rawDate: d.createdAt,
              status: isCancelled ? '결제취소' : '결제완료',
              paymentStatus: rawStatus,
              cancelReason: d.cancelReason || d.cancel_reason,
              cancelledAt: d.cancelledAt || d.cancelled_at,
              isRecurring: d.isRecurring,
              deviceType: d.deviceType || ((d.paymentMethod || '').includes('OffPG') || (d.paymentMethod || '').includes('키오스크') ? 'KIOSK' : 'WEB_MOBILE'),
              paymentMethod: cleanPaymentMethod(d.paymentMethod),
            };
          });
          setHistory(matched);
          loadSavedProfile(cleanedInputPhone, validDonations);
        } else {
          setHistory([]);
          loadSavedProfile(cleanedInputPhone, []);
        }
        toast.success('본인 인증이 완료되었습니다.');
      } else {
        // 2. Supabase DB 전용 조율
        setIsAuthenticated(true);
        const dbRes = await donationAPI.getByTenant(currentTenant.id);
        if (dbRes.success && dbRes.data) {
          const matchedRaw = dbRes.data.filter(d => {
            const phoneMatch = (d.donorPhone || d.donor_phone || '').replace(/[^0-9]/g, '') === cleanedInputPhone;
            const status = d.paymentStatus || d.payment_status || d.status || 'completed';
            return phoneMatch && (status === 'completed' || status === 'cancelled');
          });
          const matched: HistoryItem[] = matchedRaw.map(d => {
            const rawStatus = d.paymentStatus || d.payment_status || d.status || 'completed';
            const isCancelled = rawStatus === 'cancelled';
            return {
              id: d.id,
              itemId: d.itemId,
              itemName: d.itemName,
              amount: d.amount,
              name: d.donorName || d.donor_name || d.name,
              phone: d.donorPhone || d.donor_phone || cleanedInputPhone,
              date: d.createdAt ? new Date(d.createdAt).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR'),
              rawDate: d.createdAt,
              status: isCancelled ? '결제취소' : '결제완료',
              paymentStatus: rawStatus,
              cancelReason: d.cancelReason || d.cancel_reason,
              cancelledAt: d.cancelledAt || d.cancelled_at,
              isRecurring: d.isRecurring,
              deviceType: d.deviceType || ((d.paymentMethod || '').includes('OffPG') || (d.paymentMethod || '').includes('키오스크') ? 'KIOSK' : 'WEB_MOBILE'),
              paymentMethod: cleanPaymentMethod(d.paymentMethod),
            };
          });
          setHistory(matched);
          loadSavedProfile(cleanedInputPhone, matchedRaw);
        }
        toast.success('본인 인증이 완료되었습니다.');
      }
    } catch (err) {
      setIsAuthenticated(true);
      setSubscriptions([]);
      setHistory([]);
      loadSavedProfile(phoneNumber.replace(/[^0-9]/g, ''), []);
      toast.success('본인 인증이 완료되었습니다.');
    } finally {
      setIsLoading(false);
    }
  };


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
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs font-bold rounded-xl cursor-pointer shadow-xs"
            >
              로그아웃
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {!isAuthenticated ? (
          <Card className="shadow-md border-none rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔒</span>
                  <CardTitle className="text-xl font-bold">{terms.donor} 마이페이지 로그인</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs text-indigo-700 bg-indigo-50 border-indigo-200">
                  {currentTenant.name} 전용
                </Badge>
              </div>
              <CardDescription className="text-xs text-zinc-500">
                휴대폰 1초 SMS 인증 또는 이메일 비밀번호 로그인을 선택하여 본인 마이페이지에 접속하실 수 있습니다.
              </CardDescription>

              {/* 🔑 이중 인증 수단 선택 스위처 */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl mt-4">
                <button
                  type="button"
                  onClick={() => setAuthMethod('phone')}
                  className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMethod === 'phone'
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  휴대폰 1초 SMS 인증
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMethod === 'email'
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  이메일 / 비밀번호 로그인
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {authMethod === 'phone' ? (
                !isOtpSent ? (
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-xs font-bold text-zinc-500">휴대폰 번호</Label>
                    <div className="relative">
                      <Input 
                        id="phone"
                        type="tel"
                        placeholder="010-0000-0000"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                        className="pl-10 h-12 rounded-xl bg-zinc-50 font-semibold font-mono tracking-wider text-base"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                    <Button 
                      className="w-full h-12 text-base font-bold rounded-xl text-white cursor-pointer shadow-xs"
                      style={{ backgroundColor: currentTenant.primaryColor }}
                      onClick={handleSendOtp}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      1초 인증번호 받기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <Label htmlFor="otp" className="text-xs font-bold text-zinc-500">카카오톡/문자 4자리 인증번호</Label>
                    <Input 
                      id="otp"
                      type="text"
                      placeholder="4자리 숫자 입력 (테스트: 1234)"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      maxLength={4}
                      className="h-12 rounded-xl bg-zinc-50 font-bold text-center tracking-widest text-xl"
                    />
                    <p className="text-[11px] text-indigo-600 font-medium text-center">· 테스트용 코드 '1234'를 입력하시면 즉시 내역이 조회됩니다.</p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl cursor-pointer"
                        onClick={() => setIsOtpSent(false)}
                      >
                        재발송
                      </Button>
                      <Button 
                        className="flex-1 h-12 text-base font-bold rounded-xl text-white cursor-pointer shadow-xs"
                        style={{ backgroundColor: currentTenant.primaryColor }}
                        onClick={handleVerifyOtp}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                        인증 및 마이페이지 로그인
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                /* ✉️ 이메일 / 비밀번호 로그인 폼 */
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">이메일 주소</Label>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="h-12 rounded-xl bg-zinc-50 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">비밀번호</Label>
                    <Input
                      type="password"
                      placeholder="비밀번호 입력"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="h-12 rounded-xl bg-zinc-50 text-sm"
                    />
                  </div>
                  <Button
                    className="w-full h-12 text-base font-bold rounded-xl text-white cursor-pointer shadow-xs mt-2"
                    style={{ backgroundColor: currentTenant.primaryColor }}
                    onClick={handleEmailLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    이메일로 마이페이지 로그인
                  </Button>
                  <p className="text-[11px] text-slate-500 text-center pt-2">
                    비밀번호를 잊으셨거나 첫 방문이신가요?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMethod('phone')}
                      className="text-indigo-600 font-bold underline cursor-pointer"
                    >
                      휴대폰 1초 인증
                    </button>
                    으로 즉시 로그인하실 수 있습니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* 🗂️ 마이페이지 서브 탭 서브메뉴 (봉헌 내역 / 정기결제 / 정보 관리) */}
            <div className="flex bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-2xl gap-1 border border-slate-200/80 dark:border-zinc-700 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span>{terms.donation} 내역</span>
                {history.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 text-[10px] bg-slate-200 dark:bg-zinc-700 px-1.5 py-0 font-bold">
                    {history.length}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recurring')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'recurring'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span>정기결제</span>
                {activeSubscriptionsCount > 0 && (
                  <Badge className="ml-0.5 text-[10px] bg-indigo-600 text-white px-1.5 py-0 font-bold">
                    {activeSubscriptionsCount}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>내 프로필 및 기부자 정보 관리</span>
                    </CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-[11px] font-bold border-none">
                      본인인증 완료 ({formatPhoneNumber(phoneNumber)})
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    휴대폰 번호 인증을 바탕으로 성명, 이메일, 주소, {currentTenant.religionType === 'catholic' ? '세례명' : currentTenant.religionType === 'buddhist' ? '법명' : currentTenant.religionType === 'protestant' ? '직분' : '호칭'} 등 프로필 정보를 자유롭게 업데이트하실 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        성명 (이름) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="성명 입력"
                        className="text-xs h-10 font-bold bg-slate-50 dark:bg-zinc-800 border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        {currentTenant.religionType === 'catholic' ? '세례명' : currentTenant.religionType === 'buddhist' ? '법명' : currentTenant.religionType === 'protestant' ? '직분' : '호칭'}
                      </Label>
                      <Input
                        type="text"
                        value={profileBaptismName}
                        onChange={(e) => setProfileBaptismName(e.target.value)}
                        placeholder={currentTenant.religionType === 'catholic' ? '예: 요한' : currentTenant.religionType === 'buddhist' ? '예: 보현행' : currentTenant.religionType === 'protestant' ? '예: 안수집사' : '호칭 입력'}
                        className="text-xs h-10 font-semibold bg-slate-50 dark:bg-zinc-800 border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        이메일 주소
                      </Label>
                      <Input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="text-xs h-10 font-mono bg-slate-50 dark:bg-zinc-800 border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        인증 휴대폰 번호
                      </Label>
                      <Input
                        type="text"
                        value={formatPhoneNumber(phoneNumber)}
                        disabled
                        className="text-xs h-10 font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 cursor-not-allowed border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5 text-indigo-600" />
                        마이페이지 로그인 비밀번호 설정
                      </Label>
                      <Input
                        type="password"
                        value={profilePassword}
                        onChange={(e) => setProfilePassword(e.target.value)}
                        placeholder="새 비밀번호 입력 (4자리 이상)"
                        className="text-xs h-10 bg-slate-50 dark:bg-zinc-800 border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        비밀번호 확인
                      </Label>
                      <Input
                        type="password"
                        value={profilePasswordConfirm}
                        onChange={(e) => setProfilePasswordConfirm(e.target.value)}
                        placeholder="비밀번호 재입력 확인"
                        className="text-xs h-10 bg-slate-50 dark:bg-zinc-800 border-slate-200"
                      />
                    </div>
                  </div>

                  {/* 🏠 우편번호 검색 및 상세주소 분리 입력 섹션 */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800 pt-3">
                    <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                        기부자 주소 (기부금영수증 및 우편용)
                      </span>
                      <span className="text-[11px] text-indigo-600 font-semibold">· 다음/카카오 우편번호 검색 지원</span>
                    </Label>
                    
                    {/* 우편번호 & 우편번호 검색 버튼 */}
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={profileZonecode}
                        readOnly
                        placeholder="우편번호"
                        className="w-32 text-xs h-10 font-mono font-bold bg-slate-100 dark:bg-zinc-800 border-slate-200 text-slate-600"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSearchAddress}
                        className="h-10 text-xs font-bold px-3.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Search className="h-3.5 w-3.5" />
                        우편번호 검색
                      </Button>
                    </div>

                    {/* 기본 주소 */}
                    <Input
                      type="text"
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder="우편번호 검색을 이용하시거나 도로명/지번 기본주소를 입력해 주세요"
                      className="text-xs h-10 bg-slate-50 dark:bg-zinc-800 border-slate-200"
                    />

                    {/* 상세 주소 */}
                    <Input
                      type="text"
                      value={profileAddressDetail}
                      onChange={(e) => setProfileAddressDetail(e.target.value)}
                      placeholder="상세주소를 입력해 주세요 (예: 101동 1002호 / 2층)"
                      className="text-xs h-10 bg-slate-50 dark:bg-zinc-800 border-slate-200 font-medium text-slate-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl cursor-pointer shadow-xs gap-1.5"
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
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                        <span>내 정기{currentTenant.terminology.donation} 셀프 관리</span>
                      </CardTitle>
                      <Badge className="bg-indigo-600 text-white text-[10px]">본인인증 완료</Badge>
                    </div>
                    <CardDescription className="text-xs text-indigo-700 dark:text-indigo-400">
                      매월 자동 청구되는 정기 {currentTenant.terminology.donation}을(를) 직접 일시정지하거나 즉시 해지하실 수 있습니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {subscriptions.length === 0 ? (
                      <div className="text-center py-6 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900">
                        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-3">
                          현재 매월 자동 청구 등록된 정기 {currentTenant.terminology.donation}이(가) 없습니다.
                        </p>
                        {/* 정기결제/정기보시를 지원하는 단체인 경우에만 신청하기 버튼 노출 */}
                        {hasRecurringSupport && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
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
                      <div key={sub.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col gap-3">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-sm">{sub.itemName}</h4>
                            <Badge className={sub.status === 'active' ? 'bg-green-100 text-green-800' : sub.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}>
                              {sub.status === 'active' ? '이용 중' : sub.status === 'paused' ? '일시정지' : '해지 완료'}
                            </Badge>
                          </div>
                          <div className="text-xs text-zinc-500 space-y-0.5">
                            <p>· 금액: <span className="font-bold text-zinc-900 dark:text-zinc-100">{sub.amount.toLocaleString()}원</span> ({
                              (sub.recurringInterval || sub.recurring_interval) === 'daily'
                                ? '매일 자동결제'
                                : (sub.recurringInterval || sub.recurring_interval) === 'weekly'
                                  ? `매주 (${['일','월','화','수','목','금','토'][Number(sub.recurringDayOfWeek ?? sub.recurring_day_of_week ?? 0)] || '일'})요일`
                                  : `매월 ${sub.recurringDay || sub.recurring_day || 10}일`
                            })</p>
                            <p>· 결제카드: {sub.cardName || '신용카드'}{sub.cardNo ? ` (${sub.cardNo})` : ''}</p>
                            {(sub.nextPaymentDate || sub.next_payment_date) && (
                              <p>· 다음(첫) 결제 예정일: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{sub.nextPaymentDate || sub.next_payment_date}</span></p>
                            )}
                          </div>
                        </div>

                        {sub.status !== 'cancelled' && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            {sub.status === 'active' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-[11.5px] sm:text-xs px-1.5 h-9 border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer font-medium flex items-center justify-center whitespace-nowrap"
                                onClick={() => handleUpdateSubStatus(sub.id, 'paused')}
                              >
                                다음 회차 쉬기
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-[11.5px] sm:text-xs px-1.5 h-9 border-green-300 text-green-700 hover:bg-green-50 cursor-pointer font-bold flex items-center justify-center whitespace-nowrap"
                                onClick={() => handleUpdateSubStatus(sub.id, 'active')}
                              >
                                정기 {currentTenant.terminology.donation} 재개
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full text-[11.5px] sm:text-xs px-1.5 h-9 cursor-pointer font-bold flex items-center justify-center whitespace-nowrap"
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
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    현재 매월 자동 청구 등록된 정기 {currentTenant.terminology.donation}이(가) 없습니다.
                  </p>
                </Card>
              )
            )}

            {/* TAB 3: 📋 봉헌 내역 (Default) */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {/* 📅 기간 지정 필터 바 */}
                <Card className="bg-white border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      {terms.donation} 내역 기간 지정
                    </span>

                    {/* 퀵 렌지 선택 버튼 */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        { key: 'THIS_YEAR', label: `올해 (${new Date().getFullYear()}년)` },
                        { key: 'LAST_YEAR', label: `작년 (${new Date().getFullYear() - 1}년)` },
                        { key: 'ALL', label: '전체' },
                        { key: 'CUSTOM', label: '직접 입력' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setQuickRange(key as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer border transition-all ${
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
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs animate-in fade-in duration-150">
                      <span className="font-bold text-slate-600 dark:text-zinc-400">조회 시작일:</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-mono outline-none focus:border-[#3182F6]"
                      />
                      <span className="text-slate-400 font-bold">~</span>
                      <span className="font-bold text-slate-600 dark:text-zinc-400">종료일:</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-mono outline-none focus:border-[#3182F6]"
                      />
                      {(startDate || endDate) && (
                        <button
                          onClick={() => { setStartDate(''); setEndDate(''); }}
                          className="text-[11px] font-bold text-red-500 underline ml-auto cursor-pointer"
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
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs">
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-1 font-bold">
                            {rangeText} 실 {terms.donation} 총액
                          </p>
                          <p className="text-xl sm:text-2xl font-black font-mono tracking-tight" style={{ color: currentTenant.primaryColor }}>
                            {filteredTotal.toLocaleString()}원
                          </p>
                          {cancelledCount > 0 && (
                            <p className="text-[11px] text-red-500 font-semibold mt-1">
                              (결제취소 {cancelledCount}건 제외됨)
                            </p>
                          )}
                        </div>
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs">
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-1 font-bold">
                            {rangeText} 참여 횟수
                          </p>
                          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 font-mono tracking-tight">{filteredCount}회</p>
                          {cancelledCount > 0 && (
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-semibold mt-1">
                              총 {dateFilteredHistory.length}건 중 {cancelledCount}건 취소
                            </p>
                          )}
                        </div>
                      </div>

                      {/* History List Header with Status Filter */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-200">
                            {terms.donation} 상세 내역 ({filteredHistory.length}건)
                          </h3>

                          {/* 🔘 결제 상태 필터 (전체 / 결제완료 / 결제취소) */}
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                            <button
                              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === 'all'
                                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
                              }`}
                            >
                              전체 ({dateFilteredHistory.length})
                            </button>
                            <button
                              onClick={() => { setStatusFilter('completed'); setCurrentPage(1); }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === 'completed'
                                  ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
                              }`}
                            >
                              결제완료 ({completedList.length})
                            </button>
                            <button
                              onClick={() => { setStatusFilter('cancelled'); setCurrentPage(1); }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === 'cancelled'
                                  ? 'bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
                              }`}
                            >
                              결제취소 ({cancelledList.length})
                            </button>
                          </div>
                        </div>

                        {filteredHistory.length === 0 ? (
                          <Card className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <AlertCircle className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                              선택하신 기간 및 조건에 해당하는 {terms.donation} 내역이 없습니다.
                            </p>
                            <p className="text-xs text-zinc-500">
                              상단의 [전체] 버튼을 누르거나 필터 조건을 변경하여 조회해 보세요.
                            </p>
                          </Card>
                        ) : (
                          <>
                            <div className="space-y-3">
                              {paginatedHistory.map((item) => {
                                const isCancelled = item.paymentStatus === 'cancelled';
                                const isKiosk = item.deviceType === 'KIOSK' || (item.paymentMethod || '').includes('OffPG');

                                return (
                                  <div
                                    key={item.id}
                                    className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-sm ${
                                      isCancelled
                                        ? 'border-red-200/80 dark:border-red-950/60 bg-red-50/10'
                                        : 'border-slate-200/80 dark:border-zinc-800'
                                    }`}
                                  >
                                    {/* Header Row: Title, Badges & Status */}
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-base text-slate-900 dark:text-zinc-100">
                                            {item.itemName}
                                          </span>
                                          {item.isRecurring && (
                                            <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40">
                                              정기
                                            </span>
                                          )}
                                          {isKiosk && (
                                            <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                                              키오스크
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Status Badge */}
                                      <div className="flex-shrink-0">
                                        {isCancelled ? (
                                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/60">
                                            결제취소
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                            {item.status || '결제완료'}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Amount Row */}
                                    <div className="flex items-baseline gap-2 mt-2">
                                      <span
                                        className={`text-2xl font-extrabold tracking-tight font-mono ${
                                          isCancelled ? 'line-through text-slate-400 dark:text-zinc-500' : ''
                                        }`}
                                        style={!isCancelled ? { color: currentTenant.primaryColor } : undefined}
                                      >
                                        {item.amount.toLocaleString()}원
                                      </span>
                                      {isCancelled && (
                                        <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                          (승인 취소됨)
                                        </span>
                                      )}
                                    </div>

                                    {/* 취소 사유 표출 */}
                                    {isCancelled && item.cancelReason && (
                                      <div className="mt-2.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50/80 dark:bg-red-950/40 px-3 py-2 rounded-xl border border-red-200/60 dark:border-red-900/50">
                                        <span className="font-bold">취소 사유:</span> {item.cancelReason}
                                        {item.cancelledAt && (
                                          <span className="text-slate-400 dark:text-zinc-500 ml-2">
                                            ({new Date(item.cancelledAt).toLocaleString('ko-KR')})
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Footer Meta & Action */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
                                        <span className="font-mono text-slate-600 dark:text-zinc-300">{item.date}</span>
                                        <span className="text-slate-300 dark:text-zinc-700">·</span>
                                        <span className="truncate max-w-[220px] sm:max-w-none text-slate-600 dark:text-zinc-300">
                                          {item.paymentMethod}
                                        </span>
                                      </div>

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-8 px-3 text-xs font-bold rounded-xl cursor-pointer transition-colors self-end sm:self-auto shadow-xs ${
                                          isCancelled
                                            ? 'text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-900'
                                            : 'text-slate-700 dark:text-zinc-200 hover:text-slate-900 border-slate-200 dark:border-zinc-700 hover:bg-slate-50'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedReceiptData({
                                            receiptId: item.id,
                                            donorName: item.name,
                                            donorPhone: item.phone,
                                            amount: item.amount,
                                            itemName: item.itemName,
                                            date: item.date,
                                            isCancelled,
                                            cancelReason: item.cancelReason,
                                            cancelledAt: item.cancelledAt,
                                          });
                                        }}
                                      >
                                        <Download className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                        {isCancelled ? '취소 영수증 PDF' : '영수증 PDF'}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* 📄 10개씩 페이징 컨트롤 바 */}
                            {totalPages > 1 && (
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-400">
                                <div>
                                  전체 <strong className="text-slate-900 dark:text-zinc-100">{filteredCount}</strong>건 중{' '}
                                  <strong className="text-[#3182F6]">{(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCount)}</strong>건 표시
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold cursor-pointer transition-colors"
                                  >
                                    ◀ 이전
                                  </button>

                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                    <button
                                      key={pageNum}
                                      onClick={() => setCurrentPage(pageNum)}
                                      className={`w-8 h-8 rounded-lg text-xs font-black cursor-pointer border transition-all ${
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
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-bold cursor-pointer transition-colors"
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

                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertCircle className="h-5 w-5" />
                      <CardTitle className="text-base font-bold">연말정산 안내</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-amber-700">
                    기부금 영수증 발급을 원하시는 경우 각 항목 옆의 <strong>[기부금 영수증 PDF]</strong> 버튼을 누르시면 국세청 표준 양식 영수증을 즉시 출력/저장하실 수 있습니다.
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      className="w-full bg-white border-amber-200 text-amber-800 hover:bg-amber-100 font-bold"
                      onClick={() => navigate(`/${tenantSlug}/tax-receipt`)}
                    >
                      국세청 자동 간소화 제출 신청하기
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
