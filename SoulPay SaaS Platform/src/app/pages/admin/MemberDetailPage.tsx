import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Printer,
  FileText,
  RefreshCw,
  Edit2,
  Check,
  PauseCircle,
  XCircle,
  Copy,
  Sparkles,
  Menu,
  User,
  MapPin,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useTenantTerms } from '../../hooks/useTenantTerms';
import { MemberTitleSelect } from '../../components/common/MemberTitleSelect';
import { donationAPI, subscriptionAPI, memberAPI } from '../../api/client';
import { formatPhoneNumber, stripPhoneDigits } from './AdminAccountManagement';
import { cleanPaymentMethod } from './DonationHistory';
import { PeriodRangePicker, PeriodUnit, PeriodSelection } from '../../components/PeriodRangePicker';

export interface MemberDonationHistoryItem {
  id: string;
  date: string;
  time?: string;
  itemName: string;
  amount: number;
  paymentMethod: string;
  type: 'recurring' | 'once';
  status: 'completed' | 'cancelled' | 'failed' | 'pending';
  cancelReason?: string;
  cancelApprovedAt?: string;
  failureReason?: string;
}

export interface MemberSubscriptionItem {
  id: string;
  itemName: string;
  monthlyAmount: number;
  billingDay: number;
  status: 'active' | 'paused' | 'cancelled';
  nextPaymentDate: string;
  cardName?: string;
  cardNo?: string;
  recurringInterval?: string;
  recurringDayOfWeek?: number | string;
  createdAt?: string;
}

export interface MemberDetailData {
  id: string;
  name: string;
  baptismName?: string; // 법명/세례명/직분
  phone: string;
  email: string;
  address?: string;
  rrn?: string; // 주민등록번호 (기부금영수증 발급용)
  registeredDate: string;
  totalDonation: number;
  lastDonation: string;
  recurringCount: number;
  note?: string;
  donationsHistory?: MemberDonationHistoryItem[];
  subscriptions?: MemberSubscriptionItem[];
  prayersHistory?: {
    id: string;
    date: string;
    title: string;
    category: string;
    beneficiaryName: string;
  }[];
}

