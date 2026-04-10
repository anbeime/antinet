import type { Dayjs } from 'dayjs';

export type Season = '春日' | '夏日' | '秋日' | '冬日';

export type FestivalType = 'solarTerm' | 'festival' | 'season';

export type HolidayStatus = '工作日' | '假日';

export interface DateCardProps {
  solarDate: string;
  lunarDate: string;
  weekday: string;
  month: string;
  holidayStatus: HolidayStatus;
  daysToHoliday: string;
  season: Season;
}

export interface FestivalInfo {
  name: string;
  description: string;
  type: FestivalType;
}

export interface Poetry {
  text: string;
}

export interface SolarTerm {
  month: number;
  day: number;
  name: string;
  desc: string;
}

export interface TraditionalFestival {
  month: number;
  day: number;
  name: string;
  desc: string;
}

export interface CountdownInfo {
  title: string;
  days: number;
  message: string;
}

export interface CalendarData {
  fullDate: string;
  solarDate: string;
  month: string;
  lunarDate: string;
  weekday: string;
  holidayStatus: HolidayStatus;
  daysToHoliday: string;
  festivalInfo: FestivalInfo;
  dailyPoetry: Poetry;
  season: Season;
}

export interface CalendarTask {
  id: number;
  title: string;
  due_date?: string;
  created_at?: string;
  priority: 'low' | 'medium' | 'high';
  is_completed: boolean;
}

export interface MonthCalendarProps {
  currentMonth: Dayjs;
  onDateSelect: (date: Dayjs) => void;
  getLunarDate: (date: Dayjs) => string;
  traditionalFestivals: Record<string, string>;
  isCurrentMonth: boolean;
  solarTerms?: SolarTerm[];
  extraWorkDays?: string[];
  makeupWorkDays?: string[];
  tasks?: CalendarTask[];
  selectedDate?: Dayjs | null;
}

export interface HappyFuelStationProps {
  daysToHoliday: string;
}

export interface DecoPatternProps {
  className?: string;
}

export interface UseCalendarOptions {
  extraWorkDays?: string[];
  makeupWorkDays?: string[];
  holidays?: string[];
  holidayNames?: Record<string, string>;
}

export interface UseCalendarReturn {
  currentDate: Dayjs;
  setCurrentDate: (date: Dayjs) => void;
  calendarData: CalendarData;
  isCurrentMonth: boolean;
  goToToday: () => void;
  getSeason: (date: Dayjs) => Season;
  getLunarDate: (date: Dayjs) => string;
  getHolidayStatus: (date: Dayjs) => HolidayStatus;
  getDaysToNextHoliday: (date: Dayjs) => string;
  getFestivalInfo: (date: Dayjs) => FestivalInfo;
  getDailyPoetry: (date: Dayjs) => Poetry;
  getTraditionalFestivalsData: (year: number) => Record<string, string>;
}
