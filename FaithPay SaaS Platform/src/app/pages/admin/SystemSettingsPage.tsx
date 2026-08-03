import { useState, useEffect } from 'react';
import { Percent, Save, RefreshCw, Building } from 'lucide-react';
import { toast } from 'sonner';

/* ── PG사 목록 및 기본 원가/마진 설정 ── */
interface PGEntry {
  id: string;
  name: string;
  rate: number;   // PG 원가 수수료율
  margin: number; // 플랫폼 개별 마진율
}

const DEFAULT_PGS: PGEntry[] = [
  { id: 'nanopay', name: '나노페이 (NanoPay)', rate: 1.5, margin: 0.5 },
  { id: 'toss', name: '토스페이먼츠 (TossPayments)', rate: 1.5, margin: 0.5 },
];

const STORAGE_KEY        = 'faithpay:pg_rates';
const STORAGE_KEY_MARGIN = 'faithpay:platform_margin';

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
  // 첫 번째 PG사의 마진율을 하위 호환용 기본 마진으로 저장
  if (list.length > 0) {
    localStorage.setItem(STORAGE_KEY_MARGIN, String(list[0].margin));
  }
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
      {/* PG사별 원가 및 플랫폼 마진율 통합 관리 */}
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
    </div>
  );
}
