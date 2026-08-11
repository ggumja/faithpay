import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { FAITH_THEMES, ReligionId } from '../theme/faithTheme';
import { Motif } from '../components/Motif';
import { donationAPI, donationItemsAPI, DonationItem } from '../api/client';
import { Badge } from '../components/ui/badge';
import {
  CreditCard,
  Phone,
  UserCheck,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Home,
  ChevronLeft,
  Info,
  Check,
  Heart,
} from 'lucide-react';

import { toast } from 'sonner';

type KioskStep = 'MODE_SELECT' | 'PHONE_INPUT' | 'ITEM_SELECT' | 'AMOUNT_SELECT' | 'NAME_INPUT' | 'CARD_PAYMENT' | 'COMPLETE';

// 2-Set Hangul Automaton Helpers for On-Screen Touch Keyboard
const CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG_LIST = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const COMPOUND_JUNG: Record<string, string> = {
  'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
  'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
  'ㅡㅣ': 'ㅢ',
};

const COMPOUND_JONG: Record<string, string> = {
  'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ',
  'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ',
  'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ',
};

function disassembleHangulChar(char: string) {
  if (!char) return null;
  const code = char.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return null;
  const jongIdx = code % 28;
  const jungIdx = Math.floor((code - jongIdx) / 28) % 21;
  const choIdx = Math.floor((code - jongIdx) / 28 / 21);
  return { cho: CHO_LIST[choIdx], jung: JUNG_LIST[jungIdx], jong: JONG_LIST[jongIdx] };
}

function assembleHangulKey(prev: string, key: string): string {
  if (key === 'DEL') return prev.slice(0, -1);
  if (key === 'CLR') return '';
  if (key === 'SPACE') return prev + ' ';
  if (!prev) return key;

  const lastChar = prev[prev.length - 1];
  const dis = disassembleHangulChar(lastChar);

  if (!dis) {
    const isLastCho = CHO_LIST.includes(lastChar);
    const isKeyJung = JUNG_LIST.includes(key);
    if (isLastCho && isKeyJung) {
      const choIdx = CHO_LIST.indexOf(lastChar);
      const jungIdx = JUNG_LIST.indexOf(key);
      return prev.slice(0, -1) + String.fromCharCode(0xAC00 + (choIdx * 588) + (jungIdx * 28));
    }
    return prev + key;
  }

  if (!dis.jong) {
    const isKeyJung = JUNG_LIST.includes(key);
    const isKeyJong = JONG_LIST.includes(key);

    if (isKeyJung) {
      const compoundKey = dis.jung + key;
      if (COMPOUND_JUNG[compoundKey]) {
        const choIdx = CHO_LIST.indexOf(dis.cho);
        const jungIdx = JUNG_LIST.indexOf(COMPOUND_JUNG[compoundKey]);
        return prev.slice(0, -1) + String.fromCharCode(0xAC00 + (choIdx * 588) + (jungIdx * 28));
      }
      return prev + key;
    }

    if (isKeyJong) {
      const choIdx = CHO_LIST.indexOf(dis.cho);
      const jungIdx = JUNG_LIST.indexOf(dis.jung);
      const jongIdx = JONG_LIST.indexOf(key);
      if (choIdx >= 0 && jungIdx >= 0 && jongIdx >= 0) {
        return prev.slice(0, -1) + String.fromCharCode(0xAC00 + (choIdx * 588) + (jungIdx * 28) + jongIdx);
      }
    }
    return prev + key;
  }

  const isKeyJung = JUNG_LIST.includes(key);
  if (isKeyJung) {
    const choIdx = CHO_LIST.indexOf(dis.cho);
    const jungIdx = JUNG_LIST.indexOf(dis.jung);
    const prevWithoutJong = String.fromCharCode(0xAC00 + (choIdx * 588) + (jungIdx * 28));

    const newCho = dis.jong;
    const newChoIdx = CHO_LIST.indexOf(newCho);
    const newJungIdx = JUNG_LIST.indexOf(key);

    if (newChoIdx >= 0 && newJungIdx >= 0) {
      const newChar = String.fromCharCode(0xAC00 + (newChoIdx * 588) + (newJungIdx * 28));
      return prev.slice(0, -1) + prevWithoutJong + newChar;
    }
  }

  const isKeyJong = JONG_LIST.includes(key);
  if (isKeyJong) {
    const compoundJongKey = dis.jong + key;
    if (COMPOUND_JONG[compoundJongKey]) {
      const choIdx = CHO_LIST.indexOf(dis.cho);
      const jungIdx = JUNG_LIST.indexOf(dis.jung);
      const jongIdx = JONG_LIST.indexOf(COMPOUND_JONG[compoundJongKey]);
      if (choIdx >= 0 && jungIdx >= 0 && jongIdx >= 0) {
        return prev.slice(0, -1) + String.fromCharCode(0xAC00 + (choIdx * 588) + (jungIdx * 28) + jongIdx);
      }
    }
  }

  return prev + key;
}

