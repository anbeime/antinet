import { useState, useMemo, useCallback } from 'react';
import type { Dayjs } from 'dayjs';
import type { UseCalendarReturn, UseCalendarOptions } from '@/types/calendar';
import {
  getSeason,
  getLunarDate,
  getHolidayStatus,
  getDaysToNextHoliday,
  getFestivalInfo,
  getDailyPoetry,
  getTraditionalFestivalsData,
  getCalendarData
} from '@/utils/calendar/calendar';

const defaultExtraWorkDays = [
  '2026-01-01', '2026-01-02', '2026-02-16', '2026-02-17', '2026-02-18',
  '2026-02-19', '2026-02-20', '2026-02-23', '2026-04-06', '2026-05-01',
  '2026-05-04', '2026-05-05', '2026-06-19', '2026-09-25', '2026-10-01',
  '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'
];

const defaultMakeupWorkDays = [
  '2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'
];

export function useCalendar(
  initialDate: Dayjs,
  options: UseCalendarOptions = {}
): UseCalendarReturn {
  const {
    extraWorkDays = defaultExtraWorkDays,
    makeupWorkDays = defaultMakeupWorkDays
  } = options;

  const [currentDate, setCurrentDate] = useState<Dayjs>(initialDate);

  const calendarData = useMemo(() => {
    return getCalendarData(currentDate);
  }, [currentDate]);

  const isCurrentMonth = useMemo(() => {
    const today = initialDate;
    return currentDate.isSame(today, 'month');
  }, [currentDate, initialDate]);

  const goToToday = useCallback(() => {
    setCurrentDate(initialDate);
  }, [initialDate]);

  const memoizedGetSeason = useCallback((date: Dayjs) => getSeason(date), []);

  const memoizedGetLunarDate = useCallback((date: Dayjs) => getLunarDate(date), []);

  const memoizedGetHolidayStatus = useCallback((date: Dayjs) => getHolidayStatus(date), []);

  const memoizedGetDaysToNextHoliday = useCallback(
    (date: Dayjs) => getDaysToNextHoliday(date, extraWorkDays, makeupWorkDays),
    [extraWorkDays, makeupWorkDays]
  );

  const memoizedGetFestivalInfo = useCallback((date: Dayjs) => getFestivalInfo(date), []);

  const memoizedGetDailyPoetry = useCallback((date: Dayjs) => getDailyPoetry(date), []);

  const memoizedGetTraditionalFestivalsData = useCallback(
    (year: number) => getTraditionalFestivalsData(year),
    []
  );

  return {
    currentDate,
    setCurrentDate,
    calendarData,
    isCurrentMonth,
    goToToday,
    getSeason: memoizedGetSeason,
    getLunarDate: memoizedGetLunarDate,
    getHolidayStatus: memoizedGetHolidayStatus,
    getDaysToNextHoliday: memoizedGetDaysToNextHoliday,
    getFestivalInfo: memoizedGetFestivalInfo,
    getDailyPoetry: memoizedGetDailyPoetry,
    getTraditionalFestivalsData: memoizedGetTraditionalFestivalsData
  };
}


