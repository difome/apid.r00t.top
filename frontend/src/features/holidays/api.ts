import { api } from '@/lib/api'

export interface HolidayItem {
  name?: string
  title?: string
  description?: string
  link?: string
}

export interface HistoricalEventItem {
  year: number | string
  description: string
}

export interface BirthdayItem {
  year: number | string
  name?: string
  description?: string
}

export type TextOrStringItem = string | { text: string }

export interface HolidaysApiResponse {
  status: 'success' | 'error'
  date_formatted?: string
  holidays?: HolidayItem[]
  historical_events?: HistoricalEventItem[]
  birthdays?: BirthdayItem[]
  signs?: TextOrStringItem[]
  prohibitions?: TextOrStringItem[]
  count?: number
  cached_at?: string
}

export const fetchHolidaysList = async (): Promise<HolidaysApiResponse> => {
  const { data } = await api.get<HolidaysApiResponse>('/holidays/today')
  return data
}
