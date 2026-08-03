import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp, Tenant, mockAdmins } from '../../context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Key,
  Lock,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  RefreshCw,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '../../components/ui/separator';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface PaymentConfig {
  tenantId: string;
  pgProvider: string;
  apiKey: string;
  secretKey: string;
  mid: string;
  loginId?: string;
  iv?: string;
  ver?: string;
  isActive: boolean;
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenants, updateTenantInfo, fetchTenants } = useApp();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Basic Info State
  const [name, setName] = useState('');
  const [religionType, setReligionType] = useState('');
  const [slug, setSlug] = useState('');

  // Main Page Tab State ('basic' | 'payment')
  const [activeTab, setActiveTab] = useState<'basic' | 'payment'>('basic');

  // Payment Config State
  const [paymentTab, setPaymentTab] = useState<'general' | 'billing'>('general');
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [pgProvider, setPgProvider] = useState('');
  const [mid, setMid] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loginId, setLoginId] = useState('');
  const [iv, setIv] = useState('');
  const [ver, setVer] = useState('');
  
  // Billing Key (Recurring Payment) State
  const [billMid, setBillMid] = useState('');
  const [billApiKey, setBillApiKey] = useState('');
  const [billSecretKey, setBillSecretKey] = useState('');
  const [billVer, setBillVer] = useState('240000005');

  const [enableCard, setEnableCard] = useState(true);
  const [enableEasyPayment, setEnableEasyPayment] = useState(true);
  const [enableVBank, setEnableVBank] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showIv, setShowIv] = useState(false);
  const [showBillApiKey, setShowBillApiKey] = useState(false);
  const [showBillSecretKey, setShowBillSecretKey] = useState(false);

  useEffect(() => {
    if (id) {
      loadTenantData();
    }
  }, [id, tenants]);

  const loadTenantData = async () => {
    setIsLoading(true);
    try {
      // Load tenant basic info
      const foundTenant = tenants.find(t => t.id === id);
      if (foundTenant) {
        setTenant(foundTenant);
        setName(foundTenant.name);
        setReligionType(foundTenant.religionType);
        setSlug(foundTenant.slug);
      } else {
        toast.error('단체를 찾을 수 없습니다');
        navigate('/admin');
        return;
      }

      // Load payment config
      await loadPaymentConfig();
    } catch (error) {
      console.error('Error loading tenant data:', error);
      toast.error('데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPaymentConfig = async () => {
    if (!id) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d0d82cc7/payment/${id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPaymentConfig(result.data);
          setPgProvider(result.data.pgProvider || '');
          setMid(result.data.mid || '');
          setApiKey(result.data.apiKey || '');
          setSecretKey(result.data.secretKey || '');
          setLoginId(result.data.loginId || '');
          setIv(result.data.iv || '');
          setVer(result.data.ver || '');
          setEnableCard(result.data.enableCard !== undefined ? result.data.enableCard : true);
          setEnableEasyPayment(result.data.enableEasyPayment !== undefined ? result.data.enableEasyPayment : true);
          setEnableVBank(result.data.enableVBank !== undefined ? result.data.enableVBank : true);
          setIsActive(result.data.isActive || false);
        }
      }
    } catch (error) {
      console.error('Error loading payment config, falling back to local storage:', error);
      // Fallback for offline/mock testing
      const localData = localStorage.getItem(`paymentConfig_${id}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        setPaymentConfig(parsed);
        setPgProvider(parsed.pgProvider || '');
        setMid(parsed.mid || '');
        setApiKey(parsed.apiKey || '');
        setSecretKey(parsed.secretKey || '');
        setLoginId(parsed.loginId || '');
        setIv(parsed.iv || '');
        setVer(parsed.ver || '');
        setEnableCard(parsed.enableCard !== undefined ? parsed.enableCard : true);
        setEnableEasyPayment(parsed.enableEasyPayment !== undefined ? parsed.enableEasyPayment : true);
        setEnableVBank(parsed.enableVBank !== undefined ? parsed.enableVBank : true);
        setIsActive(parsed.isActive || false);
      }
    }
  };

  const handleSaveBasicInfo = async () => {
    if (!id || !name.trim() || !slug.trim()) {
      toast.error('필수 항목을 입력해주세요');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d0d82cc7/tenants/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            name,
            religionType,
            slug,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update tenant');
      }

      const result = await response.json();
      if (result.success) {
        toast.success('단체 정보가 수정되었습니다');
        await fetchTenants();
      } else {
        toast.error('단체 정보 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('단체 정보를 수정하는데 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePaymentConfig = async () => {
    if (!id) return;

    if (!apiKey.trim() || !secretKey.trim()) {
      toast.error('API Key와 Secret Key를 입력해주세요');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d0d82cc7/payment/${id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            pgProvider,
            mid,
            apiKey,
            secretKey,
            loginId,
            iv,
            ver,
            enableCard,
            enableEasyPayment,
            enableVBank,
            isActive,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save payment config');
      }

      const result = await response.json();
      if (result.success) {
        toast.success('결제 설정이 저장되었습니다');
        await loadPaymentConfig();
      } else {
        toast.error('결제 설정 저장에 실패했습니다');
      }
    } catch (error) {
      console.error('Error saving payment config, falling back to local storage:', error);
      // Fallback for offline/mock testing
      const configData = {
        tenantId: id,
        pgProvider,
        mid,
        apiKey,
        secretKey,
        loginId,
        iv,
        ver,
        enableCard,
        enableEasyPayment,
        enableVBank,
        isActive,
      };
      localStorage.setItem(`paymentConfig_${id}`, JSON.stringify(configData));
      toast.success('결제 설정이 저장되었습니다');
      await loadPaymentConfig();
    } finally {
      setIsSaving(false);
    }
  };

  const getReligionLabel = (type: string) => {
    switch (type) {
      case 'protestant':
        return '기독교';
      case 'catholic':
        return '천주교';
      case 'buddhist':
        return '불교';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--hm-accent)] mx-auto mb-3"></div>
          <p className="text-[12px] text-[var(--hm-ink-3)]">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/system/admin/tenants')}
            className="shrink-0 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-semibold text-[var(--hm-ink)]">
                {tenant?.name ?? '단체 상세 정보'}
              </h1>
              <span className="inline-flex items-center text-[10.5px] font-medium rounded-[5px] px-2 py-0.5 border border-purple-200 bg-purple-50 text-purple-700">
                {getReligionLabel(tenant?.religionType)}
              </span>
            </div>
            <p className="text-[12.5px] text-[var(--hm-ink-3)] mt-0.5">
              단체의 기본 정보와 결제 설정을 관리하세요
            </p>
          </div>
        </div>

        {/* 탭 전환 스위치 버튼 그룹 */}
        <div className="flex gap-2 p-1 bg-slate-200/70 dark:bg-zinc-800 rounded-xl max-w-md">
          <button
            type="button"
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'basic'
                ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('basic')}
          >
            <Building2 className="h-4 w-4" />
            🏢 기본 정보 & 계정
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'payment'
                ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('payment')}
          >
            <CreditCard className="h-4 w-4" />
            💳 결제 / PG 설정
          </button>
        </div>

        {/* ── 탭 1: 기본 정보 ── */}
        {activeTab === 'basic' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                사찰 / 교회 기본 정보 및 로그인 계정
              </CardTitle>
            <CardDescription>단체의 기본 정보를 수정합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  단체명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 서울중앙교회"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="religionType">
                  종교 유형 <span className="text-red-500">*</span>
                </Label>
                <Select value={religionType} onValueChange={setReligionType}>
                  <SelectTrigger id="religionType">
                    <SelectValue placeholder="종교 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protestant">기독교</SelectItem>
                    <SelectItem value="catholic">천주교</SelectItem>
                    <SelectItem value="buddhist">불교</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="slug">
                  URL Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="예: seoul-central-church"
                />
                <p className="text-xs text-muted-foreground">
                  신도용 봉헌 페이지 URL: /{slug}
                </p>
              </div>

              {/* 담당자 및 계정/사업자 정보 카드 섹션 */}
              <div className="md:col-span-2 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-purple-600" />
                    대표 관리자 (주지스님 / 담임목사)
                  </Label>
                  <Input value={tenant.contact?.name || '주지스님 / 담임목사'} disabled className="bg-white dark:bg-zinc-900 text-sm font-semibold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                    담당자 연락처 (전화번호)
                  </Label>
                  <Input value={tenant.contact?.phone || '010-1234-5678'} disabled className="bg-white dark:bg-zinc-900 text-sm font-semibold text-indigo-600 dark:text-indigo-400" />
                </div>
                
                {/* 관리자 로그인 계정 아이디 & 임시 비밀번호 */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-emerald-600" />
                    관리자 로그인 아이디 (이메일)
                  </Label>
                  <Input value={tenant.contact?.email || `${tenant.slug}@faithpay.or.kr`} disabled className="bg-white dark:bg-zinc-900 text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                    <Key className="h-3.5 w-3.5 text-amber-500" />
                    발급 관리자 비밀번호
                  </Label>
                  <div className="relative">
                    <Input 
                      type={showSecretKey ? "text" : "password"}
                      value="fp348320" 
                      disabled 
                      className="bg-amber-50/60 dark:bg-amber-950/30 text-sm font-extrabold font-mono text-amber-900 dark:text-amber-300 border-amber-200" 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                    >
                      {showSecretKey ? "숨기기" : "보기"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">고유(사업자) 등록번호</Label>
                  <Input value={tenant.businessInfo?.registrationNumber || '240-82-12345'} disabled className="bg-white dark:bg-zinc-900 text-sm font-semibold font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">사찰/교회 소재지 주소</Label>
                  <Input value={tenant.businessInfo?.address || '충청남도 천안시 동남구 각원사길 245'} disabled className="bg-white dark:bg-zinc-900 text-sm font-semibold" />
                </div>
              </div>

              {/* 해당 단체 소속 관리자 계정 리스트 섹션 */}
              <div className="md:col-span-2 border-t pt-5 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-purple-600" />
                      소속 관리자 계정 목록 (총 {mockAdmins.filter(a => a.tenantId === tenant.id || (tenant.slug === 'gakwonsa' && a.tenantId === '1')).length || 1}명)
                    </h4>
                    <p className="text-xs text-muted-foreground">이 사찰/교회 시스템에 접근할 수 있는 관리 권한자 계정입니다.</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 font-bold">
                    + 관리자 계정 추가
                  </Button>
                </div>

                <div className="border rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold border-b">
                      <tr>
                        <th className="px-4 py-2.5">성명 / 담당자</th>
                        <th className="px-4 py-2.5">로그인 아이디 (이메일)</th>
                        <th className="px-4 py-2.5">관리 권한</th>
                        <th className="px-4 py-2.5">등록일</th>
                        <th className="px-4 py-2.5 text-center">계정 상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(() => {
                        const filteredAdmins = mockAdmins.filter(a => a.tenantId === tenant.id || (tenant.slug === 'gakwonsa' && a.tenantId === '1'));
                        const displayAdmins = filteredAdmins.length > 0 ? filteredAdmins : [
                          { id: '1', name: tenant.contact?.name || '주지스님 / 담임목사', email: tenant.contact?.email || `${tenant.slug}@faithpay.or.kr`, role: 'tenant_admin', createdAt: '2026-01-15' }
                        ];
                        return displayAdmins.map((adminUser: any) => (
                        <tr key={adminUser.id} className="hover:bg-slate-50 dark:hover:bg-zinc-850">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-zinc-100">
                            {adminUser.name}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-purple-700 dark:text-purple-400">
                            {adminUser.email}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={adminUser.role === 'tenant_admin' ? 'bg-purple-100 text-purple-800 font-bold' : 'bg-blue-100 text-blue-800'}>
                              {adminUser.role === 'tenant_admin' ? '최고 관리자' : '재무/보시 실무자'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono">
                            {adminUser.createdAt || '2026-01-15'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className="bg-emerald-100 text-emerald-800 font-bold">
                              🟢 정상 작동
                            </Badge>
                          </td>
                        </tr>
                      ));
                    })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSaveBasicInfo}
                disabled={isSaving || !name.trim() || !slug.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? '저장 중...' : '기본 정보 저장'}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* ── 탭 2: 결제 / PG 설정 ── */}
        {activeTab === 'payment' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  결제 정보 설정
                </CardTitle>
                <CardDescription>
                  {pgProvider === 'toss' ? '토스페이먼츠(TossPayments) API 키 및 결제 설정을 관리합니다' : '나노PG API 키 및 결제 설정을 관리합니다'}
                </CardDescription>
              </div>
              {paymentConfig && (
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className={isActive ? 'bg-green-600' : ''}
                >
                  {isActive ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      활성화
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      비활성화
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Payment Method Category Tabs */}
            <div className="flex gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-4">
              <button
                type="button"
                className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  paymentTab === 'general'
                    ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                onClick={() => setPaymentTab('general')}
              >
                <CreditCard className="h-4 w-4" />
                <span>💳 일반 결제 설정 (일시불/가상계좌)</span>
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  paymentTab === 'billing'
                    ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                onClick={() => setPaymentTab('billing')}
              >
                <Key className="h-4 w-4 text-amber-500" />
                <span>⚡ 빌링키(정기) 결제 설정 (매월 자동 청구)</span>
              </button>
            </div>

            {paymentTab === 'general' ? (
              /* ==================== GENERAL PAYMENT TAB ==================== */
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="pgProvider" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    PG 제공자 <span className="text-red-500">*</span>
                  </Label>
                  <Select value={pgProvider || 'nanopay'} onValueChange={setPgProvider}>
                    <SelectTrigger id="pgProvider">
                      <SelectValue placeholder="PG 제공자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nanopay">나노PG (NANO)</SelectItem>
                      <SelectItem value="toss">토스페이먼츠 (TossPayments)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mid" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {pgProvider === 'nanopay' ? '가맹점 코드 (shopcode)' : '가맹점 식별번호 (MID)'} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="mid"
                    value={mid}
                    onChange={(e) => setMid(e.target.value)}
                    placeholder={pgProvider === 'nanopay' ? "예: 240000006" : "예: toss_mid_12345"}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    API Key {pgProvider !== 'nanopay' && '(Client Key)'} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={pgProvider === 'nanopay' ? "API Key 입력" : "토스페이먼츠 API Key 입력"}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secretKey" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {pgProvider === 'nanopay' ? '암호화 KEY (Secret)' : 'Secret Key'} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="secretKey"
                      type={showSecretKey ? 'text' : 'password'}
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder={pgProvider === 'nanopay' ? "암호화 KEY 입력" : "토스페이먼츠 Secret Key 입력"}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                    >
                      {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {pgProvider === 'nanopay' && (
                  <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900">
                    <div className="space-y-2">
                      <Label htmlFor="loginId" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        로그인 ID (loginId) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="loginId"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        placeholder="예: smbtestshop"
                        className="bg-white dark:bg-zinc-900"
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="iv" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        초기화 벡터 (IV) <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="iv"
                          type={showIv ? 'text' : 'password'}
                          value={iv}
                          onChange={(e) => setIv(e.target.value)}
                          placeholder="IV 값 입력"
                          className="pr-10 bg-white dark:bg-zinc-900"
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowIv(!showIv)}
                        >
                          {showIv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ver" className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        버전 (ver) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="ver"
                        value={ver}
                        onChange={(e) => setVer(e.target.value)}
                        placeholder="예: smbtest 또는 1.0"
                        className="bg-white dark:bg-zinc-900"
                        autoComplete="off"
                      />
                    </div>

                    <div className="flex justify-end mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-white border-purple-200 text-purple-700 hover:bg-purple-100"
                        onClick={() => {
                          setMid('240000006');
                          setLoginId('smbtestshop');
                          setApiKey('2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL');
                          setSecretKey('UfS2tccZNyz3HYxXJDhZH52Ujorqp5km');
                          setIv('vgqTyX5tBqnMXB68');
                          setVer('smbtest');
                          toast.info('나노PG 일반결제 테스트 계정 정보가 채워졌습니다.');
                        }}
                      >
                        나노PG 일반결제 테스트 계정 정보 채우기
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ==================== BILLING KEY PAYMENT TAB ==================== */
              <div className="space-y-4 animate-fade-in p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/50">
                <div className="p-3.5 bg-amber-100/70 dark:bg-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                  ⚡ <strong>나노페이 정기결제(빌링키) 연동 v2.2.1 안내</strong><br />
                  매월 신도 자동 청구 결제를 처리하기 위한 정기결제 전용 가맹점 코드(Bill MID) 및 빌링 API Key를 설정합니다. 미입력 시 일반 결제 가맹점 정보가 기본 호환 적용됩니다.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billMid" className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                    정기결제 전용 가맹점 코드 (Bill MID / shopcode)
                  </Label>
                  <Input
                    id="billMid"
                    value={billMid}
                    onChange={(e) => setBillMid(e.target.value)}
                    placeholder="미입력 시 일반 가맹점 코드(240000006) 사용"
                    className="bg-white dark:bg-zinc-900 font-semibold"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billApiKey" className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
                    <Key className="h-4 w-4 text-amber-600" />
                    정기결제 빌링 API Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="billApiKey"
                      type={showBillApiKey ? 'text' : 'password'}
                      value={billApiKey}
                      onChange={(e) => setBillApiKey(e.target.value)}
                      placeholder="나노페이 발급 빌링 전용 API Key 입력"
                      className="pr-10 bg-white dark:bg-zinc-900 font-semibold"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowBillApiKey(!showBillApiKey)}
                    >
                      {showBillApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billSecretKey" className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
                    <Lock className="h-4 w-4 text-amber-600" />
                    정기결제 암호화 Key (Secret)
                  </Label>
                  <div className="relative">
                    <Input
                      id="billSecretKey"
                      type={showBillSecretKey ? 'text' : 'password'}
                      value={billSecretKey}
                      onChange={(e) => setBillSecretKey(e.target.value)}
                      placeholder="나노페이 발급 빌링 암호화 Key 입력"
                      className="pr-10 bg-white dark:bg-zinc-900 font-semibold"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowBillSecretKey(!showBillSecretKey)}
                    >
                      {showBillSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billVer" className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    정기결제 API 버전 (ver)
                  </Label>
                  <Input
                    id="billVer"
                    value={billVer}
                    onChange={(e) => setBillVer(e.target.value)}
                    placeholder="기본값: 240000005"
                    className="bg-white dark:bg-zinc-900 font-semibold"
                    autoComplete="off"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
                    onClick={() => {
                      setBillMid('240000005');
                      setBillApiKey('2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL');
                      setBillSecretKey('Q2Jv7LkNp5X3M8Yc6rW9T1Eb4F6HdKx6');
                      setBillVer('240000005');
                      toast.info('나노PG 빌링결제 v2.2.1 테스트 계정 정보가 채워졌습니다.');
                    }}
                  >
                    나노PG 빌링 테스트 계정 정보 채우기
                  </Button>
                </div>
              </div>
            )}

              {/* 결제 수단 사용 여부 체크박스 섹션 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span>💳</span>
                  <span>신도 제공 결제 수단 선택</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  체크 해제된 결제 수단은 신도 결제 페이지에서 즉시 숨김 처리됩니다.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={enableCard}
                      onChange={(e) => setEnableCard(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600 border-gray-300"
                    />
                    <span className="text-xs font-semibold text-slate-700">💳 신용/체크카드</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={enableEasyPayment}
                      onChange={(e) => setEnableEasyPayment(e.target.checked)}
                      className="h-4 w-4 rounded text-amber-500 border-gray-300"
                    />
                    <span className="text-xs font-semibold text-slate-700">⚡ 간편결제 (카카오/네이버/토스)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={enableVBank}
                      onChange={(e) => setEnableVBank(e.target.checked)}
                      className="h-4 w-4 rounded text-emerald-600 border-gray-300"
                    />
                    <span className="text-xs font-semibold text-slate-700">🏦 가상계좌 (무통장 입금)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="cursor-pointer font-normal">
                  전체 결제 기능 활성화
                </Label>
              </div>

              {pgProvider === 'nanopay' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">나노PG API 키 및 설정 안내</p>
                      <ul className="text-xs space-y-1 text-blue-800">
                        <li>• 나노페이 계약 후 발급받으신 가맹점 코드(shopcode)와 API Key, 암호화 KEY, IV를 정확히 입력해주세요</li>
                        <li>• ver 값은 테스트 가맹점인 경우 'smbtest'를, 실 가맹점인 경우 알맞은 버전 정보를 입력해야 합니다</li>
                        <li>• Key 값들이 유출되지 않도록 각별히 유의해 주시기 바랍니다</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

            <Separator className="my-4" />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSavePaymentConfig}
                disabled={isSaving || !apiKey.trim() || !secretKey.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? '저장 중...' : '결제 설정 저장'}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}