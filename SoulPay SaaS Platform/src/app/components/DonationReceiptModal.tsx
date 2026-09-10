import React, { Fragment } from 'react';
import { Receipt, Printer, X, RotateCcw, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Tenant } from '../context/AppContext';
import { useTenantTerms } from '../hooks/useTenantTerms';

export interface DonationReceiptItem {
  id: string;
  donorName?: string;
  name?: string;
  donorPhone?: string;
  phone?: string;
  amount: number;
  itemName?: string;
  item?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  paymentMethod?: string;
  method?: string;
  paymentStatus?: string;
  status?: string;
  deviceType?: string;
  approveNo?: string;
  transactionId?: string;
  cancelTransactionId?: string;
  cancelApproveNo?: string;
  cancelReason?: string;
  cancelApprovedAt?: string;
  cancelledAt?: string;
  prayerText?: string;
  prayer?: string;
}

interface Props {
  tenant: Tenant;
  donation: DonationReceiptItem;
  onClose: () => void;
  onOpenTaxReceipt?: () => void;
}

function numberToKorean(amount: number): string {
  const units = ['', '만', '억', '조'];
  const smallUnits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const posUnits = ['', '십', '백', '천'];
  if (amount === 0) return '영';
  let result = '';
  let unitIdx = 0;
  while (amount > 0) {
    const chunk = amount % 10000;
    if (chunk > 0) {
      let chunkStr = '';
      let temp = chunk;
      let pos = 0;
      while (temp > 0) {
        const digit = temp % 10;
        if (digit > 0) {
          chunkStr = smallUnits[digit] + (pos > 0 ? posUnits[pos] : '') + chunkStr;
        }
        temp = Math.floor(temp / 10);
        pos++;
      }
      result = chunkStr + units[unitIdx] + ' ' + result;
    }
    amount = Math.floor(amount / 10000);
    unitIdx++;
  }
  return result.trim();
}

function formatPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

