import { ArrowLeft, Copy, Percent, RefreshCw, Building2, Plus, UserCircle, History } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Partner, partnerAPI } from '../../../api/client';
import { toast } from 'sonner';

interface PartnerAgentDetailViewProps {
  selectedAgent: Partner;
  setSelectedAgent: (agent: Partner | null) => void;
  agentRates: Record<string, number>;
  setAgentRates: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  editAgencyRate: number;
  savingAgentId: string | null;
  setSavingAgentId: (id: string | null) => void;
  tenants: any[];
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  category: string;
  beforeVal: string;
  afterVal: string;
  modifiedBy: string;
}

export function PartnerAgentDetailView({
  selectedAgent,
  setSelectedAgent,
  agentRates,
  setAgentRates,
  editAgencyRate,
  savingAgentId,
  setSavingAgentId,
  tenants,
}: PartnerAgentDetailViewProps) {
  const navigate = useNavigate();

  const currentRate = agentRates[selectedAgent.id] ?? editAgencyRate ?? 0.3;
  let pgCost2 = 1.5, platformMargin2 = 0.5;
  try {
    const pgs2 = JSON.parse(localStorage.getItem('faithpay:pg_rates') || '[]');
    if (pgs2.length > 0) pgCost2 = pgs2[0].rate ?? 1.5;
    const pm2 = parseFloat(localStorage.getItem('faithpay:platform_margin') || '');
    if (!isNaN(pm2)) platformMargin2 = pm2;
  } catch {}
  const subAgentFloor = +(pgCost2 + platformMargin2 + currentRate).toFixed(2);

  const agentTenants = tenants.filter(t =>
    (t as any).registeredByPartnerId === selectedAgent.id ||
    (t as any).registeredByReferralCode === selectedAgent.referralCode ||
    (t as any).referralCode === selectedAgent.referralCode
  );

  const historyStorageKey = `faithpay:agent_history:${selectedAgent.id}`;
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(historyStorageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'h-1',
        timestamp: '2026-08-03 12:00:00',
        category: '수수료율 지정',
        beforeVal: '대리점 0.5% (베이스 2.5%)',
        afterVal: `대리점 ${currentRate}% (베이스 ${subAgentFloor}%)`,
        modifiedBy: '한국불교문화원 (대리점)',
      },
      {
        id: 'h-2',
        timestamp: '2026-07-20 10:15:00',
        category: '가맹점 단체 유치',
        beforeVal: '—',
        afterVal: '신규 단체 [명성교회] 유치 등록 (3.0%)',
        modifiedBy: `${selectedAgent.name} (영업자)`,
      },
      {
        id: 'h-3',
        timestamp: '2026-07-01 09:00:00',
        category: '영업자 계정 승인',
        beforeVal: '승인 대기',
        afterVal: `승인 완료 (추천코드 ${selectedAgent.referralCode} 부여)`,
        modifiedBy: '시스템 관리자',
      },
    ];
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 상단 뒤로가기 바 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setSelectedAgent(null)} className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4 mr-2" /> 영업자 목록으로 돌아가기
        </Button>
        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
          💼 소속 영업자 상세 프로필 및 수수료 관리
        </span>
      </div>

      {/* 헤더 카드 */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50/80 via-white to-purple-50/50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
                {selectedAgent.name?.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[20px] font-bold text-slate-800">{selectedAgent.name} 영업자</h1>
                  <Badge className="bg-purple-600 text-white font-mono text-[11px]">
                    추천코드: {selectedAgent.referralCode}
                  </Badge>
                </div>
                <p className="text-[12.5px] text-slate-500 mt-1">
                  소속 대리점: <strong>한국불교문화원</strong> · 등록 가맹점: <strong>{agentTenants.length}개소</strong>
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
              onClick={() => {
                navigator.clipboard.writeText(selectedAgent.referralCode);
                toast.success('영업자 추천코드가 복사되었습니다.');
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> 코드 복사
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 대리점 수수료 마진 & 영업자 베이스 수수료 설정 */}
      <Card className="border-purple-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-purple-100">
          <CardTitle className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
            <Percent className="h-4 w-4 text-purple-600" /> [{selectedAgent.name}] 영업자 대리점 수수료 및 베이스 수수료 설정
          </CardTitle>
          <CardDescription className="text-[11.5px] text-slate-500">
            대리점 수수료(나의 수익)를 조정하면, 해당 영업자에게 부여되는 정산 베이스 수수료(하한선)가 자동 산출됩니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <Label className="text-xs font-bold text-slate-700 block mb-1">
                대리점 수수료율 (나의 수수료 마진)
              </Label>
              <p className="text-[11px] text-slate-500">
                {selectedAgent.name} 님이 유치한 가맹점 거래액에서 대리점이 취할 수수료율입니다.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Input
                type="number"
                step="0.05"
                min="0.1"
                max="3.0"
                value={currentRate}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setAgentRates(prev => ({ ...prev, [selectedAgent.id]: val }));
                }}
                className="w-28 text-right font-bold text-purple-900 font-mono h-10 text-base"
              />
              <span className="font-bold text-slate-700 text-sm">%</span>
            </div>
          </div>

          {/* 베이스 수수료 구성 안내 */}
          <div className="p-3.5 bg-white rounded-xl border border-purple-100 space-y-2">
            <div className="text-[11.5px] font-bold text-slate-800 flex items-center justify-between">
              <span>🎯 {selectedAgent.name} 님의 베이스 수수료 (하한선):</span>
              <span className="font-mono text-[14px] text-purple-800 font-bold bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                {subAgentFloor}%
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 mt-1">
              * {selectedAgent.name} 님이 가맹점과 계약할 때 <strong>{subAgentFloor}% 이상</strong>으로 체결해야 차액 마진 수익이 발생합니다.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              disabled={savingAgentId === selectedAgent.id}
              onClick={async () => {
                setSavingAgentId(selectedAgent.id);
                try {
                  await partnerAPI.updateAgentRate(selectedAgent.id, currentRate);
                  let savedMap: Record<string, number> = {};
                  try { savedMap = JSON.parse(localStorage.getItem('faithpay:agent_rates') || '{}'); } catch {}
                  const prevRate = savedMap[selectedAgent.id] ?? 0.3;
                  savedMap[selectedAgent.id] = currentRate;
                  localStorage.setItem('faithpay:agent_rates', JSON.stringify(savedMap));

                  // 수정 이력 추가 저장
                  const newEntry: HistoryEntry = {
                    id: `h-${Date.now()}`,
                    timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
                    category: '수수료율 변경',
                    beforeVal: `대리점 ${prevRate}% (베이스 ${+(pgCost2 + platformMargin2 + prevRate).toFixed(2)}%)`,
                    afterVal: `대리점 ${currentRate}% (베이스 ${subAgentFloor}%)`,
                    modifiedBy: '한국불교문화원 (대리점)',
                  };
                  const updatedHistory = [newEntry, ...history];
                  setHistory(updatedHistory);
                  localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));

                  toast.success(`[${selectedAgent.name}] 영업자의 베이스 수수료가 ${subAgentFloor}% (대리점 수수료 ${currentRate}%)로 저장되었습니다.`);
                } catch {
                  toast.error('저장 중 오류가 발생했습니다.');
                } finally {
                  setSavingAgentId(null);
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-6"
            >
              {savingAgentId === selectedAgent.id ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />저장 중...</> : '수수료율 및 베이스 수수료 저장'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 관리 단체 목록 */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" /> 관리 단체 목록 ({agentTenants.length}개소)
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">
              {selectedAgent.name} 님이 유치하여 관리 중인 사찰 · 교회 가맹점 목록입니다.
            </CardDescription>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs"
            onClick={() => navigate('/partner/tenants/new')}>
            <Plus className="h-3.5 w-3.5 mr-1" /> 신규 개설
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {agentTenants.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs space-y-2">
              <Building2 className="h-8 w-8 mx-auto text-slate-300" />
              <p className="font-medium text-slate-500">아직 이 영업자가 등록한 관리 단체가 없습니다.</p>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate('/partner/tenants/new')}>
                + {selectedAgent.name} 명의로 단체 계정 신규 개설하기
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-[11px]">종교</TableHead>
                  <TableHead className="text-[11px]">사찰/교회명</TableHead>
                  <TableHead className="text-[11px]">도메인</TableHead>
                  <TableHead className="text-[11px]">신청/개설일</TableHead>
                  <TableHead className="text-right text-[11px]">계약 수수료율</TableHead>
                  <TableHead className="text-center text-[11px]">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentTenants.map(t => (
                  <TableRow key={t.id} className="hover:bg-slate-50">
                    <TableCell className="text-[11px]">
                      {t.religionType === 'buddhist' ? '⛩️ 불교' : t.religionType === 'catholic' ? '✝️ 천주교' : '⛪ 기독교'}
                    </TableCell>
                    <TableCell className="font-bold text-[12.5px] text-slate-800">{t.name}</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">faithpay.kr/{t.slug}</TableCell>
                    <TableCell className="text-[11px] text-slate-400">
                      {(t as any).appliedAt ? new Date((t as any).appliedAt).toLocaleDateString('ko-KR') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-700 text-[12px]">
                      {(t as any).contractRate ?? 3.0}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                        {t.status === 'active' ? '운영중' : '승인대기'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 📜 정보 및 수수료 변경 이력 하단 원장 카드 */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="pb-3 bg-slate-50/80 border-b border-slate-200">
          <CardTitle className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
            <History className="h-4 w-4 text-purple-600" /> [{selectedAgent.name}] 영업자 정보 및 수수료 변경 이력
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5">
            수수료율 변경, 프로필 수정 및 주요 가맹점 개설 내역 실시간 기록원장입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-[11px]">변경일시</TableHead>
                <TableHead className="text-[11px]">구분 / 항목</TableHead>
                <TableHead className="text-[11px]">변경 내용 (변경 전 ➔ 변경 후)</TableHead>
                <TableHead className="text-[11px]">처리 담당자</TableHead>
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
