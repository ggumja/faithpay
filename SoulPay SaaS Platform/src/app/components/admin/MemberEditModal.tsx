import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Edit2, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { MemberTitleSelect } from '../common/MemberTitleSelect';
import { memberAPI } from '../../api/client';
import { formatPhoneNumber, stripPhoneDigits } from '../../pages/admin/AdminAccountManagement';
import { openDaumPostcode } from '../../utils/daumPostcode';
import { MemberDetailData } from '../../pages/admin/MemberDetailPage';
import { Tenant } from '../../types';

interface MemberEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberDetailData | null;
  currentTenant: Tenant;
  onSaveSuccess: (updatedMember: MemberDetailData) => void;
}

export function MemberEditModal({
  isOpen,
  onOpenChange,
  member,
  currentTenant,
  onSaveSuccess,
}: MemberEditModalProps) {
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editZonecode, setEditZonecode] = useState('');
  const [editAddressBase, setEditAddressBase] = useState('');
  const [editAddressDetail, setEditAddressDetail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getTitleLabel = () => {
    if (currentTenant.religionType === 'catholic') return '세례명';
    if (currentTenant.religionType === 'buddhist') return '법명';
    if (currentTenant.religionType === 'protestant') return '직분';
    return '호칭';
  };

  const memberTerm =
    currentTenant.terminology?.donor ||
    (currentTenant.religionType === 'buddhist'
      ? '불자'
      : currentTenant.religionType === 'catholic'
      ? '신자'
      : currentTenant.religionType === 'protestant'
      ? '성도'
      : '회원');

  useEffect(() => {
    if (!isOpen || !member) return;

    setEditName(member.name || '');
    setEditTitle(member.baptismName || '');
    setEditPhone(formatPhoneNumber(member.phone || ''));
    setEditEmail(member.email || '');

    let parsedZonecode = member.zonecode || '';
    let parsedBase = member.addressBase || '';
    let parsedDetail = member.addressDetail || '';

    if (!parsedBase && member.address) {
      const match = member.address.match(/^\[(\d{5})\]\s*(.*)$/);
      if (match) {
        parsedZonecode = parsedZonecode || match[1];
        parsedBase = match[2].trim();
      } else {
        parsedBase = member.address.trim();
      }
    }

    setEditZonecode(parsedZonecode);
    setEditAddressBase(parsedBase);
    setEditAddressDetail(parsedDetail);
  }, [isOpen, member]);

  const handleSearchAddress = () => {
    openDaumPostcode((res) => {
      setEditZonecode(res.zonecode);
      setEditAddressBase(res.address);
      toast.success('주소가 선택되었습니다. 상세주소를 확인 또는 입력해 주세요.');
    });
  };

  const handleSave = async () => {
    if (!member) return;
    if (!editName.trim()) {
      toast.error(`${memberTerm} 성명을 입력해 주세요.`);
      return;
    }

    const cleanPhone = stripPhoneDigits(editPhone) || stripPhoneDigits(member.phone);
    const combinedAddress = editZonecode
      ? `[${editZonecode}] ${editAddressBase}${editAddressDetail ? ' ' + editAddressDetail.trim() : ''}`.trim()
      : `${editAddressBase}${editAddressDetail ? ' ' + editAddressDetail.trim() : ''}`.trim();

    setIsSaving(true);
    try {
      if (cleanPhone) {
        await memberAPI.updateProfile(cleanPhone, {
          name: editName.trim(),
          baptismName: editTitle.trim(),
          email: editEmail.trim(),
          zonecode: editZonecode.trim(),
          address: editAddressBase.trim(),
          addressDetail: editAddressDetail.trim(),
          fullAddress: combinedAddress,
        });
      }

      const updated: MemberDetailData = {
        ...member,
        name: editName.trim(),
        baptismName: editTitle.trim(),
        phone: cleanPhone || member.phone,
        email: editEmail.trim(),
        address: combinedAddress,
        zonecode: editZonecode.trim(),
        addressBase: editAddressBase.trim(),
        addressDetail: editAddressDetail.trim(),
      };

      onSaveSuccess(updated);
      onOpenChange(false);
      toast.success(`[${editName.trim()}] ${memberTerm} 정보가 수정 및 저장되었습니다.`);
    } catch (err: any) {
      console.warn('Failed to persist member profile edit in DB:', err);
      toast.error('회원 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 border-[var(--hm-border)] bg-[var(--hm-paper)] shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[var(--hm-ink)] flex items-center gap-2 font-[family-name:var(--font-display)]">
            <Edit2 className="h-4 w-4 text-[var(--hm-accent)]" />
            <span>{memberTerm} 정보 수정</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--hm-ink-3)] mt-1">
            선택한 {memberTerm}의 기본 정보를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} autoComplete="off" className="space-y-4 py-2">
          {/* 성명 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">성명 (이름) *</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              placeholder="회원 이름"
              className="text-xs rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
            />
          </div>

          {/* 종교별 호칭 (법명/세례명/직분) */}
          <MemberTitleSelect
            value={editTitle}
            onChange={setEditTitle}
            religionType={currentTenant.religionType}
            showLabel={true}
            label={getTitleLabel()}
            selectClassName="rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
            inputClassName="rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
          />

          {/* 휴대폰 번호 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">휴대폰 번호</Label>
            <Input
              type="tel"
              value={formatPhoneNumber(editPhone)}
              onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
              placeholder="010-0000-0000"
              className="text-xs rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)] font-[family-name:var(--font-mono)] tabular-nums"
            />
          </div>

          {/* 이메일 주소 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--hm-ink-2)]">이메일 주소</Label>
            <Input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="example@email.com"
              className="text-xs rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
            />
          </div>

          {/* 주소 (우편번호 검색 + 기본주소 + 상세주소) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--hm-ink-2)] flex items-center justify-between">
              <span>주소</span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">카카오 우편번호 검색 지원</span>
            </Label>

            {/* 우편번호 & 우편번호 검색 버튼 */}
            <div className="flex gap-2">
              <Input
                type="text"
                value={editZonecode}
                readOnly
                placeholder="우편번호"
                className="w-28 text-xs h-9 rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper-2)] text-[var(--hm-ink)] font-[family-name:var(--font-mono)] tabular-nums font-semibold"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearchAddress}
                className="h-9 px-3 text-xs font-semibold border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5 shadow-2xs rounded-lg"
              >
                <Search className="h-3.5 w-3.5" />
                <span>주소 검색</span>
              </Button>
            </div>

            {/* 기본 주소 */}
            <Input
              type="text"
              value={editAddressBase}
              onChange={(e) => setEditAddressBase(e.target.value)}
              placeholder="기본 주소 (주소 검색 버튼을 이용하세요)"
              className="text-xs h-9 rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
            />

            {/* 상세 주소 */}
            <Input
              type="text"
              value={editAddressDetail}
              onChange={(e) => setEditAddressDetail(e.target.value)}
              placeholder="상세 주소를 입력하세요 (예: 101동 1002호 / 2층)"
              className="text-xs h-9 rounded-lg border-[var(--hm-border)] bg-[var(--hm-paper)] text-[var(--hm-ink)]"
            />
          </div>

          {/* 주민등록번호 보안 방침 안내 (DB 미저장, 영수증 발급 시 1회성 입력 원칙) */}
          <div className="bg-[var(--hm-paper-2)] border border-[var(--hm-border)] rounded-xl p-3 text-xs text-[var(--hm-ink-3)] space-y-1">
            <p className="font-semibold text-[var(--hm-ink)] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--hm-accent)]" />
              <span>주민등록번호 보안 방침 안내</span>
            </p>
            <p className="text-[11px] leading-relaxed text-[var(--hm-ink-3)]">
              개인정보보호법에 따라 주민등록번호는 회원 DB에 저장을 허용하지 않으며, 소득공제용 영수증 발급 시 1회성으로 안전하게 입력받습니다.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs border-[var(--hm-border)] text-[var(--hm-ink-2)] rounded-lg cursor-pointer"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="hm-cobalt-btn bg-blue-600 hover:brightness-110 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer"
            >
              {isSaving ? '저장 중...' : '수정 사항 저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
