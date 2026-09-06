import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { CheckCircle2, ShieldCheck, QrCode, Camera, RefreshCw, Zap, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function KakaoPaySandbox() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tid = searchParams.get('tid') || `T${Date.now()}`;
  const partnerOrderId = searchParams.get('partner_order_id') || `FP-${Date.now()}`;
  const partnerUserId = searchParams.get('partner_user_id') || `USER-${Date.now()}`;
  const amount = Number(searchParams.get('amount') || 50000);
  const itemName = searchParams.get('item_name') || 'SoulPay 온라인/현장 봉헌금';

  const [scanStep, setScanStep] = useState<'SCANNING' | 'RECOGNIZED' | 'APPROVING'>('SCANNING');
  const [hasWebcam, setHasWebcam] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize Real Webcam stream if available
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setHasWebcam(true);
          }
        } else {
          setHasWebcam(false);
        }
      } catch (err) {
        console.warn('Webcam not accessible:', err);
        setHasWebcam(false);
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle Barcode/QR Read Trigger
  const handleBarcodeRead = () => {
    setScanStep('RECOGNIZED');
    toast.success('📷 카카오페이 결제 바코드(QR) 카메라 인식이 완료되었습니다!');

    setTimeout(() => {
      setScanStep('APPROVING');
      const mockPgToken = `pg_token_kakaopay_${Date.now()}`;
      setTimeout(() => {
        navigate(`/kakaopay/approve?pg_token=${mockPgToken}&tid=${tid}&partner_order_id=${partnerOrderId}&partner_user_id=${partnerUserId}&amount=${amount}`);
      }, 1500);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col justify-between items-center p-4 font-sans">
      {/* Top Kakao Pay Test Header */}
      <header className="w-full max-w-md bg-[#FEE500] text-[#3C1E1E] px-6 py-4 rounded-t-3xl flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#3C1E1E] text-[#FEE500] font-black rounded-full flex items-center justify-center text-xs">
            💬
          </div>
          <span className="font-black text-lg">kakaopay</span>
          <span className="bg-[#3C1E1E] text-white text-[10px] font-mono px-2 py-0.5 rounded-md ml-1">
            카메라 스캐너 연동
          </span>
        </div>
        <span className="text-xs font-bold opacity-80">카메라 리딩 테스트</span>
      </header>

      {/* Main Sandbox Card */}
      <main className="w-full max-w-md bg-white p-6 sm:p-8 rounded-b-3xl border-x border-b border-[#E5E8EB] shadow-2xl space-y-6 animate-in zoom-in duration-150">
        
        {/* Info Box */}
        <div className="bg-[#FFFDE7] border border-[#FBC02D]/40 p-4 rounded-2xl space-y-1 text-center">
          <span className="text-[#E65100] text-xs font-extrabold flex items-center justify-center gap-1">
            <ShieldCheck className="w-4 h-4" /> 카카오페이 공식 가맹점 테스트 (TC0ONETIME)
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#3C1E1E]">{itemName}</h2>
          <div className="text-2xl sm:text-3xl font-black text-[#191F28] pt-1">
            {amount.toLocaleString()}<span className="text-base font-bold text-[#4E5968]"> 원</span>
          </div>
        </div>

        {/* 📷 1단계: 카메라 비디오 / 스캐너 뷰파인더 화면 */}
        {scanStep === 'SCANNING' && (
          <div className="space-y-4 text-center">
            <div className="space-y-1">
              <span className="bg-[#E8F5E9] text-[#1B5E20] text-xs font-black px-3 py-1 rounded-full border border-[#A5D6A7]">
                📷 STEP 1: 카메라 리딩 단계
              </span>
              <p className="text-xs text-[#4E5968] font-bold pt-1">
                스마트폰 <strong>카카오페이 앱의 바코드(QR)</strong>를 아래 카메라 뷰파인더에 비춰주세요.
              </p>
            </div>

            {/* 카메라 / 스캐너 애니메이션 뷰파인더 Box */}
            <div className="relative w-full h-56 bg-black rounded-2xl overflow-hidden flex items-center justify-center border-2 border-[#FBC02D] shadow-inner">
              
              {/* 실시간 웹캠 비디오 스트림 */}
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover ${hasWebcam ? 'block' : 'hidden'}`}
              />

              {/* 웹캠 미연결 시 카메라 스캐너 렌즈 시뮬레이터 */}
              {!hasWebcam && (
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-800 to-black flex flex-col items-center justify-center text-zinc-400">
                  <Camera className="w-16 h-16 text-[#FEE500] animate-pulse mb-2" />
                  <span className="text-xs font-mono font-bold text-zinc-300">카메라 리더기 작동 중...</span>
                </div>
              )}

              {/* 뷰파인더 타겟 프레임 & 레이저 스캔 빔 */}
              <div className="absolute inset-6 border-2 border-dashed border-[#FEE500] rounded-xl flex items-center justify-center pointer-events-none">
                <div className="w-full h-0.5 bg-[#FF1744] shadow-[0_0_12px_#FF1744] animate-pulse" />
              </div>

              {/* 모서리 브라켓 타겟 오버레이 */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-[#FEE500] rounded-tl-md" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-[#FEE500] rounded-tr-md" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-[#FEE500] rounded-bl-md" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-[#FEE500] rounded-br-md" />

              <div className="absolute bottom-2 bg-black/70 text-[#FEE500] px-3 py-1 rounded-full text-[10px] font-mono font-bold backdrop-blur-xs">
                QR / Barcode Laser Reader Active
              </div>
            </div>

            {/* 바코드 리딩 완료 트리거 버튼 */}
            <button
              onClick={handleBarcodeRead}
              className="w-full py-4 bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] font-black text-base rounded-2xl cursor-pointer border-none shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Camera className="w-5 h-5 text-[#3C1E1E]" />
              <span>📷 바코드 / QR 카메라 리딩 인식 테스트</span>
            </button>
          </div>
        )}

        {/* 📷 2단계: 카메라 바코드 인식 성공 화면 */}
        {scanStep === 'RECOGNIZED' && (
          <div className="space-y-4 text-center py-6 animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-[#E8F5E9] text-[#2E7D32] rounded-full flex items-center justify-center mx-auto border border-[#A5D6A7]">
              <Check className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-[#191F28]">바코드(QR) 카메라 인식 성공!</h3>
              <p className="text-xs text-[#1B64DA] font-bold">
                카카오페이 안전 결제 토큰이 정상적으로 리딩되었습니다.
              </p>
            </div>
          </div>
        )}

        {/* 📷 3단계: 카카오페이 최종 결제 승인 중 화면 */}
        {scanStep === 'APPROVING' && (
          <div className="space-y-4 text-center py-6 animate-in zoom-in duration-200">
            <RefreshCw className="w-12 h-12 text-[#FBC02D] animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-xl font-black text-[#191F28]">카카오페이 승인 처리 중...</h3>
              <p className="text-xs text-[#4E5968] font-bold">
                결제 승인 후 즉시 수납 완료 페이지로 전환됩니다.
              </p>
            </div>
          </div>
        )}

        {/* Transaction Summary */}
        <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E8EB] space-y-2 text-xs text-[#4E5968] font-mono">
          <div className="flex justify-between"><span>테스트 CID:</span> <span className="font-bold text-[#3C1E1E]">TC0ONETIME</span></div>
          <div className="flex justify-between"><span>주문 번호:</span> <span className="font-bold text-[#191F28]">{partnerOrderId}</span></div>
          <div className="flex justify-between"><span>거래 TID:</span> <span className="font-bold text-[#1B64DA] truncate max-w-[180px]">{tid}</span></div>
        </div>

      </main>

      <footer className="py-4 text-center text-xs text-[#8B95A1]">
        SoulPay Kakao Pay Camera Reader Sandbox © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
