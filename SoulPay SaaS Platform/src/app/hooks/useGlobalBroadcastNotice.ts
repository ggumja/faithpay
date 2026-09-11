import { useState, useEffect, useCallback, useRef } from 'react';
import { settingsAPI } from '../api/client';

export interface GlobalBroadcastNotice {
  id: string;
  title: string;
  content: string;
  noticeType: 'info' | 'warning' | 'urgent';
  isMaintenanceMode: boolean;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

const BROADCAST_CHANNEL_NAME = 'soulpay_broadcast_notice_channel';
const BROADCAST_EVENT_NAME = 'soulpay:broadcast_notice_updated';

/**
 * 다른 창이나 모달에서 공지 상태가 변경되었을 때 실시간 전파하는 헬퍼 함수
 */
export function notifyBroadcastNoticeChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BROADCAST_EVENT_NAME));
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.postMessage({ type: 'NOTICE_UPDATED', timestamp: Date.now() });
        bc.close();
      }
    } catch {
      // BroadcastChannel 미지원 브라우저는 무시
    }
  }
}

/**
 * 실시간 전체 공지 & 결제 점검 모드 자동 동기화 훅
 * - 마운트 시 1회 즉시 로드
 * - 10초 주기 자동 폴링 (새로고침 없는 실시간 갱신)
 * - 브라우저 탭 활성화(visibilitychange, focus) 시 즉시 재조회
 * - 멀티탭/모달 발행 이벤트 감지 시 0초 즉각 동기화
 * - 결제 직전 JIT(Just-in-Time) 최신 점검 여부 검증 함수 제공
 */
export function useGlobalBroadcastNotice(pollingIntervalMs: number = 10000) {
  const [notice, setNotice] = useState<GlobalBroadcastNotice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const noticeRef = useRef<GlobalBroadcastNotice | null>(null);

  const fetchNotice = useCallback(async (): Promise<GlobalBroadcastNotice | null> => {
    try {
      const res = await settingsAPI.get('global_broadcast_notice');
      const raw = res?.data ?? res?.value ?? res;
      const parsedNotice = (raw && typeof raw === 'object' && raw.value && typeof raw.value === 'object')
        ? raw.value
        : raw;

      if (parsedNotice && parsedNotice.isActive) {
        setNotice(parsedNotice);
        noticeRef.current = parsedNotice;
        return parsedNotice;
      } else {
        setNotice(null);
        noticeRef.current = null;
        return null;
      }
    } catch (err) {
      console.warn('Failed to sync global broadcast notice:', err);
      return noticeRef.current;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchNotice();

    // 1. 주기적 백그라운드 폴링 (새로고침 없는 실시간 갱신)
    const timer = setInterval(() => {
      if (isMounted) fetchNotice();
    }, pollingIntervalMs);

    // 2. 창 포커스 및 탭 가시성 변화 시 즉각 갱신
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotice();
      }
    };
    const handleFocus = () => fetchNotice();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 3. 브라우저 내부 커스텀 이벤트 리스너 (같은 탭 내 즉각 갱신)
    const handleCustomEvent = () => fetchNotice();
    window.addEventListener(BROADCAST_EVENT_NAME, handleCustomEvent);

    // 4. BroadcastChannel 멀티탭 동기화 (관리자 탭에서 해제 시 신도 탭 0초 즉각 갱신)
    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.onmessage = (event) => {
          if (event.data?.type === 'NOTICE_UPDATED') {
            fetchNotice();
          }
        };
      }
    } catch {
      // 미지원 브라우저 무시
    }

    return () => {
      isMounted = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(BROADCAST_EVENT_NAME, handleCustomEvent);
      if (bc) bc.close();
    };
  }, [fetchNotice, pollingIntervalMs]);

  /**
   * 결제 버튼 클릭 시점 최신 점검 여부 즉각 검증 (JIT check)
   * 캐시된 10초 대기 없이 서버에 즉시 1회 확인하여 점검이 방금 풀렸으면 결제를 즉시 통과시킴
   */
  const checkMaintenanceJIT = useCallback(async (): Promise<{ isMaintenance: boolean; notice: GlobalBroadcastNotice | null }> => {
    const latest = await fetchNotice();
    const isMaintenance = Boolean(latest?.isActive && latest?.isMaintenanceMode);
    return { isMaintenance, notice: latest };
  }, [fetchNotice]);

  const isMaintenance = Boolean(notice?.isActive && notice?.isMaintenanceMode);

  return {
    notice,
    isMaintenance,
    isLoading,
    refetch: fetchNotice,
    checkMaintenanceJIT,
  };
}
