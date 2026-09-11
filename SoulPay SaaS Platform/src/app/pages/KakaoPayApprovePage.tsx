import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { donationAPI } from '../api/client';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generateTransactionId } from '../utils/transactionId';

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
      const rawPending = sessionStorage.getItem('soulpay_kakaopay_pending') || sessionStorage.getItem('faithpay_kakaopay_pending');
      let pending: any = {};
      try {
        if (rawPending) pending = JSON.parse(rawPending);
      } catch {
        // ignore
      }

      const tenantId = pending.tenantId || '';
      const tenantSlug = pending.tenantSlug || '';
      const amount = Number(pending.amount || amountStr || 0);
      const donorName = pending.donorName || '익명';
      const donorPhone = pending.donorPhone || '';
      const baptismName = pending.baptismName || '';
      const itemId = pending.itemId || 'general';
      const itemName = pending.itemName || '온라인 봉헌금';

      // GBL-03 fix: pg_token을 받은 즉시 completed INSERT하지 않고,
      // 반드시 백엔드(/kakaopay/approve)를 통해 카카오 서버에서 승인 검증 후 INSERT.
      if (!pgToken) {
        setStatus('error');
        setErrorMessage('카카오페이 승인 토큰(pg_token)이 없습니다.');
        return;
      }

      if (!tenantId) {
        setStatus('error');
        setErrorMessage('결제 세션 정보가 유실되었습니다. 다시 시도해 주세요.');
        return;
      }

      try {
        // 1단계: 백엔드에서 카카오 /payment/approve API 호출하여 검증
        const { kakaoPayAPI } = await import('../api/client');
        const approveRes = await kakaoPayAPI.approve({
          tid,
          partner_order_id: partnerOrderId,
          partner_user_id: donorPhone || tenantId,
          pg_token: pgToken,
        });

        if (!approveRes.success) {
          setStatus('error');
          setErrorMessage(approveRes.error || '카카오페이 승인이 거절되었습니다.');
          return;
        }

        // 2단계: 카카오 서버 검증 성공 후에만 DB INSERT
        const receiptId = generateTransactionId();  // YYYYMMDDHHMM-NNNNNNN

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
          paymentMethod: '카카오페이',
          transactionId: approveRes.data?.aid || tid,
          deviceType: 'WEB',
        });

        setStatus('success');
        toast.success('💛 카카오페이 결제가 성공적으로 완료되었습니다!');
        
        sessionStorage.removeItem('soulpay_kakaopay_pending');
        sessionStorage.removeItem('faithpay_kakaopay_pending');

        setTimeout(() => {
          if (tenantSlug) {
            navigate(`/${tenantSlug}/complete?donId=${receiptId}`);
          } else {
            navigate('/');
          }
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
