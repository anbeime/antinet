import type { Dayjs } from 'dayjs';
import type {
  Season,
  HolidayStatus,
  FestivalInfo,
  Poetry,
  CalendarData
} from '@/types/calendar';
import {
  lunarMonths,
  lunarDays,
  lunarCalendar2025,
  lunarCalendar2026
} from '@/data/calendar/lunarCalendar';
import { solarTerms, traditionalFestivals } from '@/data/calendar/festivalData';
import { poetryDatabase } from '@/data/calendar/poetryDatabase';
import { holidays2026, holidayNames } from '@/data/calendar/holidayData';
import { monthBackgrounds } from '@/data/calendar/backgrounds';

const defaultExtraWorkDays = [
  '2026-01-01', '2026-01-02', '2026-02-16', '2026-02-17', '2026-02-18',
  '2026-02-19', '2026-02-20', '2026-02-23', '2026-04-06', '2026-05-01',
  '2026-05-04', '2026-05-05', '2026-06-19', '2026-09-25', '2026-10-01',
  '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'
];

const defaultMakeupWorkDays = [
  '2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'
];

export function getSeason(date: Dayjs): Season {
  const month = date.month() + 1;
  if (month >= 12 || month <= 2) return '冬日';
  if (month >= 3 && month <= 5) return '春日';
  if (month >= 6 && month <= 8) return '夏日';
  return '秋日';
}

export function getLunarDate(date: Dayjs): string {
  const dateStr = date.format('YYYY-MM-DD');
  const year = date.year();

  if (date.month() === 0 && date.date() === 1) {
    return '元旦';
  }

  let lunarData;
  if (year === 2026 && lunarCalendar2026[dateStr as keyof typeof lunarCalendar2026]) {
    lunarData = lunarCalendar2026[dateStr as keyof typeof lunarCalendar2026];
  } else if (year === 2025 && lunarCalendar2025[dateStr as keyof typeof lunarCalendar2025]) {
    lunarData = lunarCalendar2025[dateStr as keyof typeof lunarCalendar2025];
  }

  if (lunarData) {
    const [lunarMonth, lunarDay] = lunarData;
    if (lunarMonth === 12 && lunarDay === 8) {
      return '腊八';
    }
    const monthIndex = Math.max(0, Math.min(11, lunarMonth - 1));
    const dayIndex = Math.max(0, Math.min(29, lunarDay - 1));
    return `${lunarMonths[monthIndex]}${lunarDays[dayIndex]}`;
  }

  const day = date.date();
  const dayIndex = (day - 1) % 30;
  return lunarDays[dayIndex];
}

export function getHolidayStatus(date: Dayjs): HolidayStatus {
  const weekday = date.day();

  if (weekday === 0 || weekday === 6) {
    return '假日';
  }

  const dateStr = date.format('YYYY-MM-DD');
  if (holidays2026.includes(dateStr)) {
    return '假日';
  }

  return '工作日';
}

export function getDaysToNextHoliday(
  date: Dayjs,
  extraWorkDays: string[] = defaultExtraWorkDays,
  makeupWorkDays: string[] = defaultMakeupWorkDays
): string {
  const weekday = date.day();
  const dateStr = date.format('YYYY-MM-DD');

  if (extraWorkDays.includes(dateStr)) {
    return '今天调休';
  }

  const isWeekend = (weekday === 0 || weekday === 6) && !makeupWorkDays.includes(dateStr);

  if (isWeekend) {
    return '今天周末';
  }

  if (holidayNames[dateStr as keyof typeof holidayNames]) {
    return `今天${holidayNames[dateStr as keyof typeof holidayNames]}`;
  }

  let daysToHoliday = 5 - weekday;

  for (let i = 1; i <= 90; i++) {
    const futureDate = date.add(i, 'day');
    const futureDateStr = futureDate.format('YYYY-MM-DD');
    const futureWeekday = futureDate.day();

    if (!makeupWorkDays.includes(futureDateStr) && (futureWeekday === 0 || futureWeekday === 6)) {
      daysToHoliday = i;
      break;
    }

    if (holidayNames[futureDateStr as keyof typeof holidayNames]) {
      daysToHoliday = i;
      break;
    }
  }

  if (daysToHoliday === 0) {
    return '今天就是假期';
  } else if (daysToHoliday === 1) {
    return '明天就是假期';
  } else {
    return `还有${daysToHoliday}天放假`;
  }
}

