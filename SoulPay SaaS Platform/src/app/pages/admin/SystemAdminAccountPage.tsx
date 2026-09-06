/* SystemAdminAccountPage.tsx — 시스템 관리자 계정 관리 페이지 */
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { systemAdminAPI, SystemAdmin } from '../../api/client';
import { toast } from 'sonner';
import {
  Shield, ShieldCheck, UserPlus, Pencil, Trash2, RefreshCw,
  Eye, EyeOff, CheckCircle, XCircle, Clock, Mail, Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const ROLE_LABEL: Record<string, string> = {
  system_admin:  '최고관리자',
  system_viewer: '조회전용',
};
const STATUS_LABEL: Record<string, string> = {
  active:    '활성',
  suspended: '정지',
};

function Badge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
        <CheckCircle size={10} /> 활성
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:border-red-800">
      <XCircle size={10} /> 정지
    </span>
  );
}

interface FormState {
  name: string;
  email: string;
  password: string;
  role: 'system_admin' | 'system_viewer';
  status: 'active' | 'suspended';
  memo: string;
}

const EMPTY_FORM: FormState = {
  name: '', email: '', password: '', role: 'system_admin', status: 'active', memo: '',
};

export default function SystemAdminAccountPage() {
  const { currentAdmin } = useApp();
  const [admins, setAdmins]         = useState<SystemAdmin[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<SystemAdmin | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [showPw, setShowPw]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemAdminAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        setAdmins(res.data);
      } else {
        toast.error(res.error ?? '관리자 목록 조회 실패');
      }
    } catch {
      toast.error('서버 연결 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowPw(false);
    setShowModal(true);
  };

  const openEdit = (admin: SystemAdmin) => {
    setEditTarget(admin);
    setForm({
      name:     admin.name,
      email:    admin.email,
      password: '',          // 수정 시 비워두면 변경 안 함
      role:     admin.role,
      status:   admin.status,
      memo:     admin.memo ?? '',
    });
    setShowPw(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('이름과 이메일은 필수입니다.');
      return;
    }
    if (!editTarget && !form.password.trim()) {
      toast.error('신규 등록 시 비밀번호는 필수입니다.');
      return;
    }
    setSaving(true);
    try {
      let res;
      if (editTarget) {
        const updates: Partial<SystemAdmin> = {
          name: form.name, email: form.email, role: form.role,
          status: form.status, memo: form.memo,
        };
        if (form.password.trim()) updates.password = form.password;
        res = await systemAdminAPI.update(editTarget.id, updates);
      } else {
        res = await systemAdminAPI.create({
          name: form.name, email: form.email, password: form.password,
          role: form.role, status: form.status, memo: form.memo,
        });
      }
      if (res.success) {
        toast.success(editTarget ? '계정 정보가 수정되었습니다.' : '새 관리자 계정이 등록되었습니다.');
        setShowModal(false);
        load();
      } else {
        toast.error(res.error ?? '저장 실패');
      }
    } catch {
      toast.error('서버 오류');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: SystemAdmin) => {
    if (admin.id === currentAdmin?.id) {
      toast.error('자신의 계정은 삭제할 수 없습니다.');
      return;
    }
    if (!window.confirm(`"${admin.name}" 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      const res = await systemAdminAPI.delete(admin.id);
      if (res.success) {
        toast.success('계정이 삭제되었습니다.');
        load();
      } else {
        toast.error(res.error ?? '삭제 실패');
      }
    } catch {
      toast.error('서버 오류');
    }
  };

  const handleToggleStatus = async (admin: SystemAdmin) => {
    if (admin.id === currentAdmin?.id) {
      toast.error('자신의 계정 상태는 변경할 수 없습니다.');
      return;
    }
    const next = admin.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await systemAdminAPI.update(admin.id, { status: next });
      if (res.success) {
        toast.success(next === 'active' ? '계정을 활성화했습니다.' : '계정을 정지했습니다.');
        load();
      } else {
        toast.error(res.error ?? '상태 변경 실패');
      }
    } catch {
      toast.error('서버 오류');
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--hm-ink)] flex items-center gap-2">
            <Shield size={20} className="text-[var(--hm-accent)]" />
            시스템 관리자 계정 관리
          </h1>
          <p className="text-[12px] text-[var(--hm-ink-3)] mt-1">
            SoulPay 시스템에 접근할 수 있는 관리자 계정을 관리합니다. 총 {admins.length}명
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg border border-[var(--hm-border)] bg-[var(--hm-paper)] hover:bg-[var(--hm-paper-2)] cursor-pointer transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[var(--hm-ink-3)]' : 'text-[var(--hm-ink-3)]'} />
          </button>
          <Button onClick={openCreate} size="sm" className="gap-1.5 h-8 text-[12px] font-semibold cursor-pointer">
            <UserPlus size={13} /> 관리자 추가
          </Button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-[var(--hm-paper)] border border-[var(--hm-border)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[var(--hm-ink-3)]">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-[13px]">불러오는 중...</span>
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-16 text-[var(--hm-ink-3)] text-[13px]">
            등록된 시스템 관리자 계정이 없습니다.
          </div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--hm-border)] bg-[var(--hm-paper-2)]">
                <th className="text-left px-4 py-2.5 font-semibold text-[var(--hm-ink-3)] text-[11px] uppercase tracking-wide">이름</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[var(--hm-ink-3)] text-[11px] uppercase tracking-wide">이메일</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[var(--hm-ink-3)] text-[11px] uppercase tracking-wide">권한</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[var(--hm-ink-3)] text-[11px] uppercase tracking-wide">상태</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[var(--hm-ink-3)] text-[11px] uppercase tracking-wide">마지막 로그인</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[var(--hm-ink-3)] text-[11px] uppercase tracking-wide">메모</th>
                <th className="text-right px-4 py-2.5 font-semibold text-[var(--hm-ink-3)] text-[11px] uppercase tracking-wide">작업</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin, idx) => (
                <tr
                  key={admin.id}
                  className={`border-b border-[var(--hm-border)] last:border-0 hover:bg-[var(--hm-paper-2)] transition-colors ${admin.id === currentAdmin?.id ? 'bg-[var(--hm-accent-bg)]/30' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        admin.role === 'system_admin'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {admin.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--hm-ink)]">{admin.name}</div>
                        {admin.id === currentAdmin?.id && (
                          <span className="text-[9px] text-[var(--hm-accent)] font-bold">현재 로그인 계정</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-[var(--hm-ink-2)]">{admin.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                      admin.role === 'system_admin'
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                        : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                    }`}>
                      <ShieldCheck size={9} />
                      {ROLE_LABEL[admin.role] ?? admin.role}
                    </span>
                  </td>
                  <td className="px-4 py-3"><Badge status={admin.status} /></td>
                  <td className="px-4 py-3 text-[11px] text-[var(--hm-ink-3)]">
                    {admin.lastLoginAt
                      ? <span className="flex items-center gap-1"><Clock size={10} />{new Date(admin.lastLoginAt).toLocaleString('ko-KR')}</span>
                      : <span className="text-[var(--hm-ink-3)] opacity-50">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-[11.5px] text-[var(--hm-ink-3)] max-w-[160px] truncate">
                    {admin.memo || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleToggleStatus(admin)}
                        disabled={admin.id === currentAdmin?.id}
                        title={admin.status === 'active' ? '계정 정지' : '계정 활성화'}
                        className={`p-1.5 rounded-md border cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                          admin.status === 'active'
                            ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800'
                        }`}
                      >
                        {admin.status === 'active' ? <XCircle size={12} /> : <CheckCircle size={12} />}
                      </button>
                      <button
                        onClick={() => openEdit(admin)}
                        title="수정"
                        className="p-1.5 rounded-md border border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink-2)] hover:bg-[var(--hm-paper-2)] cursor-pointer transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(admin)}
                        disabled={admin.id === currentAdmin?.id}
                        title="삭제"
                        className="p-1.5 rounded-md border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed dark:bg-red-950/30 dark:border-red-800"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 신규/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--hm-paper)] border border-[var(--hm-border)] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-[var(--hm-border)] flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--hm-accent)] flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <div>
                <h2 className="text-[14px] font-bold text-[var(--hm-ink)]">
                  {editTarget ? '관리자 계정 수정' : '새 관리자 계정 등록'}
                </h2>
                <p className="text-[11px] text-[var(--hm-ink-3)]">
                  {editTarget ? `${editTarget.name} 계정을 수정합니다.` : '새 시스템 관리자 계정을 추가합니다.'}
                </p>
              </div>
            </div>

            {/* 폼 */}
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">이름 *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="홍길동"
                    className="h-9 text-[12.5px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">권한</Label>
                  <select
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value as any }))}
                    className="w-full h-9 px-2.5 text-[12.5px] border border-[var(--hm-border)] rounded-md bg-[var(--hm-paper)] text-[var(--hm-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--hm-accent)]"
                  >
                    <option value="system_admin">최고관리자</option>
                    <option value="system_viewer">조회전용</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold flex items-center gap-1"><Mail size={11} /> 이메일 *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="admin@soulpay.kr"
                  className="h-9 text-[12.5px] font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold flex items-center gap-1">
                  <Lock size={11} /> 비밀번호 {editTarget && <span className="text-[10px] text-[var(--hm-ink-3)] font-normal">(비워두면 변경 안 함)</span>}
                </Label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={editTarget ? '변경할 비밀번호 입력' : '초기 비밀번호 *'}
                    className="h-9 text-[12.5px] pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--hm-ink-3)] hover:text-[var(--hm-ink)] cursor-pointer border-none bg-transparent"
                  >
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">상태</Label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full h-9 px-2.5 text-[12.5px] border border-[var(--hm-border)] rounded-md bg-[var(--hm-paper)] text-[var(--hm-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--hm-accent)]"
                  >
                    <option value="active">활성</option>
                    <option value="suspended">정지</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">메모</Label>
                  <Input
                    value={form.memo}
                    onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                    placeholder="선택 입력"
                    className="h-9 text-[12.5px]"
                  />
                </div>
              </div>
            </div>

            {/* 모달 하단 */}
            <div className="px-6 py-4 border-t border-[var(--hm-border)] flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="h-8 text-[12px] cursor-pointer"
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-8 text-[12px] gap-1.5 cursor-pointer"
              >
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                {editTarget ? '저장' : '등록'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
