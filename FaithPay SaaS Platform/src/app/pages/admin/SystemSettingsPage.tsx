import { useState, useEffect } from 'react';
import { Percent, Save, RefreshCw, Building } from 'lucide-react';
import { toast } from 'sonner';

/* ── PG사 목록 ── */
const DEFAULT_PGS = [
  { id: 'nanopay', name: '나노페이 (NanoPay)', rate: 1.5 },
];

interface PGEntry { id: string; name: string; rate: number; }

const STORAGE_KEY        = 'faithpay:pg_rates';
const STORAGE_KEY_MARGIN = 'faithpay:platform_margin';

function loadRates(): PGEntry[] {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return DEFAULT_PGS.map(p => ({ ...p }));
}
function saveRates(list: PGEntry[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
function loadMargin(): number {
  const v = parseFloat(localStorage.getItem(STORAGE_KEY_MARGIN) || '');
  return isNaN(v) ? 0.5 : v;
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
  const [pgs, setPgs]                 = useState<PGEntry[]>([]);
  const [dirty, setDirty]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [platformMargin, setPM]       = useState(loadMargin);
  const [marginDirty, setMarginDirty] = useState(false);
  const [marginSaving, setMarginSaving] = useState(false);

  useEffect(() => { setPgs(loadRates()); }, []);

  const updatePgRate = (id: string, val: string) => {
    const n = parseFloat(val);
    setPgs(prev => prev.map(p => p.id === id ? { ...p, rate: isNaN(n) ? p.rate : n } : p));
    setDirty(true);
  };

  const handleSavePG = () => {
    setSaving(true);
    setTimeout(() => { saveRates(pgs); setDirty(false); setSaving(false); toast.success('PG 원가율이 저장되었습니다.'); }, 400);
  };

  const handleSaveMargin = () => {
    setMarginSaving(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY_MARGIN, String(platformMargin));
      setMarginDirty(false); setMarginSaving(false);
      toast.success(`플랫폼 마진율 ${platformMargin}%로 저장되었습니다.`);
    }, 300);
  };

  const pgCost = pgs[0]?.rate ?? 1.5;
  const floorPreview = +(pgCost + platformMargin).toFixed(2);

  return (
    <div className="space-y-4">

      {/* PG 원가 수수료율 */}
      <div className={S.card}>
        <div className={S.head}>
          <Building size={13} className="text-[var(--hm-accent)] shrink-0" />
          <span className="text-[12.5px] font-semibold text-[var(--hm-ink)]">PG사별 계약 수수료율 (원가)</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md ml-2">
            💳 신용카드 전용
          </span>
          <span className="text-[10.5px] text-[var(--hm-ink-3)] ml-auto">플랫폼이 각 PG사에 지불하는 계약 원가율</span>
        </div>
        <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 text-[11px] text-blue-700 flex items-center gap-2">
          ℹ️ <span>현재 <strong>신용카드 결제</strong>만 지원합니다. 가상계좌·계좌이체 등 타 수단은 추후 지원 예정입니다.</span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={S.th}>PG사</th>
              <th className={`${S.th} text-right w-20`}>신용카드 수수료율 (%)</th>
              <th className={`${S.th} text-right w-36`}>가상계좌</th>
              <th className={`${S.th} text-right w-36`}>계좌이체</th>
            </tr>
          </thead>
          <tbody>
            {pgs.map(pg => (
              <tr key={pg.id} className="hover:bg-[var(--hm-paper-2)] transition-colors">
                <td className={S.td}><span className="text-[var(--hm-ink)] font-medium">{pg.name}</span></td>
                <td className={`${S.td} text-right`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <input type="number" step="0.1" min="0" max="20" value={pg.rate}
                      onChange={e => updatePgRate(pg.id, e.target.value)}
                      className="w-20 px-2.5 py-1.5 rounded-[7px] border border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-[13px] text-right font-mono text-[var(--hm-ink)] outline-none focus:border-[var(--hm-accent)] transition-colors"
                    />
                    <span className="text-[12px] text-[var(--hm-ink-3)]">%</span>
                  </div>
                </td>
                <td className={`${S.td} text-right`}>
                  <span className="text-[11px] text-[var(--hm-ink-3)] bg-[var(--hm-paper-2)] px-2 py-1 rounded">미지원</span>
                </td>
                <td className={`${S.td} text-right`}>
                  <span className="text-[11px] text-[var(--hm-ink-3)] bg-[var(--hm-paper-2)] px-2 py-1 rounded">미지원</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end px-4 py-3 border-t border-[var(--hm-border)]">
          <button onClick={handleSavePG} disabled={saving || !dirty} className={S.btnSave}>
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? '저장 중...' : 'PG 원가율 저장'}
          </button>
        </div>
      </div>

      {/* 플랫폼 마진율 */}
      <div className={S.card}>
        <div className={S.head}>
          <Percent size={13} className="text-[var(--hm-accent)] shrink-0" />
          <span className="text-[12.5px] font-semibold text-[var(--hm-ink)]">플랫폼 기본 마진율</span>
          <span className="text-[10.5px] text-[var(--hm-ink-3)] ml-auto">
            PG 원가 위에 플랫폼이 가산하는 수익 마진 — 영업자 Guardrail 하한에 실시간 반영
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-5">
            {/* 입력 */}
            <div className="space-y-1">
              <label className={S.label}>플랫폼 마진율 (%)</label>
              <div className="flex items-center gap-2">
                <input type="number" step="0.1" min="0" max="5" value={platformMargin}
                  onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { setPM(v); setMarginDirty(true); } }}
                  className="w-24 px-3 py-2 rounded-[7px] border border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-[14px] font-bold text-right text-[var(--hm-ink)] outline-none focus:border-[var(--hm-accent)] transition-colors"
                />
                <span className="text-[13px] font-bold text-[var(--hm-ink-2)]">%</span>
              </div>
            </div>

            {/* Guardrail 미리보기 */}
            <div className="flex-1 bg-[var(--hm-paper-2)] rounded-[10px] p-3 space-y-1.5 border border-[var(--hm-border)]">
              <p className="text-[10.5px] font-bold text-[var(--hm-ink-3)] uppercase tracking-wide">Guardrail 하한선 미리보기</p>
              {[
                { label: 'PG 원가',          value: pgCost,          color: 'bg-red-100 text-red-700' },
                { label: '플랫폼 마진',       value: platformMargin,  color: 'bg-amber-100 text-amber-700' },
                { label: '기본 합산 하한선',  value: floorPreview,    color: 'bg-indigo-100 text-indigo-700', bold: true },
              ].map(({ label, value, color, bold }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--hm-ink-2)]">{label}</span>
                  <span className={`text-[11.5px] px-1.5 py-0.5 rounded font-mono ${color} ${bold ? 'font-bold' : ''}`}>{value}%</span>
                </div>
              ))}
              <p className="text-[9.5px] text-[var(--hm-ink-3)] mt-1">※ 대리점·영업자 마진 추가 시 하한선 더 높아짐</p>
            </div>
          </div>

          <p className="text-[11px] text-[var(--hm-ink-3)] bg-amber-50 border border-amber-100 rounded-[8px] px-3 py-2">
            ⚠️ 이 값은 영업자가 가맹점 계약 수수료율을 입력할 때 역마진 방지(Guardrail) 하한선 계산에 실시간 반영됩니다.
          </p>

          <div className="flex justify-end">
            <button onClick={handleSaveMargin} disabled={marginSaving || !marginDirty} className={S.btnSave}>
              {marginSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
              {marginSaving ? '저장 중...' : '마진율 저장'}
            </button>
          </div>
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