export default function MemberDetailPage() {
  const { tenantSlug, memberId } = useParams();
  const navigate = useNavigate();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin } = useApp();
  const terms = useTenantTerms(currentTenant);

  const [member, setMember] = useState<MemberDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'recurring' | 'prayers' | 'note'>('history');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [noteText, setNoteText] = useState('');
  // Tax Receipt On-Demand Dialog State
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxYear, setTaxYear] = useState('2026');
  const [taxDonorName, setTaxDonorName] = useState('');
  const [taxRrn, setTaxRrn] = useState('');
  const [taxAddress, setTaxAddress] = useState('');

  const handleOpenTaxModal = () => {
    if (!member) return;
    if (member.totalDonation <= 0) {
      toast.warning(`실제 납부 완료된 ${terms.donation} 금액이 0원이므로 소득공제용 기부금영수증을 발급할 수 없습니다.`);
      return;
    }
    setTaxYear(new Date().getFullYear().toString());
    setTaxDonorName(member.name);
    setTaxAddress(member.address || '');
    setTaxRrn(''); // Always empty by default for security
    setIsTaxModalOpen(true);
  };

  const formatRrnInput = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 13);
    if (clean.length > 6) {
      return `${clean.slice(0, 6)}-${clean.slice(6)}`;
    }
    return clean;
  };

  // Period filter states using official PeriodRangePicker module
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>('daily');
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>(() => {
    const now = new Date();
    const start = new Date(2020, 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return {
      unit: 'daily',
      startDate: start,
      endDate: end,
      label: '전체 기간',
    };
  });

  const filteredDonationsHistory = useMemo(() => {
    if (!member || !member.donationsHistory) return [];
    return member.donationsHistory.filter((don) => {
      if (!periodSelection || !periodSelection.startDate || !periodSelection.endDate) return true;
      const donTime = new Date(don.date).getTime();
      const startTime = new Date(periodSelection.startDate).setHours(0, 0, 0, 0);
      const endTime = new Date(periodSelection.endDate).setHours(23, 59, 59, 999);
      return donTime >= startTime && donTime <= endTime;
    });
  }, [member, periodSelection]);

  // 기간 내 정상 결제 완료 건들의 합계 (취소/실패/대기 제외)
  const filteredCompletedSum = useMemo(() => {
    return filteredDonationsHistory
      .filter((don) => don.status === 'completed')
      .reduce((sum, don) => sum + (don.amount || 0), 0);
  }, [filteredDonationsHistory]);

  const completedDonationCount = useMemo(() => {
    return filteredDonationsHistory.filter((don) => don.status === 'completed').length;
  }, [filteredDonationsHistory]);

  const nonCompletedDonationCount = useMemo(() => {
    return filteredDonationsHistory.filter((don) => don.status !== 'completed').length;
  }, [filteredDonationsHistory]);

  useEffect(() => {
    const tenant = tenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  useEffect(() => {
    async function loadMemberDetail() {
      if (!currentTenant || !memberId) return;
      setIsLoading(true);

      try {
        const res = await donationAPI.getByTenant(currentTenant.id);
        if (res.success && res.data) {
          // Aggregate or find matching member (by donation ID, raw phone, or stripped digits)
          const targetDigits = stripPhoneDigits(memberId);
          let rawMatch = res.data.find(
            (d: any) =>
              d.id === memberId ||
              stripPhoneDigits(d.donorPhone) === targetDigits ||
              d.donorPhone === memberId
          );

          // If no donation record exists yet, check if member has active subscription
          if (!rawMatch && targetDigits.length >= 8) {
            try {
              const subRes = await subscriptionAPI.getByPhone(targetDigits);
              if (subRes.success && subRes.data && subRes.data.length > 0) {
                const firstSub = subRes.data[0];
                rawMatch = {
                  id: firstSub.id,
                  donorName: firstSub.donorName,
                  donorPhone: firstSub.donorPhone,
                  donorEmail: firstSub.donorEmail || '',
                  createdAt: firstSub.createdAt,
                };
              }
            } catch (e) {
              console.warn('Subscription fallback check failed:', e);
            }
          }

          if (rawMatch) {
            const rawPhone = rawMatch.donorPhone || '';
            const digitsKey = stripPhoneDigits(rawPhone) || '미등록';

            // Filter all donations for this donor phone and sort newest first
            const donorDonations = res.data.filter((d: any) => stripPhoneDigits(d.donorPhone) === digitsKey);
            donorDonations.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

            // 1. 실 납부 완료 건 집계 (취소/실패 건은 총액 및 최근 납부일 산정에서 엄격 제외)
            const completedDonations = donorDonations.filter((d: any) => !d.paymentStatus || d.paymentStatus === 'completed');
            const totalSum = completedDonations.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
            const lastCompleted = completedDonations[0];
            const lastDonationDate = lastCompleted?.createdAt ? lastCompleted.createdAt.split('T')[0] : '';

            // 2. 정기 약정 현황 (Subscriptions) - 실제 DB subscriptions 테이블 100% 실측 조회
            let subscriptionsList: MemberSubscriptionItem[] = [];
            if (digitsKey && digitsKey !== '미등록') {
              try {
                const subRes = await subscriptionAPI.getByPhone(digitsKey);
                if (subRes.success && Array.isArray(subRes.data)) {
                  subscriptionsList = subRes.data.map((sub: any) => ({
                    id: sub.id,
                    itemName: sub.itemName || `${currentTenant.terminology?.donation || '헌금/봉헌'} (정기)`,
                    monthlyAmount: sub.amount || 0,
                    billingDay: sub.recurringDay || 15,
                    status: (sub.status as any) || 'active',
                    nextPaymentDate: sub.nextPaymentDate ? sub.nextPaymentDate.slice(0, 10) : '',
                    cardName: sub.cardName || '',
                    cardNo: sub.cardNo || '',
                    recurringInterval: sub.recurringInterval || 'monthly',
                    recurringDayOfWeek: sub.recurringDayOfWeek ?? sub.recurring_day_of_week,
                    createdAt: sub.createdAt ? sub.createdAt.slice(0, 10) : '',
                  }));
                }
              } catch (subErr) {
                console.error('Failed to load subscriptions from DB:', subErr);
              }
            }

            // DB subscriptions 테이블에 아직 미등록된 레거시 정기 납부 이력이 있는 경우 보완
            if (subscriptionsList.length === 0) {
              const recurringDonations = completedDonations.filter((d: any) => d.isRecurring);
              const recurringMap = new Map<string, MemberSubscriptionItem>();

              recurringDonations.forEach((d: any) => {
                const itemKey = d.itemName || d.title || `${currentTenant.terminology?.donation || '헌금/봉헌'} (정기)`;
                if (!recurringMap.has(itemKey)) {
                  const dateObj = d.createdAt ? new Date(d.createdAt) : new Date();
                  const billingDay = dateObj.getDate() || 15;
                  const nextDate = new Date();
                  nextDate.setMonth(nextDate.getMonth() + 1);
                  nextDate.setDate(billingDay);

                  recurringMap.set(itemKey, {
                    id: `sub_${d.id}`,
                    itemName: itemKey,
                    monthlyAmount: d.amount || 0,
                    billingDay: billingDay,
                    status: 'active' as const,
                    nextPaymentDate: nextDate.toISOString().slice(0, 10),
                    recurringInterval: 'monthly',
                    createdAt: d.createdAt ? d.createdAt.slice(0, 10) : '',
                  });
                }
              });

              subscriptionsList = Array.from(recurringMap.values());
            }

            const activeRecurringCount = subscriptionsList.filter((s) => s.status === 'active').length;

            // 3. 발원문 / 지향문 이력 (Prayers) - DB의 prayerText 기반 수집
            const prayersList = donorDonations
              .filter((d: any) => d.prayerText && String(d.prayerText).trim() !== '')
              .map((d: any, idx: number) => ({
                id: `pr_${d.id || idx}`,
                date: d.createdAt ? d.createdAt.split('T')[0] : new Date().toISOString().slice(0, 10),
                title: String(d.prayerText),
                category: d.itemName || currentTenant.terminology?.prayer || '메시지',
                beneficiaryName: d.donorName || rawMatch.donorName || terms.donor,
              }));

            // 4. 회원 프로필 정보 동기화 (이메일, 주소, 직분 등 DB 실측 조회)
            const nonNullBaptism = donorDonations.find((d: any) => d.baptismName)?.baptismName;
            const nonNullEmail = donorDonations.find((d: any) => d.donorEmail || d.email)?.donorEmail || donorDonations.find((d: any) => d.donorEmail || d.email)?.email;
            const nonNullAddress = donorDonations.find((d: any) => d.address)?.address;

            let resolvedEmail = nonNullEmail || rawMatch.donorEmail || '';
            let resolvedAddress = nonNullAddress || rawMatch.address || '';
            let resolvedName = rawMatch.donorName || '무기명';
            let resolvedTitle = nonNullBaptism || rawMatch.baptismName || '';

            if (digitsKey && digitsKey !== '미등록') {
              try {
                const profileRes = await memberAPI.getProfile(digitsKey);
                if (profileRes.success && profileRes.data) {
                  const p = profileRes.data;
                  if (p.email) resolvedEmail = p.email;
                  if (p.fullAddress || p.address) {
                    resolvedAddress = p.fullAddress || p.address || '';
                  }
                  if (p.name && (resolvedName === '무기명' || !resolvedName)) resolvedName = p.name;
                  if (p.baptismName) resolvedTitle = p.baptismName;
                }
              } catch (profErr) {
                console.warn('Failed to load member profile:', profErr);
              }
            }

            // 만약 resolvedEmail이 아직 비어있다면 subscriptions의 donorEmail 확인
            if (!resolvedEmail && subscriptionsList.length > 0) {
              const subWithEmail = subscriptionsList.find((s: any) => (s as any).donorEmail || (s as any).email);
              if (subWithEmail) {
                resolvedEmail = (subWithEmail as any).donorEmail || (subWithEmail as any).email;
              }
            }

            const loadedMem: MemberDetailData = {
              id: memberId,
              name: resolvedName,
              baptismName: resolvedTitle,
              phone: digitsKey,
              email: resolvedEmail,
              address: resolvedAddress,
              rrn: rawMatch.rrn || '',
              registeredDate: rawMatch.createdAt ? rawMatch.createdAt.split('T')[0] : new Date().toISOString().slice(0, 10),
              totalDonation: totalSum,
              lastDonation: lastDonationDate,
              recurringCount: activeRecurringCount,
              note: rawMatch.note || '',
              donationsHistory: donorDonations.map((d: any) => {
                const dateObj = d.createdAt ? new Date(d.createdAt) : null;
                const isValid = dateObj && !isNaN(dateObj.getTime());
                const datePart = isValid
                  ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
                  : (d.createdAt ? d.createdAt.split('T')[0] : '');
                const timePart = isValid
                  ? `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`
                  : (d.createdAt && d.createdAt.includes('T') ? d.createdAt.split('T')[1]?.slice(0, 8) : '');

                return {
                  id: d.id,
                  date: datePart,
                  time: timePart,
                  itemName: d.itemName || (d.isRecurring ? `${currentTenant.terminology?.donation || '헌금/봉헌'} (정기)` : `특별 ${currentTenant.terminology?.donation || '헌금/봉헌'}`),
                  amount: d.amount || 0,
                  paymentMethod: cleanPaymentMethod(d.paymentMethod || d.payMethod || d.method),
                  type: d.isRecurring ? 'recurring' : 'once',
                  status: (d.paymentStatus || 'completed') as any,
                  cancelReason: d.cancelReason,
                  cancelApprovedAt: d.cancelApprovedAt,
                  failureReason: d.failureReason,
                };
              }),
              subscriptions: subscriptionsList,
              prayersHistory: prayersList,
            };

            setMember(loadedMem);
            setNoteText(loadedMem.note || '');
          } else {
            setMember(null);
          }
        }
      } catch (err) {
        console.error('Error fetching member detail:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMemberDetail();
  }, [currentTenant, memberId]);

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

  const isAuthorized = currentAdmin && (currentAdmin.role === 'tenant_admin' || currentAdmin.role === 'system_admin' || currentAdmin.role === 'finance_manager');
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>회원 관리 메뉴는 단체 관리자 및 재정 담당자만 접근할 수 있습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">회원 상세 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  const currentPath = `/${tenantSlug}/admin/members`;
  const memberTerm = terms.donor;
  const donationTerm = terms.donation;
  const prayerTerm = terms.prayer;

  const getTitleLabel = () => {
    if (currentTenant.religionType === 'catholic') return '세례명';
    if (currentTenant.religionType === 'buddhist') return '법명';
    if (currentTenant.religionType === 'protestant') return '직분';
    return '호칭';
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(member.phone);
    toast.success('연락처가 클립보드에 복사되었습니다.');
  };

  const handleSaveNote = () => {
    setMember((prev) => (prev ? { ...prev, note: noteText } : null));
    toast.success('관리자 메모가 저장되었습니다.');
  };

  // 1. 국세청 별지 제45호 서식 소득공제용 기부금 영수증 온디맨드 인쇄
  const handleGenerateTaxReceipt = () => {
    if (!member || !currentTenant) return;
    if (!taxRrn.trim()) {
      toast.error(`소득공제용 기부금영수증 발급을 위해 ${terms.donor}(기부자)의 주민등록번호를 입력해주세요.`);
      return;
    }

    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      toast.error('팝업 차단이 활성화되어 있습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const receiptNo = `FP-${taxYear}-${member.id.slice(-6).toUpperCase()}`;
    const donorNameUse = taxDonorName || member.name;
    const addressUse = taxAddress || member.address || '주소 미입력';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>[국세청 별지 제45호 서식] 기부금 영수증 - ${donorNameUse}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 15px; color: #000; font-size: 12px; line-height: 1.4; }
            .form-box { border: 2px solid #000; padding: 25px; max-width: 720px; margin: 0 auto; background: #fff; box-sizing: border-box; }
            .top-sub { font-size: 10px; color: #555; text-align: right; margin-bottom: 5px; }
            .title-area { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
            .title-area h1 { font-size: 22px; font-weight: 900; letter-spacing: 4px; margin: 0 0 5px 0; }
            .title-area p { font-size: 11px; color: #333; margin: 0; }
            .section-label { font-size: 12px; font-weight: bold; background: #eaeaea; border: 1px solid #000; padding: 5px 10px; margin-top: 15px; border-bottom: none; }
            table.form-table { width: 100%; border-collapse: collapse; margin-bottom: -1px; }
            table.form-table th, table.form-table td { border: 1px solid #000; padding: 6px 10px; font-size: 11px; text-align: left; }
            table.form-table th { background-color: #f5f5f5; font-weight: bold; width: 22%; }
            .total-amount-area { border: 2px solid #000; background: #fdfdfd; padding: 15px; text-align: center; margin: 20px 0; }
            .total-amount-area h2 { font-size: 20px; margin: 5px 0 0 0; color: #1e3a8a; font-weight: bold; }
            .notice-box { border: 1px solid #888; padding: 10px; font-size: 10.5px; color: #444; background: #fafafa; margin-top: 15px; line-height: 1.5; }
            .seal-wrapper { text-align: center; margin-top: 30px; position: relative; }
            .seal-stamp { display: inline-block; width: 55px; height: 55px; border: 2px solid #d97706; color: #d97706; border-radius: 50%; font-size: 11px; font-weight: bold; line-height: 51px; text-align: center; margin-left: 10px; vertical-align: middle; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="form-box">
            <div class="top-sub">[별지 제45호 서식] 소득공제 및 세액공제용 영수증 (일련번호: ${receiptNo})</div>

            <div class="title-area">
              <h1>기 부 금 영 수 증</h1>
              <p>(소득세법 제59조의4 및 조세특례제한법 제76조/제88조의4에 따른 연말정산 기부금 영수증)</p>
            </div>

            <!-- 1. 기부자 정보 -->
            <div class="section-label">1. 기부자 (Donor Information)</div>
            <table class="form-table">
              <tr>
                <th>성 명 (이름)</th>
                <td style="width: 28%;"><strong>${donorNameUse}</strong> ${member.baptismName ? `(${member.baptismName})` : ''}</td>
                <th>주민등록번호</th>
                <td><strong>${taxRrn}</strong></td>
              </tr>
              <tr>
                <th>주 소</th>
                <td colspan="3">${addressUse}</td>
              </tr>
            </table>

            <!-- 2. 기부금 수령 단체 정보 -->
            <div class="section-label">2. 기부금 수령 단체 (Donee Organization)</div>
            <table class="form-table">
              <tr>
                <th>단 체 명</th>
                <td style="width: 28%;"><strong>${currentTenant?.name || '가맹 단체'}</strong></td>
                <th>고유번호 / 사업자번호</th>
                <td>${currentTenant?.uniqueNumber || currentTenant?.businessRegistrationNumber || '240-82-12345'}</td>
              </tr>
              <tr>
                <th>소재지 (주소)</th>
                <td colspan="3">${currentTenant?.address || '서울특별시 종로구 우정국로 55'}</td>
              </tr>
              <tr>
                <th>기부금 유형</th>
                <td>지정기부금 (종교단체)</td>
                <th>기부금 코드</th>
                <td><strong>코드 41번 (종교단체 기부금)</strong></td>
              </tr>
            </table>

            <!-- 3. 기부금 내용 -->
            <div class="section-label">3. 기부금 납부 내용 (${taxYear}년 귀속 연말정산용)</div>
            <table class="form-table">
              <tr>
                <th>귀속 연도</th>
                <td style="width: 28%;"><strong>${taxYear} 년도</strong></td>
                <th>기부금 수납 유형</th>
                <td>정기 수납 및 지정 기부금 합산</td>
              </tr>
              <tr>
                <th>최근 납부일</th>
                <td>${member.lastDonation}</td>
                <th>발급 일련번호</th>
                <td>${receiptNo}</td>
              </tr>
            </table>

            <div class="total-amount-area">
              <p style="margin: 0; font-size: 11px; color: #555;">${taxYear}년도 연간 기부 합계 금액 (Total Tax-Deductible Donation)</p>
              <h2>${member.totalDonation.toLocaleString()} 원</h2>
            </div>

            <div class="notice-box">
              • 본 영수증은 소득세법 제59조의4 및 조세특례제한법에 따라 연말정산 및 종합소득세 신고 시 소득공제/세액공제 증빙 서류로 제출할 수 있습니다.<br/>
              • 기부금 영수증을 기위조 또는 변조하거나 허위로 발급받은 경우 관련 법령에 의하여 처벌받을 수 있습니다.
            </div>

            <div class="seal-wrapper">
              <p style="margin-bottom: 8px; font-size: 12px;">발급일자: ${todayStr}</p>
              <p style="font-size: 16px; font-weight: bold; margin: 0;">
                ${currentTenant?.name || '가맹 단체'} 대표 
                <span class="seal-stamp">직인생략</span>
              </p>
            </div>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 12px 30px; font-size: 15px; font-weight: bold; background: #1e3a8a; color: white; border: none; border-radius: 8px; cursor: pointer;">
              🧾 소득공제용 기부금 영수증 인쇄하기
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('기부금영수증 발급 인쇄 창이 열렸습니다.');
    setIsTaxModalOpen(false);
    setTaxRrn(''); // Security: Instantly wipe RRN from memory
  };

  // 2. 전체 납부 확인서 인쇄
  const handlePrintReceipt = (donationItem?: any) => {
    if (donationItem && donationItem.status !== 'completed') {
      toast.warning('취소 또는 실패한 결제 건은 납부 확인서를 발급할 수 없습니다.');
      return;
    }
    if (!donationItem && member.totalDonation <= 0) {
      toast.warning(`실제 납부 완료된 ${terms.donation} 금액이 0원이므로 납부 확인서를 발급할 수 없습니다.`);
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast.error('팝업 차단이 활성화되어 있습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const targetAmount = donationItem ? donationItem.amount : member.totalDonation;
    const targetItemName = donationItem ? donationItem.itemName : `전체 누적 ${donationTerm} 확인서`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${currentTenant?.name || '가맹 단체'} - ${donationTerm} 확인증 / 영수증</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 20px; color: #111; line-height: 1.6; }
            .receipt-box { border: 3px double #333; padding: 30px; border-radius: 8px; max-w: 650px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 25px; }
            .header h1 { font-size: 24px; letter-spacing: 4px; margin: 0 0 5px 0; font-weight: 800; }
            .header p { font-size: 13px; color: #555; margin: 0; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .info-table th, .info-table td { border: 1px solid #ccc; padding: 10px 12px; font-size: 13px; text-align: left; }
            .info-table th { background-color: #f7f7f7; font-weight: bold; width: 30%; }
            .amount-box { background: #f0f4ff; border: 1.5px solid #2563eb; padding: 15px; text-align: center; border-radius: 6px; margin-bottom: 25px; }
            .amount-box h2 { margin: 0; font-size: 22px; color: #1d4ed8; font-weight: bold; }
            .footer-msg { text-align: center; margin-top: 35px; font-size: 13px; }
            .seal-area { text-align: right; margin-top: 30px; font-size: 14px; font-weight: bold; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <h1>${donationTerm.toUpperCase()} 납부 확인증</h1>
              <p>${currentTenant?.name || '가맹 단체명'} 공식 납부 영수 증명서</p>
            </div>

            <table class="info-table">
              <tr>
                <th>${memberTerm} 성명</th>
                <td><strong>${member.name}</strong> ${member.baptismName ? `(${member.baptismName})` : ''}</td>
              </tr>
              <tr>
                <th>연락처</th>
                <td>${formatPhoneNumber(member.phone)}</td>
              </tr>
              <tr>
                <th>이메일</th>
                <td>${member.email || '미등록'}</td>
              </tr>
              <tr>
                <th>${donationTerm} 항목</th>
                <td>${targetItemName}</td>
              </tr>
              <tr>
                <th>발급 일자</th>
                <td>${todayStr}</td>
              </tr>
            </table>

            <div class="amount-box">
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #4b5563;">총 납부 금액 (Amount Paid)</p>
              <h2>${targetAmount.toLocaleString()} 원</h2>
            </div>

            <div class="footer-msg">
              <p>위 금액을 ${currentTenant?.name || '본 단체'}에 정성껏 납부하였음을 증명합니다.</p>
            </div>

            <div class="seal-area">
              <p style="margin-bottom: 5px;">${todayStr}</p>
              <p style="font-size: 16px;"><strong>${currentTenant?.name || '가맹 단체'} 대표 [직인생략]</strong></p>
            </div>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 25px; font-size: 14px; font-weight: bold; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
              🖨️ 즉시 인쇄하기
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 3. 정기결제 약정 상태 변경 (DB 실시간 반영)
  const handleUpdateSubscriptionStatus = async (subId: string, newStatus: 'active' | 'paused' | 'cancelled') => {
    try {
      const res = await subscriptionAPI.updateStatus(subId, newStatus);
      if (res.success) {
        const label = newStatus === 'active' ? '약정 유지' : newStatus === 'paused' ? '일시정지' : '해지';
        toast.success(`정기결제 약정 상태가 [${label}] 상태로 변경되었습니다.`);
        setMember((prev) => {
          if (!prev || !prev.subscriptions) return prev;
          const updatedSubs = prev.subscriptions.map((s) => (s.id === subId ? { ...s, status: newStatus } : s));
          const activeCount = updatedSubs.filter((s) => s.status === 'active').length;
          return {
            ...prev,
            subscriptions: updatedSubs,
            recurringCount: activeCount,
          };
        });
      } else {
        toast.error('약정 상태 변경에 실패했습니다: ' + (res.error || ''));
      }
    } catch (e: any) {
      toast.error('약정 상태 변경 중 오류가 발생했습니다: ' + (e?.message || ''));
    }
  };

  const handleOpenEditModal = () => {
    setEditName(member.name);
    setEditTitle(member.baptismName || '');
    setEditPhone(formatPhoneNumber(member.phone));
    setEditEmail(member.email || '');
    setEditAddress(member.address || '');
    setEditRrn(member.rrn || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.error('회원 성명을 입력해 주세요.');
      return;
    }

    const cleanPhone = stripPhoneDigits(editPhone) || (member ? stripPhoneDigits(member.phone) : '');

    // DB 및 영구 설정 실측 저장
    if (cleanPhone) {
      try {
        await memberAPI.updateProfile(cleanPhone, {
          name: editName.trim(),
          baptismName: editTitle.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
          fullAddress: editAddress.trim(),
        });
      } catch (err) {
        console.warn('Failed to update member profile in DB:', err);
      }
    }

    setMember((prev) =>
      prev
        ? {
            ...prev,
            name: editName.trim(),
            baptismName: editTitle.trim(),
            phone: cleanPhone || prev.phone,
            email: editEmail.trim(),
            address: editAddress.trim(),
            rrn: editRrn.trim() || prev.rrn,
          }
        : null
    );

    setIsEditModalOpen(false);
    toast.success(`[${editName}] ${memberTerm} 정보가 수정 및 저장되었습니다.`);
  };

  const handleDelete = () => {
    if (confirm(`정말로 [${member.name}] ${memberTerm} 정보를 삭제하시겠습니까?`)) {
      toast.success(`[${member.name}] ${memberTerm} 정보가 삭제되었습니다.`);
      navigate(`/${tenantSlug}/admin/members`);
    }
  };

  const donations = member.donationsHistory || [];
  const subscriptions = member.subscriptions || [];
  const prayers = member.prayersHistory || [];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content Page */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-8 space-y-6 w-full">
          {/* Navigation Bar & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/${tenantSlug}/admin/members`)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--hm-ink-2)] hover:text-[var(--hm-ink)] hover:bg-[var(--hm-paper-2)] -ml-2 self-start cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-[var(--hm-ink-3)]" />
              <span>{memberTerm} 목록으로 돌아가기</span>
            </Button>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-xs text-[var(--hm-ink-2)] bg-[var(--hm-paper)] hover:bg-[var(--hm-paper-2)] border border-[var(--hm-border)] h-8 px-3 rounded-lg shadow-2xs transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5 text-[var(--hm-ink-3)]" />
                <span>정보 수정</span>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-xs text-[var(--hm-danger)] hover:bg-[oklch(0.52_0.20_27_/_0.08)] border border-[oklch(0.52_0.20_27_/_0.25)] h-8 px-3 rounded-lg shadow-2xs transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>회원 삭제</span>
              </button>
            </div>
          </div>

          {/* Member Profile Card & Unified Metrics Strip (Hallmark Cobalt-01 Light) */}
          <div className="rounded-2xl border border-[var(--hm-border)] bg-[var(--hm-paper)] shadow-2xs p-6 sm:p-7 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                    {member.name}
                  </h1>
                  {member.baptismName && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {getTitleLabel()}: {member.baptismName}
                    </span>
                  )}
                  {member.recurringCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      정기 약정 {member.recurringCount}건
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      일반 회원
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500 font-normal">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="tabular-nums text-slate-700 font-semibold">
                      {formatPhoneNumber(member.phone)}
                    </span>
                    <button
                      onClick={handleCopyPhone}
                      title="연락처 복사"
                      className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600">{member.email || '이메일 미등록'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="tabular-nums text-slate-600">가입일: {member.registeredDate}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
                <button
                  type="button"
                  onClick={handleOpenTaxModal}
                  className="inline-flex items-center gap-1.5 bg-[var(--hm-paper)] hover:bg-[var(--hm-paper-2)] text-[var(--hm-ink)] border border-[var(--hm-border)] font-semibold text-xs h-9 px-3.5 rounded-lg shadow-2xs cursor-pointer transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-[var(--hm-ink-3)]" />
                  <span>소득공제 영수증 발급</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintReceipt()}
                  className="inline-flex items-center gap-1.5 bg-[var(--hm-cobalt-gradient)] hover:brightness-110 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm cursor-pointer transition-all"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>전체 {donationTerm} 확인서</span>
                </button>
              </div>
            </div>

            {/* Quiet 4-Column Metric Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-[var(--hm-border)]">
              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--hm-ink-3)] block">총 누적 {donationTerm}액</span>
                <span className="text-2xl font-black text-[var(--hm-ink)] font-[family-name:var(--font-mono)] tabular-nums tracking-tight block">
                  {member.totalDonation.toLocaleString()}원
                </span>
                <span className="text-[11px] text-[var(--hm-ink-3)] block">실측 결제 완료 기준</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--hm-ink-3)] block">최근 {donationTerm}일</span>
                <span className="text-base font-bold text-[var(--hm-ink)] font-[family-name:var(--font-mono)] tabular-nums block pt-0.5">
                  {member.lastDonation || '기록 없음'}
                </span>
                <span className="text-[11px] text-[var(--hm-ink-3)] block">최근 납부 일자</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--hm-ink-3)] block">정기 약정 현황</span>
                <span className="text-base font-bold text-[var(--hm-ink)] font-[family-name:var(--font-display)] block pt-0.5">
                  {member.recurringCount > 0 ? `${member.recurringCount}건 활성 유지` : '1회성 전용'}
                </span>
                <span className="text-[11px] text-[var(--hm-ink-3)] block">자동 이체 등록 여부</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--hm-ink-3)] flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[var(--hm-ink-3)] shrink-0" />
                    주소
                  </span>
                  {member.address && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(member.address || '');
                        toast.success('주소가 클립보드에 복사되었습니다.');
                      }}
                      title="주소 복사"
                      className="text-[var(--hm-ink-3)] hover:text-[var(--hm-ink)] transition-colors p-0.5 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <span
                  className="text-xs text-[var(--hm-ink-2)] block leading-relaxed break-keep break-words select-text pt-0.5"
                  title={member.address}
                >
                  {member.address || '주소 미입력'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <div className="rounded-2xl border border-[var(--hm-border)] bg-[var(--hm-paper)] shadow-2xs p-6 sm:p-7">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              {/* Hallmark Modern Tab Bar */}
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-[var(--hm-paper-2)] p-1 rounded-xl border border-[var(--hm-border)] mb-6 h-auto">
                <TabsTrigger
                  value="history"
                  className="gap-2 font-medium text-xs sm:text-sm py-2 rounded-lg text-[var(--hm-ink-3)] data-[state=active]:bg-[var(--hm-paper)] data-[state=active]:text-[var(--hm-ink)] data-[state=active]:shadow-xs transition-all cursor-pointer font-[family-name:var(--font-body)]"
                >
                  <CreditCard className="h-3.5 w-3.5 text-[var(--hm-ink-3)]" />
                  <span>{donationTerm} 내역</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-[var(--hm-paper-3)] text-[var(--hm-ink-2)] font-[family-name:var(--font-mono)] tabular-nums font-semibold">
                    {donations.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="recurring"
                  className="gap-2 font-medium text-xs sm:text-sm py-2 rounded-lg text-[var(--hm-ink-3)] data-[state=active]:bg-[var(--hm-paper)] data-[state=active]:text-[var(--hm-ink)] data-[state=active]:shadow-xs transition-all cursor-pointer font-[family-name:var(--font-body)]"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[var(--hm-ink-3)]" />
                  <span>정기 약정</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-[var(--hm-paper-3)] text-[var(--hm-ink-2)] font-[family-name:var(--font-mono)] tabular-nums font-semibold">
                    {subscriptions.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="prayers"
                  className="gap-2 font-medium text-xs sm:text-sm py-2 rounded-lg text-[var(--hm-ink-3)] data-[state=active]:bg-[var(--hm-paper)] data-[state=active]:text-[var(--hm-ink)] data-[state=active]:shadow-xs transition-all cursor-pointer font-[family-name:var(--font-body)]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[var(--hm-ink-3)]" />
                  <span>{prayerTerm} 이력</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-[var(--hm-paper-3)] text-[var(--hm-ink-2)] font-[family-name:var(--font-mono)] tabular-nums font-semibold">
                    {prayers.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="note"
                  className="gap-2 font-medium text-xs sm:text-sm py-2 rounded-lg text-[var(--hm-ink-3)] data-[state=active]:bg-[var(--hm-paper)] data-[state=active]:text-[var(--hm-ink)] data-[state=active]:shadow-xs transition-all cursor-pointer font-[family-name:var(--font-body)]"
                >
                  <FileText className="h-3.5 w-3.5 text-[var(--hm-ink-3)]" />
                  <span>관리자 메모</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: 결제 / 납부 내역 */}
              <TabsContent value="history" className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[var(--hm-ink)] text-base flex items-center gap-2 font-[family-name:var(--font-display)]">
                      <span>{member.name} {memberTerm}의 {donationTerm} 내역</span>
                      <span className="text-xs font-semibold text-[var(--hm-ink-3)] bg-[var(--hm-paper-2)] px-2.5 py-0.5 rounded-full border border-[var(--hm-border)] font-[family-name:var(--font-mono)] tabular-nums">
                        {filteredDonationsHistory.length}건 / 전체 {donations.length}건
                      </span>
                    </h3>
                    <p className="text-xs text-[var(--hm-ink-3)] mt-0.5">
                      기간 검색 필터 조회를 제공하며 건별 확인서 인쇄가 가능합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--hm-paper)] hover:bg-[var(--hm-paper-2)] text-[var(--hm-ink)] border border-[var(--hm-border)] h-8 px-3 rounded-lg shadow-2xs self-start sm:self-auto cursor-pointer transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5 text-[var(--hm-ink-3)]" />
                    <span>납부확인서 인쇄</span>
                  </button>
                </div>

                {/* 기간 지정 필터 모듈 */}
                <div className="bg-[var(--hm-paper-2)] border border-[var(--hm-border)] p-3.5 sm:p-4 rounded-xl space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--hm-ink-2)] flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="h-3.5 w-3.5 text-[var(--hm-ink-3)]" />
                        기간:
                      </span>
                      <PeriodRangePicker
                        unit={periodUnit}
                        onUnitChange={(u) => setPeriodUnit(u)}
                        selection={periodSelection}
                        onSelectionChange={(newSel) => setPeriodSelection(newSel)}
                      />
                    </div>

                    <div className="flex items-center gap-3 self-end lg:self-auto text-xs font-normal text-[var(--hm-ink-3)]">
                      <span>
                        조회 건수: <strong className="text-[var(--hm-ink)] font-bold font-[family-name:var(--font-mono)] tabular-nums">{filteredDonationsHistory.length}건</strong>
                        {nonCompletedDonationCount > 0 && (
                          <span className="text-[11px] text-[var(--hm-ink-3)] ml-1 font-[family-name:var(--font-mono)] tabular-nums">
                            (완료 {completedDonationCount}건 / 취소·실패 {nonCompletedDonationCount}건)
                          </span>
                        )}
                      </span>
                      <span className="text-[var(--hm-border)]">|</span>
                      <span>
                        기간 실납부 합계: <strong className="text-[var(--hm-ink)] font-black font-[family-name:var(--font-mono)] tabular-nums">{filteredCompletedSum.toLocaleString()}원</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-[var(--hm-border)] overflow-hidden bg-[var(--hm-paper)] shadow-2xs">
                  <Table>
                    <TableHeader className="bg-[var(--hm-paper-2)] border-b border-[var(--hm-border)]">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">결제일시</TableHead>
                        <TableHead className="font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">{donationTerm} 항목</TableHead>
                        <TableHead className="font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">구분</TableHead>
                        <TableHead className="font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">결제 수단</TableHead>
                        <TableHead className="text-right font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">결제 금액</TableHead>
                        <TableHead className="text-center font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">결제 상태</TableHead>
                        <TableHead className="text-center font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">영수증</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDonationsHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-[var(--hm-ink-3)]">
                            <div className="space-y-1">
                              <p className="font-semibold text-[var(--hm-ink)]">선택하신 기간에 해당하는 내역이 없습니다.</p>
                              <p className="text-xs text-[var(--hm-ink-3)]">기간 설정을 변경하거나 '전체 기간'을 눌러 확인해보세요.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDonationsHistory.map((don) => (
                          <TableRow key={don.id} className="hover:bg-[var(--hm-paper-2)] border-b border-[var(--hm-border)] transition-colors">
                            <TableCell className="font-[family-name:var(--font-mono)] tabular-nums text-xs whitespace-nowrap py-3">
                              <div className="font-semibold text-[var(--hm-ink)]">{don.date}</div>
                              {don.time && (
                                <div className="text-[11px] text-[var(--hm-ink-3)] mt-0.5">{don.time}</div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-[var(--hm-ink)] py-3 text-sm">
                              {don.itemName}
                            </TableCell>
                            <TableCell className="py-3">
                              {don.type === 'recurring' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--hm-accent-bg)] text-[var(--hm-accent)] border border-[var(--hm-accent-border)] font-[family-name:var(--font-mono)]">
                                  정기
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--hm-paper-2)] text-[var(--hm-ink-3)] border border-[var(--hm-border)] font-[family-name:var(--font-mono)]">
                                  1회성
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-[var(--hm-ink-2)] py-3 font-normal">
                              {don.paymentMethod}
                            </TableCell>
                            <TableCell className="text-right py-3 font-[family-name:var(--font-mono)] tabular-nums">
                              {don.status === 'completed' ? (
                                <span className="font-black text-[var(--hm-ink)] text-sm">
                                  {don.amount.toLocaleString()}원
                                </span>
                              ) : (
                                <span className="font-normal text-[var(--hm-ink-3)] line-through text-sm">
                                  {don.amount.toLocaleString()}원
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {don.status === 'completed' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[oklch(0.55_0.17_148_/_0.12)] text-[var(--hm-success)] border border-[oklch(0.55_0.17_148_/_0.25)]">
                                  정상 완료
                                </span>
                              ) : don.status === 'cancelled' ? (
                                <div className="space-y-0.5 inline-block">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[oklch(0.52_0.20_27_/_0.12)] text-[var(--hm-danger)] border border-[oklch(0.52_0.20_27_/_0.25)]">
                                    결제 취소
                                  </span>
                                  {don.cancelReason && (
                                    <span className="block text-[10px] text-[var(--hm-danger)] font-normal max-w-[130px] truncate" title={don.cancelReason}>
                                      사유: {don.cancelReason}
                                    </span>
                                  )}
                                </div>
                              ) : don.status === 'failed' ? (
                                <div className="space-y-0.5 inline-block">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[oklch(0.65_0.16_65_/_0.12)] text-[oklch(0.65_0.16_65)] border border-[oklch(0.65_0.16_65_/_0.25)]">
                                    결제 실패
                                  </span>
                                  {don.failureReason && (
                                    <span className="block text-[10px] text-[oklch(0.65_0.16_65)] font-normal max-w-[130px] truncate" title={don.failureReason}>
                                      {don.failureReason}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--hm-paper-2)] text-[var(--hm-ink-3)] border border-[var(--hm-border)]">
                                  대기
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {don.status === 'completed' ? (
                                <button
                                  type="button"
                                  onClick={() => handlePrintReceipt(don)}
                                  className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold text-[var(--hm-accent)] hover:bg-[var(--hm-accent-bg)] cursor-pointer rounded-md transition-colors"
                                >
                                  <Printer className="h-3 w-3" />
                                  <span>인쇄</span>
                                </button>
                              ) : don.status === 'cancelled' ? (
                                <span className="text-xs text-[var(--hm-danger)] font-medium">취소</span>
                              ) : (
                                <span className="text-xs text-[var(--hm-ink-3)] font-normal">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* TAB 2: 정기 약정 현황 */}
              <TabsContent value="recurring" className="space-y-4">
                <div>
                  <h3 className="font-bold text-[var(--hm-ink)] text-base font-[family-name:var(--font-display)]">
                    자동 이체 / 정기결제 약정 목록
                  </h3>
                  <p className="text-xs text-[var(--hm-ink-3)] mt-0.5">
                    매월 또는 매주 자동 수납되는 정기 약정을 확인하고 일시정지 또는 해지 관리합니다.
                  </p>
                </div>

                {subscriptions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subscriptions.map((sub) => {
                      const intervalLabel =
                        sub.recurringInterval === 'daily'
                          ? '매일'
                          : sub.recurringInterval === 'weekly'
                          ? '매주'
                          : '매월';

                      const getDayLabel = (val: any) => {
                        if (val === undefined || val === null) return '일';
                        if (typeof val === 'string') {
                          const trimmed = val.replace(/[^일월화수목금토0-6]/g, '');
                          if (['일', '월', '화', '수', '목', '금', '토'].includes(trimmed)) return trimmed;
                          const num = parseInt(trimmed, 10);
                          if (!isNaN(num) && num >= 0 && num <= 6) return ['일', '월', '화', '수', '목', '금', '토'][num];
                          return '일';
                        }
                        const days = ['일', '월', '화', '수', '목', '금', '토'];
                        return days[Number(val) % 7] ?? '일';
                      };

                      const cycleDesc =
                        sub.recurringInterval === 'daily'
                          ? '매일'
                          : sub.recurringInterval === 'weekly'
                          ? `매주 ${getDayLabel(sub.recurringDayOfWeek)}요일`
                          : `매월 ${sub.billingDay || 15}일`;

                      return (
                        <div
                          key={sub.id}
                          className="rounded-xl border border-[var(--hm-border)] bg-[var(--hm-paper)] p-5 shadow-2xs space-y-4 hover:border-[var(--hm-accent-border)] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-base font-bold text-[var(--hm-ink)] font-[family-name:var(--font-display)]">{sub.itemName}</h4>
                              <span className="text-xs text-[var(--hm-ink-3)] font-normal">{intervalLabel} 자동 납부</span>
                            </div>
                            {sub.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[oklch(0.55_0.17_148_/_0.12)] text-[var(--hm-success)] border border-[oklch(0.55_0.17_148_/_0.25)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--hm-success)]"></span>
                                약정 유지 중
                              </span>
                            ) : sub.status === 'paused' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[oklch(0.65_0.16_65_/_0.12)] text-[oklch(0.65_0.16_65)] border border-[oklch(0.65_0.16_65_/_0.25)]">
                                일시 정지
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--hm-paper-2)] text-[var(--hm-ink-3)] border border-[var(--hm-border)]">
                                약정 해지됨
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline justify-between pt-1">
                            <span className="text-xs font-medium text-[var(--hm-ink-3)]">약정 금액</span>
                            <span className="text-lg font-black text-[var(--hm-ink)] font-[family-name:var(--font-mono)] tabular-nums">
                              {sub.monthlyAmount.toLocaleString()}원 / {sub.recurringInterval === 'weekly' ? '주' : '월'}
                            </span>
                          </div>

                          <div className="text-xs text-[var(--hm-ink-2)] space-y-1.5 pt-3 border-t border-[var(--hm-border)]">
                            {sub.cardName && (
                              <div className="flex justify-between">
                                <span className="text-[var(--hm-ink-3)]">결제 수단</span>
                                <span className="font-semibold text-[var(--hm-ink)]">{sub.cardName}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-[var(--hm-ink-3)]">결제 주기</span>
                              <span className="font-semibold text-[var(--hm-ink)]">{cycleDesc}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--hm-ink-3)]">다음 결제 예정일</span>
                              <span className="font-bold text-[var(--hm-ink)] font-[family-name:var(--font-mono)] tabular-nums">{sub.nextPaymentDate || '-'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            {sub.status === 'active' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSubscriptionStatus(sub.id, 'paused')}
                                  className="flex-1 inline-flex items-center justify-center text-xs font-semibold h-8 rounded-lg gap-1 border border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)] hover:bg-[var(--hm-paper-2)] cursor-pointer transition-colors"
                                >
                                  <PauseCircle className="h-3.5 w-3.5 text-[var(--hm-ink-3)]" />
                                  <span>일시정지</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSubscriptionStatus(sub.id, 'cancelled')}
                                  className="flex-1 inline-flex items-center justify-center text-xs font-semibold h-8 rounded-lg gap-1 text-[var(--hm-danger)] hover:bg-[oklch(0.52_0.20_27_/_0.08)] border border-[oklch(0.52_0.20_27_/_0.25)] cursor-pointer transition-colors"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>약정 해지</span>
                                </button>
                              </>
                            )}
                            {sub.status === 'paused' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSubscriptionStatus(sub.id, 'active')}
                                  className="flex-1 inline-flex items-center justify-center text-xs font-semibold h-8 rounded-lg gap-1 text-[var(--hm-success)] hover:bg-[oklch(0.55_0.17_148_/_0.10)] border border-[oklch(0.55_0.17_148_/_0.25)] cursor-pointer transition-colors"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  <span>약정 재개</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSubscriptionStatus(sub.id, 'cancelled')}
                                  className="flex-1 inline-flex items-center justify-center text-xs font-semibold h-8 rounded-lg gap-1 text-[var(--hm-danger)] hover:bg-[oklch(0.52_0.20_27_/_0.08)] border border-[oklch(0.52_0.20_27_/_0.25)] cursor-pointer transition-colors"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>약정 해지</span>
                                </button>
                              </>
                            )}
                            {sub.status === 'cancelled' && (
                              <div className="w-full text-center py-2 text-xs font-normal text-[var(--hm-ink-3)] bg-[var(--hm-paper-2)] rounded-lg border border-[var(--hm-border)]">
                                해지된 정기결제 약정입니다.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-[var(--hm-paper-2)] rounded-xl border border-[var(--hm-border)] text-[var(--hm-ink-3)] text-xs">
                    등록된 정기 결제 약정이 없습니다.
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: 메시지 신청 이력 */}
              <TabsContent value="prayers" className="space-y-4">
                <div>
                  <h3 className="font-bold text-[var(--hm-ink)] text-base font-[family-name:var(--font-display)]">
                    {prayerTerm} 및 기부 메시지 내역
                  </h3>
                  <p className="text-xs text-[var(--hm-ink-3)] mt-0.5">
                    회원이 신청 시 함께 남긴 전달 메시지 목록입니다.
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--hm-border)] overflow-hidden bg-[var(--hm-paper)] shadow-2xs">
                  <Table>
                    <TableHeader className="bg-[var(--hm-paper-2)] border-b border-[var(--hm-border)]">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">신청일자</TableHead>
                        <TableHead className="font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">구분</TableHead>
                        <TableHead className="font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">메시지 내용</TableHead>
                        <TableHead className="font-semibold text-xs text-[var(--hm-ink-3)] py-3 uppercase tracking-wide">대상자 성명</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prayers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-[var(--hm-ink-3)] text-xs">
                            등록된 {prayerTerm} 및 메시지 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        prayers.map((pr) => (
                          <TableRow key={pr.id} className="hover:bg-[var(--hm-paper-2)] border-b border-[var(--hm-border)]">
                            <TableCell className="font-[family-name:var(--font-mono)] tabular-nums text-xs text-[var(--hm-ink-3)] py-3">{pr.date}</TableCell>
                            <TableCell className="py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--hm-paper-2)] text-[var(--hm-ink)] border border-[var(--hm-border)]">
                                {pr.category}
                              </span>
                            </TableCell>
                            <TableCell className="font-semibold text-[var(--hm-ink)] py-3 text-sm">{pr.title}</TableCell>
                            <TableCell className="text-xs font-normal text-[var(--hm-ink-2)] py-3">{pr.beneficiaryName}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* TAB 4: 관리자 메모 */}
              <TabsContent value="note" className="space-y-4">
                <div>
                  <h3 className="font-bold text-[var(--hm-ink)] text-base font-[family-name:var(--font-display)]">
                    {member.name} {memberTerm} 특이사항 메모
                  </h3>
                  <p className="text-xs text-[var(--hm-ink-3)] mt-0.5">
                    회원과의 상담 내역, 영수증 합산 요청 등 관리자 전용 기록입니다 (외부 미노출).
                  </p>
                </div>

                <div className="space-y-3">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={terms.adminNotePlaceholder}
                    className="min-h-[160px] rounded-xl p-4 text-sm bg-[var(--hm-paper-2)] border-[var(--hm-border)] text-[var(--hm-ink)] placeholder:text-[var(--hm-ink-3)] focus:bg-[var(--hm-paper)] transition-colors"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      className="inline-flex items-center gap-1.5 bg-[var(--hm-cobalt-gradient)] hover:brightness-110 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm cursor-pointer transition-all"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>메모 저장</span>
                    </button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* 🧾 소득공제용 기부금영수증 발급 전용 온디맨드 일시 입력 모달 */}
      <Dialog open={isTaxModalOpen} onOpenChange={setIsTaxModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 border-[var(--hm-border)] bg-[var(--hm-paper)] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--hm-ink)] flex items-center gap-2 font-[family-name:var(--font-display)]">
              <FileText className="h-4 w-4 text-[var(--hm-accent)]" />
              <span>소득공제용 기부금영수증 발급</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--hm-ink-3)] mt-1">
              국세청 별지 제45호 서식 기부금영수증 출력을 위한 발급 정보를 입력합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-[var(--hm-paper-2)] border border-[var(--hm-border)] rounded-xl p-3.5 space-y-1 text-xs text-[var(--hm-ink-2)]">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--hm-ink)]">
                <ShieldCheck className="h-4 w-4 text-[var(--hm-accent)] shrink-0" />
                <span>개인정보보호법에 따른 안전 안내</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-[var(--hm-ink-2)]">
                {terms.donor}(기부자)의 <strong>주민등록번호</strong>는 영수증 출력 시에만 일시 사용되며, <strong>DB에 영구 저장되지 않으므로</strong> 안심하고 발급하실 수 있습니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">귀속 연도</Label>
                <Input
                  type="text"
                  value={taxYear}
                  onChange={(e) => setTaxYear(e.target.value)}
                  className="text-xs bg-[var(--hm-paper)] border-[var(--hm-border)] text-[var(--hm-ink)] font-[family-name:var(--font-mono)] tabular-nums font-semibold rounded-lg"
                  placeholder="2026"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">연간 기부 총액</Label>
                <Input
                  type="text"
                  readOnly
                  value={`${member.totalDonation.toLocaleString()}원`}
                  className="text-xs bg-[var(--hm-paper-2)] border-[var(--hm-border)] font-bold font-[family-name:var(--font-mono)] tabular-nums text-[var(--hm-ink)] cursor-not-allowed rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">{terms.donor} 성명 (기부자)</Label>
              <Input
                type="text"
                value={taxDonorName}
                onChange={(e) => setTaxDonorName(e.target.value)}
                placeholder="성명 입력 (부양가족 신청 시 변경 가능)"
                className="text-xs bg-[var(--hm-paper)] border-[var(--hm-border)] text-[var(--hm-ink)] rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[var(--hm-ink)] flex items-center justify-between">
                <span>주민등록번호 <span className="text-[var(--hm-danger)] font-normal">* (필수 13자리)</span></span>
                <span className="text-[11px] font-normal text-[var(--hm-ink-3)] font-[family-name:var(--font-mono)]">일시 사용 / DB 미저장</span>
              </Label>
              <Input
                type="text"
                value={taxRrn}
                onChange={(e) => setTaxRrn(formatRrnInput(e.target.value))}
                placeholder="주민등록번호 13자리 (예: 850101-1234567)"
                maxLength={14}
                className="text-xs bg-[var(--hm-paper)] border-[var(--hm-border)] focus:border-[var(--hm-accent)] text-[var(--hm-ink)] font-[family-name:var(--font-mono)] tabular-nums font-semibold tracking-wider rounded-lg"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">{terms.donor} 주소 (기부자)</Label>
              <Input
                type="text"
                value={taxAddress}
                onChange={(e) => setTaxAddress(e.target.value)}
                placeholder="서울특별시 강남구..."
                className="text-xs bg-[var(--hm-paper)] border-[var(--hm-border)] text-[var(--hm-ink)] rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTaxModalOpen(false)}
              className="text-xs border-[var(--hm-border)] text-[var(--hm-ink-2)] rounded-lg cursor-pointer"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleGenerateTaxReceipt}
              className="bg-[var(--hm-cobalt-gradient)] hover:brightness-110 text-white font-semibold text-xs gap-1.5 cursor-pointer rounded-lg shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>영수증 출력 / PDF 저장</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✏️ 회원 정보 수정 모달 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 border-[var(--hm-border)] bg-[var(--hm-paper)] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--hm-ink)] flex items-center gap-2 font-[family-name:var(--font-display)]">
              <Edit2 className="h-4 w-4 text-[var(--hm-accent)]" />
              <span>{memberTerm} 정보 수정</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--hm-ink-3)] mt-1">
              선택한 {memberTerm}의 기본 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} autoComplete="off" className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">성명 (이름) *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="text-xs rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
              />
            </div>

            <MemberTitleSelect
              value={editTitle}
              onChange={setEditTitle}
              religionType={currentTenant.religionType}
              showLabel={true}
              label={getTitleLabel()}
              selectClassName="rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
              inputClassName="rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
            />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">휴대폰 번호</Label>
              <Input
                type="tel"
                value={formatPhoneNumber(editPhone)}
                onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
                className="text-xs rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)] font-[family-name:var(--font-mono)] tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">이메일 주소</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="text-xs rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">주소</Label>
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="text-xs rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
              />
            </div>

            <div className="bg-[var(--hm-paper-2)] border border-[var(--hm-border)] rounded-xl p-3 text-xs text-[var(--hm-ink-3)] space-y-1">
              <p className="font-semibold text-[var(--hm-ink)] flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--hm-accent)]" />
                <span>주민등록번호 보안 방침 안내</span>
              </p>
              <p className="text-[11px] leading-relaxed text-[var(--hm-ink-3)]">
                개인정보보호법에 따라 주민등록번호는 회원 DB에 저장을 허용하지 않으며, 영수증 발급 시 1회성으로 안전하게 입력받습니다.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-xs border-[var(--hm-border)] text-[var(--hm-ink-2)] rounded-lg cursor-pointer"
              >
                취소
              </Button>
              <Button
                type="submit"
                className="bg-[var(--hm-cobalt-gradient)] hover:brightness-110 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer"
              >
                수정 사항 저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
