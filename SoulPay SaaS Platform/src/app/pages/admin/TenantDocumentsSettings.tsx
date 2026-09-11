import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router';
import { useApp, Tenant } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { AdminSidebar } from '../../components/AdminSidebar';
import { TenantSettingsNav } from '../../components/admin/TenantSettingsNav';
import {
  Menu,
  Save,
  Trash2,
  Info,
  Upload,
  CheckCircle2,
  FileText,
  FileCheck,
  Download,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { RBACRouteGuard } from '../../components/RBACRouteGuard';

export default function TenantDocumentsSettings() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { tenants, currentTenant, setCurrentTenant, currentAdmin, updateTenantInfo } = useApp();

  const [isSaving, setIsSaving] = useState(false);

  // 서류 및 정산 정보 state
  const [uniqueNumber, setUniqueNumber] = useState('');
  const [uniqueNumberFile, setUniqueNumberFile] = useState('');
  const [uniqueNumberFileName, setUniqueNumberFileName] = useState('');
  const [bylawsFile, setBylawsFile] = useState('');
  const [bylawsFileName, setBylawsFileName] = useState('');
  const [bankbookFile, setBankbookFile] = useState('');
  const [bankbookFileName, setBankbookFileName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [representativeCertFile, setRepresentativeCertFile] = useState('');
  const [representativeCertFileName, setRepresentativeCertFileName] = useState('');
  const [representativeIdFile, setRepresentativeIdFile] = useState('');
  const [representativeIdFileName, setRepresentativeIdFileName] = useState('');

  // 대리인 서류 state
  const [isDelegated, setIsDelegated] = useState(false);
  const [delegateName, setDelegateName] = useState('');
  const [delegatePhone, setDelegatePhone] = useState('');
  const [delegationLetterFile, setDelegationLetterFile] = useState('');
  const [delegationLetterFileName, setDelegationLetterFileName] = useState('');
  const [delegateIdFile, setDelegateIdFile] = useState('');
  const [delegateIdFileName, setDelegateIdFileName] = useState('');

  const [previewDoc, setPreviewDoc] = useState<{ title: string; fileUrl: string; fileName?: string } | null>(null);

  const handleDocFileUpload = (
    setterFile: React.Dispatch<React.SetStateAction<string>>,
    setterName: React.Dispatch<React.SetStateAction<string>>,
    file: File | null
  ) => {
    if (!file) {
      setterFile('');
      setterName('');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 최대 10MB까지 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setterFile(base64);
      setterName(file.name);
      toast.success(`${file.name} 서류가 첨부되었습니다.`);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const decodedSlug = tenantSlug ? decodeURIComponent(tenantSlug).trim().toLowerCase() : '';
    const tenant = tenants.find(
      (t) =>
        (t.slug && t.slug.toLowerCase() === decodedSlug) ||
        (t.id && t.id.toLowerCase() === decodedSlug) ||
        (t.name && t.name.toLowerCase() === decodedSlug) ||
        (t.slug && decodeURIComponent(t.slug).toLowerCase() === decodedSlug)
    ) || currentTenant;

    if (tenant) {
      setCurrentTenant(tenant);

      const bInfo = tenant.businessInfo || {};
      setUniqueNumber(tenant.uniqueNumber || bInfo.uniqueNumber || '');
      setUniqueNumberFile(tenant.uniqueNumberFile || bInfo.uniqueNumberFile || '');
      setUniqueNumberFileName(bInfo.uniqueNumberFileName || (tenant.uniqueNumberFile ? '고유번호증_사본' : ''));
      setBylawsFile(bInfo.bylawsFile || '');
      setBylawsFileName(bInfo.bylawsFileName || (bInfo.bylawsFile ? '정관_회칙_사본' : ''));
      setBankbookFile(bInfo.bankbookFile || '');
      setBankbookFileName(bInfo.bankbookFileName || (bInfo.bankbookFile ? '통장_사본' : ''));
      setBankName(bInfo.bankName || '');
      setAccountNumber(bInfo.accountNumber || '');
      setAccountHolder(bInfo.accountHolder || '');
      setRepresentativeName(bInfo.representativeName || tenant.contact.name || '');
      setRepresentativeCertFile(bInfo.representativeCertFile || '');
      setRepresentativeCertFileName(bInfo.representativeCertFileName || (bInfo.representativeCertFile ? '대표자확인서류' : ''));
      setRepresentativeIdFile(bInfo.representativeIdFile || '');
      setRepresentativeIdFileName(bInfo.representativeIdFileName || (bInfo.representativeIdFile ? '대표자신분증' : ''));

      setIsDelegated(!!bInfo.isDelegated);
      setDelegateName(bInfo.delegateName || '');
      setDelegatePhone(bInfo.delegatePhone || '');
      setDelegationLetterFile(bInfo.delegationLetterFile || '');
      setDelegationLetterFileName(bInfo.delegationLetterFileName || (bInfo.delegationLetterFile ? '위임장' : ''));
      setDelegateIdFile(bInfo.delegateIdFile || '');
      setDelegateIdFileName(bInfo.delegateIdFileName || (bInfo.delegateIdFile ? '대리인신분증' : ''));
    }
  }, [tenantSlug, setCurrentTenant, tenants]);

  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">단체 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  const isAuthorized = currentAdmin && (currentAdmin.role === 'tenant_admin' || currentAdmin.role === 'system_admin');
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>단체 관리자 또는 최고 관리자만 접근할 수 있습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentPath = location.pathname;

  const handleSave = async () => {
    const updatedTenant: Tenant = {
      ...currentTenant,
      uniqueNumber: uniqueNumber.trim() || undefined,
      uniqueNumberFile: uniqueNumberFile || undefined,
      businessInfo: {
        ...(currentTenant.businessInfo || {}),
        uniqueNumber: uniqueNumber.trim() || undefined,
        uniqueNumberFile: uniqueNumberFile || undefined,
        uniqueNumberFileName: uniqueNumberFileName || undefined,
        bylawsFile: bylawsFile || undefined,
        bylawsFileName: bylawsFileName || undefined,
        bankbookFile: bankbookFile || undefined,
        bankbookFileName: bankbookFileName || undefined,
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        accountHolder: accountHolder.trim() || undefined,
        representativeName: representativeName.trim() || undefined,
        representativeCertFile: representativeCertFile || undefined,
        representativeCertFileName: representativeCertFileName || undefined,
        representativeIdFile: representativeIdFile || undefined,
        representativeIdFileName: representativeIdFileName || undefined,
        isDelegated,
        delegateName: isDelegated ? delegateName.trim() : undefined,
        delegatePhone: isDelegated ? delegatePhone.trim() : undefined,
        delegationLetterFile: isDelegated ? delegationLetterFile : undefined,
        delegationLetterFileName: isDelegated ? delegationLetterFileName : undefined,
        delegateIdFile: isDelegated ? delegateIdFile : undefined,
        delegateIdFileName: isDelegated ? delegateIdFileName : undefined,
      },
    };

    setIsSaving(true);
    try {
      await updateTenantInfo(updatedTenant);
      toast.success('단체 인증 및 서류 정보가 성공적으로 저장되었습니다');
    } catch {
      toast.error('서류 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b p-4 flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">단체 서류 관리</h1>
        </div>

        {/* Content */}
        <RBACRouteGuard menuId="settings">
          <div className="p-6 lg:p-8">
            <div className="w-full">
              {/* Common Settings Nav Tabs */}
              <TenantSettingsNav
                tenantSlug={tenantSlug}
                activeTab="documents"
                currentPath={currentPath}
              />

              {/* ── 단체 인증 및 정산 서류 관리 카드 ── */}
              <Card className="mb-6 border-slate-200 dark:border-zinc-800 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                      단체 인증 및 정산 서류 관리
                    </CardTitle>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      인증 서류
                    </span>
                  </div>
                  <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    가입 시 미제출된 서류를 등록하거나, 변경된 단체 고유번호증/통장사본/정관 등을 갱신할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  
                  {/* 1. 고유번호증 */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <FileText size={15} className="text-indigo-500" />
                        종교/비영리 단체 고유번호증
                      </Label>
                      <div className="flex items-center gap-2">
                        {uniqueNumberFile ? (
                          <>
                            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle2 size={12} /> {uniqueNumberFileName || '서류 등록됨'}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 cursor-pointer"
                              onClick={() => setPreviewDoc({ title: '고유번호증 사본', fileUrl: uniqueNumberFile, fileName: uniqueNumberFileName })}
                            >
                              <Eye size={12} className="mr-1" /> 보기
                            </Button>
                          </>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                            미등록 (선택)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="고유번호 (예: 240-82-12345)"
                        className="h-10 text-xs font-mono font-medium"
                        value={uniqueNumber}
                        onChange={(e) => setUniqueNumber(e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex-1 h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                          <Upload size={13} />
                          <span className="truncate">{uniqueNumberFileName || '고유번호증 파일 업로드'}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="sr-only"
                            onChange={(e) => handleDocFileUpload(setUniqueNumberFile, setUniqueNumberFileName, e.target.files?.[0] || null)}
                          />
                        </label>
                        {uniqueNumberFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDocFileUpload(setUniqueNumberFile, setUniqueNumberFileName, null)}
                            className="h-10 w-10 text-rose-500 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. 정관 또는 회칙 */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <FileText size={15} className="text-indigo-500" />
                        정관 또는 회칙 사본
                      </Label>
                      <div className="flex items-center gap-2">
                        {bylawsFile ? (
                          <>
                            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle2 size={12} /> {bylawsFileName || '서류 등록됨'}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 cursor-pointer"
                              onClick={() => setPreviewDoc({ title: '정관/회칙 사본', fileUrl: bylawsFile, fileName: bylawsFileName })}
                            >
                              <Eye size={12} className="mr-1" /> 보기
                            </Button>
                          </>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                            미등록 (선택)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                        <Upload size={13} />
                        <span className="truncate">{bylawsFileName || '정관 또는 회칙 파일 첨부 (PDF, 이미지)'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="sr-only"
                          onChange={(e) => handleDocFileUpload(setBylawsFile, setBylawsFileName, e.target.files?.[0] || null)}
                        />
                      </label>
                      {bylawsFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDocFileUpload(setBylawsFile, setBylawsFileName, null)}
                          className="h-10 w-10 text-rose-500 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 3. 단체명의 정산 통장 사본 */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                      <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <FileText size={15} className="text-indigo-500" />
                        단체명의 정산 통장 사본 및 계좌 정보
                      </Label>
                      <div className="flex items-center gap-2">
                        {bankbookFile ? (
                          <>
                            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle2 size={12} /> {bankbookFileName || '통장사본 등록됨'}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 cursor-pointer"
                              onClick={() => setPreviewDoc({ title: '정산 통장 사본', fileUrl: bankbookFile, fileName: bankbookFileName })}
                            >
                              <Eye size={12} className="mr-1" /> 보기
                            </Button>
                          </>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
                            미등록 (선택)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      <Input
                        placeholder="은행명 (예: 국민은행)"
                        className="h-10 text-xs"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      />
                      <Input
                        placeholder="계좌번호 (- 제외)"
                        className="h-10 text-xs font-mono"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                      <Input
                        placeholder="예금주명 (단체명)"
                        className="h-10 text-xs"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                        <Upload size={13} />
                        <span className="truncate">{bankbookFileName || '통장 사본 파일 업로드'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="sr-only"
                          onChange={(e) => handleDocFileUpload(setBankbookFile, setBankbookFileName, e.target.files?.[0] || null)}
                        />
                      </label>
                      {bankbookFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDocFileUpload(setBankbookFile, setBankbookFileName, null)}
                          className="h-10 w-10 text-rose-500 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 4. 대표자 확인서류 & 5. 대표자 신분증 */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            대표자(관리인) 확인서류
                          </Label>
                          {representativeCertFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-1.5 text-indigo-600 cursor-pointer"
                              onClick={() => setPreviewDoc({ title: '대표자 확인서류', fileUrl: representativeCertFile, fileName: representativeCertFileName })}
                            >
                              보기
                            </Button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-1.5">재직증명서, 임명장 또는 소속증명서</p>
                        <label className="h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                          <Upload size={13} />
                          <span className="truncate">{representativeCertFileName || '확인서류 파일 업로드'}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="sr-only"
                            onChange={(e) => handleDocFileUpload(setRepresentativeCertFile, setRepresentativeCertFileName, e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            대표자 신분증 사본
                          </Label>
                          {representativeIdFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-1.5 text-indigo-600 cursor-pointer"
                              onClick={() => setPreviewDoc({ title: '대표자 신분증 사본', fileUrl: representativeIdFile, fileName: representativeIdFileName })}
                            >
                              보기
                            </Button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-1.5">주민등록증, 운전면허증 등</p>
                        <label className="h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                          <Upload size={13} />
                          <span className="truncate">{representativeIdFileName || '신분증 사본 업로드'}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="sr-only"
                            onChange={(e) => handleDocFileUpload(setRepresentativeIdFile, setRepresentativeIdFileName, e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 6. 대리인 신청 정보 및 서류 */}
                  <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isDelegated}
                        onChange={(e) => setIsDelegated(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-zinc-300"
                      />
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        대리인 신청 및 위임 서류 관리
                      </span>
                    </label>

                    {isDelegated && (
                      <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-slate-600 dark:text-zinc-300 mb-1 block">대리인 성명</Label>
                            <Input
                              placeholder="대리인 성명"
                              className="h-10 text-xs bg-white dark:bg-zinc-900"
                              value={delegateName}
                              onChange={(e) => setDelegateName(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600 dark:text-zinc-300 mb-1 block">대리인 연락처</Label>
                            <Input
                              placeholder="대리인 연락처"
                              className="h-10 text-xs bg-white dark:bg-zinc-900"
                              value={delegatePhone}
                              onChange={(e) => setDelegatePhone(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-200">대리인 위임장 사본</Label>
                              {delegationLetterFile && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] px-1 text-amber-700 cursor-pointer"
                                  onClick={() => setPreviewDoc({ title: '대리인 위임장', fileUrl: delegationLetterFile, fileName: delegationLetterFileName })}
                                >
                                  보기
                                </Button>
                              )}
                            </div>
                            <label className="h-10 px-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                              <Upload size={13} />
                              <span className="truncate">{delegationLetterFileName || '위임장 파일 업로드'}</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="sr-only"
                                onChange={(e) => handleDocFileUpload(setDelegationLetterFile, setDelegationLetterFileName, e.target.files?.[0] || null)}
                              />
                            </label>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-200">대리인 신분증 사본</Label>
                              {delegateIdFile && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] px-1 text-amber-700 cursor-pointer"
                                  onClick={() => setPreviewDoc({ title: '대리인 신분증 사본', fileUrl: delegateIdFile, fileName: delegateIdFileName })}
                                >
                                  보기
                                </Button>
                              )}
                            </div>
                            <label className="h-10 px-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 cursor-pointer truncate">
                              <Upload size={13} />
                              <span className="truncate">{delegateIdFileName || '신분증 파일 업로드'}</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="sr-only"
                                onChange={(e) => handleDocFileUpload(setDelegateIdFile, setDelegateIdFileName, e.target.files?.[0] || null)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end gap-3">
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="min-w-32 bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-md"
                >
                  {isSaving ? (
                    <>저장 중...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      단체서류 저장하기
                    </>
                  )}
                </Button>
              </div>

              {/* Info Note */}
              <Card className="mt-6 bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-slate-900">
                    <Info className="h-4 w-4 text-amber-600" />
                    안내사항
                  </h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• 서류 등록은 필수가 아니며, 가입 승인 및 정산 계약 단계에서 언제든 추가/수정하실 수 있습니다</li>
                    <li>• 등록된 서류는 최고 관리자의 보안 검토용으로만 안전하게 보관됩니다</li>
                    <li>• 정산 계좌 변경 시 검토 및 승인 절차를 거쳐 반영됩니다</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </RBACRouteGuard>

        {/* 서류 미리보기 모달 */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-zinc-800">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="text-indigo-600 h-5 w-5" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{previewDoc.title}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 cursor-pointer"
                  onClick={() => setPreviewDoc(null)}
                >
                  닫기
                </Button>
              </div>
              <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-50 dark:bg-zinc-950 min-h-[300px]">
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
                    <FileCheck size={48} className="mx-auto text-blue-500 mb-3" />
                    <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">서류 파일이 등록되어 있습니다</p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">{previewDoc.fileName || '서류 파일'}</p>
                    <a
                      href={previewDoc.fileUrl}
                      download={previewDoc.fileName || 'document'}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 cursor-pointer"
                    >
                      <Download size={14} /> 다운로드하여 열기
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
