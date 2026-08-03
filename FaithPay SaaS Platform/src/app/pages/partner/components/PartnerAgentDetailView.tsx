import { ArrowLeft, Copy, Percent, RefreshCw, Building2, Plus, UserCircle } from 'lucide-react';
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

      {/* 영업자 헤더 배너 카드 */}
      <Card className="border-slate-800 bg-slate-900 text-white overflow-hidden shadow-lg">
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-purple-300">{selectedAgent.name?.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-bold">{selectedAgent.name}</h2>
                <Badge className={selectedAgent.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}>
                  {selectedAgent.status === 'active' ? '활성' : '대기/정지'}
                </Badge>
              </div>
              <p className="text-[12px] text-slate-300 font-mono mt-0.5">
                추천코드: {selectedAgent.referralCode} {selectedAgent.email && ` · ${selectedAgent.email}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="text-xs bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => {
                const link = `${window.location.origin}/partner/apply?ref=${selectedAgent.referralCode}`;
                navigator.clipboard.writeText(link);
                toast.success(`${selectedAgent.name} 전용 초대 링크가 복사되었습니다.`);
              }}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> 초대 링크 복사
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 수수료 설정 & 베이스 수수료 블록 */}
      <Card className="border-purple-200 bg-purple-50/30 shadow-sm">
        <CardHeader className="pb-3 bg-purple-50/60 border-b border-purple-100">
          <CardTitle className="text-[14px] font-bold text-purple-950 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-purple-600" /> 대리점 수수료 설정 & 베이스 수수료
            </span>
            <span className="text-[12px] font-bold text-purple-800 bg-white px-3 py-1 rounded-lg border border-purple-200 shadow-2xs font-mono">
              영업자 베이스 수수료: {subAgentFloor}%
            </span>
          </CardTitle>
          <CardDescription className="text-[11.5px] text-purple-800">
            이 영업자에게 지정할 대리점 수수료율(내 수수료)을 입력하면 영업자의 베이스 수수료(하한선)가 자동 저장 및 연동됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 bg-white rounded-xl border border-purple-100">
            <div>
              <Label className="text-[13px] font-bold text-purple-950">대리점 수수료율 (내 수수료 %)</Label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedAgent.name} 님이 유치하는 가맹점 결제 발생 시 대리점(나)에 귀속되는 고정 수수료율입니다.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number" step="0.1" min="0" max="3"
                value={currentRate}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setAgentRates(prev => ({ ...prev, [selectedAgent.id]: v }));
                }}
                className="w-24 h-9 text-right font-bold text-[14px] text-purple-900 bg-purple-50/50 border-purple-300"
              />
              <span className="text-[14px] font-bold text-purple-900">%</span>
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
            <div className="flex items-center gap-1 flex-wrap text-[10.5px]">
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">PG {pgCost2}%</span>
              <span className="text-slate-300">+</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">플랫폼 {platformMargin2}%</span>
              <span className="text-slate-300">+</span>
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">대리점(나) {currentRate}%</span>
              <span className="text-slate-300">=</span>
              <span className="font-bold text-purple-900 font-mono bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                베이스 수수료 {subAgentFloor}%
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
                  savedMap[selectedAgent.id] = currentRate;
                  localStorage.setItem('faithpay:agent_rates', JSON.stringify(savedMap));

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

      {/* 연락처 및 정산 계좌 상세 정보 */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-slate-500" /> 기본 연락처 및 정산 계좌 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[12.5px]">
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl">
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">휴대폰 번호</span>
              <span className="font-mono font-bold text-slate-700">{selectedAgent.phone || '—'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">이메일 주소</span>
              <span className="font-mono text-slate-700">{selectedAgent.email || '—'}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 rounded-xl">
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">정산 은행</span>
              <span className="font-bold text-slate-700">{(selectedAgent as any).bankName || '—'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">계좌 번호</span>
              <span className="font-mono text-slate-700">{(selectedAgent as any).accountNumber || '—'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">예금주</span>
              <span className="font-bold text-slate-700">{(selectedAgent as any).accountHolder || selectedAgent.name || '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
