import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

export type PeriodUnit = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PeriodSelection {
  unit: PeriodUnit;
  startDate: Date;
  endDate: Date;
  label: string;
}

interface PeriodRangePickerProps {
  unit: PeriodUnit;
  onUnitChange: (unit: PeriodUnit) => void;
  selection: PeriodSelection;
  onSelectionChange: (newSelection: PeriodSelection) => void;
}

function formatDateToInputString(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function PeriodRangePicker({
  unit,
  onUnitChange,
  selection,
  onSelectionChange,
}: PeriodRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Picker internal view states
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [pickerDecadeStart, setPickerDecadeStart] = useState<number>(2020);

  // Draft selection state inside modal
  const [tempStartDate, setTempStartDate] = useState<Date | null>(selection.startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(selection.endDate);
  const [selectingMode, setSelectingMode] = useState<'start' | 'end'>('start');

  // Open modal handler
  const handleOpen = () => {
    const s = selection.startDate ? new Date(selection.startDate) : new Date();
    const e = selection.endDate ? new Date(selection.endDate) : new Date();
    setTempStartDate(s);
    setTempEndDate(e);
    setPickerYear(s.getFullYear());
    setPickerMonth(s.getMonth());
    setPickerDecadeStart(Math.floor(s.getFullYear() / 10) * 10);
    setSelectingMode('start');
    setIsOpen(true);
  };

  // Unit Switch Handler
  const handleUnitSwitch = (newUnit: PeriodUnit) => {
    onUnitChange(newUnit);
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = '';

    if (newUnit === 'daily') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getFullYear()}년 ${end.getMonth() + 1}월 ${end.getDate()}일`;
    } else if (newUnit === 'weekly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const weekStart = Math.ceil(start.getDate() / 7);
      const weekEnd = Math.ceil(end.getDate() / 7);
      label = `${start.getFullYear()}년 ${weekStart}주차 ~ ${start.getFullYear()}년 ${weekEnd}주차`;
    } else if (newUnit === 'monthly') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      label = `${start.getFullYear()}년 1월 ~ ${start.getFullYear()}년 12월`;
    } else if (newUnit === 'yearly') {
      start = new Date(now.getFullYear() - 2, 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      label = `${now.getFullYear() - 2}년 ~ ${now.getFullYear()}년`;
    }

    setTempStartDate(start);
    setTempEndDate(end);

    onSelectionChange({
      unit: newUnit,
      startDate: start,
      endDate: end,
      label,
    });
  };

  // Reset temp dates
  const handleReset = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    setTempStartDate(start);
    setTempEndDate(end);
    setSelectingMode('start');
  };

  // Modal Apply Handler
  const handleApply = () => {
    if (!tempStartDate) return;
    const rawEnd = tempEndDate || tempStartDate;
    
    // Ensure chronological start & end
    const s = tempStartDate <= rawEnd ? tempStartDate : rawEnd;
    const e = tempStartDate <= rawEnd ? rawEnd : tempStartDate;

    const start = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
    const end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);

    let label = '';
    if (unit === 'daily') {
      label = `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getFullYear()}년 ${end.getMonth() + 1}월 ${end.getDate()}일`;
    } else if (unit === 'weekly') {
      const wStart = Math.ceil(start.getDate() / 7);
      const wEnd = Math.ceil(end.getDate() / 7);
      label = `${start.getFullYear()}년 ${wStart}주차 ~ ${end.getFullYear()}년 ${wEnd}주차`;
    } else if (unit === 'monthly') {
      label = `${start.getFullYear()}년 ${start.getMonth() + 1}월 ~ ${end.getFullYear()}년 ${end.getMonth() + 1}월`;
    } else if (unit === 'yearly') {
      label = `${start.getFullYear()}년 ~ ${end.getFullYear()}년`;
    }

    onSelectionChange({
      unit,
      startDate: start,
      endDate: end,
      label,
    });
    setIsOpen(false);
  };

  // Manual input handlers
  const handleManualStartDateChange = (valStr: string) => {
    if (!valStr) return;
    const parts = valStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const newStart = new Date(y, m, d, 0, 0, 0, 0);
        setTempStartDate(newStart);
        if (tempEndDate && newStart > tempEndDate) {
          setTempEndDate(new Date(y, m, d, 23, 59, 59, 999));
        }
      }
    }
  };

  const handleManualEndDateChange = (valStr: string) => {
    if (!valStr) return;
    const parts = valStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const newEnd = new Date(y, m, d, 23, 59, 59, 999);
        setTempEndDate(newEnd);
        if (tempStartDate && newEnd < tempStartDate) {
          setTempStartDate(new Date(y, m, d, 0, 0, 0, 0));
        }
      }
    }
  };

  // 1. DAY CLICK HANDLER
  const handleDayClick = (d: Date) => {
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    if (selectingMode === 'start' || !tempStartDate) {
      setTempStartDate(dayStart);
      setTempEndDate(null);
      setSelectingMode('end');
    } else {
      if (dayStart < tempStartDate) {
        setTempEndDate(new Date(tempStartDate.getFullYear(), tempStartDate.getMonth(), tempStartDate.getDate(), 23, 59, 59, 999));
        setTempStartDate(dayStart);
      } else {
        setTempEndDate(dayEnd);
      }
      setSelectingMode('start');
    }
  };

  const isSelectedDay = (d: Date | null) => {
    if (!d) return false;
    const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (tempStartDate) {
      const sTime = new Date(tempStartDate.getFullYear(), tempStartDate.getMonth(), tempStartDate.getDate()).getTime();
      if (dTime === sTime) return true;
    }
    if (tempEndDate) {
      const eTime = new Date(tempEndDate.getFullYear(), tempEndDate.getMonth(), tempEndDate.getDate()).getTime();
      if (dTime === eTime) return true;
    }
    return false;
  };

  const isInRangeDay = (d: Date | null) => {
    if (!d || !tempStartDate || !tempEndDate) return false;
    const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const sTime = new Date(tempStartDate.getFullYear(), tempStartDate.getMonth(), tempStartDate.getDate()).getTime();
    const eTime = new Date(tempEndDate.getFullYear(), tempEndDate.getMonth(), tempEndDate.getDate()).getTime();
    return dTime > sTime && dTime < eTime;
  };

  // Helper date generators for Dual Calendar
  const getMonthDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const leftMonthDays = useMemo(() => getMonthDays(pickerYear, pickerMonth), [pickerYear, pickerMonth]);
  const rightMonthYear = pickerMonth === 11 ? pickerYear + 1 : pickerYear;
  const rightMonth = pickerMonth === 11 ? 0 : pickerMonth + 1;
  const rightMonthDays = useMemo(() => getMonthDays(rightMonthYear, rightMonth), [rightMonthYear, rightMonth]);

  // 2. WEEK CLICK HANDLER
  const handleWeekClick = (wStart: Date, wEnd: Date) => {
    const start = new Date(wStart.getFullYear(), wStart.getMonth(), wStart.getDate(), 0, 0, 0, 0);
    const end = new Date(wEnd.getFullYear(), wEnd.getMonth(), wEnd.getDate(), 23, 59, 59, 999);

    if (selectingMode === 'start' || !tempStartDate) {
      setTempStartDate(start);
      setTempEndDate(end);
      setSelectingMode('end');
    } else {
      if (start < tempStartDate) {
        setTempEndDate(new Date(tempStartDate.getFullYear(), tempStartDate.getMonth(), tempStartDate.getDate(), 23, 59, 59, 999));
        setTempStartDate(start);
      } else {
        setTempEndDate(end);
      }
      setSelectingMode('start');
    }
  };

  const isSelectedWeek = (wStart: Date, wEnd: Date) => {
    if (!tempStartDate) return false;
    const sTime = tempStartDate.getTime();
    const eTime = tempEndDate ? tempEndDate.getTime() : sTime;
    const ws = wStart.getTime();
    const we = wEnd.getTime();
    return (ws >= sTime && ws <= eTime) || (we >= sTime && we <= eTime) || (sTime >= ws && eTime <= we);
  };

  // Weeks for 주별
  const monthWeeks = useMemo(() => {
    const daysCount = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const weeks = [];
    let weekNum = 1;
    for (let startDay = 1; startDay <= daysCount; startDay += 7) {
      const endDay = Math.min(startDay + 6, daysCount);
      weeks.push({
        weekNum: weekNum++,
        name: `${weekNum - 1}주차`,
        rangeLabel: `${pickerMonth + 1}/${startDay} ~ ${pickerMonth + 1}/${endDay}`,
        startDate: new Date(pickerYear, pickerMonth, startDay, 0, 0, 0, 0),
        endDate: new Date(pickerYear, pickerMonth, endDay, 23, 59, 59, 999),
      });
    }
    return weeks;
  }, [pickerYear, pickerMonth]);

  // 3. MONTH CLICK HANDLER
  const handleMonthClick = (y: number, m: number) => {
    const start = new Date(y, m, 1, 0, 0, 0, 0);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    if (selectingMode === 'start' || !tempStartDate) {
      setTempStartDate(start);
      setTempEndDate(end);
      setSelectingMode('end');
    } else {
      if (start < tempStartDate) {
        setTempEndDate(new Date(tempStartDate.getFullYear(), tempStartDate.getMonth() + 1, 0, 23, 59, 59, 999));
        setTempStartDate(start);
      } else {
        setTempEndDate(end);
      }
      setSelectingMode('start');
    }
  };

  const isSelectedMonth = (y: number, m: number) => {
    if (!tempStartDate) return false;
    const cellStart = new Date(y, m, 1, 0, 0, 0, 0).getTime();
    const cellEnd = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();

    const sTime = new Date(tempStartDate.getFullYear(), tempStartDate.getMonth(), 1, 0, 0, 0, 0).getTime();
    const eTime = tempEndDate
      ? new Date(tempEndDate.getFullYear(), tempEndDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
      : sTime;

    return cellStart >= sTime && cellEnd <= eTime;
  };

  // 4. YEAR CLICK HANDLER
  const handleYearClick = (y: number) => {
    const start = new Date(y, 0, 1, 0, 0, 0, 0);
    const end = new Date(y, 11, 31, 23, 59, 59, 999);

    if (selectingMode === 'start' || !tempStartDate) {
      setTempStartDate(start);
      setTempEndDate(end);
      setSelectingMode('end');
    } else {
      if (start < tempStartDate) {
        setTempEndDate(new Date(tempStartDate.getFullYear(), 11, 31, 23, 59, 59, 999));
        setTempStartDate(start);
      } else {
        setTempEndDate(end);
      }
      setSelectingMode('start');
    }
  };

  const isSelectedYear = (y: number) => {
    if (!tempStartDate) return false;
    const sYear = tempStartDate.getFullYear();
    const eYear = tempEndDate ? tempEndDate.getFullYear() : sYear;
    return y >= sYear && y <= eYear;
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Segmented Button Group [ 일별 | 주별 | 월별 | 년별 ] */}
      <div className="inline-flex bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-inner">
        <button
          type="button"
          onClick={() => handleUnitSwitch('daily')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            unit === 'daily'
              ? 'bg-[#1E3A8A] text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          일별
        </button>
        <button
          type="button"
          onClick={() => handleUnitSwitch('weekly')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            unit === 'weekly'
              ? 'bg-[#1E3A8A] text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          주별
        </button>
        <button
          type="button"
          onClick={() => handleUnitSwitch('monthly')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            unit === 'monthly'
              ? 'bg-[#1E3A8A] text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          월별
        </button>
        <button
          type="button"
          onClick={() => handleUnitSwitch('yearly')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            unit === 'yearly'
              ? 'bg-[#1E3A8A] text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          년별
        </button>
      </div>

      {/* Clickable Date Range Button Display */}
      <button
        type="button"
        onClick={handleOpen}
        className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-500 rounded-xl px-4 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100 flex items-center gap-2.5 shadow-sm transition-all cursor-pointer"
      >
        <CalendarIcon className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
        <span>{selection.label}</span>
      </button>

      {/* Modal Popup */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 max-w-2xl w-full p-6 space-y-5 relative text-slate-900 dark:text-zinc-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">
                  {unit === 'daily' && '날짜 범위 선택'}
                  {unit === 'weekly' && '주차 범위 선택'}
                  {unit === 'monthly' && '월 범위 선택'}
                  {unit === 'yearly' && '연도 범위 선택'}
                </h3>
                <Badge className={selectingMode === 'start' ? 'bg-blue-600 text-white text-[11px]' : 'bg-indigo-600 text-white text-[11px]'}>
                  {selectingMode === 'start' ? '1. 시작시점 선택 중' : '2. 종료시점 선택 중'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs text-slate-500 gap-1 hover:text-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  초기화
                </Button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Direct Input Inputs for Start & End Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-slate-200 dark:border-zinc-700">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">시작 시점 (직접 지정)</label>
                <Input
                  type="date"
                  value={formatDateToInputString(tempStartDate)}
                  onChange={(e) => handleManualStartDateChange(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-zinc-900 font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">종료 시점 (직접 지정)</label>
                <Input
                  type="date"
                  value={formatDateToInputString(tempEndDate)}
                  onChange={(e) => handleManualEndDateChange(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-zinc-900 font-semibold"
                />
              </div>
            </div>

            {/* 1. DAILY: DUAL CALENDAR PICKER */}
            {unit === 'daily' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={() => setPickerMonth((m) => (m === 0 ? 11 : m - 1))}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex gap-16 font-bold text-sm">
                    <span>{pickerYear}년 {pickerMonth + 1}월</span>
                    <span>{rightMonthYear}년 {rightMonth + 1}월</span>
                  </div>
                  <button
                    onClick={() => setPickerMonth((m) => (m === 11 ? 0 : m + 1))}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8 border-t border-b border-slate-100 dark:border-zinc-800 py-4">
                  {/* Left Month Calendar */}
                  <div>
                    <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 mb-2">
                      <span className="text-red-500">일</span>
                      <span>월</span>
                      <span>화</span>
                      <span>수</span>
                      <span>목</span>
                      <span>금</span>
                      <span>토</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {leftMonthDays.map((d, i) => (
                        <div key={i} className="h-8 flex items-center justify-center">
                          {d ? (
                            <button
                              onClick={() => handleDayClick(d)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                isSelectedDay(d)
                                  ? 'bg-[#1E3A8A] text-white font-bold shadow-md'
                                  : isInRangeDay(d)
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-semibold'
                                  : 'hover:bg-slate-100 dark:hover:bg-zinc-800'
                              }`}
                            >
                              {d.getDate()}
                            </button>
                          ) : (
                            <span />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Month Calendar */}
                  <div>
                    <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 mb-2">
                      <span className="text-red-500">일</span>
                      <span>월</span>
                      <span>화</span>
                      <span>수</span>
                      <span>목</span>
                      <span>금</span>
                      <span>토</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {rightMonthDays.map((d, i) => (
                        <div key={i} className="h-8 flex items-center justify-center">
                          {d ? (
                            <button
                              onClick={() => handleDayClick(d)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                isSelectedDay(d)
                                  ? 'bg-[#1E3A8A] text-white font-bold shadow-md'
                                  : isInRangeDay(d)
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-semibold'
                                  : 'hover:bg-slate-100 dark:hover:bg-zinc-800'
                              }`}
                            >
                              {d.getDate()}
                            </button>
                          ) : (
                            <span />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. WEEKLY PICKER */}
            {unit === 'weekly' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4">
                  <button
                    onClick={() => setPickerMonth((m) => (m === 0 ? 11 : m - 1))}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="font-extrabold text-base">{pickerYear}년 {pickerMonth + 1}월</span>
                  <button
                    onClick={() => setPickerMonth((m) => (m === 11 ? 0 : m + 1))}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="border rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800">
                  {monthWeeks.map((w) => {
                    const isSelected = isSelectedWeek(w.startDate, w.endDate);
                    return (
                      <div
                        key={w.weekNum}
                        onClick={() => handleWeekClick(w.startDate, w.endDate)}
                        className={`flex items-center justify-between p-3.5 text-xs font-semibold cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#1E3A8A] text-white font-bold shadow-xs'
                            : 'hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <span>{w.name}</span>
                        <span>{w.rangeLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. MONTHLY PICKER */}
            {unit === 'monthly' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4">
                  <button
                    onClick={() => setPickerYear((y) => y - 1)}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="font-extrabold text-base">{pickerYear}년</span>
                  <button
                    onClick={() => setPickerYear((y) => y + 1)}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  {Array.from({ length: 12 }, (_, i) => i).map((mIdx) => {
                    const isSelected = isSelectedMonth(pickerYear, mIdx);
                    return (
                      <button
                        key={mIdx}
                        onClick={() => handleMonthClick(pickerYear, mIdx)}
                        className={`py-3.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1E3A8A] text-white shadow-md font-extrabold'
                            : 'bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {mIdx + 1}월
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. YEARLY PICKER */}
            {unit === 'yearly' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4">
                  <button
                    onClick={() => setPickerDecadeStart((y) => y - 10)}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="font-extrabold text-base">
                    {pickerDecadeStart} ~ {pickerDecadeStart + 9}
                  </span>
                  <button
                    onClick={() => setPickerDecadeStart((y) => y + 10)}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {Array.from({ length: 10 }, (_, i) => pickerDecadeStart + i).map((y) => {
                    const isSelected = isSelectedYear(y);
                    return (
                      <button
                        key={y}
                        onClick={() => handleYearClick(y)}
                        className={`py-3.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1E3A8A] text-white shadow-md font-extrabold'
                            : 'bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {y}년
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Bottom Preview & Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">
                {tempStartDate && tempEndDate
                  ? `${tempStartDate.getFullYear()}-${String(tempStartDate.getMonth() + 1).padStart(2, '0')}-${String(tempStartDate.getDate()).padStart(2, '0')} ~ ${tempEndDate.getFullYear()}-${String(tempEndDate.getMonth() + 1).padStart(2, '0')}-${String(tempEndDate.getDate()).padStart(2, '0')}`
                  : tempStartDate
                  ? `${tempStartDate.getFullYear()}-${String(tempStartDate.getMonth() + 1).padStart(2, '0')}-${String(tempStartDate.getDate()).padStart(2, '0')} (종료 시점 선택 중...)`
                  : '범위를 선택해 주세요'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-9 px-4 text-xs font-semibold"
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="h-9 px-5 text-xs font-bold bg-[#1E3A8A] hover:bg-blue-900 text-white"
                >
                  적용
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
