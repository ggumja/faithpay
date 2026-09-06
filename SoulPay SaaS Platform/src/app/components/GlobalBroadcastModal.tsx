import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Megaphone, X, Check, Bell, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

export default function GlobalBroadcastModal({ onClose }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noticeType, setNoticeType] = useState<'info' | 'warning' | 'urgent'>('info');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const handleSendNotice = () => {
    if (!title || !content) {
      toast.error('제목과 내용을 입력해주세요');
      return;
    }

    toast.success(`[전체 공지 등록 완료]\n모든 사찰/교회 관리자 대시보드 상단에 전송되었습니다.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8 border">
        
        {/* Header */}
        <div className="bg-purple-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-amber-300" />
            <h3 className="font-bold text-base">전체 사찰/교회 공지 & 점검 브로드캐스트</h3>
          </div>
          <Button size="sm" variant="ghost" className="text-white hover:bg-purple-800" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Notice Type Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700">공지 유형</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNoticeType('info')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  noticeType === 'info' 
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40' 
                    : 'bg-gray-50 border-gray-200 text-gray-600'
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
                    : 'bg-gray-50 border-gray-200 text-gray-600'
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
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                🚨 긴급 점검
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700">공지 제목</Label>
            <Input
              placeholder="예: [안내] 2026년 국세청 기부금 영수증 서식 업데이트 안내"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700">공지 내용</Label>
            <Textarea
              rows={4}
              placeholder="모든 사찰/교회 관리자 대시보드 상단에 게재될 상세 공지 내용을 작성해주세요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Maintenance Mode Toggle */}
          <div className="p-3.5 bg-slate-100 dark:bg-zinc-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold block">결제 시스템 일시 점검 모드</span>
              <span className="text-[11px] text-slate-500">활성화 시 신도 결제 페이지에 점검 안내 팝업이 노출됩니다.</span>
            </div>
            <input 
              type="checkbox" 
              checked={isMaintenanceMode}
              onChange={(e) => setIsMaintenanceMode(e.target.checked)}
              className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-zinc-800/50 px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white font-bold" onClick={handleSendNotice}>
            전체 관리자에 전송
          </Button>
        </div>

      </div>
    </div>
  );
}
