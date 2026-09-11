import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { ShieldAlert, Clock, RefreshCw, LogOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { isAdminPortalDomain } from '../../utils/domainUtils';

// 역할별 비활동 유휴 타임아웃 시간 (밀리초)
const TIMEOUT_CONFIG = {
  system_admin: 30 * 60 * 1000, // 시스템 최고 관리자: 30분 (1,800,000ms)
  tenant_admin: 60 * 60 * 1000, // 단체 관리자: 60분 (3,600,000ms)
  partner: 60 * 60 * 1000,      // 파트너 관리자: 60분 (3,600,000ms)
};

// 만료 경고 모달 표시 시점 (만료 2분 전 = 120,000ms)
const WARNING_THRESHOLD_MS = 2 * 60 * 1000;

export function SessionTimeoutWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentAdmin, setCurrentAdmin, currentTenant, setCurrentTenant } = useApp();

  const [partnerSession, setPartnerSession] = useState<any>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const lastThrottleRef = useRef<number>(Date.now());

  // 1. 파트너 세션 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkPartner = () => {
        try {
          const raw = sessionStorage.getItem('soulpay_partner_session') || sessionStorage.getItem('faithpay_partner_session');
          setPartnerSession(raw ? JSON.parse(raw) : null);
        } catch {
          setPartnerSession(null);
        }
      };
      checkPartner();
      window.addEventListener('storage', checkPartner);
      return () => window.removeEventListener('storage', checkPartner);
    }
  }, [location.pathname]);

  // 현재 관리자 유형 판별
  const adminType = currentAdmin
    ? currentAdmin.role === 'system_admin'
      ? 'system_admin'
      : 'tenant_admin'
    : partnerSession
    ? 'partner'
    : null;

  const maxIdleMs = adminType ? TIMEOUT_CONFIG[adminType] : 0;
  const storageKey = adminType === 'partner' ? 'soulpay_partner_last_activity' : 'soulpay_admin_last_activity';

  // 2. 활동 시간 갱신 함수 (슬라이딩 세션)
  const refreshActivity = useCallback(() => {
    if (!adminType) return;
    const now = Date.now();
    try {
      localStorage.setItem(storageKey, now.toString());
    } catch {}
    lastThrottleRef.current = now;
    setIsWarningOpen(false);
  }, [adminType, storageKey]);

  // 3. 로그아웃 핸들러
  const handleLogout = useCallback((isTimeout = false) => {
    setIsWarningOpen(false);

    if (adminType === 'system_admin') {
      setCurrentAdmin(null);
      if (isTimeout) {
        toast.error('보안을 위해 30분간 활동이 없어 시스템 관리자 계정이 자동 로그아웃되었습니다.');
      }
      navigate('/system/login');
    } else if (adminType === 'tenant_admin') {
      const tenantSlug = currentTenant?.slug || currentAdmin?.tenantId;
      setCurrentAdmin(null);
      setCurrentTenant(null);
      if (isTimeout) {
        toast.error('보안을 위해 60분간 활동이 없어 단체 관리자 계정이 자동 로그아웃되었습니다.');
      }
      const isDedicated = isAdminPortalDomain();
      const loginPath = tenantSlug
        ? (isDedicated ? `/${tenantSlug}/login` : `/${tenantSlug}/admin/login`)
        : (isDedicated ? '/login' : '/admin/login');
      navigate(loginPath);
    } else if (adminType === 'partner') {
      try {
        sessionStorage.removeItem('soulpay_partner_session');
        sessionStorage.removeItem('faithpay_partner_session');
        localStorage.removeItem('soulpay_partner_last_activity');
      } catch {}
      setPartnerSession(null);
      if (isTimeout) {
        toast.error('보안을 위해 60분간 활동이 없어 파트너 계정이 자동 로그아웃되었습니다.');
      }
      navigate('/partner/login');
    }
  }, [adminType, currentAdmin, currentTenant, navigate, setCurrentAdmin, setCurrentTenant]);

  // 4. 사용자 인터랙션 이벤트 리스너 (마우스, 키보드, 스크롤, 터치)
  useEffect(() => {
    if (!adminType) return;

    const handleUserAction = () => {
      // 경고 모달이 열려 있을 때는 무의식적인 마우스 스침으로 자동 연장되지 않도록 방지
      if (isWarningOpen) return;

      const now = Date.now();
      // 2초(2000ms) 쓰로틀링으로 성능 최적화
      if (now - lastThrottleRef.current > 2000) {
        refreshActivity();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, handleUserAction, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserAction));
    };
  }, [adminType, isWarningOpen, refreshActivity]);

  // 5. 1초 주기 타이머 검사 및 멀티탭 동기화
  useEffect(() => {
    if (!adminType) {
      setIsWarningOpen(false);
      return;
    }

    // 최초 로드 시 last_activity가 없으면 기록
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, Date.now().toString());
    }

    const interval = setInterval(() => {
      const lastActivityStr = localStorage.getItem(storageKey);
      const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : Date.now();
      const elapsed = Date.now() - lastActivity;
      const remainingMs = Math.max(0, maxIdleMs - elapsed);
      const remainingSec = Math.ceil(remainingMs / 1000);

      setRemainingSeconds(remainingSec);

      // 만료 2분(120초) 전이고 아직 시간이 남아있는 경우 경고 모달 표출
      if (remainingMs <= WARNING_THRESHOLD_MS && remainingMs > 0) {
        setIsWarningOpen(true);
      } else if (remainingMs > WARNING_THRESHOLD_MS) {
        setIsWarningOpen(false);
      }

      // 0초 이하 도달 시 자동 로그아웃 실행
      if (remainingMs <= 0) {
        clearInterval(interval);
        handleLogout(true);
      }
    }, 1000);

    // 다른 탭에서 활동하여 storage가 변경되었을 때 동기화
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const newTime = parseInt(e.newValue, 10);
        if (Date.now() - newTime < maxIdleMs - WARNING_THRESHOLD_MS) {
          setIsWarningOpen(false);
        }
      }
      // 다른 탭에서 로그아웃된 경우
      if (e.key === 'soulpay_current_admin' && !e.newValue && adminType !== 'partner') {
        setCurrentAdmin(null);
        navigate('/');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [adminType, maxIdleMs, storageKey, handleLogout, navigate, setCurrentAdmin]);

  if (!adminType) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const adminTitle =
    adminType === 'system_admin'
      ? '시스템 최고 관리자'
      : adminType === 'partner'
      ? '영업 파트너'
      : '단체 관리자';

  return (
    <Dialog open={isWarningOpen} onOpenChange={(open) => { if (!open) refreshActivity(); }}>
      <DialogContent className="sm:max-w-md border-amber-200 bg-white dark:bg-zinc-900 shadow-2xl p-6">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                로그인 세션 만료 경고
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  {adminTitle}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                금융 결제 및 개인정보 보호를 위한 자동 세션 제어
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="my-4 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-semibold">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>비활동 자동 로그아웃까지 남은 시간</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tracking-wider">
            {formattedTime}
          </div>
          <p className="text-[12px] text-slate-600 dark:text-zinc-400 leading-relaxed">
            시간 내에 [세션 연장하기]를 누르지 않으시면 보안을 위해 자동으로 로그아웃됩니다.
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleLogout(false)}
            className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer h-9"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            지금 로그아웃
          </Button>
          <Button
            type="button"
            onClick={refreshActivity}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            세션 연장하기 (계속 작업)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
