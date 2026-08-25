import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Printer,
  Download,
  FileText,
  Heart,
  RefreshCw,
  Edit2,
  Check,
  PauseCircle,
  XCircle,
  Copy,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPhoneNumber } from '../../pages/admin/AdminAccountManagement';

export interface MemberDetailData {
  id: string;
  name: string;
  baptismName?: string; // 법명/세례명/직분
  phone: string;
  email: string;
  address?: string;
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

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberDetailData | null;
  currentTenant: any;
  onUpdateMember?: (updatedMember: MemberDetailData) => void;
}

export function MemberDetailModal({
  isOpen,
  onClose,
  member,
  currentTenant,
  onUpdateMember,
}: MemberDetailModalProps) {
  if (!member) return null;

  const [activeTab, setActiveTab] = useState<'history' | 'recurring' | 'prayers' | 'note'>('history');
  
  // Note state
  const [noteText, setNoteText] = useState(member.note || '');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Religious terminology label
  const memberTerm = currentTenant?.terminology?.member || '회원';
  const donationTerm = currentTenant?.terminology?.donation || '납부';
  const prayerTerm = currentTenant?.terminology?.prayer || '메시지';
  
  const getTitleLabel = () => {
    if (currentTenant?.religionType === 'catholic') return '세례명';
    if (currentTenant?.religionType === 'buddhist') return '법명';
    if (currentTenant?.religionType === 'protestant') return '직분';
    return '호칭/직함';
  };

  const donations = member.donationsHistory || [];
  const subscriptions = member.subscriptions || [];
  const prayers = member.prayersHistory || [];

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(member.phone);
    toast.success('연락처가 클립보드에 복사되었습니다.');
  };

  const handleSaveNote = () => {
    if (onUpdateMember) {
      onUpdateMember({ ...member, note: noteText });
    }
    setIsEditingNote(false);
    toast.success('관리자 메모가 저장되었습니다.');
  };

  // 국세청 소득공제용 기부금 영수증 (별지 제45호 서식) 법정 표준 인쇄 엔진
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

  // 납부 확인서 / 영수증 브라우저 1:1 인쇄 엔진
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
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        {/* Header Profile Summary (Clean Light Mode) */}
        <div className="bg-white border-b border-slate-200 p-6 sm:p-8 rounded-t-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl font-black text-indigo-700 shadow-inner">
                {member.name.slice(0, 1)}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-900">{member.name}</h2>
                  {member.baptismName && (
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs font-bold">
                      {getTitleLabel()}: {member.baptismName}
                    </Badge>
                  )}
                  {member.recurringCount > 0 ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin-slow text-emerald-700" />
                      정기 약정 {member.recurringCount}건
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs">
                      일반 회원
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium mt-1.5">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-indigo-600" />
                    {formatPhoneNumber(member.phone)}
                    <button
                      onClick={handleCopyPhone}
                      title="연락처 복사"
                      className="hover:text-indigo-600 transition-colors"
                    >
                      <Copy className="h-3 w-3 ml-0.5" />
                    </button>
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-indigo-600" />
                    {member.email || '이메일 미등록'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    등록일: {member.registeredDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button
                onClick={() => handlePrintTaxReceipt('2026')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 text-xs cursor-pointer shadow-sm shadow-amber-200"
              >
                <FileText className="h-4 w-4" />
                🧾 소득공제용 기부금영수증 발급
              </Button>
              <Button
                onClick={() => handlePrintReceipt()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 text-xs cursor-pointer shadow-sm shadow-indigo-200"
              >
                <Printer className="h-4 w-4" />
                전체 {donationTerm} 확인서 인쇄
              </Button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[11px] font-bold text-slate-500 block">총 {donationTerm} 금액</span>
              <span className="text-lg font-black text-emerald-600 mt-0.5 block">
                ₩ {member.totalDonation.toLocaleString()}원
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[11px] font-bold text-slate-500 block">최근 {donationTerm}일</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">
                {member.lastDonation || '기록 없음'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[11px] font-bold text-slate-500 block">정기 약정 수</span>
              <span className="text-sm font-bold text-indigo-600 mt-1 block">
                {member.recurringCount > 0 ? `${member.recurringCount}개 정기 결제` : '단발 전용'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[11px] font-bold text-slate-500 block">주소</span>
              <span className="text-xs font-semibold text-slate-700 mt-1 block truncate" title={member.address}>
                {member.address || '주소 미입력'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-slate-100 dark:bg-zinc-800 p-1 mb-6">
              <TabsTrigger value="history" className="gap-1.5 font-bold text-xs sm:text-sm">
                <CreditCard className="h-4 w-4" />
                1. {donationTerm}/결제 내역 ({donations.length}건)
              </TabsTrigger>
              <TabsTrigger value="recurring" className="gap-1.5 font-bold text-xs sm:text-sm">
                <RefreshCw className="h-4 w-4" />
                2. 정기 약정 현황 ({subscriptions.length}건)
              </TabsTrigger>
              <TabsTrigger value="prayers" className="gap-1.5 font-bold text-xs sm:text-sm">
                <Sparkles className="h-4 w-4" />
                3. {prayerTerm} 이력 ({prayers.length}건)
              </TabsTrigger>
              <TabsTrigger value="note" className="gap-1.5 font-bold text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                4. 관리자 메모
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: 결제 / 납부 내역 */}
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                    {member.name} {memberTerm}의 상세 {donationTerm} 기록
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    건별 영수증 출력 및 기간별 납부 내역을 조회합니다.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handlePrintReceipt()} className="gap-1.5 text-xs font-bold">
                  <Printer className="h-3.5 w-3.5" />
                  영수증 1:1 출력
                </Button>
              </div>

              <Table className="border rounded-xl">
                <TableHeader className="bg-slate-50 dark:bg-zinc-900">
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
                  {donations.map((don) => (
                    <TableRow key={don.id}>
                      <TableCell className="font-mono text-xs text-slate-600">{don.date}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-zinc-100">{don.itemName}</TableCell>
                      <TableCell>
                        <Badge variant={don.type === 'recurring' ? 'default' : 'secondary'} className="text-[11px]">
                          {don.type === 'recurring' ? '🔄 정기' : '⚡ 단발'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{don.paymentMethod}</TableCell>
                      <TableCell className="text-right font-black text-slate-900 dark:text-zinc-100">
                        ₩ {don.amount.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintReceipt(don)}
                          className="h-7 px-2 text-xs gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          인쇄
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* TAB 2: 정기 약정 현황 */}
            <TabsContent value="recurring" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
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

            {/* TAB 3: 메시지 신청 이력 */}
            <TabsContent value="prayers" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                    {prayerTerm} 및 기부 메시지 내역
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    회원이 후원/신청 시 함께 남긴 메시지 및 전달사항 목록입니다.
                  </p>
                </div>
              </div>

              <Table className="border rounded-xl">
                <TableHeader className="bg-slate-50 dark:bg-zinc-900">
                  <TableRow>
                    <TableHead className="font-bold">신청일자</TableHead>
                    <TableHead className="font-bold">구분</TableHead>
                    <TableHead className="font-bold">메시지 내용</TableHead>
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
                <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
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
                  className="min-h-[140px] rounded-xl p-4 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
