import { useState } from 'react';
import { Building2, Plus, ExternalLink, Users, Filter, LayoutGrid, List } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Partner } from '../../../api/client';

interface PartnerTenantsSectionProps {
  partner: Partner;
  myTenants: any[];
  subAgents: Partner[];
}

export function PartnerTenantsSection({ partner, myTenants, subAgents }: PartnerTenantsSectionProps) {
  const navigate = useNavigate();
  const isAgency = partner.role === 'master_agency';

  // 뷰 선택: 'all' (전체 목록) vs 'grouped' (영업자별 묶어보기)
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('all');
  // 영업자 필터 선택 ('all' 또는 specific partner/agent id)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');

  // 필터링된 단체 목록
  const filteredTenants = myTenants.filter(t => {
    if (selectedAgentId === 'all') return true;
    if (selectedAgentId === 'direct') {
      return (t as any).registeredByPartnerId === partner.id || (t as any).referralCode === partner.referralCode;
    }
    const matchedAgent = subAgents.find(a => a.id === selectedAgentId);
    return (
      (t as any).registeredByPartnerId === selectedAgentId ||
      (matchedAgent && ((t as any).registeredByReferralCode === matchedAgent.referralCode || (t as any).referralCode === matchedAgent.referralCode))
    );
  });

  return (
    <div className="space-y-5 max-w-4xl">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-bold text-slate-800">관리 단체 목록</h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5">내가 유치하거나 관할 영업자가 유치한 사찰 · 교회 가맹점 현황</p>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"
          onClick={() => navigate('/partner/tenants/new')}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> 신규 가맹점 개설
        </Button>
      </div>

      {/* 뷰 전환 & 필터 바 (대리점인 경우) */}
      {isAgency && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          {/* 뷰 방식 선택 버튼 */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-0 ${
                viewMode === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="h-3.5 w-3.5" /> 전체 목록 ({myTenants.length})
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-0 ${
                viewMode === 'grouped' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-purple-600" /> 영업자별 묶어보기
            </button>
          </div>

          {/* 영업자별 드롭다운/필터 (전체 목록 모드일 때) */}
          {viewMode === 'all' && (
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedAgentId}
                onChange={e => setSelectedAgentId(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:border-purple-500"
              >
                <option value="all">전체 영업자 ({myTenants.length}개소)</option>
                <option value="direct">대리점 직접 유치</option>
                {subAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    영업자: {agent.name} ({agent.referralCode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── 1. 전체 목록 뷰 (Single List View) ── */}
      {viewMode === 'all' && (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            {filteredTenants.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs space-y-2">
                <Building2 className="h-10 w-10 mx-auto text-slate-300" />
                <p className="font-medium text-slate-500 text-sm">등록된 관리 단체가 없습니다.</p>
                <p className="text-slate-400">신규 개설 버튼을 사용하여 가맹점 단체를 등록하세요.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTenants.map((t: any, idx: number) => (
                  <div key={t.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 font-bold font-mono flex items-center justify-center text-xs border border-purple-100 shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-[14px]">{t.name}</p>
                          <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                            {t.status === 'active' ? '운영중' : '승인대기'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          도메인: faithpay.kr/{t.slug} · 종교: {t.religionType === 'buddhist' ? '불교' : t.religionType === 'catholic' ? '천주교' : '기독교'} · PG사: {t.paymentConfig?.pgProvider === 'toss' ? '토스페이먼츠' : t.paymentConfig?.pgProvider === 'nanopay' ? '나노PG' : '미지정'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2 hidden sm:block">
                        <span className="text-[11px] text-slate-400 block">계약 수수료율 / PG</span>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-[13px] font-bold text-emerald-700 font-mono">
                            {(t as any).contractRate ?? 3.0}%
                          </span>
                          <Badge variant="outline" className={t.paymentConfig?.pgProvider === 'toss' ? 'bg-blue-50 text-blue-700 border-blue-200 text-[9.5px]' : t.paymentConfig?.pgProvider === 'nanopay' ? 'bg-purple-50 text-purple-700 border-purple-200 text-[9.5px]' : 'bg-slate-50 text-slate-400 border-slate-200 text-[9.5px]'}>
                            {t.paymentConfig?.pgProvider === 'toss' ? '토스페이먼츠' : t.paymentConfig?.pgProvider === 'nanopay' ? '나노PG' : '미지정'}
                          </Badge>
                        </div>
                      </div>
                      <a
                        href={`/g/${t.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        페이지 이동 <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 2. 영업자별 묶어보기 뷰 (Grouped View by Sales Agent) ── */}
      {viewMode === 'grouped' && (
        <div className="space-y-6">
          {/* 대리점 직접 유치 단체 카드 */}
          {(() => {
            const directTenants = myTenants.filter(
              t => (t as any).registeredByPartnerId === partner.id || (t as any).referralCode === partner.referralCode
            );
            return (
              <Card className="border-purple-200 bg-purple-50/20">
                <CardHeader className="pb-3 bg-purple-50/60 border-b border-purple-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-[14px] font-bold text-purple-950 flex items-center gap-2">
                      🏢 대리점 본사 직접 유치 단체 ({directTenants.length}개소)
                    </CardTitle>
                    <CardDescription className="text-[11px] text-purple-800 mt-0.5">
                      영업자를 통하지 않고 대리점에서 직접 등록·관리 중인 가맹점 단체입니다.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                  {directTenants.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      대리점 본사에서 직접 개설한 가맹점 단체가 없습니다.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {directTenants.map((t: any, idx: number) => (
                        <div key={t.id} className="p-4 flex items-center justify-between hover:bg-purple-50/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-100/70 text-purple-800 font-bold font-mono flex items-center justify-center text-xs border border-purple-200 shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-[13.5px]">{t.name}</span>
                                <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="text-[9.5px]">
                                  {t.status === 'active' ? '운영중' : '승인대기'}
                                </Badge>
                              </div>
                              <span className="text-[10.5px] text-slate-400 font-mono mt-0.5 block">faithpay.kr/{t.slug}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-bold text-emerald-700 font-mono">{(t as any).contractRate ?? 3.0}%</span>
                            <a href={`/g/${t.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-700 hover:underline">
                              보기 ➔
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* 소속 영업자별 그룹 카드 */}
          {subAgents.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-10 text-center text-slate-400 text-xs">
                소속 영업자가 없습니다.
              </CardContent>
            </Card>
          ) : (
            subAgents.map(agent => {
              const agentTenants = myTenants.filter(
                t =>
                  (t as any).registeredByPartnerId === agent.id ||
                  (t as any).registeredByReferralCode === agent.referralCode ||
                  (t as any).referralCode === agent.referralCode
              );

              return (
                <Card key={agent.id} className="border-slate-200 shadow-2xs">
                  <CardHeader className="pb-3 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs shrink-0 border border-purple-200">
                        {agent.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-[14px] font-bold text-slate-800">{agent.name}</CardTitle>
                          <Badge className="bg-purple-100 text-purple-800 text-[10px] hover:bg-purple-100 font-mono">
                            추천코드: {agent.referralCode}
                          </Badge>
                        </div>
                        <CardDescription className="text-[11px] mt-0.5">
                          이 영업자가 유치하여 관리 중인 단체: <strong>{agentTenants.length}개소</strong>
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50 h-8"
                      onClick={() => navigate('/partner/tenants/new')}
                    >
                      + {agent.name} 명의 신규 개설
                    </Button>
                  </CardHeader>

                  <CardContent className="p-0">
                    {agentTenants.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        아직 {agent.name} 영업자가 유치한 가맹점 단체가 없습니다.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {agentTenants.map((t: any, idx: number) => (
                          <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold font-mono flex items-center justify-center text-xs border border-emerald-100 shrink-0">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-800 text-[13.5px]">{t.name}</p>
                                  <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="text-[9.5px]">
                                    {t.status === 'active' ? '운영중' : '승인대기'}
                                  </Badge>
                                </div>
                                <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">faithpay.kr/{t.slug}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[10.5px] text-slate-400 block">계약 수수료율</span>
                                <span className="text-[12.5px] font-bold text-emerald-700 font-mono">
                                  {(t as any).contractRate ?? 3.0}%
                                </span>
                              </div>
                              <a
                                href={`/g/${t.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                페이지 이동 <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