export default function DonationReceiptModal({ tenant, donation, onClose, onOpenTaxReceipt }: Props) {
  const terms = useTenantTerms(tenant);
  const isCancelled = donation.paymentStatus === 'cancelled' || donation.status === 'cancelled';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-6"
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
            <Receipt className={`h-5 w-5 ${isCancelled ? 'text-red-600' : 'text-indigo-600'}`} />
            <span>{isCancelled ? terms.cancelReceiptModalTitle : terms.receiptModalTitle}</span>
          </h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              className={`${isCancelled ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold gap-1 rounded-xl cursor-pointer`}
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              프린트 / PDF 출력
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-xl cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Receipt Ticket Container (printable) */}
        <div id="printable-receipt" className="bg-white text-zinc-900 p-6 rounded-xl border border-zinc-200 space-y-6">
          {/* Organization & Receipt Header */}
          <div className={`text-center pb-4 border-b-2 ${isCancelled ? 'border-red-600' : 'border-zinc-900'}`}>
            <p className={`text-xs font-bold tracking-wider mb-1 ${isCancelled ? 'text-red-600' : 'text-indigo-600'}`}>
              {tenant?.name || 'SoulPay'}
            </p>
            <h2 className={`text-2xl font-black tracking-tight ${isCancelled ? 'text-red-600' : 'text-zinc-900'}`}>
              {isCancelled ? terms.cancelReceiptTitle : terms.receiptTitle}
            </h2>
            <p className={`text-[11px] font-semibold mt-1 ${isCancelled ? 'text-red-500' : 'text-zinc-500'}`}>
              {isCancelled ? terms.receiptEnglishCancelTitle : terms.receiptEnglishTitle}
            </p>
          </div>

          {isCancelled && (
            <div className="bg-red-50 border border-red-300 p-3 rounded-xl text-center text-red-700 font-extrabold text-xs flex items-center justify-center gap-2">
              <RotateCcw className="h-4 w-4 text-red-600" />
              <span>[승인 취소 완료] 본 결제건은 정상적으로 승인 취소 처리되었습니다.</span>
            </div>
          )}

          {/* Metadata */}
          <div className="flex justify-between text-xs text-zinc-600 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
            <div>
              <span className="font-semibold text-zinc-500">영수증 번호: </span>
              <span className="font-mono font-bold text-zinc-900">{donation.id}</span>
            </div>
            <div>
              <span className="font-semibold text-zinc-500">발행일시: </span>
              <span className="font-bold text-zinc-900">{new Date(donation.createdAt || donation.date || Date.now()).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>

          {/* Receipt Details Table */}
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">{terms.receiptDonorLabel}</span>
              <span className="col-span-2 font-bold text-zinc-900">{donation.donorName || donation.name} 님</span>
            </div>
            <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">연 락 처</span>
              <span className="col-span-2 font-semibold text-zinc-800">{formatPhoneNumber(donation.donorPhone || donation.phone || '')}</span>
            </div>
            <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">{terms.receiptItemLabel}</span>
              <span className={`col-span-2 font-bold ${isCancelled ? 'text-zinc-700 line-through' : 'text-indigo-700'}`}>
                {donation.itemName || donation.item}
              </span>
            </div>
            <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">결 제 수 단</span>
              <span className={`col-span-2 font-bold ${isCancelled ? 'text-red-600' : 'text-zinc-800'}`}>
                {donation.paymentMethod || donation.method || '신용카드'} ({isCancelled ? '승인 취소 완료' : '정상 처리'})
              </span>
            </div>
            <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">접 수 채 널</span>
              <span className="col-span-2 font-medium text-zinc-800">
                {donation.deviceType === 'KIOSK' ? '현장 키오스크 (KIOSK)' : '온라인 모바일/웹 (Mobile)'}
              </span>
            </div>
            <div className="grid grid-cols-3 py-2 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">결제 승인번호</span>
              <span className="col-span-2 font-mono font-bold text-zinc-800">
                {donation.approveNo || donation.transactionId || donation.id}
              </span>
            </div>
            {isCancelled && (
              <>
                <div className="grid grid-cols-3 py-2 border-b border-zinc-100 bg-red-50/70 p-2 rounded-lg">
                  <span className="text-red-700 font-bold">취소 승인번호</span>
                  <span className="col-span-2 font-mono font-bold text-red-700">
                    {donation.cancelTransactionId || donation.cancelApproveNo || '-'}
                  </span>
                </div>
                {donation.cancelReason && (
                  <div className="grid grid-cols-3 py-2 border-b border-zinc-100 bg-red-50/40 p-2 rounded-lg">
                    <span className="text-red-700 font-bold">취 소 사 유</span>
                    <span className="col-span-2 font-medium text-red-700">
                      {donation.cancelReason}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className={`grid grid-cols-3 py-3 p-3 rounded-xl border items-center ${isCancelled ? 'bg-red-50/80 border-red-200' : 'bg-indigo-50/70 border-indigo-100'}`}>
              <span className={`font-bold ${isCancelled ? 'text-red-900' : 'text-indigo-900'}`}>
                {isCancelled ? '취 소 금 액' : terms.receiptAmountLabel}
              </span>
              <div className="col-span-2">
                <p className={`text-xs font-semibold mb-0.5 ${isCancelled ? 'text-red-600 line-through' : 'text-indigo-700'}`}>
                  일금 {numberToKorean(donation.amount || 0)}원정
                </p>
                <p className={`text-xl font-black ${isCancelled ? 'text-red-600' : 'text-indigo-950'}`}>
                  {isCancelled ? '-' : ''} ₩ {(donation.amount || 0).toLocaleString()} 원
                </p>
              </div>
            </div>
            {(donation.prayerText || donation.prayer) && (
              <div className="py-3 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium block mb-1">{terms.receiptPrayerLabel}</span>
                <p className="text-xs text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 italic">
                  "{donation.prayerText || donation.prayer}"
                </p>
              </div>
            )}
          </div>

          {/* Gratitude Statement & Stamp Seal */}
          <div className="pt-4 border-t-2 border-zinc-900 text-center relative">
            <p className="text-xs font-semibold text-zinc-700 leading-relaxed">
              {isCancelled ? (
                <>
                  {terms.receiptCancelConfirmText}<br />
                  (취소 처리 일시: {new Date(donation.cancelApprovedAt || donation.cancelledAt || donation.updatedAt || donation.createdAt || Date.now()).toLocaleString('ko-KR')})
                </>
              ) : (
                <>
                  {terms.receiptGratitudeText.split('\n').map((line: string, idx: number) => (
                    <Fragment key={idx}>
                      {line}<br />
                    </Fragment>
                  ))}
                </>
              )}
            </p>
            
            <div className="mt-6 flex items-center justify-center gap-6">
              <div className="text-right">
                <p className="text-xs text-zinc-500">{new Date(donation.createdAt || donation.date || Date.now()).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm font-bold text-zinc-900 mt-1">{tenant?.name || 'SoulPay (소울페이)'}</p>
              </div>

              {/* Stamp SVG */}
              <div className={`w-14 h-14 rounded-full border-2 text-red-600 border-red-600 flex flex-col items-center justify-center text-[10px] font-black leading-tight transform -rotate-12 select-none shadow-xs ${isCancelled ? 'bg-red-50/50' : ''}`}>
                <span>{tenant?.name?.slice(0, 4) || 'Faith'}</span>
                <span className="text-[8px]">{isCancelled ? '취 소' : '인 영'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Tax Receipt Link Option (no-print) */}
        {onOpenTaxReceipt && (
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center no-print">
            <button
              type="button"
              onClick={onOpenTaxReceipt}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              국세청 별지 제45호 서식 기부금영수증(소득공제용) 양식 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
