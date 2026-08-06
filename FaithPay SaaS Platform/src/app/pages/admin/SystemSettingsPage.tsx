import { useState, useEffect } from 'react';
import { Percent, Save, RefreshCw, Building, Landmark, CreditCard, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

/* ── PG사 목록 및 기본 원가/마진 설정 ── */
interface PGEntry {
  id: string;
  name: string;
  rate: number;   // PG 원가 수수료율
  margin: number; // 플랫폼 개별 마진율
}

interface PlatformAccount {
  bank: string;
  accountNumber: string;
  holderName: string;
  businessNumber: string;
  payoutCycle: string;
  updatedAt?: string;
}

const DEFAULT_PGS: PGEntry[] = [
  { id: 'nanopay', name: '나노페이 (NanoPay)', rate: 1.5, margin: 0.5 },
  { id: 'toss', name: '토스페이먼츠 (TossPayments)', rate: 1.5, margin: 0.5 },
];

const STORAGE_KEY        = 'faithpay:pg_rates';
const STORAGE_KEY_MARGIN = 'faithpay:platform_margin';
const STORAGE_KEY_ACCOUNT = 'faithpay:platform_payout_account';

const DEFAULT_ACCOUNT: PlatformAccount = {
  bank: '088', // 신한은행
  accountNumber: '110-482-992014',
  holderName: '주식회사 페이스페이 (FaithPay)',
  businessNumber: '128-86-94021',
  payoutCycle: 'D+1',
};

function loadRates(): PGEntry[] {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) {
      const parsed = JSON.parse(r);
      return DEFAULT_PGS.map(d => {
        const found = parsed.find((p: any) => p.id === d.id);
        return {
          ...d,
          rate: found?.rate !== undefined ? Number(found.rate) : d.rate,
          margin: found?.margin !== undefined ? Number(found.margin) : d.margin,
        };
      });
    }
  } catch {}
  return DEFAULT_PGS.map(p => ({ ...p }));
}

function saveRates(list: PGEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  if (list.length > 0) {
    localStorage.setItem(STORAGE_KEY_MARGIN, String(list[0].margin));
  }
}

function loadAccount(): PlatformAccount {
  try {
    const a = localStorage.getItem(STORAGE_KEY_ACCOUNT);
    if (a) {
      return { ...DEFAULT_ACCOUNT, ...JSON.parse(a) };
    }
  } catch {}
  return { ...DEFAULT_ACCOUNT };
}

function saveAccount(acc: PlatformAccount) {
  const updated = { ...acc, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(updated));
  return updated;
}

/* ── style atoms ── */
const S = {
  page:     'p-6 space-y-5',
  card:     'bg-[var(--hm-paper)] rounded-[12px] border border-[var(--hm-border)] overflow-hidden',
  head:     'px-5 py-3 border-b border-[var(--hm-border)] flex items-center gap-2',
  label:    'text-[11px] font-semibold text-[var(--hm-ink-2)] mb-1 block',
  th:       'text-[10.5px] font-semibold text-[var(--hm-ink-3)] uppercase py-2.5 px-4 text-left bg-[var(--hm-paper-2)]',
  td:       'text-[12.5px] py-2.5 px-4 border-t border-[var(--hm-border)]',
  btnSave:  'inline-flex items-center gap-2 px-4 py-1.5 rounded-[7px] text-[12.5px] font-semibold text-white bg-[var(--hm-accent)] hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer border-none',
};

const TABS = [
  { key: 'fee', label: '수수료 설정', icon: Percent },
  { key: 'account', label: '토스 수수료 입금 계좌 설정', icon: Landmark },
] as const;
type TabKey = typeof TABS[number]['key'];

