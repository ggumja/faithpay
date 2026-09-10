import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp, DonationItem } from '../../context/AppContext';
import { donationItemsAPI } from '../../api/client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import {
  Menu,
  Plus,
  Edit2,
  Trash2,
  Coins,
  CheckCircle2,
  EyeOff,
  Sparkles,
  Info,
  SlidersHorizontal,
  CalendarDays,
  Repeat,
  FileEdit,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useTenantTerms } from '../../hooks/useTenantTerms';

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · macrostructure: Workbench · theme: Atelier Slate */

interface MenuItemFormProps {
  item?: DonationItem | null;
  onSave: (item: Partial<DonationItem>) => void;
  onClose: () => void;
  terminology: string;
  religionType?: string;
}

function MenuItemForm({ item, onSave, onClose, terminology, religionType }: MenuItemFormProps) {
  const terms = useTenantTerms(religionType);
  const prayerLabel = terms.prayerInputLabel;
  const [formData, setFormData] = useState<Partial<DonationItem>>(
    item || {
      name: '',
      description: '',
      amountType: 'flexible',
      allowRecurring: true,
      allowOneTime: true,
      enablePrayerField: true,
      enabled: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      toast.error('항목명과 설명을 입력해주세요');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              항목명 <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={religionType === 'buddhist' ? '인등 / 특별보시' : religionType === 'charity' || religionType === 'general' ? '정기후원' : '주일헌금'}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">공개 상태</Label>
            <div className="flex items-center justify-between px-3 h-9 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60">
              <span className={`text-xs font-medium ${formData.enabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                {formData.enabled ? '공개 중' : '비공개'}
              </span>
              <Switch
                checked={formData.enabled ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            항목 설명 및 안내 <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={
              religionType === 'buddhist'
                ? '가족의 건강과 안녕을 기원하는 정기 보시입니다.'
                : religionType === 'charity' || religionType === 'general'
                ? '더 나은 내일을 만들어가는 소중한 나눔입니다.'
                : '정성으로 드리는 주일 헌금입니다.'
            }
            rows={2}
            className="text-xs leading-relaxed resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* 결제 타입 */}
          <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5 text-indigo-600" />
              <Label className="text-xs font-semibold text-slate-800 dark:text-zinc-200">결제 방식 선택</Label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
                <Checkbox
                  checked={formData.allowOneTime ?? true}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allowOneTime: checked as boolean })
                  }
                />
                <span>일회성 {terms.donation}</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
                <Checkbox
                  checked={formData.allowRecurring ?? true}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allowRecurring: checked as boolean })
                  }
                />
                <span>정기구독 {terms.donation}</span>
              </label>
            </div>
          </div>

          {/* 추가 필드 */}
          <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <FileEdit className="h-3.5 w-3.5 text-indigo-600" />
              <Label className="text-xs font-semibold text-slate-800 dark:text-zinc-200">입력 항목 옵션</Label>
            </div>
            <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer pt-0.5">
              <Checkbox
                checked={formData.enablePrayerField ?? true}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enablePrayerField: checked as boolean })
                }
              />
              <span>{prayerLabel} 입력란 활성화</span>
            </label>
          </div>
        </div>

        {/* 금액 설정 */}
        <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 space-y-2.5">
          <Label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">금액 책정 방식</Label>
          <RadioGroup
            value={formData.amountType || 'flexible'}
            onValueChange={(value) =>
              setFormData({ ...formData, amountType: value as 'fixed' | 'flexible' })
            }
            className="grid grid-cols-2 gap-2"
          >
            <label htmlFor="flexible" className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${formData.amountType === 'flexible' ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold' : 'border-slate-200 bg-white text-slate-700'}`}>
              <RadioGroupItem value="flexible" id="flexible" />
              <span>자율 입력 (신도 직접 입력)</span>
            </label>
            <label htmlFor="fixed" className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${formData.amountType === 'fixed' ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold' : 'border-slate-200 bg-white text-slate-700'}`}>
              <RadioGroupItem value="fixed" id="fixed" />
              <span>지정 금액 (고정 납부액)</span>
            </label>
          </RadioGroup>
          {formData.amountType === 'fixed' && (
            <div className="pt-1.5 flex items-center gap-2">
              <Input
                type="number"
                placeholder="고정 납부 금액(원) 입력"
                value={formData.fixedAmount || ''}
                onChange={(e) =>
                  setFormData({ ...formData, fixedAmount: Number(e.target.value) })
                }
                className="h-8 text-xs max-w-xs"
              />
              <span className="text-xs text-slate-500">원</span>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-zinc-800">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
          취소
        </Button>
        <Button type="submit" size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:text-zinc-900">
          저장하기
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function DonationMenuManagement() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { currentTenant, setCurrentTenant, currentAdmin, tenants } = useApp();
  const terms = useTenantTerms(currentTenant);
  const [editingItem, setEditingItem] = useState<DonationItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dbItems, setDbItems] = useState<DonationItem[]>([]);

  useEffect(() => {
    const decodedSlug = tenantSlug ? decodeURIComponent(tenantSlug).trim().toLowerCase() : '';
    const tenant = tenants.find(
      (t) =>
        (t.slug && t.slug.toLowerCase() === decodedSlug) ||
        (t.id && t.id.toLowerCase() === decodedSlug) ||
        (t.name && t.name.toLowerCase() === decodedSlug)
    ) || currentTenant;

    if (tenant) {
      setCurrentTenant(tenant);
      donationItemsAPI.getItems(tenant.id || tenant.slug).then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setDbItems(res.data);
        }
      }).catch(() => {});
    }
  }, [tenantSlug, tenants, setCurrentTenant]);

  const refreshItems = () => {
    const targetKey = currentTenant?.id || currentTenant?.slug || tenantSlug;
    if (targetKey) {
      donationItemsAPI.getItems(targetKey).then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setDbItems(res.data);
        }
      }).catch(() => {});
    }
  };

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

  if (!currentAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>관리자 로그인이 필요합니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end pt-4">
            <Button onClick={() => navigate(tenantSlug ? `/${tenantSlug}/admin/login` : '/admin/login')}>
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPath = `/${tenantSlug}/admin/menu`;
  const donationItems = dbItems;

  const handleSave = async (itemData: Partial<DonationItem>) => {
    const baseList = dbItems;
    let updatedList: DonationItem[];

    if (editingItem?.id) {
      updatedList = baseList.map(item => item.id === editingItem.id ? { ...item, ...itemData } as DonationItem : item);
    } else {
      const newItem: DonationItem = {
        id: `item-${Date.now()}`,
        name: itemData.name || '새 항목',
        description: itemData.description || '',
        amountType: itemData.amountType || 'flexible',
        fixedAmount: itemData.fixedAmount,
        allowRecurring: itemData.allowRecurring ?? true,
        allowOneTime: itemData.allowOneTime ?? true,
        enablePrayerField: itemData.enablePrayerField ?? true,
        enabled: itemData.enabled ?? true,
      };
      updatedList = [...baseList, newItem];
    }

    setDbItems(updatedList);

    try {
      const targetId = currentTenant.id || currentTenant.slug || tenantSlug;
      if (targetId) {
        await donationItemsAPI.saveItems(targetId, updatedList);
      }
    } catch (e) {
      console.warn('Failed to save items to DB:', e);
    }

    if (editingItem) {
      toast.success(`${terms.donation} 항목이 저장되었습니다`);
    } else {
      toast.success(`새 ${terms.donation} 항목이 저장되었습니다`);
    }
    setIsDialogOpen(false);
    setEditingItem(null);
    refreshItems();
  };

  const handleDelete = async (itemId: string) => {
    const baseList = dbItems;
    const updatedList = baseList.filter(item => item.id !== itemId);

    setDbItems(updatedList);

    try {
      const targetId = currentTenant.id || currentTenant.slug || tenantSlug;
      if (targetId) {
        await donationItemsAPI.saveItems(targetId, updatedList);
      }
    } catch (e) {
      console.warn('Failed to delete item from DB:', e);
    }

    toast.success(`${terms.donation} 항목이 삭제되었습니다`);
    refreshItems();
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: DonationItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const enabledCount = donationItems.filter(i => i.enabled).length;

  return (
    <div className="flex min-h-screen bg-slate-50/60 dark:bg-zinc-950 font-sans antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
      </div>

      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-white/90 backdrop-blur shadow-xs">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <AdminSidebar tenantSlug={tenantSlug} currentPath={currentPath} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content Workbench */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-6 lg:p-8 space-y-6">
          
          {/* Header Banner: Compact & Typographic Focus */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-zinc-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                  {terms.donationItems}
                </h1>
                <Badge variant="outline" className="text-[11px] font-semibold bg-white dark:bg-zinc-900 border-slate-200 text-slate-600 dark:text-zinc-300">
                  총 {donationItems.length}개 항목 (노출 {enabledCount}개)
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5">
                {terms.donor}들이 온라인 {terms.donation} 화면에서 직접 선택할 수 있는 목적별 항목 카드를 구성합니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddNew} size="sm" className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold text-xs shadow-xs gap-1.5 cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    새 {terms.donation} 항목 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="pb-2 border-b border-slate-100 dark:border-zinc-800">
                    <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
                      {editingItem ? `${terms.donation} 항목 정보 수정` : `새로운 ${terms.donation} 항목 등록`}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      {terms.donor}의 선택 편의를 위해 정확한 명칭과 안내 설명을 작성하세요.
                    </DialogDescription>
                  </DialogHeader>
                  <MenuItemForm
                    item={editingItem}
                    onSave={handleSave}
                    onClose={() => {
                      setIsDialogOpen(false);
                      setEditingItem(null);
                    }}
                    terminology={terms.donation}
                    religionType={currentTenant.religionType}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* List Content: Compact 2-column or 1-column Dense Grid */}
          {donationItems.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
                <Coins className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-1">
                등록된 {terms.donation} 항목이 없습니다
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
                {terms.donor}들이 온라인에서 선택할 수 있도록 첫 번째 {terms.donation} 항목을 추가해 주세요.
              </p>
              <Button onClick={handleAddNew} size="sm" className="h-8 text-xs cursor-pointer">
                <Plus className="h-3.5 w-3.5 mr-1" />
                첫 번째 항목 등록하기
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {donationItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`group relative rounded-xl border bg-white dark:bg-zinc-900 p-4 transition-all duration-150 hover:shadow-sm ${
                    item.enabled
                      ? 'border-slate-200/90 dark:border-zinc-800'
                      : 'border-slate-200/60 bg-slate-50/70 dark:bg-zinc-900/40 opacity-75'
                  }`}
                >
                  {/* Top Row: Title, Badges, Action Buttons */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-zinc-100 truncate">
                        {item.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold px-1.5 py-0 rounded ${
                          item.enabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {item.enabled ? '공개 중' : '비공개'}
                      </Badge>
                    </div>

                    {/* Compact actions */}
                    <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        onClick={() => handleEdit(item)}
                        title="수정"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        onClick={() => handleDelete(item.id)}
                        title="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                    {item.description || '상세 설명이 등록되지 않았습니다.'}
                  </p>

                  {/* Bottom Metadata Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium">
                      <Coins className="h-3 w-3 text-slate-500" />
                      {item.amountType === 'fixed'
                        ? `${item.fixedAmount?.toLocaleString()}원 고정`
                        : '자율 금액'}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium">
                      <Repeat className="h-3 w-3 text-slate-500" />
                      {[
                        item.allowOneTime && '1회성',
                        item.allowRecurring && '정기',
                      ]
                        .filter(Boolean)
                        .join(' · ') || '납부방식 미지정'}
                    </span>

                    {item.enablePrayerField && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-medium">
                        {terms.prayerInputLabel} 입력 가능
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Operational Policy Guide Footer */}
          <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4 text-xs text-slate-500 dark:text-zinc-400 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <span className="font-semibold text-slate-800 dark:text-zinc-200 block">
                {terms.donation} 항목 설정 및 노출 기준
              </span>
              <p>
                • '비공개' 상태인 항목은 {terms.donor} 공개 웹 화면 목록에서 숨김 처리되어 결제가 발생하지 않습니다.
              </p>
              <p>
                • 정기 {terms.donation} 방식이 켜진 항목은 성도가 신청 시 매월 지정일에 자동 정기 결제(구독)로 접수됩니다.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}