export function getFestivalInfo(date: Dayjs): FestivalInfo {
  const seasonalGreetings = [
    { months: [12, 1, 2], name: '冬日', desc: '寒冬暖阳，静待春来' },
    { months: [3, 4, 5], name: '春日', desc: '春暖花开，生机盎然' },
    { months: [6, 7, 8], name: '夏日', desc: '夏日炎炎，清凉自在' },
    { months: [9, 10, 11], name: '秋日', desc: '秋高气爽，硕果累累' }
  ];

  const month = date.month() + 1;
  const day = date.date();

  const solarTerm = solarTerms.find(st => st.month === month && st.day === day);
  if (solarTerm) {
    return {
      name: solarTerm.name,
      description: solarTerm.desc,
      type: 'solarTerm'
    };
  }

  const festival = traditionalFestivals.find(f => f.month === month && f.day === day);
  if (festival) {
    return {
      name: festival.name,
      description: festival.desc,
      type: 'festival'
    };
  }

  const currentSeason = seasonalGreetings.find(sg => sg.months.includes(month));
  return {
    name: currentSeason?.name || '日常',
    description: currentSeason?.desc || '岁月静好，珍惜当下',
    type: 'season'
  };
}

export function getDailyPoetry(date: Dayjs): Poetry {
  const dateStr = date.format('YYYY-MM-DD');
  const month = date.month() + 1;
  const day = date.date();

  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = (seed << 5) - seed + dateStr.charCodeAt(i);
    seed |= 0;
  }

  const seasonalGreetings = [
    { months: [12, 1, 2], key: 'winter' as const },
    { months: [3, 4, 5], key: 'spring' as const },
    { months: [6, 7, 8], key: 'summer' as const },
    { months: [9, 10, 11], key: 'autumn' as const }
  ];

  const currentSeason = seasonalGreetings.find(sg => sg.months.includes(month));
  const seasonKey = currentSeason?.key || 'winter';

  const festival = traditionalFestivals.find(f => f.month === month && f.day === day);
  if (festival && festival.name in poetryDatabase.festivals) {
    const festivalPoems = poetryDatabase.festivals[festival.name as keyof typeof poetryDatabase.festivals];
    const poemIndex = Math.abs(seed) % festivalPoems.length;
    return festivalPoems[poemIndex];
  }

  const seasonPoems = poetryDatabase[seasonKey] || poetryDatabase.spring;
  const poemIndex = Math.abs(seed) % seasonPoems.length;
  return seasonPoems[poemIndex];
}

export function getTraditionalFestivalsData(year: number): Record<string, string> {
  const result: Record<string, string> = {};

  if (year === 2026) {
    traditionalFestivals.forEach(festival => {
      const dateStr = `2026-${String(festival.month).padStart(2, '0')}-${String(festival.day).padStart(2, '0')}`;
      result[dateStr] = festival.name;
    });
  }

  if (year === 2025) {
    result['2025-12-05'] = '冬至';
  }

  return result;
}

export function getCalendarData(date: Dayjs): CalendarData {
  const season = getSeason(date);
  const festivalInfo = getFestivalInfo(date);

  return {
    fullDate: date.format('YYYY年MM月DD日'),
    solarDate: date.format('DD'),
    month: date.format('MM月'),
    lunarDate: getLunarDate(date),
    weekday: date.format('dddd'),
    holidayStatus: getHolidayStatus(date),
    daysToHoliday: getDaysToNextHoliday(date),
    festivalInfo,
    dailyPoetry: getDailyPoetry(date),
    season
  };
}

export function getMonthBackground(month: number): string {
  return monthBackgrounds[month] || monthBackgrounds[1];
}

