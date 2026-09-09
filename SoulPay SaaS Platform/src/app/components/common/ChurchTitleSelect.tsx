import React, { useState, useEffect } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

export const CHURCH_TITLE_PRESETS = [
  '성도',
  '집사',
  '안수집사',
  '권사',
  '장로',
  '목회자/교역자',
  '청년/학생',
] as const;

export type ChurchTitlePreset = typeof CHURCH_TITLE_PRESETS[number];

interface ChurchTitleSelectProps {
  value: string;
  onChange: (value: string) => void;
  religionType?: string; // 'protestant' | 'catholic' | 'buddhist' | etc.
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  showLabel?: boolean;
  label?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
}

export const ChurchTitleSelect: React.FC<ChurchTitleSelectProps> = ({
  value,
  onChange,
  religionType = 'protestant',
  className = '',
  selectClassName = '',
  inputClassName = '',
  showLabel = false,
  label,
  required = false,
  placeholder,
  id,
}) => {
  const isProtestant = religionType === 'protestant';
  const isPreset = CHURCH_TITLE_PRESETS.includes(value as ChurchTitlePreset);

  // If value is non-empty and not in presets, it's a custom title
  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => {
    return Boolean(value && !isPreset);
  });

  // Synchronize custom mode if value changes externally
  useEffect(() => {
    if (value && !isPreset) {
      setIsCustomMode(true);
    } else if (isPreset) {
      setIsCustomMode(false);
    }
  }, [value, isPreset]);

  const defaultLabel = isProtestant
    ? '직분'
    : religionType === 'catholic'
    ? '세례명'
    : religionType === 'buddhist'
    ? '법명'
    : '호칭';

  const defaultPlaceholder = isProtestant
    ? '예: 협동목사, 간사, 집사'
    : religionType === 'catholic'
    ? '예: 프란치스코 / 마리아'
    : religionType === 'buddhist'
    ? '예: 보현행'
    : '호칭 입력';

  // For non-protestant organizations (Catholic, Buddhist, etc.), render direct text input
  if (!isProtestant) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {showLabel && (
          <Label htmlFor={id} className="text-xs font-bold text-slate-700 dark:text-zinc-300">
            {label || defaultLabel} {required && <span className="text-red-500">*</span>}
          </Label>
        )}
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || defaultPlaceholder}
          className={`text-xs h-10 font-semibold bg-slate-50 dark:bg-zinc-800 border-slate-200 ${inputClassName}`}
        />
      </div>
    );
  }

  const selectValue = isCustomMode ? '__CUSTOM__' : (value || '');

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <Label htmlFor={id} className="text-xs font-bold text-slate-700 dark:text-zinc-300">
          {label || defaultLabel} {required && <span className="text-red-500">*</span>}
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
          <option value="">직분 선택 (선택 안 함)</option>
          {CHURCH_TITLE_PRESETS.map((t) => (
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
            placeholder={placeholder || '직분 직접 입력 (예: 안수집사, 간사, 협동목사)'}
            className={`text-xs h-10 font-semibold bg-white dark:bg-zinc-900 border-blue-400 focus-visible:ring-blue-500/30 ${inputClassName}`}
            autoFocus
          />
        )}
      </div>
    </div>
  );
};
