import { useState } from 'react';
import { Users, Copy, Trophy, Building2, UserPlus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Partner, partnerAPI } from '../../../api/client';
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
  const [showRegDialog, setShowRegDialog] = useState(false);
  const [newAgentName,  setNewAgentName]  = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentRate,  setNewAgentRate]  = useState(editAgencyRate);
  const [isRegistering, setIsRegistering] = useState(false);

  // 영업자별 수수료 합산 (저장된 commissions localStorage 감여)
  const getAgentCommissionSum = (agentId: string): number => {
    try {
      const allComm = JSON.parse(localStorage.getItem('faithpay:commissions') || '[]');
      return allComm.filter((c: any) => c.partnerId === agentId || c.agentId === agentId)
        .reduce((s: number, c: any) => s + (c.commissionAmount ?? 0), 0);
    } catch { return 0; }
  };

  const handleRegisterAgent = async () => {
    if (!newAgentName.trim() || !newAgentEmail.trim()) {
      toast.error('이름과 이메일은 필수입니다.');
      return;
    }
    setIsRegistering(true);
    try {
      const res = await partnerAPI.create({
        name: newAgentName, email: newAgentEmail, phone: newAgentPhone,
        role: 'sales_agent', parentId: partner.id, agencyRate: newAgentRate,
        commissionRate: newAgentRate, referralCode: '',
      } as any);
      if (res.success) {
        toast.success(`영업자 ${newAgentName}님이 등록되었습니다.`);
        setShowRegDialog(false);
        setNewAgentName(''); setNewAgentEmail(''); setNewAgentPhone('');
      } else {
        toast.error(res.error || '등록에 실패했습니다.');
      }
    } catch { toast.error('등록 중 오류가 발생했습니다.'); }
    finally { setIsRegistering(false); }
  };

  // 대리점 본사 직접 유치 항목 생성 (영업자 목록 및 집계에 포함)
  const agencyDirectItem: Partner = {
    id: partner.id,
    name: `${partner.name} (대리점 직접 유치)`,
    email: partner.email,
    phone: partner.phone,
    role: 'master_agency',
    commissionRate: editAgencyRate,
    referralCode: partner.referralCode,
    bankName: (partner as any).bankName,
    accountNumber: (partner as any).accountNumber,
    accountHolder: (partner as any).accountHolder,
    status: 'active',
    createdAt: partner.createdAt,
  };

  const displayAgents = [agencyDirectItem, ...subAgents];

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
    <>
    <div className="p-6 space-y-5 bg-[var(--hm-paper-2)] dark:bg-zinc-950 min-h-full">
      {/* 상단 헤더 & 초대 버튼 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-bold text-[var(--hm-ink)]">영업자 관리</h1>
          <p className="text-[12.5px] text-[var(--hm-ink-3)] mt-0.5">소속 영업자 및 대리점 직접유치 현황 관리</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0"
            onClick={() => setShowRegDialog(true)}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> 영업자 직접 등록
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-xs shrink-0"
            onClick={() => {
              const link = `${window.location.origin}/partner/apply?ref=${partner.referralCode}`;
              navigator.clipboard.writeText(link);
              toast.success('영업자 초대 링크가 복사되었습니다!');
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" /> 초대 링크 복사
          </Button>
        </div>
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
          <Users className="h-4 w-4" /> 영업자 목록 ({displayAgents.length}명)
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

      {/* 서브 탭 1: 영업자 목록 (대리점 직접유치 포함) */}
      {agentSubTab === 'list' && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-[14px] font-bold text-slate-800">
                영업자 목록 ({displayAgents.length}명 - 대리점 직접유치 포함)
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                영업자 항목을 클릭하면 상세프로필, 수수료 설정 및 관리 단체 목록으로 이동합니다.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {displayAgents.map(agent => {
                const isAgencyDirect = agent.id === partner.id;
                const rate = isAgencyDirect
                  ? editAgencyRate
                  : agentRates[agent.id] ?? editAgencyRate ?? 0.3;
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
                    className={`p-4 flex items-center justify-between transition-colors cursor-pointer group ${
                      isAgencyDirect ? 'bg-purple-50/40 hover:bg-purple-50/70' : 'hover:bg-purple-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                          isAgencyDirect
                            ? 'bg-purple-600 text-white border-purple-700 shadow-2xs font-bold'
                            : isActive
                            ? 'bg-purple-100 border-purple-200 text-purple-800'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      >
                        {isAgencyDirect ? <Building2 className="h-5 w-5" /> : <span className="font-bold text-base">{agent.name?.charAt(0)}</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-[14px] group-hover:text-purple-700 transition-colors">
                            {agent.name}
                          </p>
                          <Badge
                            className={`text-[9.5px] px-1.5 py-0 ${
                              isAgencyDirect
                                ? 'bg-purple-600 text-white hover:bg-purple-600'
                                : isActive
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {isAgencyDirect ? '🏢 대리점 본사' : isActive ? '활성' : '대기/정지'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {agent.referralCode} {agent.email && ` · ${agent.email}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <div className="text-[11px] text-slate-400">대리점 수수료 / 베이스</div>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className="text-[12px] font-bold text-purple-700">대리점 {rate}%</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[12px] font-bold text-slate-700">베이스 {subAgentFloor}%</span>
                        </div>
                      </div>
                      <div className="text-right hidden md:block">
                        <div className="text-[11px] text-slate-400">수수료 누적</div>
                        <div className="text-[13px] font-bold text-emerald-700 mt-0.5">
                          {getAgentCommissionSum(agent.id).toLocaleString()}원
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
          </CardContent>
        </Card>
      )}

      {/* 서브 탭 2: 영업자별 오버라이딩 마진 집계 (대리점 직접유치 포함) */}
      {agentSubTab === 'overriding' && (
        <div className="space-y-5">
          {/* 요약 KPI */}
          {(() => {
            const agencyOverridingMargin = displayAgents.reduce((s, a) => {
              if (a.status !== 'active') return s;
              const agentMonthly = (a as any).monthlyAmount ?? 0;
              const aRate = a.id === partner.id ? editAgencyRate : (agentRates[a.id] ?? (a as any).agencyRate ?? editAgencyRate ?? 0.5);
              return s + Math.round(agentMonthly * aRate / 100);
            }, 0);

            return (
              <>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: '총 관리 영업자', value: `${displayAgents.length}명`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: '활성 영업자', value: `${displayAgents.filter(a => a.status === 'active').length}명`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: '대기/정지', value: `${displayAgents.filter(a => a.status !== 'active').length}명`, color: 'text-amber-600', bg: 'bg-amber-50' },
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
                        <Trophy className="h-4 w-4 text-purple-600" /> 영업자별 오버라이딩 마진 집계 (대리점 직접유치 포함)
                      </CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">
                        대리점 본사 직접유치 실적 및 소속 영업자 결제 실적에 지정 수수료율(내 수수료 %)을 적용한 대리점 수익 집계입니다.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-[11px]">영업자 / 구분을</TableHead>
                          <TableHead className="text-[11px]">추천 코드</TableHead>
                          <TableHead className="text-[11px]">상태</TableHead>
                          <TableHead className="text-right text-[11px]">당월 추정 결제액</TableHead>
                          <TableHead className="text-right text-[11px]">대리점 마진율</TableHead>
                          <TableHead className="text-right text-[11px] text-purple-700">오버라이딩 마진</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayAgents.map(agent => {
                          const isAgencyDirect = agent.id === partner.id;
                          const agentMonthly = (agent as any).monthlyAmount ?? 0;
                          const agentAgencyRate = isAgencyDirect
                            ? editAgencyRate
                            : (agentRates[agent.id] ?? (agent as any).agencyRate ?? editAgencyRate ?? 0.5);
                          const overriding = Math.round(agentMonthly * agentAgencyRate / 100);
                          const isActive = agent.status === 'active';

                          return (
                            <TableRow key={agent.id} className={`hover:bg-purple-50/20 ${isAgencyDirect ? 'bg-purple-50/30' : ''}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[12.5px]">{agent.name}</span>
                                  {isAgencyDirect && (
                                    <Badge className="bg-purple-600 text-white text-[9px] hover:bg-purple-600">
                                      본사
                                    </Badge>
                                  )}
                                </div>
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
                                {isActive ? agentMonthly.toLocaleString() + '원' : <span className="text-slate-300">—</span>}
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
                        })}
                      </TableBody>
                    </Table>
                    <div className="flex items-center justify-between px-4 py-3 border-t border-purple-100 bg-purple-50/40">
                      <span className="text-[11.5px] text-purple-700 font-semibold">
                        활성 영업자 {displayAgents.filter(a => a.status === 'active').length}명 합산 (대리점 본사 포함)
                      </span>
                      <span className="text-[15px] font-bold text-purple-800">
                        총 +{agencyOverridingMargin.toLocaleString()}원 / 월
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>
      )}
    </div>

      {/* ── 신규 영업자 직접 등록 Dialog ── */}
      {showRegDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[var(--hm-paper)] rounded-2xl shadow-2xl border border-[var(--hm-border)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hm-border)] bg-purple-50/60">
              <div>
                <h2 className="text-[14px] font-bold text-purple-950">영업자 직접 등록</h2>
                <p className="text-[11px] text-purple-700 mt-0.5">신규 영업자를 대리점에서 직접 등록합니다</p>
              </div>
              <button onClick={() => setShowRegDialog(false)} className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-400 cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">이름 <span className="text-red-500">*</span></Label>
                <Input value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="홍길동" className="text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">이메일 <span className="text-red-500">*</span></Label>
                <Input type="email" value={newAgentEmail} onChange={e => setNewAgentEmail(e.target.value)} placeholder="agent@email.com" className="text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">연락처</Label>
                <Input value={newAgentPhone} onChange={e => setNewAgentPhone(e.target.value)} placeholder="010-0000-0000" className="text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">부여 수수료율 (%)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" step="0.1" min="0" max="3"
                    value={newAgentRate} onChange={e => setNewAgentRate(parseFloat(e.target.value) || 0)}
                    className="text-xs h-9 w-24 text-right font-mono font-bold" />
                  <span className="text-sm font-bold text-slate-600">%</span>
                  <span className="text-[10.5px] text-slate-400 flex-1">← 대리점 마진율 ({editAgencyRate}%) 이하 설정 권장</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 text-xs h-9" onClick={() => setShowRegDialog(false)}>취소</Button>
                <Button
                  className="flex-1 text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  disabled={isRegistering}
                  onClick={handleRegisterAgent}
                >
                  {isRegistering ? '등록 중...' : '영업자 등록'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
