import { ArrowLeft, Copy, Plus, RefreshCw } from 'lucide-react';
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
  agencyName?: string;
  pgCost?: number;
  platformMargin?: number;
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
  agencyName,
  pgCost,
  platformMargin,
}: PartnerAgentDetailViewProps) {
  const navigate = useNavigate();

  const currentRate = agentRates[selectedAgent.id] ?? (selectedAgent as any)?.agencyRate ?? (selectedAgent as any)?.agency_rate ?? editAgencyRate ?? 0;
  const prevRate = (selectedAgent as any)?.agencyRate ?? (selectedAgent as any)?.agency_rate ?? currentRate;
  const pgCost2 = pgCost ?? 1.5;
  const platformMargin2 = platformMargin ?? 0.5;
  const subAgentFloor = +(pgCost2 + platformMargin2 + currentRate).toFixed(2);

  // 영업자 관리 가맹점 목록 (실제 DB 정보 기반)
  const agentTenants = tenants.filter(t =>
    (t as any).registeredByPartnerId === selectedAgent.id ||
    (t as any).registeredByReferralCode === selectedAgent.referralCode ||
    (t as any).referralCode === selectedAgent.referralCode
  );

  const historyStorageKey = `soulpay:agent_history:${selectedAgent.id}`;
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(historyStorageKey);
      if (raw) return JSON.parse(raw);
    } catch {}

    const list: HistoryEntry[] = [];
    if (selectedAgent.createdAt) {
      list.push({
        id: `h-init`,
        timestamp: new Date(selectedAgent.createdAt).toLocaleString('ko-KR'),
        category: '영업자 계정 등록',
        beforeVal: '신규 등록',
        afterVal: `승인 완료 (추천코드 ${selectedAgent.referralCode || '-'})`,
        modifiedBy: '대리점 관리자',
      });
    }

    agentTenants.forEach((t, i) => {
      list.push({
        id: `h-tenant-${i}`,
        timestamp: t.createdAt ? new Date(t.createdAt).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR'),
        category: '가맹점 단체 유치',
        beforeVal: '—',
        afterVal: `신규 단체 [${t.name}] 유치 등록 완료`,
        modifiedBy: `${selectedAgent.name} (영업자)`,
      });
    });

    return list;
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 bg-slate-50 min-h-full font-sans w-full">
      {/* 상단 뒤로가기 & 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedAgent(null)}
            className="text-slate-500 hover:text-slate-900 -ml-2 h-8 px-2 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> 영업자 목록으로 돌아가기
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {selectedAgent.name} 영업자 상세
            </h1>
            <Badge variant="outline" className="font-mono text-xs border-slate-300 text-slate-700 bg-white font-semibold">
              추천코드: {selectedAgent.referralCode}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {agencyName ? <>소속 대리점: <strong className="text-slate-700 font-semibold">{agencyName}</strong> · </> : null}
            관리 가맹점: <strong className="text-slate-700 font-semibold">{agentTenants.length}개소</strong>
            {selectedAgent.email ? ` · ${selectedAgent.email}` : ''}
            {selectedAgent.phone ? ` · ${selectedAgent.phone}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3.5 text-xs font-semibold rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
            onClick={() => {
              navigator.clipboard.writeText(selectedAgent.referralCode);
              toast.success('영업자 추천코드가 복사되었습니다.');
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> 코드 복사
          </Button>
          <Button
            size="sm"
            className="h-9 px-4 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            onClick={() => navigate('/partner/tenants/new')}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> 신규 가맹단체 개설
          </Button>
        </div>
      </div>

      {/* 수수료 마진 & 베이스 수수료 설정 카드 */}
      <Card className="border-slate-200/90 rounded-2xl bg-white shadow-xs">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            대리점 수수료 마진 및 영업자 베이스 수수료 설정
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            대리점 수수료(나의 마진)를 조정하면, 영업자가 가맹점 유치 시 적용받는 최저 베이스 수수료(하한선)가 자동 산출됩니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 대리점 수수료율 인풋 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <Label className="text-xs font-bold text-slate-800 block">
                대리점 수수료율 (나의 수수료 마진)
              </Label>
              <p className="text-[11.5px] text-slate-500 leading-relaxed">
                {selectedAgent.name} 님이 유치한 가맹점 결제 실적에서 대리점이 취하는 고정 수수료율입니다.
              </p>
              <div className="flex items-center gap-2 pt-2">
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
                  className="w-32 text-right font-bold text-slate-900 font-mono h-10 text-base rounded-lg border-slate-300"
                />
                <span className="font-bold text-slate-600 text-sm">%</span>
              </div>
            </div>

            {/* 베이스 수수료 산출 결과 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">
                  {selectedAgent.name} 영업자 베이스 수수료 (하한선)
                </div>
                <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">
                  원가(PG {pgCost2}% + 플랫폼 {platformMargin2}%) + 대리점 수수료({currentRate}%) 합산 최저 기준선입니다.
                </p>
              </div>
              <div className="pt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-blue-600 tracking-tight">
                  {subAgentFloor}%
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  (가맹점 계약 시 이 요율 이상으로 체결해야 마진이 발생합니다)
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              disabled={savingAgentId === selectedAgent.id}
              onClick={async () => {
                setSavingAgentId(selectedAgent.id);
                try {
                  const res = await partnerAPI.updateAgentRate(selectedAgent.id, currentRate);
                  if (!res.success) {
                    toast.error(res.error ?? '수수료율 저장에 실패했습니다.');
                    return;
                  }
                  const savedRate = (res.data as any)?.agencyRate ?? (res.data as any)?.agency_rate ?? currentRate;
                  setAgentRates(prev => ({ ...prev, [selectedAgent.id]: savedRate }));

                  const newEntry: HistoryEntry = {
                    id: `h-${Date.now()}`,
                    timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
                    category: '수수료율 변경',
                    beforeVal: `대리점 ${prevRate}% (베이스 ${+(pgCost2 + platformMargin2 + prevRate).toFixed(2)}%)`,
                    afterVal: `대리점 ${savedRate}% (베이스 ${subAgentFloor}%)`,
                    modifiedBy: '대리점',
                  };
                  setHistory(prev => [newEntry, ...prev]);

                  toast.success(`[${selectedAgent.name}] 영업자의 대리점 수수료가 ${savedRate}% (베이스 ${subAgentFloor}%)로 저장되었습니다.`);
                } catch {
                  toast.error('저장 중 오류가 발생했습니다.');
                } finally {
                  setSavingAgentId(null);
                }
              }}
              className="h-10 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              {savingAgentId === selectedAgent.id ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> 저장 중...
                </>
              ) : (
                '수수료 설정 저장'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 관리 가맹 단체 목록 카드 */}
      <Card className="border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden">
        <CardHeader className="p-5 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              관리 가맹 단체 ({agentTenants.length}개소)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              {selectedAgent.name} 님이 유치하여 관리 중인 사찰 · 교회 가맹점 목록입니다.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {agentTenants.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <p className="font-medium text-slate-500">아직 이 영업자가 등록한 관리 단체가 없습니다.</p>
              <Button
                size="sm"
                variant="outline"
                className="text-xs rounded-xl border-slate-300 mt-1"
                onClick={() => navigate('/partner/tenants/new')}
              >
                + {selectedAgent.name} 명의로 단체 계정 신규 개설하기
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200/80">
                  <TableHead className="text-xs font-semibold text-slate-500 pl-6">구분</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">단체명</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">도메인 식별자</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">개설일</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">계약 수수료율</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-slate-500 pr-6">운영 상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentTenants.map(t => (
                  <TableRow key={t.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                    <TableCell className="text-xs text-slate-600 pl-6 font-medium">
                      {t.religionType === 'buddhist' ? '불교' : t.religionType === 'catholic' ? '천주교' : '기독교'}
                    </TableCell>
                    <TableCell className="font-bold text-xs text-slate-900">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">soulpay.kr/{t.slug}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {(t as any).appliedAt ? new Date((t as any).appliedAt).toLocaleDateString('ko-KR') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900 text-xs">
                      {(t as any).contractRate ?? 3.0}%
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <Badge
                        variant="outline"
                        className={
                          t.status === 'active'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 text-[10.5px] font-semibold'
                            : 'bg-slate-100 text-slate-600 border-slate-200 text-[10.5px]'
                        }
                      >
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

      {/* 정보 및 수수료 변경 이력 원장 카드 */}
      <Card className="border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden">
        <CardHeader className="p-5 pb-4 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            수수료 및 프로필 변경 이력
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            수수료율 변경, 프로필 수정 및 주요 가맹점 개설 내역 기록 원장입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200/80">
                <TableHead className="text-xs font-semibold text-slate-500 pl-6">일시</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">구분</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">변경 내용 (이전 ➔ 이후)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 pr-6">처리 담당</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(item => (
                <TableRow key={item.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                  <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap pl-6">{item.timestamp}</TableCell>
                  <TableCell className="text-xs font-bold">
                    <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-700 text-[10.5px]">
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    <span className="font-medium">{item.beforeVal}</span>
                    {item.beforeVal !== '—' && <span className="mx-1.5 text-slate-400 font-bold">➔</span>}
                    <span className="font-bold text-blue-700">{item.afterVal}</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium pr-6">{item.modifiedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
