import { useState } from 'react';
import { Users, Copy, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Partner } from '../../../api/client';
import { PartnerAgentDetailView } from './PartnerAgentDetailView';
import { toast } from 'sonner';

interface PartnerAgentsSectionProps {
  partner: Partner;
  subAgents: Partner[];
  agentRates: Record<string, number>;
  setAgentRates: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  editAgencyRate: number;
  savingAgentId: string | null;
  setSavingAgentId: (id: string | null) => void;
  selectedAgent: Partner | null;
  setSelectedAgent: (agent: Partner | null) => void;
  tenants: any[];
}

export function PartnerAgentsSection({
  partner,
  subAgents,
  agentRates,
  setAgentRates,
  editAgencyRate,
  savingAgentId,
  setSavingAgentId,
  selectedAgent,
  setSelectedAgent,
  tenants,
}: PartnerAgentsSectionProps) {
  const [agentSubTab, setAgentSubTab] = useState<'list' | 'overriding'>('list');

  if (selectedAgent) {
    return (
      <PartnerAgentDetailView
        selectedAgent={selectedAgent}
        setSelectedAgent={setSelectedAgent}
        agentRates={agentRates}
        setAgentRates={setAgentRates}
        editAgencyRate={editAgencyRate}
        savingAgentId={savingAgentId}
        setSavingAgentId={setSavingAgentId}
        tenants={tenants}
      />
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* 상단 헤더 & 초대 버튼 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-bold text-slate-800">영업자 관리</h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5">소속 영업자 관리 및 영업자별 오버라이딩 마진 집계</p>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-xs shrink-0"
          onClick={() => {
            const link = `${window.location.origin}/partner/apply?ref=${partner.referralCode}`;
            navigator.clipboard.writeText(link);
            toast.success('영업자 초대 링크가 복사되었습니다!');
          }}
        >
          <Copy className="h-3.5 w-3.5 mr-1.5" /> 영업자 초대 링크 복사
        </Button>
      </div>

      {/* 서브 탭 메뉴 (소속 영업자 목록 / 영업자별 오버라이딩 마진 집계) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setAgentSubTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold border-b-2 transition-colors cursor-pointer bg-transparent border-0 ${
            agentSubTab === 'list'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" /> 소속 영업자 목록 ({subAgents.length}명)
        </button>
        <button
          onClick={() => setAgentSubTab('overriding')}
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold border-b-2 transition-colors cursor-pointer bg-transparent border-0 ${
            agentSubTab === 'overriding'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trophy className="h-4 w-4 text-purple-600" /> 영업자별 오버라이딩 마진 집계
        </button>
      </div>

      {/* 서브 탭 1: 소속 영업자 목록 */}
      {agentSubTab === 'list' && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-[14px] font-bold text-slate-800">소속 영업자 목록 ({subAgents.length}명)</CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                영업자를 클릭하면 상세정보, 수수료 설정 및 관리 단체 목록으로 이동합니다.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {subAgents.length === 0 ? (
              <div className="py-14 text-center">
                <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">소속 영업자가 없습니다</p>
                <p className="text-[12px] text-slate-400 mt-1">초대 링크를 공유하여 영업자를 등록하세요.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 text-xs"
                  onClick={() => {
                    const link = `${window.location.origin}/partner/apply?ref=${partner.referralCode}`;
                    navigator.clipboard.writeText(link);
                    toast.success('초대 링크가 복사되었습니다!');
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> 초대 링크 복사
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {subAgents.map(agent => {
                  const rate = agentRates[agent.id] ?? editAgencyRate ?? 0.3;
                  let pgCost2 = 1.5, platformMargin2 = 0.5;
                  try {
                    const pgs2 = JSON.parse(localStorage.getItem('faithpay:pg_rates') || '[]');
                    if (pgs2.length > 0) pgCost2 = pgs2[0].rate ?? 1.5;
                    const pm2 = parseFloat(localStorage.getItem('faithpay:platform_margin') || '');
                    if (!isNaN(pm2)) platformMargin2 = pm2;
                  } catch {}
                  const subAgentFloor = +(pgCost2 + platformMargin2 + rate).toFixed(2);
                  const isActive = agent.status === 'active';

                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className="p-4 flex items-center justify-between hover:bg-purple-50/30 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                            isActive ? 'bg-purple-100 border-purple-200 text-purple-800' : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          <span className="font-bold text-base">{agent.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 text-[14px] group-hover:text-purple-700 transition-colors">
                              {agent.name}
                            </p>
                            <Badge
                              className={`text-[9.5px] px-1.5 py-0 ${
                                isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                              }`}
                            >
                              {isActive ? '활성' : '대기/정지'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            {agent.referralCode} {agent.email && ` · ${agent.email}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <div className="text-[11px] text-slate-400">대리점 수수료 / 영업자 베이스</div>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <span className="text-[12px] font-bold text-purple-700">대리점 {rate}%</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[12px] font-bold text-slate-700">베이스 {subAgentFloor}%</span>
                          </div>
                        </div>

                        <Button size="sm" className="bg-purple-600 group-hover:bg-purple-700 text-white font-bold text-xs px-3 shrink-0 shadow-2xs">
                          상세정보 보기 ➔
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 서브 탭 2: 영업자별 오버라이딩 마진 집계 */}
      {agentSubTab === 'overriding' && (
        <div className="space-y-5">
          {/* 요약 KPI */}
          {(() => {
            const agencyOverridingMargin = subAgents.reduce((s, a) => {
              if (a.status !== 'active') return s;
              const mockMonthly = (a as any).monthlyAmount ?? 5000000;
              const aRate = agentRates[a.id] ?? (a as any).agencyRate ?? 0.5;
              return s + Math.round(mockMonthly * aRate / 100);
            }, 0);

            return (
              <>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: '총 소속 영업자', value: `${subAgents.length}명`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: '활성 영업자', value: `${subAgents.filter(a => a.status === 'active').length}명`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: '대기/정지', value: `${subAgents.filter(a => a.status !== 'active').length}명`, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: '당월 대리점 마진 합계', value: `${agencyOverridingMargin.toLocaleString()}원`, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map(({ label, value, color, bg }) => (
                    <Card key={label} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                          <Users className={`h-3.5 w-3.5 ${color}`} />
                        </div>
                        <div className={`text-[18px] font-bold leading-none ${color}`}>{value}</div>
                        <div className="text-[10.5px] text-slate-400 mt-1">{label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* 오버라이딩 마진 집계 테이블 */}
                <Card className="border-purple-100">
                  <CardHeader className="pb-3 bg-purple-50/50 border-b border-purple-100">
                    <div>
                      <CardTitle className="text-[13.5px] font-bold text-purple-900 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-purple-600" /> 영업자별 오버라이딩 마진 집계
                      </CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">
                        소속 영업자의 결제 실적에 영업자별 지정 대리점 수수료율(내 수수료 %)을 적용한 대리점 수익 집계입니다.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-[11px]">영업자</TableHead>
                          <TableHead className="text-[11px]">추천 코드</TableHead>
                          <TableHead className="text-[11px]">상태</TableHead>
                          <TableHead className="text-right text-[11px]">당월 추정 결제액</TableHead>
                          <TableHead className="text-right text-[11px]">대리점 마진율</TableHead>
                          <TableHead className="text-right text-[11px] text-purple-700">오버라이딩 마진</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subAgents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                              소속 영업자가 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          subAgents.map(agent => {
                            const mockMonthly = (agent as any).monthlyAmount ?? 5000000;
                            const agentAgencyRate = agentRates[agent.id] ?? (agent as any).agencyRate ?? 0.5;
                            const overriding = Math.round(mockMonthly * agentAgencyRate / 100);
                            const isActive = agent.status === 'active';
                            return (
                              <TableRow key={agent.id} className="hover:bg-purple-50/20">
                                <TableCell>
                                  <div className="font-semibold text-[12.5px]">{agent.name}</div>
                                  <div className="text-[10px] text-slate-400">{agent.email}</div>
                                </TableCell>
                                <TableCell className="font-mono text-[11px] text-indigo-600">{agent.referralCode}</TableCell>
                                <TableCell>
                                  <Badge
                                    className={`text-[10px] hover:opacity-100 ${
                                      isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                    }`}
                                  >
                                    {isActive ? '활성' : '대기/정지'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-[12px] font-semibold">
                                  {isActive ? mockMonthly.toLocaleString() + '원' : <span className="text-slate-300">—</span>}
                                </TableCell>
                                <TableCell className="text-right text-[12px] font-mono text-purple-600 font-bold">
                                  {agentAgencyRate}%
                                </TableCell>
                                <TableCell className="text-right">
                                  {isActive ? (
                                    <span className="font-bold text-purple-700 text-[13px] font-mono">
                                      +{overriding.toLocaleString()}원
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 text-[12px]">비활성</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                    {subAgents.length > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-purple-100 bg-purple-50/40">
                        <span className="text-[11.5px] text-purple-700 font-semibold">
                          활성 영업자 {subAgents.filter(a => a.status === 'active').length}명 합산
                        </span>
                        <span className="text-[15px] font-bold text-purple-800">
                          총 +{agencyOverridingMargin.toLocaleString()}원 / 월
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
