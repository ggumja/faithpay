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

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <p className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>사업자 유형 및 PG 수수료 정산계좌 설정</span>
              <span className="text-[10.5px] font-normal text-slate-500">사업자 유형에 따라 세무 서식이 자동 지정됩니다</span>
            </p>

            {/* 사업자 유형 선택 (법인/일반 vs 개인/프리랜서) */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
              <Label className="text-xs font-bold text-slate-700">사업자 유형 <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => localStorage.setItem(`faithpay:partner_type:${partner.id}`, 'CORPORATE')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    (localStorage.getItem(`faithpay:partner_type:${partner.id}`) || 'CORPORATE') === 'CORPORATE'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🏢 법인 / 일반과세 사업자 (세금계산서)
                </button>
                <button
                  type="button"
                  onClick={() => localStorage.setItem(`faithpay:partner_type:${partner.id}`, 'INDIVIDUAL')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    localStorage.getItem(`faithpay:partner_type:${partner.id}`) === 'INDIVIDUAL'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  👤 개인 / 프리랜서 (3.3% 원천징수)
                </button>
              </div>
            </div>

            {/* 법인 / 일반사업자 전용 세부 입력 필드 */}
            {(localStorage.getItem(`faithpay:partner_type:${partner.id}`) || 'CORPORATE') === 'CORPORATE' ? (
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-3">
                <div className="text-[11px] font-bold text-blue-900 flex items-center justify-between">
                  <span>🏢 법인 / 사업자 세무 정보 입력</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                    전자세금계산서 (VAT 10%)
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">상호 (법인명)</Label>
                    <Input
                      defaultValue={partner.name}
                      placeholder="예: 주식회사 엠앤에스"
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">사업자 등록번호</Label>
                    <Input
                      defaultValue="107-88-39201"
                      placeholder="123-45-67890"
                      className="text-xs h-9 bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">대표자 성명</Label>
                    <Input
                      defaultValue="김대표"
                      placeholder="대표자 이름"
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">전자세금계산서 수신 이메일</Label>
                    <Input
                      defaultValue={partner.email || 'tax@partner.com'}
                      placeholder="tax@domain.com"
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* 개인 / 프리랜서 전용 세부 입력 필드 */
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-3">
                <div className="text-[11px] font-bold text-emerald-900 flex items-center justify-between">
                  <span>👤 개인 / 프리랜서 세무 정보 입력</span>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                    3.3% 원천징수 공제
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">개인 성명 (실명)</Label>
                    <Input
                      defaultValue={partner.name}
                      placeholder="본인 실명"
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">주민등록번호 (원천징수 신고용)</Label>
                    <Input
                      defaultValue="920110-1******"
                      placeholder="주민번호 13자리 입력"
                      className="text-xs h-9 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">정산 수령 은행</Label>
                <Input
                  value={editBank}
                  onChange={e => setEditBank(e.target.value)}
                  placeholder="예: 신한은행, 국민은행"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600">예금주명 (명의 일치 필수)</Label>
                <Input
                  value={editHolder}
                  onChange={e => setEditHolder(e.target.value)}
                  placeholder="사업자명 또는 성명과 일치"
                  className="text-xs h-9 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-600">입금 계좌번호</Label>
              <Input
                value={editAccount}
                onChange={e => setEditAccount(e.target.value)}
                placeholder="숫자 및 하이픈(-)"
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
