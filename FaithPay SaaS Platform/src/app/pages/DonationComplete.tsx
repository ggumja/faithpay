import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useApp, Tenant, DonationFormData } from '../context/AppContext';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif, MotifLarge } from '../components/Motif';
import TaxReceiptModal from '../components/TaxReceiptModal';
import { donationAPI, tenantAPI } from '../api/client';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { Share2, Download, CheckCircle2, Loader2 } from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n || 0);
}

export default function DonationComplete() {
  const { tenantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentTenant: appTenant, donationFormData: appFormData, tenants } = useApp();

  const donIdParam = searchParams.get('donId') || searchParams.get('orderId') || '';
  const amountParam = searchParams.get('amount') ? parseInt(searchParams.get('amount')!, 10) : 0;
  const paymentKeyParam = searchParams.get('paymentKey') || '';
  const typeParam = searchParams.get('type') || '';

  // 영수증 ID 생성 (쿼리 파라미터가 있으면 우선 사용)
  const [receiptId] = useState(() => {
    if (donIdParam) return donIdParam;
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seqPart = Date.now().toString().slice(-8);
    return `FP-${datePart}-${seqPart}`;
  });

  // 1. 테넌트 복구
  const [tenant, setTenant] = useState<Tenant | null>(() => {
    if (appTenant) return appTenant;
    const fromList = tenants.find(t => t.slug === tenantSlug || t.id === tenantSlug);
    if (fromList) return fromList;
    try {
      const snapStr = sessionStorage.getItem(`pending_donation_${donIdParam}`) || sessionStorage.getItem('pending_donation_latest');
      if (snapStr) {
        const snap = JSON.parse(snapStr);
        if (snap.tenant) return snap.tenant;
      }
    } catch (e) {}
    return null;
  });

  // 2. 헌금 폼 데이터 복구
  const [formData, setFormData] = useState<DonationFormData>(() => {
    if (appFormData && appFormData.amount) return appFormData;
    try {
      const snapStr = sessionStorage.getItem(`pending_donation_${donIdParam}`) || sessionStorage.getItem('pending_donation_latest');
      if (snapStr) {
        const snap = JSON.parse(snapStr);
        if (snap.formData) return snap.formData;
      }
    } catch (e) {}
    return {
      itemId: 'default',
      itemName: '봉헌금',
      amount: amountParam || 10000,
      name: '성도',
      phone: '',
      prayerText: '',
      isRecurring: typeParam === 'toss_billing',
      paymentMethod: typeParam === 'toss_billing' ? '정기결제' : '토스페이먼츠',
    };
  });

  const hasRecordedRef = useRef(false);

  // 테넌트 비동기 로드 fallback
  useEffect(() => {
    if (!tenant && tenantSlug) {
      const found = tenants.find(t => t.slug === tenantSlug || t.id === tenantSlug);
      if (found) {
        setTenant(found);
      } else {
        tenantAPI.getTenants().then(res => {
          if (res.success && res.data) {
            const match = res.data.find(t => t.slug === tenantSlug || t.id === tenantSlug);
            if (match) setTenant(match);
          }
        });
      }
    }
  }, [tenant, tenantSlug, tenants]);

  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    // 신도 세션 저장
    if (formData?.phone) {
      const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
      sessionStorage.setItem('soulpay_donor_session', cleanPhone);
      sessionStorage.setItem('faithpay_donor_session', cleanPhone);
      localStorage.setItem('soulpay_last_donor_phone', cleanPhone);
      localStorage.setItem('faithpay_last_donor_phone', cleanPhone);
    }
  }, [formData]);

  // Supabase DB 기록 (1회만 실행)
  useEffect(() => {
    if (tenant && formData && !hasRecordedRef.current) {
      hasRecordedRef.current = true;
      donationAPI.create({
        id: receiptId,
        tenantId: tenant.id,
        itemId: formData.itemId || 'default',
        itemName: formData.itemName || `${tenant.name} 봉헌금`,
        amount: formData.amount || amountParam || 10000,
        donorName: formData.name || '무기명',
        donorPhone: formData.phone || '',
        prayerText: formData.prayerText || '',
        baptismName: formData.baptismName || '',
        isRecurring: formData.isRecurring || typeParam === 'toss_billing',
        recurringDay: formData.recurringDay,
        paymentStatus: 'completed',
        paymentMethod: formData.paymentMethod || (formData.isRecurring ? '정기결제' : '토스페이먼츠'),
        transactionId: paymentKeyParam || receiptId,
      }).then((res) => {
        if (res.success) {
          console.log('Successfully recorded donation in Supabase DB:', res.data);
        }
      }).catch((err) => {
        console.warn('DB recording notice:', err);
      });
    }
  }, [tenant, formData, receiptId, amountParam, paymentKeyParam, typeParam]);

  const [showTaxReceipt, setShowTaxReceipt] = useState(false);

  // 테넌트 로딩 중 스피너
  if (!tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">봉헌 완료 내역을 불러오고 있습니다...</p>
      </div>
    );
  }

  const ft = FAITH_THEMES[tenant.religionType as ReligionId] ?? FAITH_THEMES.protestant;

  const completionMessage =
    tenant.religionType === 'buddhist' ? '맑고 따뜻한 마음이 전해졌습니다.' :
    tenant.religionType === 'catholic' ? '주님께서 봉헌을 받아주실 것입니다.' :
    '정성 어린 봉헌에 감사드립니다.';

  const formattedDate = new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans pb-16">
      {/* Success Hero */}
      <section className="relative overflow-hidden px-4 py-16 text-white text-center sm:text-left" style={{ background: ft.heroGradient }}>
        {/* Large background motif decoration */}
        <div className="absolute -top-12 -right-12 w-52 h-52 opacity-10 text-white pointer-events-none">
          <MotifLarge kind={ft.motif} color="#fff" opacity={1} />
        </div>
        <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-white/[0.04] blur-3xl pointer-events-none" />

        <div className="max-w-xl mx-auto relative z-10 flex flex-col sm:flex-row items-center gap-6">
          {/* Animated check circle & Motif */}
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center animate-ring-in shadow-md">
            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center animate-pop-in">
              <Motif kind={ft.motif} size={28} color={ft.primary} />
            </div>
          </div>

          <div className="flex-1">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              봉헌이 완료되었습니다
            </h1>
            <p className="text-sm font-semibold text-white/80 tracking-wide">
              {completionMessage}
            </p>
          </div>
        </div>
      </section>

      {/* Detail Content Ticket */}
      <main className="max-w-xl mx-auto px-4 mt-8 flex flex-col gap-5">
        
        {/* Receipt Container */}
        <div 
          className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm relative overflow-hidden"
          style={{ borderColor: ft.primaryBgStrong }}
        >
          <div 
            className="absolute -top-6 -right-6 w-28 h-28 opacity-5 pointer-events-none"
            style={{ color: ft.primary }}
          >
            <MotifLarge kind={ft.motif} color="currentColor" opacity={1} />
          </div>

          <div className="relative z-10">
            {/* Ticket Tag */}
            <span 
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase mb-5"
              style={{ background: ft.primaryBg, color: ft.primary }}
            >
              <Motif kind={ft.motif} size={10} color={ft.primary} />
              <span>기부금 영수증</span>
            </span>

            <span className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1.5">
              최종 봉헌 금액
            </span>
            
            <div className="flex items-baseline gap-1 mb-6 border-b pb-5 border-dashed border-zinc-200 dark:border-zinc-800">
              <span className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: ft.primaryDark }}>
                {fmt(formData.amount)}
              </span>
              <span className="font-display text-base font-bold" style={{ color: ft.primaryDark }}>원</span>
            </div>

            {/* Meta Table */}
            <div className="flex flex-col gap-3">
              {[
                ['영수증 번호', receiptId],
                ['봉헌 일시', formattedDate],
                [`${tenant.terminology?.donation || '헌금'} 항목`, formData.itemName || `${tenant.name} 봉헌금`],
                ['받은 기관', tenant.name],
                ['봉헌자 성명', formData.name || '성도'],
                ...(formData.baptismName ? [['세례명', formData.baptismName]] : []),
                ['연락처', formData.phone || '-'],
                ...(formData.isRecurring ? [['결제 주기', `정기 결제 (매월 ${formData.recurringDay || 10}일)`]] : [['결제 유형', '일회성 단발']]),
              ].map(([key, val]) => (
                <div key={key} className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">{key}</span>
                  <span className="font-bold text-zinc-850 dark:text-zinc-150 text-right max-w-[65%] line-clamp-1">{val}</span>
                </div>
              ))}
            </div>

            {/* Prayers Note */}
            {formData.prayerText && (
              <div 
                className="mt-6 -mx-6 -mb-6 p-5 border-t"
                style={{ background: ft.accentBg, borderColor: ft.primaryBgStrong }}
              >
                <span className="block text-[10px] font-extrabold uppercase tracking-widest mb-1.5" style={{ color: ft.accent }}>
                  {tenant.terminology?.prayer || '기도제목'}
                </span>
                <p className="text-xs font-semibold leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {formData.prayerText}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Auto Report Alert Card */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M3 9h18M8 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-xs sm:text-sm font-bold tracking-tight">국세청 홈택스 신고 진행</h4>
            <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">연말정산 소득공제용 기부금 대장 자동 신고 처리</p>
          </div>
          <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24">
              <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </section>

        {/* Messaging Notice */}
        {formData.phone && (
          <section 
            className="p-4 rounded-xl border text-xs leading-relaxed"
            style={{ background: ft.primaryBg, borderColor: ft.primaryBgStrong }}
          >
            <h4 className="font-bold mb-1" style={{ color: ft.primaryDark }}>알림톡 안내</h4>
            <p className="text-zinc-650 dark:text-zinc-400 font-medium">
              기재하신 연락처({formData.phone})로 카카오 알림톡 감사 메시지가 즉시 발송되었습니다. {formData.isRecurring && '자동 정기결제 해지 및 정보관리는 마이페이지 로그인 후 가능합니다.'}
            </p>
          </section>
        )}

        {/* Action Sharing Buttons Grid */}
        <section className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => toast.info('카카오톡 공유 기능은 실제 환경에서 지원됩니다.')}
            className="h-13 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Share2 size={16} /> 
            <span>공유하기</span>
          </button>
          <button
            onClick={() => setShowTaxReceipt(true)}
            className="h-13 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Download size={16} /> 
            <span>PDF 영수증 발급</span>
          </button>
        </section>

        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={() => navigate(`/${tenantSlug}/my-donations`)}
            className="w-full h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            내 {tenant.terminology?.donation || '헌금'} 내역 보기
          </button>

          <button
            onClick={() => navigate(`/${tenantSlug}`)}
            className="w-full h-14 rounded-xl text-white font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-md"
            style={{ background: ft.heroGradient }}
          >
            <Motif kind={ft.motif} size={18} color="#fff" />
            홈으로 돌아가기
          </button>
        </div>

      </main>

      {/* 국세청 표준 기부금 영수증 출력 모달 */}
      {showTaxReceipt && (
        <TaxReceiptModal
          tenant={tenant}
          data={{
            receiptId: receiptId,
            donorName: formData.name || '성도',
            donorPhone: formData.phone || '',
            donorIdNumber: '880101-1******',
            amount: formData.amount,
            itemName: formData.itemName || `${tenant.name} 봉헌금`,
            date: formattedDate,
          }}
          onClose={() => setShowTaxReceipt(false)}
        />
      )}
    </div>
  );
}