export default function TenantKiosk() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, getTenantDonationItems } = useApp();

  // Kiosk State
  const [step, setStep] = useState<KioskStep>('MODE_SELECT');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const phone = phoneDigits ? `010${phoneDigits}` : '';
  const [donorName, setDonorName] = useState('');
  const [baptismName, setBaptismName] = useState('');
  const [isMatchedMember, setIsMatchedMember] = useState(false);
  const [matchedCount, setMatchedCount] = useState(0);

  const [dbItems, setDbItems] = useState<DonationItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);
  const [amount, setAmount] = useState<number>(50000);

  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [approvalNo, setApprovalNo] = useState('');
  const [autoResetSeconds, setAutoResetSeconds] = useState(45);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Soft Keyboard State for Name Input
  const [isSoftKeyboardOpen, setIsSoftKeyboardOpen] = useState(true);
  const [keyboardLang, setKeyboardLang] = useState<'KOR' | 'ENG'>('KOR');
  const [isDoubleConsonant, setIsDoubleConsonant] = useState(false);

  // Fetch DB items dynamically
  useEffect(() => {
    if (currentTenant) {
      donationItemsAPI.getItems(currentTenant.id).then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setDbItems(res.data.filter((i) => i.enabled !== false));
        }
      }).catch(() => {});
    }
  }, [currentTenant]);

  // Live Time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 45-Second Auto-Reset Timer
  const resetToHome = useCallback(() => {
    setStep('MODE_SELECT');
    setIsAnonymous(false);
    setPhoneDigits('');
    setDonorName('');
    setBaptismName('');
    setIsMatchedMember(false);
    setMatchedCount(0);
    setSelectedItem(null);
    setAmount(50000);
    setIsProcessingCard(false);
    setAutoResetSeconds(45);
  }, []);

  useEffect(() => {
    if (step === 'MODE_SELECT') return;

    setAutoResetSeconds(45);
    const interval = setInterval(() => {
      setAutoResetSeconds((prev) => {
        if (prev <= 1) {
          resetToHome();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, resetToHome]);

  const ft = FAITH_THEMES[currentTenant?.religionType as ReligionId] ?? FAITH_THEMES.protestant;
  const contextItems = currentTenant ? getTenantDonationItems(currentTenant.id) : [];
  const items = dbItems.length > 0 ? dbItems : contextItems;

  // 2-Set Hangul Automata Helper for On-Screen Soft Keyboard
  const handleSoftKeyClick = (key: string) => {
    setDonorName((prev) => assembleHangulKey(prev, key));
  };
  const handleNumpadPress = (num: string) => {
    if (num === 'DEL') {
      setPhoneDigits((prev) => prev.slice(0, -1));
      setIsMatchedMember(false);
    } else if (num === 'CLR') {
      setPhoneDigits('');
      setIsMatchedMember(false);
    } else {
      if (phoneDigits.length < 8) {
        const next = phoneDigits + num;
        setPhoneDigits(next);
        if (next.length === 8) {
          lookupPhone('010' + next);
        }
      }
    }
  };

  // Lookup Phone in Backend
  const lookupPhone = async (phoneNum: string) => {
    if (!currentTenant) return;
    try {
      const res = await donationAPI.lookupByPhone(currentTenant.id, phoneNum);
      if (res.success && res.data && res.data.found) {
        setIsMatchedMember(true);
        setDonorName(res.data.donorName || '성도');
        setBaptismName(res.data.baptismName || '');
        setMatchedCount(res.data.count || 1);
        toast.success(`환영합니다, ${res.data.donorName}님! 교인 정보가 연동되었습니다.`);
      } else {
        setIsMatchedMember(false);
        setDonorName('');
        setBaptismName('');
        toast.info('신규 기부자님 반갑습니다! 성함을 입력해 주세요.');
      }
    } catch {
      setIsMatchedMember(false);
    }
  };

  // Select Fast Anonymous Mode
  const startAnonymousTrack = () => {
    setIsAnonymous(true);
    setDonorName(ft.placeNoun === '사찰' ? '무명 보시 성도' : ft.placeNoun === '성당' ? '무명 교우' : '무명 성도');
    setPhoneDigits('');
    setIsMatchedMember(false);
    setStep('ITEM_SELECT');
  };

  // Select Phone Track
  const startPhoneTrack = () => {
    setIsAnonymous(false);
    setPhoneDigits('');
    setDonorName('');
    setIsMatchedMember(false);
    setStep('PHONE_INPUT');
  };

  // Submit OffPG Card Payment
  const processOffPgPayment = async () => {
    if (!currentTenant || !selectedItem) return;
    setIsProcessingCard(true);

    const generatedApproval = `OFF-PAY-${Math.floor(10000000 + Math.random() * 90000000)}`;
    setApprovalNo(generatedApproval);

    setTimeout(async () => {
      try {
        const finalName = isAnonymous
          ? (ft.placeNoun === '사찰' ? '무명 보시 성도' : '무명 성도')
          : (donorName || '성도');

        const receiptId = `FP-KIOSK-${Date.now().toString().slice(-8)}`;

        const res = await donationAPI.create({
          id: receiptId,
          tenantId: currentTenant.id,
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          amount: amount,
          donorName: finalName,
          donorPhone: phone,
          baptismName: baptismName,
          isRecurring: false,
          paymentStatus: 'completed',
          paymentMethod: 'OffPG 현장 신용카드',
          transactionId: generatedApproval,
          deviceType: 'KIOSK',
        });

        if (res.success) {
          setIsProcessingCard(false);
          setStep('COMPLETE');

          setTimeout(() => {
            resetToHome();
          }, 6000);
        } else {
          toast.error('결제 승인 처리 중 오류가 발생했습니다.');
          setIsProcessingCard(false);
        }
      } catch (err: any) {
        toast.error(err.message || '카드 결제 오류');
        setIsProcessingCard(false);
      }
    }, 2200);
  };

  if (!currentTenant) return null;

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#191F28] flex flex-col font-sans select-none antialiased">
      {/* ── 🔵 헤더 (가독성 향상 대형 폰트) ── */}
      <header className="bg-white px-8 py-5 border-b border-[#E5E8EB] flex items-center justify-between shadow-2xs sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F3FF] flex items-center justify-center p-2.5 border border-[#CEE4FE]">
            {currentTenant.logoUrl ? (
              <img src={currentTenant.logoUrl} alt={currentTenant.name} className="w-full h-full object-contain" />
            ) : (
              <Motif motif={ft.motif} className="w-8 h-8 text-[#3182F6]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-black text-[#191F28] tracking-tight">{currentTenant.name}</span>
              <span className="bg-[#E8F3FF] text-[#1B64DA] text-xs sm:text-sm font-extrabold px-3 py-1 rounded-lg border border-[#CEE4FE]">
                현장 키오스크
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#4E5968] font-semibold mt-1">
              {ft.greeting}! {ft.tagline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {step !== 'MODE_SELECT' && (
            <div className="flex items-center gap-2 bg-[#F2F4F6] px-4 py-2 rounded-full text-sm font-bold text-[#4E5968]">
              <Clock className="w-4 h-4 text-[#3182F6]" />
              <span>자동 초기화 <strong className="text-[#3182F6] font-mono text-base">{autoResetSeconds}s</strong></span>
            </div>
          )}

          <div className="text-right font-mono text-sm sm:text-base font-extrabold text-[#3182F6] bg-[#E8F3FF] px-4 py-2 rounded-xl border border-[#CEE4FE]">
            {currentTimeStr}
          </div>

          {step !== 'MODE_SELECT' && (
            <button
              onClick={resetToHome}
              className="px-5 py-2.5 bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#333D4B] text-sm sm:text-base font-black rounded-2xl flex items-center gap-2 transition-colors cursor-pointer border-none"
            >
              <Home className="w-5 h-5 text-[#3182F6]" /> 처음으로
            </button>
          )}
        </div>
      </header>

      {/* ── ⚪ 진행 단계 표시줄 (Stepper 대형) ── */}
      {step !== 'MODE_SELECT' && step !== 'COMPLETE' && (
        <div className="bg-white border-b border-[#E5E8EB] px-8 py-4 flex items-center justify-center gap-4 text-sm sm:text-base font-extrabold">
          <div className={`flex items-center gap-2 ${step === 'PHONE_INPUT' || (step === 'ITEM_SELECT' && isAnonymous) ? 'text-[#3182F6]' : 'text-[#B0B8C1]'}`}>
            <span className="w-7 h-7 rounded-full bg-[#E8F3FF] text-[#3182F6] flex items-center justify-center text-xs sm:text-sm font-black">1</span>
            <span>{isAnonymous ? '방식 선택' : '전화번호 입력'}</span>
          </div>
          <span className="text-[#D1D6DB] font-mono font-bold">/</span>
          <div className={`flex items-center gap-2 ${step === 'ITEM_SELECT' || step === 'AMOUNT_SELECT' ? 'text-[#3182F6]' : 'text-[#B0B8C1]'}`}>
            <span className="w-7 h-7 rounded-full bg-[#E8F3FF] text-[#3182F6] flex items-center justify-center text-xs sm:text-sm font-black">2</span>
            <span>항목 및 금액</span>
          </div>
          <span className="text-[#D1D6DB] font-mono font-bold">/</span>
          <div className={`flex items-center gap-2 ${step === 'CARD_PAYMENT' ? 'text-[#3182F6]' : 'text-[#B0B8C1]'}`}>
            <span className="w-7 h-7 rounded-full bg-[#E8F3FF] text-[#3182F6] flex items-center justify-center text-xs sm:text-sm font-black">3</span>
            <span>카드 터치/결제</span>
          </div>
        </div>
      )}

      {/* ── 🔵 키오스크 캔버스 메인 영역 ── */}
      <main className="flex-1 p-6 sm:p-10 flex flex-col justify-center max-w-5xl w-full mx-auto animate-fade-in">

        {/* STEP 0: 2-Track 모드 선택 */}
        {step === 'MODE_SELECT' && (
          <div className="space-y-10 text-center my-auto">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#E8F3FF] text-[#1B64DA] text-sm font-black border border-[#CEE4FE]">
                <Sparkles className="w-4 h-4" /> 현장 오프라인 터치 결제
              </span>
              <h1 className="text-4xl sm:text-5xl font-black text-[#191F28] tracking-tight leading-tight">
                원하시는 봉헌 방식을 선택해 주세요
              </h1>
              <p className="text-base sm:text-lg text-[#4E5968] font-semibold">
                무명으로 5초 만에 빠르게 봉헌하시거나, 휴대폰 번호로 교인 이력을 연동하실 수 있습니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-2">
              {/* 트랙 1: 무명 5초 패스트트랙 */}
              <button
                onClick={startAnonymousTrack}
                className="group relative p-9 rounded-3xl bg-white border-2 border-[#E5E8EB] hover:border-[#3182F6] hover:shadow-2xl transition-all duration-200 text-left flex flex-col justify-between h-88 cursor-pointer active:scale-98"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-16 h-16 rounded-2xl bg-[#FFF6E6] text-[#FF8800] flex items-center justify-center font-black text-3xl shadow-xs">
                    ⚡
                  </div>
                  <span className="bg-[#FFF6E6] text-[#CC6D00] text-sm font-black px-4 py-1.5 rounded-full border border-[#FFE8C2]">
                    5초 스피드
                  </span>
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-[#191F28] group-hover:text-[#3182F6] transition-colors">
                    무명(익명)으로 빠른 봉헌
                  </h2>
                  <p className="text-sm sm:text-base text-[#4E5968] font-medium leading-relaxed">
                    전화번호나 성함 입력 없이 **항목과 금액만 터치하여 5초 만에 카드 결제**합니다.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-[#F2F4F6] text-[#3182F6] font-black text-base">
                  <span>익명 결제 진행하기</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </div>
              </button>

              {/* 트랙 2: 전화번호 회원 연동 */}
              <button
                onClick={startPhoneTrack}
                className="group relative p-9 rounded-3xl bg-white border-2 border-[#E5E8EB] hover:border-[#3182F6] hover:shadow-2xl transition-all duration-200 text-left flex flex-col justify-between h-88 cursor-pointer active:scale-98"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-16 h-16 rounded-2xl bg-[#E8F3FF] text-[#3182F6] flex items-center justify-center font-black text-3xl shadow-xs">
                    📱
                  </div>
                  <span className="bg-[#E8F3FF] text-[#1B64DA] text-sm font-black px-4 py-1.5 rounded-full border border-[#CEE4FE]">
                    교인 / 성도용
                  </span>
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-[#191F28] group-hover:text-[#3182F6] transition-colors">
                    전화번호로 봉헌 (이력 연동)
                  </h2>
                  <p className="text-sm sm:text-base text-[#4E5968] font-medium leading-relaxed">
                    휴대폰 번호 11자리를 터치하면 교인 성함이 자동 연결되고 **마이페이지 & 알림톡**이 발송됩니다.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-[#F2F4F6] text-[#3182F6] font-black text-base">
                  <span>전화번호 입력하기</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: 전화번호 입력 화면 */}
        {step === 'PHONE_INPUT' && (
          <div className="max-w-[#540px] mx-auto w-full space-y-7 text-center my-auto">
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-[#191F28]">010 뒤 8자리 번호를 입력해 주세요</h2>
              <p className="text-base sm:text-lg text-[#4E5968] font-semibold">교인 정보 자동 매칭 및 알림톡 감사 메시지가 전송됩니다.</p>
            </div>

            {/* 대형 전화번호 디스플레이 */}
            <div className="bg-white border-2 border-[#3182F6] rounded-3xl p-5 text-4xl sm:text-5xl font-mono font-black tracking-widest shadow-md min-h-[84px] flex items-center justify-center gap-3">
              <span className="text-[#3182F6] bg-[#E8F3FF] px-3.5 py-1 rounded-xl border border-[#CEE4FE] text-3xl sm:text-4xl font-black">010</span>
              <span className="text-[#D1D6DB] font-sans font-normal">-</span>
              <span className={phoneDigits.length >= 1 ? "text-[#191F28]" : "text-[#D1D6DB]"}>
                {phoneDigits.slice(0, 4).padEnd(4, '_')}
              </span>
              <span className="text-[#D1D6DB] font-sans font-normal">-</span>
              <span className={phoneDigits.length >= 5 ? "text-[#191F28]" : "text-[#D1D6DB]"}>
                {phoneDigits.slice(4, 8).padEnd(4, '_')}
              </span>
            </div>

            {/* 교인 매칭 성공 팝업 */}
            {isMatchedMember && (
              <div className="bg-[#E8F3FF] border border-[#CEE4FE] p-5 rounded-2xl flex items-center justify-between text-left animate-in fade-in zoom-in duration-150 shadow-xs">
                <div className="flex items-center gap-4">
                  <UserCheck className="w-8 h-8 text-[#3182F6]" />
                  <div>
                    <div className="text-lg font-black text-[#1B64DA]">
                      환영합니다, {donorName}님! {baptismName && `(${baptismName})`}
                    </div>
                    <div className="text-sm text-[#4E5968] font-semibold mt-0.5">
                      이전에 {matchedCount}회 봉헌하신 이력이 확인되었습니다.
                    </div>
                  </div>
                </div>
                <span className="bg-[#3182F6] text-white font-black text-xs px-3 py-1 rounded-lg">매칭 완료</span>
              </div>
            )}

            {/* 대형 라이트 키패드 */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleNumpadPress(btn)}
                  className={`h-18 sm:h-20 rounded-2xl font-mono text-3xl sm:text-4xl font-black transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                    btn === 'CLR'
                      ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]'
                      : btn === 'DEL'
                      ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                      : 'bg-white hover:bg-[#F9FAFB] text-[#191F28] border border-[#E5E8EB] shadow-xs'
                  }`}
                >
                  {btn === 'DEL' ? '⌫' : btn === 'CLR' ? '지움' : btn}
                </button>
              ))}
            </div>

            <button
              onClick={startAnonymousTrack}
              className="w-full py-4 rounded-2xl bg-[#FFF6E6] hover:bg-[#FFE8C2] text-[#CC6D00] font-black text-sm sm:text-base cursor-pointer border border-[#FFE8C2] flex items-center justify-center gap-2 shadow-xs"
            >
              <span>⚡ 무명(익명)으로 빠른 봉헌으로 전환</span>
            </button>

            <div className="flex gap-4 pt-1">
              <button
                onClick={() => setStep('MODE_SELECT')}
                className="flex-1 py-4.5 rounded-2xl bg-[#E5E8EB] hover:bg-[#D1D6DB] text-[#333D4B] font-extrabold text-base cursor-pointer border-none"
              >
                이전
              </button>
              <button
                onClick={() => setStep('ITEM_SELECT')}
                className="flex-2 py-4.5 rounded-2xl bg-[#3182F6] hover:bg-[#1B64DA] text-white font-black text-lg cursor-pointer border-none shadow-md flex items-center justify-center gap-2"
              >
                <span>다음 단계</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: 봉헌 항목 선택 (대형 카드) */}
        {step === 'ITEM_SELECT' && (
          <div className="space-y-8 text-center my-auto max-w-5xl mx-auto w-full">
            <div className="space-y-2">
              <span className="text-sm font-extrabold text-[#3182F6] font-mono bg-[#E8F3FF] px-3 py-1 rounded-md">STEP 1 / 3</span>
              <h2 className="text-4xl sm:text-5xl font-black text-[#191F28] tracking-tight">봉헌(보시) 항목을 선택해 주세요</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {items.map((it: any) => (
                <button
                  key={it.id}
                  onClick={() => {
                    setSelectedItem(it);
                    if (it.amountType === 'fixed' && it.fixedAmount && it.fixedAmount > 0) {
                      setAmount(it.fixedAmount);
                    } else {
                      setAmount(10000);
                    }
                    setStep('AMOUNT_SELECT');
                  }}
                  className={`p-8 rounded-3xl border-2 text-left transition-all duration-150 cursor-pointer shadow-xs flex flex-col justify-between h-56 sm:h-60 active:scale-98 ${
                    selectedItem?.id === it.id
                      ? 'border-[#3182F6] bg-[#E8F3FF]'
                      : 'border-[#E5E8EB] bg-white hover:border-[#3182F6]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-2xl sm:text-3xl font-black text-[#191F28]">{it.name}</span>
                      <div className="mt-2">
                        {it.amountType === 'fixed' && it.fixedAmount ? (
                          <span className="bg-[#E8F3FF] text-[#1B64DA] text-xs sm:text-sm font-extrabold px-3 py-1 rounded-lg border border-[#CEE4FE]">
                            고정 {it.fixedAmount.toLocaleString()}원
                          </span>
                        ) : (
                          <span className="bg-[#F2F4F6] text-[#4E5968] text-xs sm:text-sm font-extrabold px-3 py-1 rounded-lg">
                            자율 봉헌 (최저 1,000원)
                          </span>
                        )}
                      </div>
                    </div>
                    <Motif motif={ft.motif} className="w-8 h-8 text-[#3182F6]" />
                  </div>
                  <p className="text-sm sm:text-base text-[#4E5968] font-semibold mt-2 leading-relaxed">{it.description || '마음을 담아 드리는 정성'}</p>
                  <div className="text-sm sm:text-base font-black text-[#3182F6] flex items-center gap-2 pt-3 border-t border-[#F2F4F6]">
                    <span>선택하기</span> <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(isAnonymous ? 'MODE_SELECT' : 'PHONE_INPUT')}
              className="px-8 py-4 bg-[#E5E8EB] hover:bg-[#D1D6DB] text-[#333D4B] font-extrabold text-base rounded-2xl cursor-pointer border-none mt-4"
            >
              이전 단계로
            </button>
          </div>
        )}

        {/* STEP 3: 금액 선택 (대형 금액 폰트 & 칩스) */}
        {step === 'AMOUNT_SELECT' && selectedItem && (
          <div className="space-y-8 text-center my-auto max-w-4xl mx-auto w-full">
            <div className="space-y-2">
              <span className="text-sm font-extrabold text-[#3182F6] font-mono bg-[#E8F3FF] px-3 py-1 rounded-md">STEP 2 / 3</span>
              <h2 className="text-4xl sm:text-5xl font-black text-[#191F28] tracking-tight">
                [{selectedItem.name}] 봉헌 금액을 선택해 주세요
              </h2>
              {selectedItem.amountType === 'fixed' && selectedItem.fixedAmount && (
                <p className="text-sm font-black text-[#1B64DA] bg-[#E8F3FF] inline-block px-4 py-1.5 rounded-full border border-[#CEE4FE]">
                  관리자 설정 고정 금액: {selectedItem.fixedAmount.toLocaleString()}원
                </p>
              )}
            </div>

            {/* 초대형 금액 디스플레이 */}
            <div className="bg-white border-2 border-[#3182F6] rounded-3xl p-8 shadow-sm">
              <span className="text-sm sm:text-base text-[#4E5968] font-bold block mb-2">최종 결제 금액 (최저 1,000원)</span>
              <span className="text-6xl sm:text-7xl font-black font-mono text-[#3182F6] tracking-tight">
                {amount.toLocaleString()}<span className="text-3xl font-sans ml-2 text-[#191F28]">원</span>
              </span>
            </div>

            {/* 대형 preset 금액 선택 칩스 */}
            <div className="space-y-4">
              <div className="text-sm font-black text-[#4E5968] text-left">빠른 금액 선택</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1000, 5000, 10000, 30000, 50000, 100000, 300000, 500000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset)}
                    className={`py-4 sm:py-5 rounded-2xl font-mono text-lg sm:text-xl font-black transition-all cursor-pointer border ${
                      amount === preset
                        ? 'bg-[#3182F6] text-white border-[#3182F6] shadow-md scale-105'
                        : 'bg-white hover:bg-[#F9FAFB] text-[#191F28] border-[#E5E8EB]'
                    }`}
                  >
                    {preset < 10000 ? `${preset.toLocaleString()}원` : `${(preset / 10000).toLocaleString()}만원`}
                  </button>
                ))}
              </div>

              {/* 금액 추가 (더하기) 대형 칩스 */}
              {selectedItem.amountType !== 'fixed' && (
                <div className="pt-3 border-t border-[#E5E8EB]">
                  <div className="text-sm font-black text-[#4E5968] text-left mb-3">금액 추가하기</div>
                  <div className="flex flex-wrap gap-2.5">
                    {[1000, 5000, 10000, 50000, 100000].map((addVal) => (
                      <button
                        key={addVal}
                        onClick={() => setAmount((prev) => prev + addVal)}
                        className="px-4 py-3 rounded-xl bg-[#E5E8EB] hover:bg-[#D1D6DB] text-[#191F28] font-mono text-sm sm:text-base font-extrabold transition-all cursor-pointer border-none"
                      >
                        +{addVal < 10000 ? `${addVal.toLocaleString()}원` : `${(addVal / 10000).toLocaleString()}만원`}
                      </button>
                    ))}
                    <button
                      onClick={() => setAmount(1000)}
                      className="px-4 py-3 rounded-xl bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#DC2626] font-mono text-sm sm:text-base font-black transition-all cursor-pointer border-none"
                    >
                      초기화(1,000원)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setStep('ITEM_SELECT')}
                className="flex-1 py-5 rounded-2xl bg-[#E5E8EB] hover:bg-[#D1D6DB] text-[#333D4B] font-extrabold text-base sm:text-lg cursor-pointer border-none"
              >
                이전
              </button>
              <button
                onClick={() => {
                  if (amount < 1000) {
                    toast.error('최소 봉헌 금액은 1,000원 이상이어야 합니다.');
                    return;
                  }
                  if (isAnonymous) {
                    setStep('CARD_PAYMENT');
                  } else if (!donorName) {
                    setStep('NAME_INPUT');
                  } else {
                    setStep('CARD_PAYMENT');
                  }
                }}
                className="flex-2 py-5 rounded-2xl bg-[#3182F6] hover:bg-[#1B64DA] text-white font-black text-lg sm:text-xl cursor-pointer border-none shadow-lg flex items-center justify-center gap-2"
              >
                <CreditCard className="w-6 h-6" />
                <span>신용카드 결제하기</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: 성함 입력 (비회원 전용 + 터치 가상 키보드 대형) */}
        {step === 'NAME_INPUT' && (
          <div className="max-w-xl mx-auto w-full space-y-6 text-center my-auto">
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-[#191F28]">성함을 입력해 주세요</h2>
              <p className="text-sm sm:text-base text-[#4E5968] font-semibold">하단 터치 키보드로 성함이나 세례명/법명을 입력해 주세요.</p>
            </div>

            {/* 성함 입력 필드 */}
            <div className="relative">
              <input
                type="text"
                readOnly={false}
                value={donorName}
                onFocus={() => setIsSoftKeyboardOpen(true)}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="터치하여 성함 입력 (예: 홍길동)"
                className="w-full px-7 py-5 rounded-2xl bg-white border-2 border-[#3182F6] text-3xl font-black text-center text-[#191F28] outline-none shadow-sm cursor-pointer"
              />
              {donorName && (
                <button
                  onClick={() => setDonorName('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-sm bg-[#E5E8EB] hover:bg-[#D1D6DB] text-[#4E5968] font-bold px-3.5 py-1.5 rounded-full cursor-pointer"
                >
                  지우기
                </button>
              )}
            </div>

            {/* 무명 성도 즉시 전환 칩 */}
            <button
              onClick={() => {
                setIsAnonymous(true);
                setDonorName(ft.placeNoun === '사찰' ? '무명 보시 성도' : ft.placeNoun === '성당' ? '무명 교우' : '무명 성도');
                setStep('CARD_PAYMENT');
              }}
              className="w-full py-3.5 bg-[#FFF6E6] hover:bg-[#FFE8C2] text-[#CC6D00] font-black text-sm sm:text-base rounded-xl cursor-pointer border border-[#FFE8C2]"
            >
              ⚡ 무명 성도로 즉시 카드 결제 진행
            </button>

            {/* ⌨️ 터치 가상 키보드 패널 */}
            {isSoftKeyboardOpen && (
              <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4 shadow-xl space-y-2 animate-in slide-in-from-bottom duration-200">
                <div className="flex justify-between items-center px-1 pb-1 border-b border-[#F2F4F6]">
                  <span className="text-xs font-extrabold text-[#3182F6]">터치 가상 키보드 ({keyboardLang})</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setKeyboardLang(keyboardLang === 'KOR' ? 'ENG' : 'KOR')}
                      className="px-2.5 py-1 text-xs font-bold bg-[#E8F3FF] text-[#1B64DA] rounded-lg cursor-pointer"
                    >
                      {keyboardLang === 'KOR' ? '한/영 (ENG)' : '한/영 (한글)'}
                    </button>
                    {keyboardLang === 'KOR' && (
                      <button
                        onClick={() => setIsDoubleConsonant(!isDoubleConsonant)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                          isDoubleConsonant ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                        }`}
                      >
                        쌍자음 ({isDoubleConsonant ? 'ON' : 'OFF'})
                      </button>
                    )}
                  </div>
                </div>

                {/* 한글 키보드 자모 배열 */}
                {keyboardLang === 'KOR' ? (
                  <div className="space-y-1.5">
                    {/* Row 1 */}
                    <div className="grid grid-cols-10 gap-1.5">
                      {(isDoubleConsonant 
                        ? ['ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅖ', 'ㅒ']
                        : ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ']
                      ).map((key) => (
                        <button
                          key={key}
                          onClick={() => handleSoftKeyClick(key)}
                          className="h-12 bg-[#F9FAFB] hover:bg-[#E8F3FF] active:bg-[#3182F6] active:text-white border border-[#E5E8EB] rounded-xl text-lg font-bold text-[#191F28] cursor-pointer"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                    {/* Row 2 */}
                    <div className="grid grid-cols-9 gap-1.5 px-3">
                      {['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'].map((key) => (
                        <button
                          key={key}
                          onClick={() => handleSoftKeyClick(key)}
                          className="h-12 bg-[#F9FAFB] hover:bg-[#E8F3FF] active:bg-[#3182F6] active:text-white border border-[#E5E8EB] rounded-xl text-lg font-bold text-[#191F28] cursor-pointer"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                    {/* Row 3 */}
                    <div className="grid grid-cols-7 gap-1.5 px-8">
                      {['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'].map((key) => (
                        <button
                          key={key}
                          onClick={() => handleSoftKeyClick(key)}
                          className="h-12 bg-[#F9FAFB] hover:bg-[#E8F3FF] active:bg-[#3182F6] active:text-white border border-[#E5E8EB] rounded-xl text-lg font-bold text-[#191F28] cursor-pointer"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* 영문 키보드 배열 */
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-10 gap-1.5">
                      {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map((key) => (
                        <button
                          key={key}
                          onClick={() => handleSoftKeyClick(key)}
                          className="h-12 bg-[#F9FAFB] hover:bg-[#E8F3FF] active:bg-[#3182F6] active:text-white border border-[#E5E8EB] rounded-xl text-base font-bold text-[#191F28] cursor-pointer"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-9 gap-1.5 px-3">
                      {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map((key) => (
                        <button
                          key={key}
                          onClick={() => handleSoftKeyClick(key)}
                          className="h-12 bg-[#F9FAFB] hover:bg-[#E8F3FF] active:bg-[#3182F6] active:text-white border border-[#E5E8EB] rounded-xl text-base font-bold text-[#191F28] cursor-pointer"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 px-8">
                      {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((key) => (
                        <button
                          key={key}
                          onClick={() => handleSoftKeyClick(key)}
                          className="h-12 bg-[#F9FAFB] hover:bg-[#E8F3FF] active:bg-[#3182F6] active:text-white border border-[#E5E8EB] rounded-xl text-base font-bold text-[#191F28] cursor-pointer"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 컨트롤 키 버튼들 */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <button
                    onClick={() => handleSoftKeyClick('SPACE')}
                    className="py-2.5 bg-[#F2F4F6] text-[#333D4B] font-bold text-xs rounded-xl cursor-pointer"
                  >
                    띄어쓰기 ␣
                  </button>
                  <button
                    onClick={() => handleSoftKeyClick('DEL')}
                    className="py-2.5 bg-[#FEF3C7] text-[#D97706] font-bold text-xs rounded-xl cursor-pointer border border-[#FDE68A]"
                  >
                    한글자 지움 ⌫
                  </button>
                  <button
                    onClick={() => handleSoftKeyClick('CLR')}
                    className="py-2.5 bg-[#FEE2E2] text-[#DC2626] font-bold text-xs rounded-xl cursor-pointer border border-[#FCA5A5]"
                  >
                    전체 지움
                  </button>
                  <button
                    onClick={() => {
                      if (!donorName) {
                        toast.error('성함을 입력해 주시거나 무명으로 진행해 주세요.');
                        return;
                      }
                      setStep('CARD_PAYMENT');
                    }}
                    className="py-2.5 bg-[#3182F6] text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md"
                  >
                    입력 완료 ✓
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-3">
              <button
                onClick={() => setStep('AMOUNT_SELECT')}
                className="flex-1 py-4.5 rounded-2xl bg-[#E5E8EB] text-[#333D4B] font-extrabold text-base sm:text-lg cursor-pointer border-none"
              >
                이전
              </button>
              <button
                onClick={() => {
                  if (!donorName) {
                    toast.error('성함을 입력해 주시거나 무명으로 진행해 주세요.');
                    return;
                  }
                  setStep('CARD_PAYMENT');
                }}
                className="flex-2 py-4.5 rounded-2xl bg-[#3182F6] hover:bg-[#1B64DA] text-white font-black text-base sm:text-lg cursor-pointer border-none shadow-md"
              >
                카드 결제 진행
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: 오프라인 카드리더기 결제 팝업 대형 */}
        {step === 'CARD_PAYMENT' && (
          <div className="max-w-2xl mx-auto w-full text-center my-auto space-y-7 bg-white p-10 rounded-3xl border border-[#E5E8EB] shadow-2xl animate-in zoom-in duration-150">
            <div className="space-y-3">
              <span className="bg-[#E8F3FF] text-[#1B64DA] text-sm font-black px-4 py-1.5 rounded-full border border-[#CEE4FE]">
                OffPG 오프라인 결제
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#191F28]">신용카드를 대거나 넣어주세요</h2>
              <p className="text-sm sm:text-base text-[#4E5968] font-semibold">
                하단 단말기 슬롯에 **신용카드를 꽂으시거나** **삼성페이/ApplePay**를 터치해 주세요.
              </p>
            </div>

            {/* 슬릭 카드리더기 터치 애니메이션 */}
            <div className="relative py-8 flex flex-col items-center justify-center">
              <div className="w-32 h-44 rounded-2xl bg-gradient-to-tr from-[#3182F6] to-[#1B64DA] shadow-xl flex flex-col justify-between p-4 text-white font-mono text-left animate-bounce">
                <div className="w-8 h-6 rounded bg-amber-300 border border-amber-400" />
                <div>
                  <div className="text-xs font-bold text-blue-200">FaithPay Card</div>
                  <div className="text-sm font-black">•••• •••• ••••</div>
                </div>
              </div>

              {isProcessingCard && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-4">
                  <RefreshCw className="w-12 h-12 text-[#3182F6] animate-spin" />
                  <div className="text-lg font-black text-[#191F28]">오프라인 카드 승인 중입니다...</div>
                </div>
              )}
            </div>

            <div className="bg-[#F9FAFB] p-5 rounded-2xl text-sm sm:text-base space-y-1.5 text-[#4E5968] font-mono border border-[#E5E8EB]">
              <div>결제 금액: <strong className="text-[#3182F6] font-black text-lg">{amount.toLocaleString()}원</strong></div>
              <div>기부자: <strong className="text-[#191F28] font-bold">{donorName || '무명 성도'}</strong> ({phone ? phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3') : '익명'})</div>
            </div>

            {!isProcessingCard && (
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setStep('AMOUNT_SELECT')}
                  className="flex-1 py-4 bg-[#E5E8EB] text-[#333D4B] font-extrabold text-base rounded-2xl cursor-pointer border-none"
                >
                  취소
                </button>
                <button
                  onClick={processOffPgPayment}
                  className="flex-2 py-4 bg-[#3182F6] hover:bg-[#1B64DA] text-white font-black text-lg rounded-2xl cursor-pointer border-none shadow-md flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  <span>오프라인 카드 승인 실행</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: 결제 완료 화면 */}
        {step === 'COMPLETE' && (
          <div className="max-w-xl mx-auto w-full text-center my-auto space-y-7 bg-white p-10 rounded-3xl border border-[#E5E8EB] shadow-2xl animate-in zoom-in duration-200">
            <div className="w-20 h-20 bg-[#3182F6] text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-[#191F28]">봉헌이 감사히 완료되었습니다!</h2>
              <p className="text-base text-[#3182F6] font-extrabold">
                {donorName || '성도'}님의 정성이 소중히 전달되었습니다.
              </p>
            </div>

            <div className="bg-[#F9FAFB] border border-[#E5E8EB] p-6 rounded-2xl text-sm sm:text-base space-y-2.5 text-[#4E5968] font-mono text-left">
              <div className="flex justify-between"><span>승인 번호:</span> <span className="text-[#191F28] font-bold">{approvalNo}</span></div>
              <div className="flex justify-between"><span>봉헌 항목:</span> <span className="text-[#191F28] font-bold">{selectedItem?.name}</span></div>
              <div className="flex justify-between"><span>결제 금액:</span> <span className="text-[#3182F6] font-black text-lg">{amount.toLocaleString()}원</span></div>
              <div className="flex justify-between"><span>결제 수단:</span> <span className="text-[#1B64DA] font-extrabold">OffPG 현장 신용카드</span></div>
              {phone && (
                <div className="pt-3 border-t border-[#E5E8EB] text-[#1B64DA] font-sans text-sm font-bold">
                  📱 기재하신 번호({phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3')})로 감사 알림톡이 전송되었습니다.
                </div>
              )}
            </div>

            <p className="text-sm text-[#8B95A1]">
              <strong className="text-[#3182F6] font-mono text-base font-bold">6초 후</strong> 자동으로 메인 화면으로 리셋됩니다.
            </p>

            <button
              onClick={resetToHome}
              className="w-full py-5 bg-[#3182F6] hover:bg-[#1B64DA] text-white font-black text-lg rounded-2xl cursor-pointer border-none shadow-md"
            >
              확인 (처음 화면으로)
            </button>
          </div>
        )}

      </main>

      {/* ── ⚪ 하단 푸터 ── */}
      <footer className="px-8 py-4 bg-white border-t border-[#E5E8EB] flex items-center justify-between text-xs text-[#8B95A1]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#3182F6]" />
          <span>보안 인증: IC/NFC 오프라인 카드 단말기 통합 연동</span>
        </div>
        <div>
          FaithPay Kiosk Platform © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
