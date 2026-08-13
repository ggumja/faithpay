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
  const prayerTerm = currentTenant?.terminology?.prayer || '지향/축원';
  
  const getTitleLabel = () => {
    if (currentTenant?.religionType === 'catholic') return '세례명';
    if (currentTenant?.religionType === 'buddhist') return '법명';
    if (currentTenant?.religionType === 'protestant') return '직분';
    return '호칭/직함';
  };

  // Default mock history for presentation if empty
  const donations = member.donationsHistory || [
    { id: 'don-1', date: member.lastDonation || '2026-08-11', itemName: `${donationTerm} (정기)`, amount: 30000, paymentMethod: '신용카드', type: 'recurring' as const, status: 'completed' as const },
    { id: 'don-2', date: '2026-07-15', itemName: `특별 ${donationTerm}`, amount: 100000, paymentMethod: '카카오페이', type: 'once' as const, status: 'completed' as const },
    { id: 'don-3', date: '2026-07-11', itemName: `${donationTerm} (정기)`, amount: 30000, paymentMethod: '신용카드', type: 'recurring' as const, status: 'completed' as const },
  ];

  const subscriptions = member.subscriptions || [
    { id: 'sub-1', itemName: `월정 ${donationTerm}`, monthlyAmount: 30000, billingDay: 15, status: 'active' as const, nextPaymentDate: '2026-09-15' },
  ];

  const prayers = member.prayersHistory || [
    { id: 'pr-1', date: member.lastDonation || '2026-08-11', title: '가족 건강 및 사업 번창 축원', category: '특별기도', beneficiaryName: member.name },
  ];

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
        {/* Header Profile Summary */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-t-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black text-indigo-200 shadow-inner">
                {member.name.slice(0, 1)}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black">{member.name}</h2>
                  {member.baptismName && (
                    <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-xs font-bold">
                      {getTitleLabel()}: {member.baptismName}
                    </Badge>
                  )}
                  {member.recurringCount > 0 ? (
                    <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/40 text-xs font-bold flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin-slow" />
                      정기 약정 {member.recurringCount}건
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-300 border-slate-700 text-xs">
                      일반 회원
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-indigo-400" />
                    {formatPhoneNumber(member.phone)}
                    <button
                      onClick={handleCopyPhone}
                      title="연락처 복사"
                      className="hover:text-white transition-colors"
                    >
                      <Copy className="h-3 w-3 ml-0.5" />
                    </button>
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-indigo-400" />
                    {member.email || '이메일 미등록'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                    등록일: {member.registeredDate}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => handlePrintReceipt()}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 gap-2 text-xs font-bold self-start sm:self-auto cursor-pointer"
            >
              <Printer className="h-4 w-4 text-indigo-300" />
              전체 {donationTerm} 확인서 인쇄
            </Button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block font-medium">총 {donationTerm} 금액</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                ₩ {member.totalDonation.toLocaleString()}원
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block font-medium">최근 {donationTerm}일</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block">
                {member.lastDonation || '기록 없음'}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block font-medium">정기 약정 수</span>
              <span className="text-sm font-bold text-indigo-300 mt-1 block">
                {member.recurringCount > 0 ? `${member.recurringCount}개 정기 결제` : '단발 전용'}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block font-medium">주소</span>
              <span className="text-xs font-medium text-slate-300 mt-1 block truncate" title={member.address}>
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

            {/* TAB 3: 지향문 / 축원 신청 이력 */}
            <TabsContent value="prayers" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                    {prayerTerm} 및 기부 지향 신청 내역
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    회원이 신청한 사찰 축원발원문, 성당 지향문, 기도 제목 목록입니다.
                  </p>
                </div>
              </div>

              <Table className="border rounded-xl">
                <TableHeader className="bg-slate-50 dark:bg-zinc-900">
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
