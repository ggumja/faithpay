import React, { useState, useEffect, useMemo } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

export interface ReligionTitleConfig {
  label: string;
  defaultPlaceholder: string;
  presets: readonly string[];
}

export const RELIGION_TITLE_CONFIGS: Record<string, ReligionTitleConfig> = {
  // 1. 기독교 / 개신교 (교회)
  protestant: {
    label: '교회 직분',
    defaultPlaceholder: '직분 직접 입력 (예: 안수집사, 간사, 협동목사)',
    presets: ['성도', '집사', '안수집사', '권사', '장로', '목회자/교역자', '청년/학생'],
  },
  // 2. 천주교 / 가톨릭 (성당)
  catholic: {
    label: '세례명 / 교우 호칭',
    defaultPlaceholder: '세례명 또는 호칭 직접 입력 (예: 프란치스코, 안토니오, 사목위원)',
    presets: ['교우', '베드로', '요한', '바오로', '프란치스코', '마리아', '데레사', '루시아', '사목위원', '구역장'],
  },
  // 3. 불교 (사찰 / 암자)
  buddhist: {
    label: '법명 / 신도 호칭',
    defaultPlaceholder: '법명 또는 신도 호칭 직접 입력 (예: 법륜, 연화심, 보현행)',
    presets: ['불자', '보살', '거사', '처사', '신도회장', '바라밀', '보현행', '대원각'],
  },
  // 4. 일반 비영리 / 공익 / 기부 단체
  general: {
    label: '직책 / 회원 호칭',
    defaultPlaceholder: '직책 또는 호칭 직접 입력 (예: 고문, 정회원, 명예회원)',
    presets: ['회원', '후원자', '정회원', '후원이사', '자원봉사자', '운영위원', '임원'],
  },
};

// Aliases
RELIGION_TITLE_CONFIGS.church = RELIGION_TITLE_CONFIGS.protestant;
RELIGION_TITLE_CONFIGS.temple = RELIGION_TITLE_CONFIGS.buddhist;
RELIGION_TITLE_CONFIGS.charity = RELIGION_TITLE_CONFIGS.general;
RELIGION_TITLE_CONFIGS.npo = RELIGION_TITLE_CONFIGS.general;
RELIGION_TITLE_CONFIGS.default = RELIGION_TITLE_CONFIGS.general;

export function getTitleConfig(religionType?: string): ReligionTitleConfig {
  if (!religionType) return RELIGION_TITLE_CONFIGS.general;
  const key = religionType.toLowerCase().trim();
  return RELIGION_TITLE_CONFIGS[key] || RELIGION_TITLE_CONFIGS.general;
}

export interface MemberTitleSelectProps {
  value: string;
  onChange: (value: string) => void;
  religionType?: string; // 'protestant' | 'catholic' | 'buddhist' | 'general' 등
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  showLabel?: boolean;
  label?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
}

export const MemberTitleSelect: React.FC<MemberTitleSelectProps> = ({
  value,
  onChange,
  religionType = 'general',
  className = '',
  selectClassName = '',
  inputClassName = '',
  showLabel = false,
  label,
  required = false,
  placeholder,
  id,
}) => {
  const config = useMemo(() => getTitleConfig(religionType), [religionType]);
  const presets = config.presets;
  const isPreset = presets.includes(value);

  // If value is non-empty and not in preset list, default to custom mode
  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => {
    return Boolean(value && !isPreset);
  });

  // Keep custom mode synced when value or religionType changes
  useEffect(() => {
    if (value && !isPreset) {
      setIsCustomMode(true);
    } else if (isPreset) {
      setIsCustomMode(false);
    }
  }, [value, isPreset]);

  const selectValue = isCustomMode ? '__CUSTOM__' : (value || '');

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <Label htmlFor={id} className="text-xs font-bold text-slate-700 dark:text-zinc-300">
          {label || config.label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      <div className="space-y-2">
        <select
          id={id}
          value={selectValue}
          onChange={(e) => {
            const selected = e.target.value;
            if (selected === '__CUSTOM__') {
              setIsCustomMode(true);
            } else {
              setIsCustomMode(false);
              onChange(selected);
            }
          }}
          className={`w-full h-10 px-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-slate-850 dark:text-zinc-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${selectClassName}`}
        >
          <option value="">{config.label} 선택 (선택 안 함)</option>
          {presets.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value="__CUSTOM__">직접 입력</option>
        </select>

        {isCustomMode && (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || config.defaultPlaceholder}
            className={`text-xs h-10 font-semibold bg-white dark:bg-zinc-900 border-blue-400 focus-visible:ring-blue-500/30 ${inputClassName}`}
            autoFocus
          />
        )}
      </div>
    </div>
  );
};

// Backward compatibility alias
export const ChurchTitleSelect = MemberTitleSelect;
