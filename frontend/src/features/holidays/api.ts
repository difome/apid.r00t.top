import { api } from '@/lib/api'

export interface HolidaysApiResponse {
  status: 'success' | 'error'
  date_formatted?: string
  holidays?: Array<{ title: string; description?: string; link?: string }>
  historical_events?: Array<{ year: string; description: string }>
  birthdays?: Array<{ year: string; name: string; description?: string }>
  signs?: Array<string>
  prohibitions?: Array<string>
}

export const fetchHolidaysList = async (): Promise<HolidaysApiResponse> => {
  const { data } = await api.get<HolidaysApiResponse>('/holidays/list')
  return data
}
