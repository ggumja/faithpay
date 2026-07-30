import React from 'react';
import { Tenant } from '../context/AppContext';
import { Button } from './ui/button';
import { Printer, Download, X } from 'lucide-react';

interface ReceiptData {
  receiptId: string;
  donorName: string;
  donorPhone?: string;
  donorAddress?: string;
  donorIdNumber?: string; // 주민등록번호/생년월일
  amount: number;
  itemName: string;
  date: string;
}

interface Props {
  tenant: Tenant;
  data: ReceiptData;
  onClose: () => void;
}

export default function TaxReceiptModal({ tenant, data, onClose }: Props) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* 화면 조망용 모달 박스 */}
      <div className="bg-white text-black w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden relative my-8 print:shadow-none print:m-0 print:w-full print:max-w-none">
        
        {/* 모달 상단 조작 헤더 (인쇄 시 숨김) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <h3 className="font-bold text-base flex items-center gap-2">
            <span>📄</span> 국세청 양식 기부금 영수증
          </h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-black bg-white hover:bg-slate-100 font-semibold" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5" /> 인쇄 / PDF 저장
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-slate-800" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* ── 국세청 표준 기부금 영수증 출력 영역 (별지 제45호 서식) ── */}
        <div id="tax-receipt-content" className="p-8 sm:p-10 font-sans leading-normal print:p-0">
          
          <div className="text-right text-xs text-gray-500 mb-2">
            [소득세법 시행규칙 별지 제45호 서식]
          </div>

          <h1 className="text-center font-bold text-2xl sm:text-3xl border-b-2 border-black pb-3 tracking-wider mb-6">
            기 부 금 영 수 증
          </h1>

          {/* 일련번호 */}
          <div className="flex justify-between text-xs mb-4">
            <div><strong>발급번호:</strong> {data.receiptId}</div>
            <div><strong>발급일자:</strong> {data.date.split(' ')[0]}</div>
          </div>

          {/* 1. 기부자 정보 */}
          <table className="w-full border-collapse border border-black text-xs mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th colSpan={4} className="border border-black p-2 text-left font-bold text-sm">
                  1. 기부자 (신청인) 정보
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 bg-gray-50 w-1/4 font-semibold">성 명</td>
                <td className="border border-black p-2 w-1/4">{data.donorName}</td>
                <td className="border border-black p-2 bg-gray-50 w-1/4 font-semibold">주민등록번호</td>
                <td className="border border-black p-2 w-1/4">{data.donorIdNumber || '880101-1******'}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 bg-gray-50 font-semibold">전화번호</td>
                <td className="border border-black p-2">{data.donorPhone || '010-****-****'}</td>
                <td className="border border-black p-2 bg-gray-50 font-semibold">주 소</td>
                <td className="border border-black p-2">{data.donorAddress || '서울특별시 종로구 (상세주소 미기재)'}</td>
              </tr>
            </tbody>
          </table>

          {/* 2. 기부금 수령 단체 정보 */}
          <table className="w-full border-collapse border border-black text-xs mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th colSpan={4} className="border border-black p-2 text-left font-bold text-sm">
                  2. 기부금 수령 단체 (종교단체) 정보
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 bg-gray-50 w-1/4 font-semibold">단 체 명</td>
                <td className="border border-black p-2 w-1/4">{tenant.name}</td>
                <td className="border border-black p-2 bg-gray-50 w-1/4 font-semibold">고유번호 (사업자)</td>
                <td className="border border-black p-2 w-1/4">120-82-*****</td>
              </tr>
              <tr>
                <td className="border border-black p-2 bg-gray-50 font-semibold">대 표 자</td>
                <td className="border border-black p-2">성불 주지스님 / 담임목사</td>
                <td className="border border-black p-2 bg-gray-50 font-semibold">소 재 지</td>
                <td className="border border-black p-2">{tenant.address || '서울특별시 종로구 인사동길 45'}</td>
              </tr>
            </tbody>
          </table>

          {/* 3. 기부금 납부 내역 */}
          <table className="w-full border-collapse border border-black text-xs mb-6 text-center">
            <thead>
              <tr className="bg-gray-100">
                <th colSpan={5} className="border border-black p-2 text-left font-bold text-sm">
                  3. 기부금 납부 상세 내역
                </th>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td className="border border-black p-2">구 분</td>
                <td className="border border-black p-2">유 형 (코드)</td>
                <td className="border border-black p-2">내 용 ({tenant.terminology.donation} 항목)</td>
                <td className="border border-black p-2">납부일자</td>
                <td className="border border-black p-2">금 액 (원)</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2">종교단체 기부금</td>
                <td className="border border-black p-2">지정기부금 (41)</td>
                <td className="border border-black p-2 font-medium">{data.itemName}</td>
                <td className="border border-black p-2">{data.date.split(' ')[0]}</td>
                <td className="border border-black p-2 font-bold text-right pr-4">
                  {data.amount.toLocaleString('ko-KR')} 원
                </td>
              </tr>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="border border-black p-2 text-right pr-4">합 계</td>
                <td className="border border-black p-2 text-right pr-4 text-sm">
                  {data.amount.toLocaleString('ko-KR')} 원
                </td>
              </tr>
            </tbody>
          </table>

          {/* 선언문 */}
          <div className="text-center my-8 leading-relaxed text-xs sm:text-sm font-medium">
            <p className="mb-4">
              「소득세법」 제34조, 제59조의4 및 「법인세법」 제24조에 따라<br />
              위와 같이 {tenant.name}에 기부금({tenant.terminology.donation})을 정상 납부하였음을 증명합니다.
            </p>
            <div className="font-bold text-base mt-6">
              {data.date.split(' ')[0].replace(/-/g, '년 ').replace(/년 (\d+)/, '년 $1월 ')}일
            </div>
          </div>

          {/* 서명 및 직인 */}
          <div className="mt-8 pt-4 flex justify-between items-center border-t border-gray-300">
            <div className="text-xs text-gray-600">
              * 본 영수증은 국세청 연말정산 간소화 서비스 제출용으로 사용할 수 있습니다.
            </div>
            <div className="text-right flex items-center gap-2 font-bold text-sm sm:text-base">
              <span>{tenant.name} 직인</span>
              <div className="w-12 h-12 rounded-full border-2 border-red-600 text-red-600 flex items-center justify-center font-bold text-xs transform -rotate-12 bg-red-50/50">
                [직인생략]
              </div>
            </div>
          </div>

        </div>

        {/* 하단 닫기 버튼 */}
        <div className="bg-gray-50 px-6 py-3 border-t text-right print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
        </div>

      </div>
    </div>
  );
}