/* ── 수수료 설정 탭 ── */
function FeeSettingsTab() {
  const [pgs, setPgs]       = useState<PGEntry[]>([]);
  const [dirty, setDirty]   = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPgs(loadRates()); }, []);

  const updatePgRate = (id: string, val: string) => {
    const n = parseFloat(val);
    setPgs(prev => prev.map(p => p.id === id ? { ...p, rate: isNaN(n) ? p.rate : n } : p));
    setDirty(true);
  };

  const updatePgMargin = (id: string, val: string) => {
    const n = parseFloat(val);
    setPgs(prev => prev.map(p => p.id === id ? { ...p, margin: isNaN(n) ? p.margin : n } : p));
    setDirty(true);
  };

  const handleSaveAll = () => {
    setSaving(true);
    setTimeout(() => {
      saveRates(pgs);
      setDirty(false);
      setSaving(false);
      toast.success('PG별 수수료 원가 및 플랫폼 마진율 설정이 저장되었습니다.');
    }, 400);
  };

  return (
    <div className="space-y-4">
      <div className={S.card}>
        <div className={S.head}>
          <Building size={13} className="text-[var(--hm-accent)] shrink-0" />
          <span className="text-[12.5px] font-semibold text-[var(--hm-ink)]">PG사별 수수료 원가 및 플랫폼 마진율 설정</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md ml-2">
            💳 신용카드 전용
          </span>
          <span className="text-[10.5px] text-[var(--hm-ink-3)] ml-auto">PG별로 원가율과 플랫폼 수수료 마진율을 각각 독립 설정합니다</span>
        </div>

        <div className="px-4 py-2.5 bg-blue-50/60 border-b border-blue-100 text-[11px] text-blue-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            ℹ️ <span>PG사별로 <strong>[PG 원가율]</strong>과 <strong>[플랫폼 마진율]</strong>을 각각 다르게 지정할 수 있으며, 두 값을 합산한 <strong>최저 하한선</strong>이 영업자 Guardrail 하한으로 적용됩니다.</span>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={S.th}>PG사명</th>
              <th className={`${S.th} text-right w-36`}>PG 원가 수수료율 (%)</th>
              <th className={`${S.th} text-right w-36`}>플랫폼 마진율 (%)</th>
              <th className={`${S.th} text-right w-40`}>최저 계약 하한선 (%)</th>
              <th className={`${S.th} text-center w-32`}>결제 수단</th>
            </tr>
          </thead>
          <tbody>
            {pgs.map(pg => {
              const floor = +(pg.rate + pg.margin).toFixed(2);
              return (
                <tr key={pg.id} className="hover:bg-[var(--hm-paper-2)] transition-colors">
                  <td className={S.td}>
                    <div className="font-bold text-[var(--hm-ink)] text-xs">
                      {pg.name}
                    </div>
                    <div className="text-[10px] text-[var(--hm-ink-3)] font-mono">PG ID: {pg.id}</div>
                  </td>
                  <td className={`${S.td} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={pg.rate}
                        onChange={e => updatePgRate(pg.id, e.target.value)}
                        className="w-24 px-2.5 py-1.5 rounded-[7px] border border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-[13px] text-right font-mono font-bold text-[var(--hm-ink)] outline-none focus:border-[var(--hm-accent)] transition-colors"
                      />
                      <span className="text-[12px] text-[var(--hm-ink-3)]">%</span>
                    </div>
                  </td>
                  <td className={`${S.td} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={pg.margin}
                        onChange={e => updatePgMargin(pg.id, e.target.value)}
                        className="w-24 px-2.5 py-1.5 rounded-[7px] border border-amber-300 bg-amber-50/50 text-[13px] text-right font-mono font-bold text-amber-800 outline-none focus:border-amber-500 transition-colors"
                      />
                      <span className="text-[12px] text-amber-700 font-bold">%</span>
                    </div>
                  </td>
                  <td className={`${S.td} text-right`}>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 font-mono font-bold text-xs">
                      <span>{floor}%</span>
                      <span className="text-[10px] font-normal text-indigo-600">(원가{pg.rate}% + 마진{pg.margin}%)</span>
                    </div>
                  </td>
                  <td className={`${S.td} text-center`}>
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                      💳 신용카드 지원
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-t border-[var(--hm-border)]">
          <p className="text-[11px] text-[var(--hm-ink-3)]">
            ⚠️ 수정 후 <strong>[설정 저장]</strong> 버튼을 누르면 신규 계약 등록 시 PG별 역마진 방지(Guardrail) 하한선이 자동 계산됩니다.
          </p>
          <button onClick={handleSaveAll} disabled={saving || !dirty} className={S.btnSave}>
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? '저장 중...' : 'PG사별 수수료 & 마진 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 수수료 입금 계좌 설정 탭 ── */
function AccountSettingsTab() {
  const [account, setAccount] = useState<PlatformAccount>(DEFAULT_ACCOUNT);
  const [dirty, setDirty]     = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    setAccount(loadAccount());
  }, []);

  const handleChange = (field: keyof PlatformAccount, val: string) => {
    setAccount(prev => ({ ...prev, [field]: val }));
    setDirty(true);
  };

  const handleSave = () => {
    if (!account.accountNumber.trim() || !account.holderName.trim()) {
      toast.error('계좌번호와 예금주명을 입력해 주세요');
      return;
    }

    setSaving(true);
    setTimeout(() => {
      const saved = saveAccount(account);
      setAccount(saved);
      setDirty(false);
      setSaving(false);
      toast.success('토스 수수료 입금 계좌 설정이 성공적으로 저장되었습니다');
    }, 400);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className={S.card}>
        <div className={S.head}>
          <Landmark size={14} className="text-emerald-600 shrink-0" />
          <span className="text-[12.5px] font-semibold text-[var(--hm-ink)]">토스페이먼츠(TossPayments) 플랫폼 수수료 수령 계좌 설정</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md ml-2">
            <CheckCircle2 size={11} /> 자동 스플릿 입금
          </span>
          <span className="text-[10.5px] text-[var(--hm-ink-3)] ml-auto">토스로부터 수수료 수익을 자동으로 정산받을 계좌를 지정합니다</span>
        </div>

        <div className="px-5 py-3.5 bg-emerald-50/60 border-b border-emerald-100 text-[11.5px] text-emerald-900 leading-relaxed">
          💡 <strong>플랫폼 자동 스플릿 정산 안내</strong><br />
          신도가 헌금/교무금을 결제할 때 토스페이먼츠 분할 정산(Payout) 엔진에 의해 **[플랫폼 수수료 마진]**이 본 수수료 계좌로 자동 분리 입금됩니다.
        </div>

        <div className="p-6 space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={S.label}>정산 수령 은행 <span className="text-red-500">*</span></label>
              <select
                value={account.bank}
                onChange={e => handleChange('bank', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-xs font-semibold text-[var(--hm-ink)] outline-none focus:border-[var(--hm-accent)]"
              >
                <option value="088">신한은행 (088)</option>
                <option value="004">KB국민은행 (004)</option>
                <option value="020">우리은행 (020)</option>
                <option value="081">하나은행 (081)</option>
                <option value="003">IBK기업은행 (003)</option>
                <option value="011">NH농협은행 (011)</option>
                <option value="090">카카오뱅크 (090)</option>
                <option value="092">토스뱅크 (092)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className={S.label}>입금 계좌번호 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={account.accountNumber}
                onChange={e => handleChange('accountNumber', e.target.value)}
                placeholder="숫자 및 하이픈(-) 입력"
                className="w-full px-3 py-2 rounded-lg border border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-xs font-mono font-bold text-[var(--hm-ink)] outline-none focus:border-[var(--hm-accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={S.label}>예금주명 (영업 주체) <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={account.holderName}
                onChange={e => handleChange('holderName', e.target.value)}
                placeholder="예: 주식회사 페이스페이"
                className="w-full px-3 py-2 rounded-lg border border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-xs font-semibold text-[var(--hm-ink)] outline-none focus:border-[var(--hm-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className={S.label}>사업자 등록번호 / 고유번호</label>
              <input
                type="text"
                value={account.businessNumber}
                onChange={e => handleChange('businessNumber', e.target.value)}
                placeholder="예: 128-86-94021"
                className="w-full px-3 py-2 rounded-lg border border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-xs font-mono text-[var(--hm-ink)] outline-none focus:border-[var(--hm-accent)]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={S.label}>토스 정산 주기 (공식 규격)</label>
            <select
              value={account.payoutCycle}
              onChange={e => handleChange('payoutCycle', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-xs font-semibold text-[var(--hm-ink)] outline-none focus:border-[var(--hm-accent)]"
            >
              <option value="D+1">D+1 영업일 자동 입금 (토스 PG 표준 기본값)</option>
              <option value="D+2">D+2 영업일 입금</option>
              <option value="D+3">D+3 영업일 입금</option>
              <option value="D+7">D+7 영업일 입금 (리스크 관리 가맹점)</option>
              <option value="REALTIME">실시간 즉시 정산 (토스 Payouts API 전용)</option>
              <option value="WEEKLY">주간 정산 (매주 지정 요일 입금)</option>
              <option value="MONTHLY">월간 정산 (매월 지정일 입금)</option>
            </select>
          </div>

          {account.updatedAt && (
            <div className="text-[11px] text-[var(--hm-ink-3)] pt-1">
              최종 수정 일시: {new Date(account.updatedAt).toLocaleString('ko-KR')}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-t border-[var(--hm-border)]">
          <p className="text-[11px] text-[var(--hm-ink-3)]">
            ⚠️ 계좌 변경 시 토스페이먼츠 지급대행 계약 정보가 자동 갱신됩니다.
          </p>
          <button onClick={handleSave} disabled={saving || !dirty} className={S.btnSave}>
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? '저장 중...' : '수수료 입금 계좌 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 페이지 ── */
export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('fee');
  return (
    <div className={S.page}>
      <div className="flex items-center gap-1 border-b border-[var(--hm-border)]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] border-b-2 -mb-px transition-colors cursor-pointer bg-transparent border-x-0 border-t-0
              ${activeTab === key
                ? 'border-[var(--hm-accent)] text-[var(--hm-accent)] font-semibold'
                : 'border-transparent text-[var(--hm-ink-3)] hover:text-[var(--hm-ink)]'}`}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>
      {activeTab === 'fee' && <FeeSettingsTab />}
      {activeTab === 'account' && <AccountSettingsTab />}
    </div>
  );
}
