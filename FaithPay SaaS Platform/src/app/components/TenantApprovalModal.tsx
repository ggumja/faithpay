import React, { useState } from 'react';
import { Tenant } from '../context/AppContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  CheckCircle2, 
  X, 
  Key, 
  Mail, 
  Phone, 
  Building, 
  FileText,
  Send,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  tenant: Tenant;
  onApprove: (tenantId: string, tempPassword: string) => void;
  onReject: (tenantId: string) => void;
  onClose: () => void;
}

export default function TenantApprovalModal({ tenant, onApprove, onReject, onClose }: Props) {
  // 임시 비밀번호 자동 생성 (알파벳+숫자 8자리)
  const [tempPassword, setTempPassword] = useState(() => 
    `fp${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [sendSMS, setSendSMS] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmApprove = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onApprove(tenant.id, tempPassword);
      toast.success(
        `[${tenant.name}] 입점 승인 완료!\n임시 비밀번호(${tempPassword})가 ${sendSMS ? 'SMS 및 ' : ''}${sendEmail ? '이메일로 ' : ''}발송되었습니다.`
      );
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8 border">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-emerald-400" />
            <h3 className="font-bold text-base">사찰/교회 입점 심사 및 승인</h3>
          </div>
          <Button size="sm" variant="ghost" className="text-white hover:bg-slate-800" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Organization Info Ticket */}
          <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-200">
                  {tenant.religionType === 'buddhist' || tenant.religionType === 'buddhism' ? '불교 (사찰)' : tenant.religionType === 'protestant' ? '기독교 (교회)' : '천주교 (성당)'}
                </span>
                <h4 className="font-extrabold text-lg mt-1">{tenant.name}</h4>
              </div>
              <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 font-bold">
                정상 승인 완료
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-zinc-300 pt-2 border-t border-slate-200 dark:border-zinc-700">
              <div><strong>도메인 주소:</strong> /{tenant.slug}</div>
              <div><strong>고유번호증 번호:</strong> {tenant.uniqueNumber || tenant.businessInfo?.uniqueNumber || '미등록'}</div>
              <div><strong>사업자등록번호:</strong> {tenant.businessRegistrationNumber || tenant.businessInfo?.registrationNumber || '미등록 (비영리)'}</div>
              <div><strong>대표 관리자:</strong> {tenant.contact?.name || `${tenant.name} 대표 관리자`}</div>
              <div><strong>연락처:</strong> {tenant.contact?.phone || '-'}</div>
            </div>
          </div>

          {/* Auto Generated Password Section */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              발급될 관리자 임시 비밀번호
            </Label>
            <div className="flex gap-2">
              <Input
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="font-mono font-bold text-center text-lg bg-amber-50/50 border-amber-300 text-amber-900"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs whitespace-nowrap"
                onClick={() => setTempPassword(`fp${Math.floor(100000 + Math.random() * 900000)}`)}
              >
                재생성
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              * 승인 완료 시 위 비밀번호로 관리자 로그인(`/{tenant.slug}/admin/login`)이 가능해집니다.
            </p>
          </div>

          {/* Notification Channel Options */}
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-xl space-y-2">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <Send className="w-3.5 h-3.5" /> 승인 즉시 자동 안내 발송 채널 선택
            </span>
            <div className="flex gap-4 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={sendSMS} 
                  onChange={(e) => setSendSMS(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Phone className="w-3.5 h-3.5 text-slate-500" /> 알림톡 / SMS 발송
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={sendEmail} 
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Mail className="w-3.5 h-3.5 text-slate-500" /> 이메일 발송
              </label>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 dark:bg-zinc-800/50 px-6 py-4 border-t flex justify-between items-center">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => {
              onReject(tenant.id);
              toast.error(`[${tenant.name}] 입점 신청이 반려되었습니다.`);
              onClose();
            }}
          >
            입점 반려
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
            <Button 
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              disabled={isSubmitting}
              onClick={handleConfirmApprove}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> 승인 & 비밀번호 발송
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
