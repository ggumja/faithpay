import { useState } from 'react';
import { Tenant, ReligionType } from '../context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';

interface EditTenantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  onUpdateTenant: (tenantId: string, updates: Partial<Tenant>) => Promise<void>;
}

export default function EditTenantDialog({
  isOpen,
  onClose,
  tenant,
  onUpdateTenant,
}: EditTenantDialogProps) {
  const [formData, setFormData] = useState({
    name: tenant.name,
    slug: tenant.slug,
    religionType: tenant.religionType,
    primaryColor: tenant.primaryColor,
    logoUrl: tenant.logoUrl,
    description: tenant.description,
    address: tenant.address,
    phone: tenant.contact.phone,
    email: tenant.contact.email,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!formData.name.trim()) {
      toast.error('단체명을 입력해주세요');
      return;
    }
    if (!formData.slug.trim()) {
      toast.error('URL 슬러그를 입력해주세요');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('주소를 입력해주세요');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('전화번호를 입력해주세요');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('이메일을 입력해주세요');
      return;
    }

    setIsSaving(true);

    try {
      const updates: Partial<Tenant> = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        religionType: formData.religionType,
        primaryColor: formData.primaryColor,
        logoUrl: formData.logoUrl.trim(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        contact: {
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        },
      };

      await onUpdateTenant(tenant.id, updates);
      toast.success('단체 정보가 수정되었습니다');
      onClose();
    } catch (error) {
      toast.error('수정 중 오류가 발생했습니다');
      console.error('Error updating tenant:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getReligionLabel = (type: ReligionType) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>단체 정보 수정</DialogTitle>
          <DialogDescription>
            단체의 기본 정보를 수정합니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 단체명 */}
          <div className="space-y-2">
            <Label htmlFor="name">단체명 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 기쁨의교회"
            />
          </div>

          {/* URL 슬러그 */}
          <div className="space-y-2">
            <Label htmlFor="slug">URL 슬러그 *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="예: joyful-church"
            />
            <p className="text-xs text-muted-foreground">
              URL에 사용될 고유한 이름 (영문, 숫자, 하이픈만 사용)
            </p>
          </div>

          {/* 종교 유형 */}
          <div className="space-y-2">
            <Label htmlFor="religionType">종교 유형 *</Label>
            <Select
              value={formData.religionType}
              onValueChange={(value) =>
                setFormData({ ...formData, religionType: value as ReligionType })
              }
            >
              <SelectTrigger id="religionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="protestant">기독교</SelectItem>
                <SelectItem value="buddhist">불교</SelectItem>
                <SelectItem value="catholic">천주교</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 테마 색상 */}
          <div className="space-y-2">
            <Label htmlFor="primaryColor">테마 색상 *</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                placeholder="#1976d2"
                className="flex-1"
              />
            </div>
          </div>

          {/* 로고 URL */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl">로고 이미지 URL</Label>
            <Input
              id="logoUrl"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">소개 *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="단체 소개를 입력하세요"
              rows={3}
            />
          </div>

          {/* 주소 */}
          <div className="space-y-2">
            <Label htmlFor="address">주소 *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="서울특별시 강남구 테헤란로 123"
            />
          </div>

          {/* 연락처 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호 *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="02-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@example.org"
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
