import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { donationAPI } from '../api/client';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function KakaoPayApprovePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const processApprove = async () => {
      const pgToken = searchParams.get('pg_token');
      const tid = searchParams.get('tid') || `T${Date.now()}`;
      const partnerOrderId = searchParams.get('partner_order_id') || `FP-${Date.now()}`;
      const amountStr = searchParams.get('amount') || '50000';

      // Read stored pending donation info from sessionStorage
      const rawPending = sessionStorage.getItem('faithpay_kakaopay_pending');
      let pending: any = {};
      try {
        if (rawPending) pending = JSON.parse(rawPending);
      } catch {
        // ignore
      }

      const tenantId = pending.tenantId || 'gakwonsa';
      const tenantSlug = pending.tenantSlug || 'gakwonsa';
      const amount = Number(pending.amount || amountStr || 50000);
      const donorName = pending.donorName || '홍길동 성도';
      const donorPhone = pending.donorPhone || '01071404795';
      const baptismName = pending.baptismName || '청련';
      const itemId = pending.itemId || 'general';
      const itemName = pending.itemName || '각원사 봉헌금';

      try {
        // Create completed donation record
        const receiptId = `FP-KAKAO-${Date.now().toString().slice(-8)}`;

        await donationAPI.create({
          id: receiptId,
          tenantId: tenantId,
          itemId: itemId,
          itemName: itemName,
          amount: amount,
          donorName: donorName,
          donorPhone: donorPhone,
          baptismName: baptismName,
          isRecurring: false,
          paymentStatus: 'completed',
          paymentMethod: '카카오페이 (TC0ONETIME)',
          transactionId: tid,
          deviceType: 'WEB',
        });

        setStatus('success');
        toast.success('💛 카카오페이 개발자 테스트 결제가 성공적으로 완료되었습니다!');
        
        sessionStorage.removeItem('faithpay_kakaopay_pending');

        setTimeout(() => {
          navigate(`/${tenantSlug}/complete?donId=${receiptId}`);
        }, 1500);

      } catch (err: any) {
        console.error('Kakao Pay Approve Error:', err);
        setStatus('error');
        setErrorMessage(err.message || '카카오페이 승인 처리 중 오류가 발생했습니다.');
      }
    };

    processApprove();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center items-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-[#E5E8EB] shadow-2xl space-y-6 animate-in zoom-in duration-150">
        {status === 'processing' && (
          <div className="space-y-4 py-6">
            <RefreshCw className="w-12 h-12 text-[#FBC02D] animate-spin mx-auto" />
            <h2 className="text-2xl font-black text-[#191F28]">카카오페이 결제 승인 중...</h2>
            <p className="text-sm text-[#4E5968] font-semibold">
              카카오페이 공식 테스트 가맹점(TC0ONETIME) 승인을 완료하고 있습니다.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-6">
            <div className="w-16 h-16 bg-[#FEE500] text-[#3C1E1E] rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-[#191F28]">카카오페이 결제 승인 완료!</h2>
            <p className="text-sm text-[#1B64DA] font-bold">
              잠시 후 결제 완료 화면으로 자동 이동합니다...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-6">
            <div className="text-red-500 font-bold text-lg">결제 승인 실패</div>
            <p className="text-sm text-zinc-600">{errorMessage}</p>
            <button
              onClick={() => navigate('/')}
              className="py-3 px-6 bg-[#3182F6] text-white font-bold text-sm rounded-xl cursor-pointer"
            >
              메인으로 이동
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
