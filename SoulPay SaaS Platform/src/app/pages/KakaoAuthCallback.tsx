import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { kakaoAuthAPI } from '../api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, Smartphone, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function KakaoAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const tenantSlug = searchParams.get('state') || '';

  const [step, setStep] = useState<'loading' | 'phone_required' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [kakaoUser, setKakaoUser] = useState<{
    id: number;
    nickname?: string;
    email?: string;
    phone?: string;
  } | null>(null);

  const [manualPhone, setManualPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 📱 전화번호 하이픈 자동 포맷팅 헬퍼
  const formatPhoneNumber = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 11);
    if (clean.length <= 3) return clean;
    if (clean.length <= 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`;
  };

  useEffect(() => {
    if (error) {
      setStep('error');
      setErrorMessage(errorDescription || '카카오 로그인이 취소되었거나 오류가 발생했습니다.');
      return;
    }

    if (!code) {
      setStep('error');
      setErrorMessage('카카오 인가 코드를 확인할 수 없습니다.');
      return;
    }

    const processKakaoLogin = async () => {
      try {
        const redirectUri = `${window.location.origin}/oauth/kakao/callback`;
        
        // 1. 인가 코드로 액세스 토큰 발급
        const tokenData = await kakaoAuthAPI.exchangeToken(code, redirectUri);
        if (!tokenData.access_token) {
          throw new Error('액세스 토큰 발급에 실패했습니다.');
        }

        // 2. 액세스 토큰으로 사용자 프로필 및 전화번호 조회
        const userInfo = await kakaoAuthAPI.getUserInfo(tokenData.access_token);
        setKakaoUser(userInfo);

        // 3. 전화번호가 포함되어 있는 경우 (카카오 비즈니스 동의 승인 상태)
        if (userInfo.phone) {
          const cleanPhone = userInfo.phone.replace(/[^0-9]/g, '');
          sessionStorage.setItem('soulpay_donor_session', cleanPhone);
          sessionStorage.setItem('faithpay_donor_session', cleanPhone);
          localStorage.setItem('soulpay_last_donor_phone', cleanPhone);
          localStorage.setItem('faithpay_last_donor_phone', cleanPhone);
          if (userInfo.nickname) {
            localStorage.setItem('soulpay_donor_name', userInfo.nickname);
          }

          toast.success(`카카오 1초 간편인증 성공! ${userInfo.nickname ? `${userInfo.nickname} 성도님, ` : ''}환영합니다.`);
          const targetPath = tenantSlug ? `/${tenantSlug}/my-donations` : '/';
          navigate(targetPath, { replace: true });
          return;
        }

        // 4. 전화번호가 미포함된 경우 (카카오 디벨로퍼스 비즈 앱 심사 전 단계)
        // 성도에게 최초 1회 휴대폰 번호를 입력받아 매칭 진행
        setStep('phone_required');
      } catch (err: any) {
        console.error('Kakao OAuth Callback Error:', err);
        setStep('error');
        setErrorMessage(err?.message || '카카오 로그인 처리 중 오류가 발생했습니다.');
      }
    };

    processKakaoLogin();
  }, [code, error, errorDescription, navigate, tenantSlug]);

  const handleManualPhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualPhone.replace(/[^0-9]/g, '');
    if (clean.length < 10) {
      toast.error('올바른 휴대폰 번호를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      sessionStorage.setItem('soulpay_donor_session', clean);
      sessionStorage.setItem('faithpay_donor_session', clean);
      localStorage.setItem('soulpay_last_donor_phone', clean);
      localStorage.setItem('faithpay_last_donor_phone', clean);
      if (kakaoUser?.nickname) {
        localStorage.setItem('soulpay_donor_name', kakaoUser.nickname);
      }

      toast.success(`인증 완료! ${kakaoUser?.nickname ? `${kakaoUser.nickname} 성도님, ` : ''}환영합니다.`);
      const targetPath = tenantSlug ? `/${tenantSlug}/my-donations` : '/';
      navigate(targetPath, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
        {step === 'loading' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 mx-auto flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                카카오 계정 인증 중입니다
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                성도님의 헌금 및 봉헌 내역을 안전하게 연결하고 있습니다. 잠시만 기다려 주세요.
              </p>
            </div>
          </div>
        )}

        {step === 'phone_required' && (
          <div>
            <CardHeader className="text-center pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-2xl bg-[#FEE500] text-[#191919] mx-auto flex items-center justify-center mb-2 shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                {kakaoUser?.nickname ? `${kakaoUser.nickname}님, 환영합니다!` : '카카오 계정 연결 완료'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                헌금 내역 조회를 위해 본인 휴대폰 번호를 1회 입력해 주세요.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleManualPhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-phone" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    휴대폰 번호
                  </Label>
                  <div className="relative">
                    <Input
                      id="manual-phone"
                      type="tel"
                      placeholder="010-0000-0000"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(formatPhoneNumber(e.target.value))}
                      className="pl-10 h-12 text-base font-mono font-bold tracking-wider rounded-xl bg-slate-50 dark:bg-zinc-800"
                      autoFocus
                    />
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    * 한 번 입력하시면 다음부터는 카카오 1초 로그인으로 자동 조회됩니다.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || manualPhone.replace(/[^0-9]/g, '').length < 10}
                  className="w-full h-12 text-sm font-bold rounded-xl bg-[#3182F6] hover:bg-blue-600 text-white cursor-pointer shadow-sm gap-2"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  헌금 내역 확인하기 <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </div>
        )}

        {step === 'error' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 mx-auto flex items-center justify-center">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                카카오 로그인 실패
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errorMessage}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(tenantSlug ? `/${tenantSlug}/my-donations` : '/', { replace: true })}
              className="w-full h-11 text-xs font-bold rounded-xl"
            >
              마이페이지로 돌아가기
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
