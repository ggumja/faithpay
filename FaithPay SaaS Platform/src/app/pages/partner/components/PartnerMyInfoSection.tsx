import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { History } from 'lucide-react';
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

interface MyInfoHistoryEntry {
  id: string;
  timestamp: string;
  category: string;
  beforeVal: string;
  afterVal: string;
  modifiedBy: string;
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

  const historyStorageKey = `faithpay:myinfo_history:${partner.id}`;
  const [history, setHistory] = useState<MyInfoHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(historyStorageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'mh-1',
        timestamp: '2026-08-03 11:30:00',
        category: '정산 계좌 정보',
        beforeVal: '계좌 미등록',
        afterVal: `${editBank || '신한은행'} ${editAccount || '110-123-456789'} (예금주: ${editHolder || partner.name})`,
        modifiedBy: `${partner.name} (${isAgency ? '대리점' : '영업자'})`,
      },
      {
        id: 'mh-2',
        timestamp: '2026-07-01 09:00:00',
        category: '프로필 생성',
        beforeVal: '신규 신청',
        afterVal: `연락처: ${editPhone || '010-9876-5432'} · 이메일: ${editEmail || partner.email}`,
        modifiedBy: '시스템 관리자',
      },
    ];
  });

  return (
    <div className="space-y-5 max-w-2xl">
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

                      // 이력 기록
                      const newEntry: MyInfoHistoryEntry = {
                        id: `mh-${Date.now()}`,
                        timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
                        category: '기본 수수료율 저장',
                        beforeVal: '이전 요율',
                        afterVal: `대리점 기본 마진율 ${editAgencyRate}%`,
                        modifiedBy: `${partner.name} (대리점)`,
                      };
                      const updated = [newEntry, ...history];
                      setHistory(updated);
                      localStorage.setItem(historyStorageKey, JSON.stringify(updated));

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
                    // 정보 수정 이력 기록
                    const newEntry: MyInfoHistoryEntry = {
                      id: `mh-${Date.now()}`,
                      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
                      category: '정산계좌 및 프로필 수정',
                      beforeVal: `${partner.bankName || '기존은행'} ${partner.accountNumber || ''}`,
                      afterVal: `${editBank} ${editAccount} (예금주: ${editHolder}) · 연락처: ${editPhone}`,
                      modifiedBy: `${partner.name} (${isAgency ? '대리점' : '영업자'})`,
                    };
                    const updated = [newEntry, ...history];
                    setHistory(updated);
                    localStorage.setItem(historyStorageKey, JSON.stringify(updated));

                    toast.success('정산 계좌 및 연락처 정보가 업데이트되었으며 수정 이력이 기록되었습니다.');
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

      {/* 📜 내 정보 변경 및 저장 이력 하단 카드 */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="pb-3 bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
            <History className="h-4 w-4 text-purple-600" /> 프로필 및 정산 계좌 정보 수정 이력
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5">
            내 정보 수정 및 정산 계좌 변경 시 실시간으로 기록되는 보안 원장입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-[11px]">변경일시</TableHead>
                <TableHead className="text-[11px]">구분</TableHead>
                <TableHead className="text-[11px]">변경 내용 (변경 전 ➔ 변경 후)</TableHead>
                <TableHead className="text-[11px]">수정 담당자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(item => (
                <TableRow key={item.id} className="hover:bg-slate-50">
                  <TableCell className="font-mono text-[11px] text-slate-500 whitespace-nowrap">{item.timestamp}</TableCell>
                  <TableCell className="text-[11px] font-bold">
                    <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-[10px]">
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[11px] text-slate-700">
                    <span className="font-medium">{item.beforeVal}</span>
                    {item.beforeVal !== '—' && <span className="mx-1.5 text-slate-400 font-bold">➔</span>}
                    <span className="font-bold text-purple-800">{item.afterVal}</span>
                  </TableCell>
                  <TableCell className="text-[11px] text-slate-500 font-medium">{item.modifiedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
