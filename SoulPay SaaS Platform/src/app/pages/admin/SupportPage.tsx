import { useState } from 'react';
import { useParams } from 'react-router';
import { useApp } from '../../context/AppContext';
import { MessageSquare, Send, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../../api/client';

const CATEGORIES = [
  '결제/정산 문의',
  '정기결제 설정',
  '테넌트 설정',
  '시스템 오류',
  '기능 개선 요청',
  '보안/계정',
  '기타',
];

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function SupportPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { currentAdmin, currentTenant } = useApp();

  const [form, setForm] = useState({
    senderName: currentAdmin?.name || '',
    senderEmail: currentAdmin?.email || '',
    category: CATEGORIES[0],
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/support/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tenantName: currentTenant?.name || tenantSlug || '미입력',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setForm(prev => ({ ...prev, subject: '', message: '' }));
      } else {
        throw new Error(data.error || '문의 접수 실패');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || '문의 접수 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">고객 문의</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">영업일 기준 1~2일 이내 답변 드립니다</p>
          </div>
        </div>
      </div>

      {/* 성공 상태 */}
      {status === 'success' && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">문의가 접수되었습니다!</p>
            <p className="text-emerald-700 dark:text-emerald-400 text-sm mt-0.5">
              <strong>{form.senderEmail}</strong>으로 접수 확인 이메일을 발송했습니다.
              영업일 기준 1~2일 이내 답변 드리겠습니다.
            </p>
          </div>
        </div>
      )}

      {/* 오류 상태 */}
      {status === 'error' && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400 text-sm">접수 실패</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* 문의 폼 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 이름 / 이메일 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              name="senderName"
              value={form.senderName}
              onChange={handleChange}
              required
              placeholder="홍길동"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              name="senderEmail"
              type="email"
              value={form.senderEmail}
              onChange={handleChange}
              required
              placeholder="example@email.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            문의 유형 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full appearance-none px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition pr-10"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            name="subject"
            value={form.subject}
            onChange={handleChange}
            required
            maxLength={100}
            placeholder="문의 제목을 간략히 입력해 주세요"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            문의 내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            required
            rows={7}
            maxLength={2000}
            placeholder="문의 내용을 상세히 작성해 주세요.&#10;&#10;예) 발생 시각, 오류 메시지, 재현 방법 등을 포함하면 더 빠른 답변이 가능합니다."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          />
          <p className="mt-1 text-xs text-slate-400 text-right">{form.message.length} / 2000</p>
        </div>

        {/* 안내 */}
        <div className="p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg text-sm text-blue-700 dark:text-blue-400">
          📩 문의 접수 시 <strong>{form.senderEmail || '입력한 이메일'}</strong>로 자동 접수 확인 이메일이 발송됩니다.
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={status === 'loading' || !form.subject.trim() || !form.message.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white font-semibold rounded-xl transition text-sm"
        >
          {status === 'loading' ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              접수 중...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              문의 접수하기
            </>
          )}
        </button>
      </form>

      {/* 직접 연락 */}
      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-zinc-800 text-center">
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          긴급 문의는 이메일로 직접 연락해 주세요
        </p>
        <a
          href="mailto:support@soulpay.kr"
          className="mt-1 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          support@soulpay.kr
        </a>
      </div>
    </div>
  );
}
