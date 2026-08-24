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

  // 사업자 유형 — 단일 변수로 통일 (배지 + 세무 폼 분기 공유)
  const businessType: string =
    (partner as any).businessType ||
    localStorage.getItem(`soulpay:partner_type:${partner.id}`) ||
    localStorage.getItem(`faithpay:partner_type:${partner.id}`) ||
    'CORPORATE';
  const isCorporate = businessType !== 'INDIVIDUAL' && businessType !== 'freelancer';

  // 법인 세무 필드
  const [editCorpName,  setEditCorpName]  = useState((partner as any).corpName  || partner.name || '');
  const [editCorpReg,   setEditCorpReg]   = useState((partner as any).corpRegNo || '107-88-39201');
  const [editCeoName,   setEditCeoName]   = useState((partner as any).ceoName   || '');
  const [editTaxEmail,  setEditTaxEmail]  = useState((partner as any).taxEmail  || partner.email || '');
  // 개인/프리랜서 세무 필드
  const [editRealName,  setEditRealName]  = useState((partner as any).realName  || partner.name || '');
  const [editResNo,     setEditResNo]     = useState((partner as any).resNo     || '920110-1******');

  const historyStorageKey = `soulpay:myinfo_history:${partner.id}`;
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
    <div className="p-6 space-y-5 bg-[var(--hm-paper-2)] dark:bg-zinc-950 min-h-full">
      <div>
        <h1 className="text-[18px] font-bold text-[var(--hm-ink)]">
          {isAgency ? '대리점 정보 및 기본 수수료 설정' : '내 정보 수정'}
        </h1>
        <p className="text-[12.5px] text-[var(--hm-ink-3)] mt-0.5">정산 계좌 정보 및 기본 수수료 설정을 관리합니다.</p>
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

            {/* 사업자 유형 — 등록 시 확정, 읽기 전용 */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">사업자 유형</Label>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  🔒 등록 시 확정 · 변경 불가
                </span>
              </div>
              <div className="pt-1">
                {(() => {
                  if (!isCorporate) {
                    return (
                      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="text-lg">👤</span>
                        <div>
                          <div className="text-[12.5px] font-bold text-emerald-900">개인 / 프리랜서</div>
                          <div className="text-[10.5px] text-emerald-700 mt-0.5">3.3% 사업소득세 원천징수 후 지급 → 원천징수 영수증 발행</div>
                        </div>
                        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-600 text-white">
                          원천징수
                        </span>
                      </div>
                    );
                  }
                  if (businessType === 'individual_business') {
                    return (
                      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200">
                        <span className="text-lg">🏬</span>
                        <div>
                          <div className="text-[12.5px] font-bold text-green-900">일반과세자 (개인사업자)</div>
                          <div className="text-[10.5px] text-green-700 mt-0.5">부가가치세 10% 포함 전자세금계산서 발행</div>
                        </div>
                        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-green-600 text-white">
                          세금계산서
                        </span>
                      </div>
                    );
                  }
                  // CORPORATE / corporation (기본값)
                  return (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200">
                      <span className="text-lg">🏢</span>
                      <div>
                        <div className="text-[12.5px] font-bold text-blue-900">법인사업자</div>
                        <div className="text-[10.5px] text-blue-700 mt-0.5">부가가치세 10% 포함 전자세금계산서 발행</div>
                      </div>
                      <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-blue-600 text-white">
                        세금계산서
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>


            {/* 법인 / 일반사업자 전용 세부 입력 필드 */}
            {isCorporate ? (
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
                    <Input value={editCorpName} onChange={e => setEditCorpName(e.target.value)}
                      placeholder="예: 주식회사 엠앤에스" className="text-xs h-9 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">사업자 등록번호</Label>
                    <Input value={editCorpReg} onChange={e => setEditCorpReg(e.target.value)}
                      placeholder="123-45-67890" className="text-xs h-9 bg-white font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">대표자 성명</Label>
                    <Input value={editCeoName} onChange={e => setEditCeoName(e.target.value)}
                      placeholder="대표자 이름" className="text-xs h-9 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">전자세금계산서 수신 이메일</Label>
                    <Input value={editTaxEmail} onChange={e => setEditTaxEmail(e.target.value)}
                      placeholder="tax@domain.com" className="text-xs h-9 bg-white" />
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
                    <Input value={editRealName} onChange={e => setEditRealName(e.target.value)}
                      placeholder="본인 실명" className="text-xs h-9 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">주민등록번호 (원천징수 신고용)</Label>
                    <Input value={editResNo} onChange={e => setEditResNo(e.target.value)}
                      placeholder="주민번호 13자리 입력" className="text-xs h-9 bg-white font-mono" />
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
                  const taxFields = isCorporate
                    ? { corpName: editCorpName, corpRegNo: editCorpReg, ceoName: editCeoName, taxEmail: editTaxEmail }
                    : { realName: editRealName, resNo: editResNo };
                  const res = await partnerAPI.updateProfile(partner.id, {
                    phone: editPhone,
                    email: editEmail,
                    bankName: editBank,
                    accountNumber: editAccount,
                    accountHolder: editHolder,
                    ...taxFields,
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
