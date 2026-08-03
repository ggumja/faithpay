import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Partner, partnerAPI } from '../../../api/client';
import { toast } from 'sonner';

interface PartnerMyInfoSectionProps {
  partner: Partner;
  editPhone: string;
  setEditPhone: (v: string) => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  editBank: string;
  setEditBank: (v: string) => void;
  editAccount: string;
  setEditAccount: (v: string) => void;
  editHolder: string;
  setEditHolder: (v: string) => void;
  editAgencyRate: number;
  setEditAgencyRate: (v: number) => void;
  subAgents: Partner[];
  setAgentRates: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export function PartnerMyInfoSection({
  partner,
  editPhone,
  setEditPhone,
  editEmail,
  setEditEmail,
  editBank,
  setEditBank,
  editAccount,
  setEditAccount,
  editHolder,
  setEditHolder,
  editAgencyRate,
  setEditAgencyRate,
  subAgents,
  setAgentRates,
}: PartnerMyInfoSectionProps) {
  const [isSaving, setIsSaving] = useState(false);
  const isAgency = partner.role === 'master_agency';

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-[18px] font-bold text-slate-800">
          {isAgency ? '대리점 정보 및 기본 수수료 설정' : '내 정보 수정'}
        </h1>
        <p className="text-[12.5px] text-slate-500 mt-0.5">정산 계좌 정보 및 기본 수수료 설정을 관리합니다.</p>
      </div>

      {/* 대리점 전용 기본 수수료율 설정 카드 */}
      {isAgency && (
        <Card className="border-purple-200 bg-purple-50/40">
          <CardHeader className="pb-3 border-b border-purple-100">
            <CardTitle className="text-[14px] font-bold text-purple-950">
              대리점 기본 수수료율 설정 (내 수수료 %)
            </CardTitle>
            <CardDescription className="text-[11.5px] text-purple-800">
              소속 영업자 등록 시 기본으로 부여되는 대리점 마진율입니다. (영업자 관리 탭에서 영업자별로 개별 변경 가능)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-[13px] font-bold text-purple-900">기본 대리점 마진율</Label>
                <p className="text-[11px] text-slate-500 mt-0.5">신규 영업자 체결 시 기본 적용 수수료율</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="3"
                  value={editAgencyRate}
                  onChange={e => setEditAgencyRate(parseFloat(e.target.value) || 0)}
                  className="w-24 h-9 text-right font-bold text-[14px] text-purple-900 bg-white border-purple-300"
                />
                <span className="text-[14px] font-bold text-purple-950">%</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                onClick={async () => {
                  try {
                    // DB API 호출 (Single Source of Truth)
                    const res = await partnerAPI.updateAgentRate(partner.id, editAgencyRate);
                    if (res.success) {
                      setAgentRates(prev => {
                        const next = { ...prev };
                        subAgents.forEach(a => {
                          if (next[a.id] === undefined) next[a.id] = editAgencyRate;
                        });
                        return next;
                      });
                      toast.success(`대리점 기본 수수료율이 ${editAgencyRate}%로 DB에 저장되었습니다.`);
                    } else {
                      toast.error(res.error || '수수료율 DB 저장에 실패했습니다.');
                    }
                  } catch {
                    toast.error('수수료율 저장 중 오류가 발생했습니다.');
                  }
                }}
              >
                기본 수수료율 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 기본 연락처 및 정산 계좌 정보 수정 카드 */}
      <Card className="border-slate-200">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">휴대폰 번호</Label>
            <Input
              value={editPhone}
              onChange={e => setEditPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-600">이메일 주소</Label>
            <Input
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              placeholder="email@domain.com"
              className="text-xs h-9"
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-xs font-bold text-slate-700">PG 수수료 자동 정산 계좌 정보</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">정산 은행</Label>
                <Input
                  value={editBank}
                  onChange={e => setEditBank(e.target.value)}
                  placeholder="예: 신한은행"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">예금주</Label>
                <Input
                  value={editHolder}
                  onChange={e => setEditHolder(e.target.value)}
                  placeholder="예금주명"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-600">계좌 번호</Label>
              <Input
                value={editAccount}
                onChange={e => setEditAccount(e.target.value)}
                placeholder="숫자만 입력"
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold h-9"
              disabled={isSaving}
              onClick={async () => {
                setIsSaving(true);
                try {
                  const res = await partnerAPI.updateProfile(partner.id, {
                    phone: editPhone,
                    email: editEmail,
                    bankName: editBank,
                    accountNumber: editAccount,
                    accountHolder: editHolder,
                  });
                  if (res.success) {
                    toast.success('정산 계좌 및 연락처 정보가 업데이트되었습니다.');
                  } else {
                    toast.error('저장에 실패했습니다.');
                  }
                } catch {
                  toast.error('오류가 발생했습니다.');
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {isSaving ? '저장 중...' : '변경사항 저장'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
