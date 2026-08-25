/* 입점 신청 상세 심사 — 신청폼 수집 필드만 표시
 * OnboardingFlow:    종교, 단체명, 슬러그, 주소, 전화, 이메일, 브랜드컬러, 소개글
 * PartnerTenantCreate: 종교, 단체명, 슬러그, 주소, 대표연락처, 관리자성함, 관리자휴대폰
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Building2, Phone, Mail, User, MapPin,
  Clock, CheckCircle, XCircle, AlertCircle, Key,
  RefreshCw, Globe, Shield, FileText, Eye, Download, FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { tenantAPI } from '../../api/client';
import { Tenant } from '../../context/AppContext';

const RELIGION: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  protestant: { label: '기독교 (교회)', emoji: '⛪', color: '#2563eb', bg: '#eff6ff' },
  buddhist:   { label: '불교 (사찰)',   emoji: '⛩️', color: '#c2410c', bg: '#fff7ed' },
  catholic:   { label: '천주교 (성당)', emoji: '✝️', color: '#1e40af', bg: '#eff6ff' },
};

const S = {
  page:       'p-6',
  card:       'bg-[var(--hm-paper)] rounded-[12px] border border-[var(--hm-border)] overflow-hidden',
  head:       'px-5 py-3 border-b border-[var(--hm-border)] flex items-center gap-2',
  body:       'px-5 py-5',
  label:      'text-[10.5px] font-semibold text-[var(--hm-ink-3)] uppercase tracking-wide mb-0.5',
  value:      'text-[13.5px] text-[var(--hm-ink)] font-medium',
  mono:       'text-[13px] font-mono text-[var(--hm-accent)]',
  empty:      'text-[12px] text-[var(--hm-ink-3)] italic',
  divider:    'border-t border-[var(--hm-border)] my-4',
  row2:       'grid grid-cols-2 gap-x-8 gap-y-4',
  row3:       'grid grid-cols-3 gap-x-8 gap-y-4',
  field:      'space-y-0.5',
  btnPrimary: 'inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-semibold bg-[var(--hm-accent)] text-white border-none cursor-pointer hover:brightness-110 active:scale-95 transition-all disabled:opacity-50',
  btnDanger:  'inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-semibold bg-transparent text-red-500 border border-red-200 cursor-pointer hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50',
  btnGhost:   'inline-flex items-center gap-1.5 px-3 py-2 rounded-[7px] text-[12px] text-[var(--hm-ink-2)] bg-[var(--hm-paper-2)] border border-[var(--hm-border)] cursor-pointer hover:bg-[var(--hm-paper-3)] transition-colors',
};

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={S.field}>
      <p className={S.label}>{label}</p>
      {children}
    </div>
  );
}

function SectionHead({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className={S.head}>
      <Icon size={13} className="text-[var(--hm-accent)] shrink-0" />
      <span className="text-[12.5px] font-semibold text-[var(--hm-ink)]">{title}</span>
    </div>
  );
}

function ConfirmBanner({
  type, onConfirm, onCancel, loading,
}: { type: 'approve' | 'reject'; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  const isApp = type === 'approve';
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-[8px] border ${
      isApp ? 'border-[var(--hm-accent-border)] bg-[var(--hm-accent-bg)]' : 'border-red-200 bg-red-50'
    }`}>
      <span className={`text-[12.5px] font-semibold ${isApp ? 'text-[var(--hm-accent)]' : 'text-red-700'}`}>
        {isApp ? '입점을 승인하시겠습니까?' : '신청을 거절하시겠습니까?'}
      </span>
      <button onClick={onConfirm} disabled={loading} className={isApp ? S.btnPrimary : S.btnDanger}>
        {loading ? <RefreshCw size={13} className="animate-spin" /> : (isApp ? <CheckCircle size={13} /> : <XCircle size={13} />)}
        확인
      </button>
      <button onClick={onCancel} disabled={loading} className={S.btnGhost}>취소</button>
    </div>
  );
}

export default function PendingTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  const [acting, setActing] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; fileUrl: string; fileName?: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    tenantAPI.getPending()
      .then(res => {
        if (res.success && res.data) {
          const found = res.data.find(t => t.id === id);
          if (found) setTenant(found);
          else toast.error('신청 단체를 찾을 수 없습니다.');
        }
      })
      .catch(() => toast.error('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const doApprove = async () => {
    if (!tenant) return;
    setActing(true);
    try {
      const res = await tenantAPI.approvePending(tenant.id);
      if (res.success) { toast.success(`✅ ${tenant.name} 입점을 승인했습니다.`); navigate('/system/admin/tenants/pending'); }
      else toast.error('승인 처리에 실패했습니다.');
    } finally { setActing(false); setConfirm(null); }
  };

  const doReject = async () => {
    if (!tenant) return;
    setActing(true);
    try {
      const res = await tenantAPI.rejectPending(tenant.id);
      if (res.success) { toast.success(`${tenant.name} 신청을 거절했습니다.`); navigate('/system/admin/tenants/pending'); }
      else toast.error('거절 처리에 실패했습니다.');
    } finally { setActing(false); setConfirm(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-[var(--hm-ink-3)]">
      <RefreshCw size={16} className="animate-spin" />
      <span className="text-[12px]">불러오는 중...</span>
    </div>
  );

  if (!tenant) return (
    <div className={S.page}>
      <div className="flex items-center gap-3 p-5 rounded-[12px] border border-red-200 bg-red-50">
        <AlertCircle size={18} className="text-red-500 shrink-0" />
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-red-700">단체를 찾을 수 없습니다</p>
          <p className="text-[12px] text-red-500 mt-0.5">이미 처리되었거나 존재하지 않는 신청입니다.</p>
        </div>
        <button onClick={() => navigate('/system/admin/tenants/pending')} className={S.btnGhost}>
          <ArrowLeft size={13} /> 목록으로
        </button>
      </div>
    </div>
  );

  const rel = RELIGION[tenant.religionType] ?? { label: tenant.religionType, emoji: '🏛️', color: '#6b7280', bg: '#f9fafb' };
  const applyDate = tenant.appliedAt
    ? new Date(tenant.appliedAt).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : (tenant.createdAt ? new Date(tenant.createdAt).toLocaleString('ko-KR') : '—');

  const actions = confirm
    ? <ConfirmBanner type={confirm} onConfirm={confirm === 'approve' ? doApprove : doReject} onCancel={() => setConfirm(null)} loading={acting} />
    : (
      <div className="flex items-center gap-2">
        <button onClick={() => setConfirm('reject')} className={S.btnDanger}><XCircle size={14} /> 거절</button>
        <button onClick={() => setConfirm('approve')} className={S.btnPrimary}><Key size={14} /> 입점 승인</button>
      </div>
    );

  return (
    <div className={S.page}>

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between gap-4 mb-5">
        {/* 좌: 뒤로 + 제목 */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/system/admin/tenants/pending')}
            className="shrink-0 -ml-1 p-1.5 rounded-[7px] text-[var(--hm-ink-3)] hover:bg-[var(--hm-paper-2)] transition-colors cursor-pointer border-none bg-transparent"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-semibold text-[var(--hm-ink)] truncate">{tenant.name}</h1>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-[5px] border border-amber-200 bg-amber-50 text-amber-700">
                <Clock size={10} /> 심사 대기
              </span>
              <span
                className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-[5px] border"
                style={{ borderColor: rel.color + '44', background: rel.bg, color: rel.color }}
              >
                {rel.emoji} {rel.label}
              </span>
            </div>
            <p className="text-[12.5px] text-[var(--hm-ink-3)] mt-0.5">
              신청일: {applyDate}
            </p>
          </div>
        </div>
        {/* 우: 액션 */}
        <div className="shrink-0">{actions}</div>
      </div>

      {/* ── 카드 1: 단체 기본 정보 ── */}
      <div className={`${S.card} mb-4`}>
        <SectionHead icon={Building2} title="단체 기본 정보" />
        <div className={S.body}>
          {/* row 1 */}
          <div className={S.row3}>
            <Field label="단체 유형">
              <span
                className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-[6px] border"
                style={{ borderColor: rel.color + '44', background: rel.bg, color: rel.color }}
              >
                {rel.emoji} {rel.label}
              </span>
            </Field>
            <Field label="단체명">
              <p className={S.value}>{tenant.name}</p>
            </Field>
            <Field label="슬러그 (URL)">
              <p className={S.mono}>soulpay.kr/<strong>{tenant.slug}</strong></p>
            </Field>
          </div>

          {/* row 2 */}
          <div className={`${S.divider}`} />
          <Field label={<><MapPin size={10} className="inline mr-1" />소재지 주소</>}>
            <p className={tenant.address ? S.value : S.empty}>{tenant.address || '미입력'}</p>
          </Field>

          {/* 소개글 */}
          {tenant.description && (
            <>
              <div className={S.divider} />
              <Field label="단체 소개글">
                <p className="text-[13px] text-[var(--hm-ink-2)] leading-relaxed whitespace-pre-wrap">{tenant.description}</p>
              </Field>
            </>
          )}
        </div>
      </div>

      {/* ── 카드 2: 연락처 ── */}
      <div className={`${S.card} mb-4`}>
        <SectionHead icon={User} title="연락처 정보" />
        <div className={S.body}>
          <div className={S.row3}>
            <Field label={<><Phone size={10} className="inline mr-1" />대표 연락처</>}>
              <p className={tenant.contact?.phone ? S.value : S.empty}>{tenant.contact?.phone || '미입력'}</p>
            </Field>
            <Field label={<><Mail size={10} className="inline mr-1" />이메일</>}>
              <p className={`${tenant.contact?.email ? S.value : S.empty} text-[12.5px]`}>{tenant.contact?.email || '미입력'}</p>
            </Field>
            {tenant.contact?.name && (
              <Field label={<><User size={10} className="inline mr-1" />담당자</>}>
                <p className={S.value}>{tenant.contact.name}</p>
              </Field>
            )}
          </div>

          {/* 신청 경로 + 파트너 정보 */}
          {(() => {
            const src = (tenant as any).registrationSource;
            const partnerName = (tenant as any).registeredByPartnerName;
            const refCode = (tenant as any).registeredByReferralCode;
            const hasPartner = src === 'agency' || src === 'agent';
            return (
              <>
                <div className={S.divider} />
                <div className={`p-3 rounded-[8px] border ${
                  src === 'agency' ? 'bg-purple-50/60 border-purple-200' :
                  src === 'agent' ? 'bg-amber-50/60 border-amber-200' :
                  'bg-emerald-50/60 border-emerald-200'
                }`}>
                  <p className={`text-[10.5px] font-semibold mb-3 flex items-center gap-1 ${
                    src === 'agency' ? 'text-purple-700' :
                    src === 'agent' ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {src === 'agency' ? '🏢 대리점이 등록한 신청' :
                     src === 'agent' ? '💼 영업자가 등록한 신청' :
                     '🏠 SoulPay 플랫폼 직접 유치'}
                  </p>
                  {hasPartner && (
                    <div className={S.row2}>
                      <Field label="등록 파트너">
                        <p className={S.value}>{partnerName || '—'}</p>
                      </Field>
                      <Field label="추천 코드">
                        <p className="font-mono text-[12.5px] font-semibold text-[var(--hm-ink)]">{refCode || '—'}</p>
                      </Field>
                    </div>
                  )}
                  {(tenant.adminName || (tenant as any).adminEmail || tenant.adminPhone) && (
                    <div className={`${S.row3} ${hasPartner ? 'mt-3' : ''}`}>
                      <Field label="대표 관리자 성함">
                        <p className={S.value}>{tenant.adminName || '—'}</p>
                      </Field>
                      <Field label="로그인 이메일 (아이디)">
                        <p className={S.value}>{(tenant as any).adminEmail || tenant.contact?.email || '—'}</p>
                      </Field>
                      <Field label="대표 관리자 휴대폰">
                        <p className={S.value}>{tenant.adminPhone || '—'}</p>
                      </Field>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* ── 카드 3: 브랜딩 (primaryColor) ── */}
      {tenant.primaryColor && (
        <div className={`${S.card} mb-4`}>
          <SectionHead icon={Globe} title="브랜딩" />
          <div className={S.body}>
            <Field label="브랜드 주 컬러">
              <div className="flex items-center gap-2 mt-0.5">
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow"
                  style={{ background: tenant.primaryColor }}
                />
                <span className={S.mono}>{tenant.primaryColor}</span>
              </div>
            </Field>
          </div>
        </div>
      )}

      {/* ── 카드 4: 제출 서류 및 인증 정보 ── */}
      {(() => {
        const bInfo = tenant.businessInfo || {};
        const uNum = tenant.uniqueNumber || bInfo.uniqueNumber;
        const uFile = tenant.uniqueNumberFile || bInfo.uniqueNumberFile;
        const uFileName = bInfo.uniqueNumberFileName;

        const bFile = bInfo.bylawsFile;
        const bFileName = bInfo.bylawsFileName;

        const bkFile = bInfo.bankbookFile;
        const bkFileName = bInfo.bankbookFileName;
        const bankName = bInfo.bankName;
        const accNum = bInfo.accountNumber;
        const accHolder = bInfo.accountHolder;

        const repCertFile = bInfo.representativeCertFile;
        const repCertFileName = bInfo.representativeCertFileName;
        const repIdFile = bInfo.representativeIdFile;
        const repIdFileName = bInfo.representativeIdFileName;

        const isDel = bInfo.isDelegated;
        const delName = bInfo.delegateName;
        const delPhone = bInfo.delegatePhone;
        const delLetterFile = bInfo.delegationLetterFile;
        const delIdFile = bInfo.delegateIdFile;

        const hasAnyDocs = uNum || uFile || bFile || bkFile || repCertFile || repIdFile || isDel;

        return (
          <div className={`${S.card} mb-4`}>
            <SectionHead icon={FileText} title="제출 서류 및 인증 검토" />
            <div className={S.body}>
              {!hasAnyDocs ? (
                <div className="p-4 rounded-[8px] bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[12.5px] text-[var(--hm-ink-2)] font-medium">
                    가입 신청 시 제출된 별도 서류가 없습니다. (승인 후 관리자 설정에서 제출 가능)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 고유번호증 */}
                  <div className="flex items-center justify-between p-3 rounded-[8px] border border-[var(--hm-border)] bg-[var(--hm-paper-2)]">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--hm-ink-3)]">1. 종교/비영리 단체 고유번호증</p>
                      <p className="text-[13px] font-mono font-bold text-[var(--hm-ink)] mt-0.5">
                        {uNum || '번호 미입력'}
                      </p>
                    </div>
                    <div>
                      {uFile ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ title: '고유번호증 사본', fileUrl: uFile, fileName: uFileName })}
                          className={S.btnGhost}
                        >
                          <Eye size={12} /> 서류 열람
                        </button>
                      ) : (
                        <span className="text-[11.5px] text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded">사본 미첨부</span>
                      )}
                    </div>
                  </div>

                  {/* 정관 / 회칙 */}
                  <div className="flex items-center justify-between p-3 rounded-[8px] border border-[var(--hm-border)] bg-[var(--hm-paper-2)]">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--hm-ink-3)]">2. 정관 또는 회칙</p>
                      <p className="text-[12.5px] text-[var(--hm-ink)] mt-0.5">
                        {bFileName || (bFile ? '정관/회칙 사본 첨부됨' : '미제출')}
                      </p>
                    </div>
                    <div>
                      {bFile ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ title: '정관/회칙 사본', fileUrl: bFile, fileName: bFileName })}
                          className={S.btnGhost}
                        >
                          <Eye size={12} /> 서류 열람
                        </button>
                      ) : (
                        <span className="text-[11.5px] text-slate-400">미제출</span>
                      )}
                    </div>
                  </div>

                  {/* 단체 정산 통장 사본 */}
                  <div className="flex items-center justify-between p-3 rounded-[8px] border border-[var(--hm-border)] bg-[var(--hm-paper-2)]">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--hm-ink-3)]">3. 단체명의 정산 통장 사본</p>
                      <p className="text-[12.5px] text-[var(--hm-ink)] mt-0.5">
                        {bankName ? `${bankName} ${accNum || ''} (예금주: ${accHolder || '미입력'})` : (bkFileName || (bkFile ? '통장 사본 첨부됨' : '미제출'))}
                      </p>
                    </div>
                    <div>
                      {bkFile ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ title: '정산 통장 사본', fileUrl: bkFile, fileName: bkFileName })}
                          className={S.btnGhost}
                        >
                          <Eye size={12} /> 서류 열람
                        </button>
                      ) : (
                        <span className="text-[11.5px] text-slate-400">미제출</span>
                      )}
                    </div>
                  </div>

                  {/* 대표자 확인 서류 & 신분증 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 rounded-[8px] border border-[var(--hm-border)] bg-[var(--hm-paper-2)]">
                      <div>
                        <p className="text-[11px] font-semibold text-[var(--hm-ink-3)]">4. 대표자(관리인) 확인서류</p>
                        <p className="text-[12px] text-[var(--hm-ink)] mt-0.5">{repCertFileName || (repCertFile ? '확인서류 첨부됨' : '미제출')}</p>
                      </div>
                      {repCertFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ title: '대표자 확인서류', fileUrl: repCertFile, fileName: repCertFileName })}
                          className={S.btnGhost}
                        >
                          <Eye size={12} /> 열람
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-[8px] border border-[var(--hm-border)] bg-[var(--hm-paper-2)]">
                      <div>
                        <p className="text-[11px] font-semibold text-[var(--hm-ink-3)]">5. 대표자 신분증 사본</p>
                        <p className="text-[12px] text-[var(--hm-ink)] mt-0.5">{repIdFileName || (repIdFile ? '신분증 사본 첨부됨' : '미제출')}</p>
                      </div>
                      {repIdFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ title: '대표자 신분증 사본', fileUrl: repIdFile, fileName: repIdFileName })}
                          className={S.btnGhost}
                        >
                          <Eye size={12} /> 열람
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 대리인 신청 정보 */}
                  {isDel && (
                    <div className="p-3.5 rounded-[8px] border border-amber-200 bg-amber-50/50">
                      <p className="text-[11px] font-bold text-amber-800 mb-2">대리인 위임 신청 서류</p>
                      <div className={S.row2}>
                        <Field label="대리인 성명 / 연락처">
                          <p className={S.value}>{delName || '—'} {delPhone ? `(${delPhone})` : ''}</p>
                        </Field>
                        <Field label="대리인 위임장 / 신분증">
                          <div className="flex gap-2">
                            {delLetterFile && (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ title: '대리인 위임장', fileUrl: delLetterFile })}
                                className={S.btnGhost}
                              >
                                위임장 열람
                              </button>
                            )}
                            {delIdFile && (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ title: '대리인 신분증', fileUrl: delIdFile })}
                                className={S.btnGhost}
                              >
                                신분증 열람
                              </button>
                            )}
                          </div>
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── 하단 액션 바 ── */}
      <div className="flex items-center justify-between mt-2 pt-4 border-t border-[var(--hm-border)]">
        <button onClick={() => navigate('/system/admin/tenants/pending')} className={S.btnGhost}>
          <ArrowLeft size={13} /> 목록으로 돌아가기
        </button>
        {actions}
      </div>

      {/* 서류 미리보기 모달 */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-600 h-4 w-4" />
                <h3 className="text-[13.5px] font-bold text-slate-900">{previewDoc.title}</h3>
              </div>
              <button
                type="button"
                className={S.btnGhost}
                onClick={() => setPreviewDoc(null)}
              >
                닫기
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100 min-h-[300px]">
              {previewDoc.fileUrl.startsWith('data:image/') || (previewDoc.fileUrl.startsWith('http') && (previewDoc.fileUrl.endsWith('.png') || previewDoc.fileUrl.endsWith('.jpg') || previewDoc.fileUrl.endsWith('.jpeg'))) ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : previewDoc.fileUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.title}
                  className="w-full h-[60vh] rounded-lg border"
                />
              ) : (
                <div className="text-center p-8">
                  <FileCheck size={44} className="mx-auto text-blue-600 mb-3" />
                  <p className="text-[13px] font-bold text-slate-800">서류 파일이 등록되어 있습니다</p>
                  <p className="text-[11.5px] text-slate-500 mt-1 font-mono">{previewDoc.fileName || '서류 파일'}</p>
                  <a
                    href={previewDoc.fileUrl}
                    download={previewDoc.fileName || 'document'}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-[12px] font-semibold shadow hover:bg-blue-700"
                  >
                    <Download size={13} /> 다운로드하여 확인
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
