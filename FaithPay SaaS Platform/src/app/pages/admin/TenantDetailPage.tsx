import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp, Tenant } from '../../context/AppContext';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '../../components/ui/separator';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface PaymentConfig {
  tenantId: string;
  pgProvider: string;
  apiKey: string;
  secretKey: string;
  mid: string;
  loginId?: string;
  iv?: string;
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

  // Payment Config State
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [pgProvider, setPgProvider] = useState('');
  const [mid, setMid] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loginId, setLoginId] = useState('');
  const [iv, setIv] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showIv, setShowIv] = useState(false);

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
          setIsActive(result.data.isActive || false);
        }
      }
    } catch (error) {
      console.error('Error loading payment config:', error);
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
      console.error('Error saving payment config:', error);
      toast.error('결제 설정을 저장하는데 실패했습니다');
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8 text-purple-600" />
              단체 상세 정보
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              단체의 기본 정보와 결제 설정을 관리하세요
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {getReligionLabel(tenant.religionType)}
          </Badge>
        </div>

        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              기본 정보
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
                  신도용 봉헌 페이지 URL: /donate/{slug}
                </p>
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

        {/* Payment Configuration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  결제 정보 설정
                </CardTitle>
                <CardDescription>토스페이먼츠 API 키를 설정합니다</CardDescription>
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
          <CardContent className="space-y-4">
            {!paymentConfig ? (
              <div className="text-center py-8 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-amber-900 mb-1">
                  결제 설정이 아직 구성되지 않았습니다
                </p>
                <p className="text-xs text-amber-700">
                  아래 정보를 입력하여 결제 기능을 활성화하세요
                </p>
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pgProvider" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  PG 제공자 <span className="text-red-500">*</span>
                </Label>
                <Select value={pgProvider} onValueChange={setPgProvider}>
                  <SelectTrigger id="pgProvider">
                    <SelectValue placeholder="PG 제공자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toss">토스페이먼츠 (추천)</SelectItem>
                    <SelectItem value="portone">포트원 (구 아임포트)</SelectItem>
                    <SelectItem value="nice">NICE페이먼츠</SelectItem>
                    <SelectItem value="kg">KG이니시스</SelectItem>
                    <SelectItem value="nanopay">나노페이 (NANO)</SelectItem>
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
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                  >
                    {showSecretKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {pgProvider === 'nanopay' && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
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
                      className="bg-white"
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
                        className="pr-10 bg-white"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowIv(!showIv)}
                      >
                        {showIv ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white border-purple-200 text-purple-700 hover:bg-purple-100 hover:text-purple-800"
                      onClick={() => {
                        setMid('240000006');
                        setLoginId('smbtestshop');
                        setApiKey('2ATpmMwRycP14AwBe27mN8I9ZJfvqhDL');
                        setSecretKey('UfS2tccZNyz3HYxXJDhZH52Ujorqp5km');
                        setIv('vgqTyX5tBqnMXB68');
                        toast.success('나노페이 테스트 계정 정보가 입력되었습니다.');
                      }}
                    >
                      나노페이 테스트 계정 정보 채우기
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="cursor-pointer font-normal">
                  결제 기능 활성화
                </Label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">토스페이먼츠 API 키 발급 안내</p>
                    <ul className="text-xs space-y-1 text-blue-800">
                      <li>• 토스페이먼츠 개발자센터에서 API 키를 발급받으세요</li>
                      <li>• 테스트 환경에서는 테스트 키를, 운영 환경에서는 실제 키를 사용하세요</li>
                      <li>• Secret Key는 안전하게 보관하고 노출되지 않도록 주의하세요</li>
                    </ul>
                  </div>
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
      </div>
    </div>
  );
}