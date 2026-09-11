import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Megaphone, X, Bell, AlertTriangle, CheckCircle2, Trash2, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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

interface Props {
  onClose: () => void;
}

export default function GlobalBroadcastModal({ onClose }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noticeType, setNoticeType] = useState<'info' | 'warning' | 'urgent'>('info');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const [activeNotice, setActiveNotice] = useState<GlobalBroadcastNotice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 기존 등록된 활성 공지 실측 조회
  useEffect(() => {
    let isMounted = true;
    async function loadCurrentNotice() {
      setIsLoading(true);
      try {
        const res = await settingsAPI.get('global_broadcast_notice');
        if (res.success && res.data) {
          const raw = res.data;
          const noticeData: GlobalBroadcastNotice = (raw.value && typeof raw.value === 'object') ? raw.value : raw;
          if (isMounted && noticeData && noticeData.isActive) {
            setActiveNotice(noticeData);
            setTitle(noticeData.title || '');
            setContent(noticeData.content || '');
            setNoticeType(noticeData.noticeType || 'info');
            setIsMaintenanceMode(!!noticeData.isMaintenanceMode);
          }
        }
      } catch (err) {
        console.warn('Failed to load global broadcast notice:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadCurrentNotice();
    return () => { isMounted = false; };
  }, []);

  // 공지 발송 (DB 실측 저장)
  const handleSendNotice = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: GlobalBroadcastNotice = {
        id: `notice-${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        noticeType,
        isMaintenanceMode,
        createdAt: new Date().toISOString(),
        createdBy: '시스템 최고 관리자',
        isActive: true,
      };

      const res = await settingsAPI.set('global_broadcast_notice', payload);
      if (res.success) {
        toast.success('[전체 공지 등록 완료]\n모든 단체 관리자 대시보드 상단에 실시간 게재되었습니다.');
        onClose();
      } else {
        toast.error(res.error || '공지 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err: any) {
      toast.error('서버 통신 오류로 공지를 등록하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 공지 종료 (내리기)
  const handleDismissNotice = async () => {
    if (!confirm('현재 게재 중인 전체 공지를 종료하고 정상 상태로 복구하시겠습니까?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: GlobalBroadcastNotice = {
        ...(activeNotice || {
          id: `notice-dismissed`,
          title: '',
          content: '',
          noticeType: 'info',
          isMaintenanceMode: false,
          createdAt: new Date().toISOString(),
          createdBy: '시스템 관리자',
        }),
        isActive: false,
        isMaintenanceMode: false,
      };

      const res = await settingsAPI.set('global_broadcast_notice', payload);
      if (res.success) {
        toast.success('전체 공지 및 점검 모드가 성공적으로 종료되었습니다.');
        setActiveNotice(null);
        setTitle('');
        setContent('');
        setIsMaintenanceMode(false);
        onClose();
      } else {
        toast.error('공지 종료 처리에 실패했습니다.');
      }
    } catch {
      toast.error('오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8 border">
        
        {/* Header */}
        <div className="bg-purple-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-base">전체 사찰/교회 공지 & 점검 브로드캐스트</h3>
              <p className="text-[11px] text-purple-200">플랫폼 전체 가맹 단체 및 신도 결제 화면 실시간 알림 제어</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-white hover:bg-purple-800" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <p className="text-xs">현재 공지 상태를 확인하는 중입니다...</p>
            </div>
          ) : (
            <>
              {/* Active Notice Alert Banner */}
              {activeNotice && activeNotice.isActive && (
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-start justify-between gap-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>현재 실시간 게재 중인 공지가 있습니다</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-1">
                      제목: {activeNotice.title}
                    </p>
                    {activeNotice.isMaintenanceMode && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                        🚨 결제 점검 모드 작동 중
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDismissNotice}
                    disabled={isSubmitting}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 shrink-0 h-8 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    공지 내리기
                  </Button>
                </div>
              )}

              {/* Notice Type Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">공지 유형</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoticeType('info')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      noticeType === 'info' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40' 
                        : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-zinc-800 dark:border-zinc-700'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" /> 일반 안내
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeType('warning')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      noticeType === 'warning' 
                        ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/40' 
                        : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-zinc-800 dark:border-zinc-700'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> PG/서식 업데이트
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeType('urgent')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      noticeType === 'urgent' 
                        ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/40' 
                        : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-zinc-800 dark:border-zinc-700'
                    }`}
                  >
                    🚨 긴급 점검
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">공지 제목</Label>
                <Input
                  placeholder="예: [안내] 2026년 국세청 기부금 영수증 서식 업데이트 안내"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">공지 내용</Label>
                <Textarea
                  rows={4}
                  placeholder="모든 사찰/교회 관리자 대시보드 상단에 게재될 상세 공지 내용을 작성해주세요."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="text-xs leading-relaxed"
                />
              </div>

              {/* Maintenance Mode Toggle */}
              <div className="p-3.5 bg-slate-100 dark:bg-zinc-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold block text-slate-900 dark:text-zinc-100">결제 시스템 일시 점검 모드</span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                    활성화 시 신도 결제 페이지에 점검 안내 팝업이 노출되며 결제가 일시 정지됩니다.
                  </span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isMaintenanceMode}
                  onChange={(e) => setIsMaintenanceMode(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                />
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-zinc-800/50 px-6 py-4 border-t flex justify-between items-center">
          <div>
            {activeNotice && activeNotice.isActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDismissNotice}
                disabled={isSubmitting}
                className="text-xs text-rose-600 hover:bg-rose-50"
              >
                공지 내리기
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button
              size="sm"
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer"
              onClick={handleSendNotice}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {activeNotice?.isActive ? '공지 업데이트 및 전송' : '전체 관리자에 전송'}
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

