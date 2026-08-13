import { useEffect, useState } from 'react';
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
import { donationAPI } from '../../api/client';
import { formatPhoneNumber, stripPhoneDigits } from './AdminAccountManagement';
import { cleanPaymentMethod } from './DonationHistory';

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
  donationsHistory?: {
    id: string;
    date: string;
    itemName: string;
    amount: number;
    paymentMethod: string;
    type: 'recurring' | 'once';
    status: 'completed' | 'cancelled';
  }[];
  subscriptions?: {
    id: string;
    itemName: string;
    monthlyAmount: number;
    billingDay: number;
    status: 'active' | 'paused' | 'cancelled';
    nextPaymentDate: string;
  }[];
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
  const [editRrn, setEditRrn] = useState('');

  // Note state
  const [noteText, setNoteText] = useState('');

  // Period filter states for Tab 1 (Donations History)
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [historyPreset, setHistoryPreset] = useState<'all' | '1m' | '3m' | '6m' | '1y' | 'custom'>('all');

  const handleApplyHistoryPreset = (preset: 'all' | '1m' | '3m' | '6m' | '1y') => {
    setHistoryPreset(preset);
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);

    if (preset === 'all') {
      setHistoryStartDate('');
      setHistoryEndDate('');
      return;
    }

    let start = new Date();
    if (preset === '1m') {
      start.setMonth(start.getMonth() - 1);
    } else if (preset === '3m') {
      start.setMonth(start.getMonth() - 3);
    } else if (preset === '6m') {
      start.setMonth(start.getMonth() - 6);
    } else if (preset === '1y') {
      start.setFullYear(start.getFullYear() - 1);
    }

    setHistoryStartDate(start.toISOString().slice(0, 10));
    setHistoryEndDate(endStr);
  };

  const filteredDonationsHistory = useMemo(() => {
    if (!member || !member.donationsHistory) return [];
    return member.donationsHistory.filter((don) => {
      if (historyStartDate && don.date < historyStartDate) return false;
      if (historyEndDate && don.date > historyEndDate) return false;
      return true;
    });
  }, [member, historyStartDate, historyEndDate]);

  const filteredTotalSum = useMemo(() => {
    return filteredDonationsHistory.reduce((sum, don) => sum + (don.amount || 0), 0);
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
          // Aggregate or find matching member
          const rawMatch = res.data.find((d: any) => d.id === memberId || stripPhoneDigits(d.donorPhone) === memberId);
          
          if (rawMatch) {
            const rawPhone = rawMatch.donorPhone || '';
            const digitsKey = stripPhoneDigits(rawPhone) || '미등록';

            // Filter all donations for this donor phone
            const donorDonations = res.data.filter((d: any) => stripPhoneDigits(d.donorPhone) === digitsKey);
            const totalSum = donorDonations.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
            
            // 1. 정기 약정 현황 (Subscriptions) - DB의 isRecurring 결제 건을 기반으로 약정 정보 수집
            const recurringDonations = donorDonations.filter((d: any) => d.isRecurring);
            const recurringMap = new Map<string, any>();

            recurringDonations.forEach((d: any) => {
              const itemKey = d.itemName || d.title || `${currentTenant.terminology?.donation || '보시/후원'} (정기)`;
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
                });
              }
            });

            const subscriptionsList = Array.from(recurringMap.values());

            // 2. 발원문 / 지향문 이력 (Prayers) - DB의 prayerText 기반 수집
            const prayersList = donorDonations
              .filter((d: any) => d.prayerText && String(d.prayerText).trim() !== '')
              .map((d: any, idx: number) => ({
                id: `pr_${d.id || idx}`,
                date: d.createdAt ? d.createdAt.split('T')[0] : new Date().toISOString().slice(0, 10),
                title: String(d.prayerText),
                category: d.itemName || currentTenant.terminology?.prayer || '지향/축원',
                beneficiaryName: d.donorName || rawMatch.donorName || '신도',
              }));

            const loadedMem: MemberDetailData = {
              id: memberId,
              name: rawMatch.donorName || '익명 보시/후원자',
              baptismName: rawMatch.baptismName || '',
              phone: digitsKey,
              email: rawMatch.donorEmail || '',
              address: rawMatch.address || '',
              rrn: rawMatch.rrn || '',
              registeredDate: rawMatch.createdAt ? rawMatch.createdAt.split('T')[0] : new Date().toISOString().slice(0, 10),
              totalDonation: totalSum,
              lastDonation: donorDonations[0]?.createdAt ? donorDonations[0].createdAt.split('T')[0] : (rawMatch.createdAt ? rawMatch.createdAt.split('T')[0] : ''),
              recurringCount: subscriptionsList.length,
              note: rawMatch.note || '',
              donationsHistory: donorDonations.map((d: any) => ({
                id: d.id,
                date: d.createdAt ? d.createdAt.split('T')[0] : new Date().toISOString().slice(0, 10),
                itemName: d.itemName || (d.isRecurring ? `${currentTenant.terminology?.donation || '보시/후원'} (정기)` : `특별 ${currentTenant.terminology?.donation || '보시/후원'}`),
                amount: d.amount || 0,
                paymentMethod: cleanPaymentMethod(d.paymentMethod || d.payMethod || d.method),
                type: d.isRecurring ? 'recurring' : 'once',
                status: 'completed',
              })),
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
  const memberTerm = currentTenant.terminology?.member || '회원';
  const donationTerm = currentTenant.terminology?.donation || '봉헌/보시';
  const prayerTerm = currentTenant.terminology?.prayer || '지향/축원';

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

  // 1. 국세청 별지 제45호 서식 소득공제용 기부금 영수증 인쇄
  const handlePrintTaxReceipt = (taxYear = '2026') => {
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      toast.error('팝업 차단이 활성화되어 있습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const receiptNo = `FP-${taxYear}-${member.id.slice(-6).toUpperCase()}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>[국세청 별지 제45호 서식] 기부금 영수증 - ${member.name}</title>
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
                <td style="width: 28%;"><strong>${member.name}</strong> ${member.baptismName ? `(${member.baptismName})` : ''}</td>
                <th>주민등록번호</th>
                <td>${member.rrn || '850101-1****** (발급용)'}</td>
              </tr>
              <tr>
                <th>주 소</th>
                <td colspan="3">${member.address || '서울특별시 강남구 테헤란로 123 (주소 미입력)'}</td>
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
              <h2>₩ ${member.totalDonation.toLocaleString()} 원</h2>
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
  };

  // 2. 전체 납부 확인서 인쇄
  const handlePrintReceipt = (donationItem?: any) => {
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
              <h2>₩ ${targetAmount.toLocaleString()} 원</h2>
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

  const handleOpenEditModal = () => {
    setEditName(member.name);
    setEditTitle(member.baptismName || '');
    setEditPhone(formatPhoneNumber(member.phone));
    setEditEmail(member.email || '');
    setEditAddress(member.address || '');
    setEditRrn(member.rrn || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      toast.error('회원 성명을 입력해 주세요.');
      return;
    }

    setMember((prev) =>
      prev
        ? {
            ...prev,
            name: editName.trim(),
            baptismName: editTitle.trim(),
            phone: stripPhoneDigits(editPhone),
            email: editEmail.trim(),
            address: editAddress.trim(),
            rrn: editRrn.trim() || prev.rrn,
          }
        : null
    );

    setIsEditModalOpen(false);
    toast.success(`[${editName}] ${memberTerm} 정보가 수정되었습니다.`);
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
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Navigation Bar Back Button */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigate(`/${tenantSlug}/admin/members`)}
              className="gap-2 cursor-pointer font-bold bg-white dark:bg-zinc-900 border-slate-300 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              {memberTerm} 목록으로 돌아가기
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleOpenEditModal}
                className="gap-1.5 cursor-pointer font-bold text-xs bg-white"
              >
                <Edit2 className="h-3.5 w-3.5 text-indigo-600" />
                정보 수정
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="gap-1.5 cursor-pointer font-bold text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
                회원 삭제
              </Button>
            </div>
          </div>

          {/* Full Page Header Profile Summary (Clean Light Mode) */}
          <Card className="overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-md bg-white dark:bg-zinc-900 border-t-4 border-t-indigo-600">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl font-black text-indigo-700 shadow-inner shrink-0">
                    {member.name.slice(0, 1)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-100">{member.name}</h1>
                      {member.baptismName && (
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-bold text-xs px-2.5 py-1">
                          {getTitleLabel()}: {member.baptismName}
                        </Badge>
                      )}
                      {member.recurringCount > 0 ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs px-2.5 py-1 flex items-center gap-1">
                          <RefreshCw className="h-3 w-3 animate-spin-slow text-emerald-700" />
                          정기 약정 {member.recurringCount}건
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs px-2.5 py-1">
                          일반 회원
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 dark:text-zinc-400 pt-1 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-indigo-600" />
                        {formatPhoneNumber(member.phone)}
                        <button onClick={handleCopyPhone} title="연락처 복사" className="hover:text-indigo-600 transition-colors">
                          <Copy className="h-3 w-3 ml-0.5" />
                        </button>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-indigo-600" />
                        {member.email || '이메일 미등록'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                        가입일: {member.registeredDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
                  <Button
                    onClick={() => handlePrintTaxReceipt('2026')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-xs cursor-pointer py-5 px-4 shadow-sm shadow-amber-200"
                  >
                    <FileText className="h-4 w-4" />
                    🧾 소득공제용 기부금영수증 발급
                  </Button>
                  <Button
                    onClick={() => handlePrintReceipt()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs cursor-pointer py-5 px-4 shadow-sm shadow-indigo-200"
                  >
                    <Printer className="h-4 w-4" />
                    전체 {donationTerm} 확인서 인쇄
                  </Button>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-2xl p-4">
                  <span className="text-xs font-bold text-slate-500 block">총 누적 {donationTerm} 금액</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                    ₩ {member.totalDonation.toLocaleString()}원
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-2xl p-4">
                  <span className="text-xs font-bold text-slate-500 block">최근 {donationTerm}일</span>
                  <span className="text-base font-bold text-slate-800 dark:text-zinc-200 mt-1.5 block">
                    {member.lastDonation || '기록 없음'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-2xl p-4">
                  <span className="text-xs font-bold text-slate-500 block">정기 결제 약정 현황</span>
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1.5 block">
                    {member.recurringCount > 0 ? `${member.recurringCount}개 약정 유지 중` : '단발 전용'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-2xl p-4">
                  <span className="text-xs font-bold text-slate-500 block">주소</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mt-2 block truncate" title={member.address}>
                    {member.address || '주소 미입력'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Full Page Main Tabs */}
          <Card className="bg-white dark:bg-zinc-900 border-slate-200">
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid grid-cols-4 w-full bg-slate-100 dark:bg-zinc-800 p-1 mb-6">
                  <TabsTrigger value="history" className="gap-2 font-bold text-sm">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    1. {donationTerm}/결제 내역 ({donations.length}건)
                  </TabsTrigger>
                  <TabsTrigger value="recurring" className="gap-2 font-bold text-sm">
                    <RefreshCw className="h-4 w-4 text-indigo-600" />
                    2. 정기 약정 현황 ({subscriptions.length}건)
                  </TabsTrigger>
                  <TabsTrigger value="prayers" className="gap-2 font-bold text-sm">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    3. {prayerTerm} 이력 ({prayers.length}건)
                  </TabsTrigger>
                  <TabsTrigger value="note" className="gap-2 font-bold text-sm">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    4. 관리자 전용 메모
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: 결제 / 납부 내역 */}
                <TabsContent value="history" className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base flex items-center gap-2">
                        {member.name} {memberTerm}의 {donationTerm} 내역
                        <Badge variant="outline" className="text-xs text-indigo-700 bg-indigo-50 border-indigo-200">
                          {filteredDonationsHistory.length}건 / 전체 {donations.length}건
                        </Badge>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        기간 검색 필터 조회를 제공하며 건별 영수증 1:1 출력이 가능합니다.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handlePrintReceipt()} className="gap-1.5 text-xs font-bold bg-white cursor-pointer shadow-2xs">
                      <Printer className="h-3.5 w-3.5" />
                      납부확인서 인쇄
                    </Button>
                  </div>

                  {/* 🔍 기간 조회 검색 컨트롤 바 */}
                  <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-3.5 rounded-2xl space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          조회 기간 선택:
                        </span>
                        <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleApplyHistoryPreset('all')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              historyPreset === 'all'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            전체
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyHistoryPreset('1m')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              historyPreset === '1m'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            1개월
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyHistoryPreset('3m')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              historyPreset === '3m'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            3개월
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyHistoryPreset('6m')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              historyPreset === '6m'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            6개월
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyHistoryPreset('1y')}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              historyPreset === '1y'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            1년
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={historyStartDate}
                          onChange={(e) => {
                            setHistoryStartDate(e.target.value);
                            setHistoryPreset('custom');
                          }}
                          className="w-36 text-xs h-8 bg-white dark:bg-zinc-800 border-slate-300 rounded-lg font-mono"
                        />
                        <span className="text-xs font-bold text-slate-400">~</span>
                        <Input
                          type="date"
                          value={historyEndDate}
                          onChange={(e) => {
                            setHistoryEndDate(e.target.value);
                            setHistoryPreset('custom');
                          }}
                          className="w-36 text-xs h-8 bg-white dark:bg-zinc-800 border-slate-300 rounded-lg font-mono"
                        />
                        {(historyStartDate || historyEndDate) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApplyHistoryPreset('all')}
                            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3 mr-1 text-slate-400" />
                            초기화
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Filtered Period Statistics Summary */}
                    <div className="flex flex-wrap items-center justify-between text-xs font-medium text-slate-600 dark:text-zinc-400 pt-2.5 border-t border-slate-200/80 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-indigo-600" />
                        <span>선택 구간: <strong className="text-slate-900 dark:text-zinc-100 font-bold">{historyStartDate || '최초'} ~ {historyEndDate || '현재'}</strong></span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>조회 건수: <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{filteredDonationsHistory.length}건</strong></span>
                        <span>기간 합계 금액: <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">₩ {filteredTotalSum.toLocaleString()}원</strong></span>
                      </div>
                    </div>
                  </div>

                  <Table className="border rounded-xl">
                    <TableHeader className="bg-slate-100 dark:bg-zinc-900">
                      <TableRow>
                        <TableHead className="font-bold">결제일시</TableHead>
                        <TableHead className="font-bold">{donationTerm} 항목</TableHead>
                        <TableHead className="font-bold">구분</TableHead>
                        <TableHead className="font-bold">결제 수단</TableHead>
                        <TableHead className="text-right font-bold">결제 금액</TableHead>
                        <TableHead className="text-center font-bold">영수증</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDonationsHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-700">선택하신 기간에 해당하는 결제 내역이 없습니다.</p>
                              <p className="text-xs text-slate-400">기간 설정을 변경하거나 '초기화' 버튼을 눌러 전체 목록을 확인해보세요.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDonationsHistory.map((don) => (
                          <TableRow key={don.id}>
                            <TableCell className="font-mono text-xs text-slate-600">{don.date}</TableCell>
                            <TableCell className="font-bold text-slate-900 dark:text-zinc-100">{don.itemName}</TableCell>
                            <TableCell>
                              <Badge variant={don.type === 'recurring' ? 'default' : 'secondary'} className="text-[11px]">
                                {don.type === 'recurring' ? '🔄 정기' : '⚡ 단발'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 font-medium">{don.paymentMethod}</TableCell>
                            <TableCell className="text-right font-black text-slate-900 dark:text-zinc-100">
                              ₩ {don.amount.toLocaleString()}원
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrintReceipt(don)}
                                className="h-7 px-2 text-xs gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                인쇄
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* TAB 2: 정기 약정 현황 */}
                <TabsContent value="recurring" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">
                        자동 이체 / 정기결제 약정 현황
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        매월 자동 수납되는 정기 약정을 일시정지 또는 해지 관리합니다.
                      </p>
                    </div>
                  </div>

                  {subscriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {subscriptions.map((sub) => (
                        <Card key={sub.id} className="border-l-4 border-l-indigo-600">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-bold">{sub.itemName}</CardTitle>
                              <Badge className={sub.status === 'active' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-800'}>
                                {sub.status === 'active' ? '🟢 약정 유지 중' : '⚪ 일시 정지'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-1">
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-slate-500">월 약정 금액</span>
                              <span className="text-lg font-black text-indigo-600">₩ {sub.monthlyAmount.toLocaleString()}원 / 월</span>
                            </div>

                            <div className="text-xs text-slate-600 space-y-1 pt-2 border-t font-mono">
                              <div className="flex justify-between">
                                <span>정기 결제일:</span>
                                <span className="font-bold">매월 {sub.billingDay}일</span>
                              </div>
                              <div className="flex justify-between">
                                <span>다음 결제 예정일:</span>
                                <span className="font-bold text-slate-900">{sub.nextPaymentDate}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast.info('정기결제 약정 상태 변경이 처리되었습니다.')}
                                className="flex-1 text-xs gap-1"
                              >
                                <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                                일시정지
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast.info('약정 해지 신청이 접수되었습니다.')}
                                className="flex-1 text-xs gap-1 text-rose-600 hover:text-rose-700"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                약정 해지
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border text-slate-500 text-sm">
                      등록된 정기 결제 약정이 없습니다.
                    </div>
                  )}
                </TabsContent>

                {/* TAB 3: 지향문 / 축원 신청 이력 */}
                <TabsContent value="prayers" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">
                        {prayerTerm} 및 기부 지향 신청 내역
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        회원이 신청한 사찰 축원발원문, 성당 지향문, 기도 제목 목록입니다.
                      </p>
                    </div>
                  </div>

                  <Table className="border rounded-xl">
                    <TableHeader className="bg-slate-100 dark:bg-zinc-900">
                      <TableRow>
                        <TableHead className="font-bold">신청일자</TableHead>
                        <TableHead className="font-bold">구분</TableHead>
                        <TableHead className="font-bold">축원/지향 내용</TableHead>
                        <TableHead className="font-bold">대상자 성명</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prayers.map((pr) => (
                        <TableRow key={pr.id}>
                          <TableCell className="font-mono text-xs text-slate-600">{pr.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-semibold">{pr.category}</Badge>
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 dark:text-zinc-100">{pr.title}</TableCell>
                          <TableCell className="text-xs font-semibold">{pr.beneficiaryName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* TAB 4: 관리자 메모 */}
                <TabsContent value="note" className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">
                      {member.name} {memberTerm} 관리자 전용 특이사항 메모
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      해당 회원과의 상담 내역, 영수증 합산 발급 요청, 특이사항을 기록합니다 (외부 미노출).
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="예: 매월 10일 사찰 방문 시 기부금 영수증 출력 희망. 010-0000-0000 배우자 통합 관리."
                      className="min-h-[160px] rounded-xl p-4 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200"
                    />

                    <div className="flex justify-end">
                      <Button onClick={handleSaveNote} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                        <Check className="h-4 w-4" />
                        메모 저장
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ✏️ 회원 정보 수정 모달 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-indigo-600" />
              {memberTerm} 정보 수정
            </DialogTitle>
            <DialogDescription>
              선택한 {memberTerm}의 기본 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} autoComplete="off" className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">성명 (이름) *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{getTitleLabel()}</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">휴대폰 번호</Label>
              <Input
                type="tel"
                value={formatPhoneNumber(editPhone)}
                onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">이메일 주소</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">주소</Label>
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-amber-700 dark:text-amber-400">주민등록번호 (소득공제 기부금영수증 발급용)</Label>
              <Input
                value={editRrn}
                onChange={(e) => setEditRrn(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                취소
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                수정 사항 저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
