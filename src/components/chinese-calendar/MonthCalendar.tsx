import React from 'react';
import type { Dayjs } from 'dayjs';
import type { MonthCalendarProps } from '@/types/calendar';

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

type DisplayMode = 'calendar' | 'past-card' | 'future-card';

function extractLunarDay(lunarDate: string): string {
  const monthNames = ['正月', '二月', '三月', '四月', '五月', '六月',
                      '七月', '八月', '九月', '十月', '冬月', '腊月'];
  for (const monthName of monthNames) {
    if (lunarDate.startsWith(monthName)) {
      return lunarDate.substring(monthName.length);
    }
  }
  return lunarDate;
}

export default function MonthCalendar({
  currentMonth,
  onDateSelect,
  getLunarDate,
  traditionalFestivals,
  isCurrentMonth,
  solarTerms = [],
  extraWorkDays = [],
  makeupWorkDays = [],
  tasks = [],
  selectedDate
}: MonthCalendarProps) {
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('calendar');
  const [displayMonth, setDisplayMonth] = React.useState(() => currentMonth);
  const today = displayMonth || currentMonth;

  const handlePreviousMonth = () => {
    if (displayMode === 'past-card') return;
    if (displayMode === 'future-card') {
      setDisplayMode('calendar');
      setDisplayMonth(displayMonth.subtract(1, 'month'));
    } else if (displayMonth.month() === 0 && displayMonth.year() === 2026) {
      setDisplayMode('past-card');
    } else {
      setDisplayMonth(displayMonth.subtract(1, 'month'));
    }
  };

  const handleNextMonth = () => {
    if (displayMode === 'future-card') return;
    if (displayMode === 'past-card') {
      setDisplayMode('calendar');
      setDisplayMonth(displayMonth.add(1, 'month'));
    } else if (displayMonth.month() === 11 && displayMonth.year() === 2026) {
      setDisplayMode('future-card');
    } else {
      setDisplayMonth(displayMonth.add(1, 'month'));
    }
  };

  if (displayMode === 'past-card') {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <button
            onClick={handlePreviousMonth}
            className="h-8 w-8 p-0 text-gray-300 cursor-not-allowed rounded-md transition-colors"
            disabled
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-500">已往</span>
          <button
            onClick={handleNextMonth}
            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-center p-12 min-h-[192px]">
          <div className="text-center space-y-6">
            <div className="text-4xl font-medium" style={{ color: '#d4a574', fontFamily: 'KaiTi, STKaiti, serif', letterSpacing: '0.2em' }}>
              一切过往
            </div>
            <div className="text-4xl font-medium" style={{ color: '#d4a574', fontFamily: 'KaiTi, STKaiti, serif', letterSpacing: '0.2em' }}>
              皆为序章
            </div>
            <div className="text-sm text-gray-500" style={{ letterSpacing: '0.1em' }}>
              ——莎士比亚比亚
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (displayMode === 'future-card') {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <button
            onClick={handlePreviousMonth}
            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-500">未至</span>
          <button
            onClick={handleNextMonth}
            className="h-8 w-8 p-0 text-gray-300 cursor-not-allowed rounded-md transition-colors"
            disabled
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-center p-12 min-h-[192px]">
          <div className="text-center space-y-6">
            <div className="text-4xl font-medium" style={{ color: '#d4a574', fontFamily: 'KaiTi, STKaiti, serif', letterSpacing: '0.1em' }}>
              国风节令归            </div>
            <div className="text-2xl font-medium text-gray-500" style={{ fontFamily: 'KaiTi, STKaiti, serif', letterSpacing: '0.05em' }}>
              敬请期待
            </div>
          </div>
        </div>
      </div>
    );
  }

  const daysInMonth = displayMonth.daysInMonth();
  const firstDayOfMonth = displayMonth.startOf('month').day();

  const calendarDays: Array<{ date: Dayjs | null; lunar: string }> = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ date: null, lunar: '' });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = displayMonth.date(day);
    const lunar = getLunarDate(date);
    calendarDays.push({ date, lunar });
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <button
          onClick={handlePreviousMonth}
          className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-base font-semibold text-gray-600 flex items-center gap-2">
          {displayMonth.format('YYYY年MM月')}
          {isCurrentMonth && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">本月</span>
          )}
        </span>
        <button
          onClick={handleNextMonth}
          className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekdays.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-bold text-white" style={{ backgroundColor: '#d4a574' }}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((item, index) => {
          if (!item.date) {
            return <div key={index} className="h-12 bg-gray-50/50" />;
          }

          const isToday = item.date!.isSame(today, 'day');
          const dateStr = item.date!.format('YYYY-MM-DD');
          const festival = traditionalFestivals[dateStr];
          const solarTerm = solarTerms.find(st => st.month === item.date!.month() + 1 && st.day === item.date!.date());
          const isExtraWorkDay = extraWorkDays.includes(dateStr);
          const isMakeupWorkDay = makeupWorkDays.includes(dateStr);
          const isWeekend = item.date!.day() === 0 || item.date!.day() === 6;
          const dayTasks = tasks.filter(t => t.due_date === dateStr || (!t.due_date && t.created_at?.startsWith(dateStr)));
          const hasTasks = dayTasks.length > 0;
          const isSelected = selectedDate ? item.date!.isSame(selectedDate, 'day') : false;

          return (
            <button
              key={index}
              onClick={() => onDateSelect(item.date!)}
              className={`
                h-12 p-1 flex flex-col items-center justify-center
                transition-all duration-200 relative
                ${isToday ? 'bg-amber-50' : ''}
                ${isSelected ? 'ring-2 ring-amber-400 bg-amber-50' : ''}
                ${!isToday && !isSelected ? 'hover:bg-gray-50' : ''}
              `}
            >
              {isExtraWorkDay || isMakeupWorkDay ? (
                <div className={`flex flex-col items-center justify-center w-11 h-14 rounded-full border relative ${isExtraWorkDay ? 'border-blue-500' : 'border-red-500'}`}>
                  <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-medium ${isExtraWorkDay ? 'bg-blue-500' : 'bg-red-500'}`}>
                    {isExtraWorkDay ? '休' : '班'}
                  </span>
                  <span className={`text-sm font-bold ${isWeekend ? (isMakeupWorkDay ? 'text-red-500' : 'text-blue-500') : festival ? 'text-amber-600' : solarTerm ? 'text-gray-600' : 'text-gray-600'}`}>
                    {item.date.date()}
                  </span>
                  <span className={`text-[10px] ${isWeekend ? (isMakeupWorkDay ? 'text-red-500' : 'text-blue-500') : festival ? 'text-amber-600 font-medium' : solarTerm ? 'text-blue-400 font-medium' : 'text-gray-500'}`}>
                    {festival || solarTerm?.name || extractLunarDay(item.lunar)}
                  </span>
                </div>
              ) : (
                <>
                  <span className={`text-sm font-bold relative z-10 ${isWeekend ? 'text-blue-500' : festival ? 'text-amber-600' : solarTerm ? 'text-gray-600' : 'text-gray-600'}`}>
                    {item.date.date()}
                  </span>
                  <span className={`text-[10px] ${isWeekend ? 'text-blue-500' : festival ? 'text-amber-600 font-medium' : solarTerm ? 'text-blue-400 font-medium' : 'text-gray-500'}`}>
                    {festival || solarTerm?.name || extractLunarDay(item.lunar)}
                  </span>
                </>
              )}
              {isToday && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#d4a574' }} />}
              {hasTasks && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5`}>
                  {dayTasks.slice(0, 3).map((t, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'} ${t.is_completed ? 'opacity-40' : ''}`} />
                  ))}
                  {dayTasks.length > 3 && <span className="text-[6px] text-gray-400">+{dayTasks.length - 3}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
