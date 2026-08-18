import { api } from '@/lib/api'
import type { CommodityApiItem } from '@/features/market/types'
import type { CurrencyData } from '@/features/currency/types'

export const fetchTrafficLogs = async () => {
  const { data } = await api.get('/admin/traffic')
  return data
}

export const fetchParsingLogs = async () => {
  const { data } = await api.get('/admin/logs')
  return data
}

export const fetchConfig = async (key: string) => {
  const { data } = await api.get(`/admin/config?key=${key}`)
  return data
}

export const updateConfig = async (key: string, value: string) => {
  const { data } = await api.post('/admin/config', { key, value })
  return data
}

export const fetchAllCurrencies = async () => {
  const { data } = await api.get<CurrencyData[]>('/admin/currencies')
  return data
}

export const createCurrencyAdmin = async (currency: any) => {
  const { data } = await api.post('/admin/currencies', currency)
  return data
}

export const updateCurrencyAdmin = async (key: string, currency: any) => {
  const { data } = await api.patch(`/admin/currencies/${key}`, currency)
  return data
}

export const deleteCurrencyAdmin = async (key: string) => {
  const { data } = await api.delete(`/admin/currencies/${key}`)
  return data
}

export const syncCurrencyHistoryAdmin = async (key: string) => {
  const { data } = await api.post(`/admin/currencies/${key}/sync`)
  return data
}

export const fetchBans = async () => {
  const { data } = await api.get('/admin/bans')
  return data
}

export const banIpAdmin = async (ip: string, reason?: string) => {
  const { data } = await api.post('/admin/bans', { ip, reason })
  return data
}

export const unbanIpAdmin = async (ip: string) => {
  const { data } = await api.delete(`/admin/bans/${ip}`)
  return data
}

export const fetchAllCommodities = async () => {
  const { data } = await api.get<CommodityApiItem[]>('/admin/commodities')
  return data
}

export const createCommodityAdmin = async (commodity: any) => {
  const { data } = await api.post('/admin/commodities', commodity)
  return data
}

export const updateCommodityAdmin = async (symbol: string, commodity: any) => {
  const { data } = await api.patch(`/admin/commodities/${symbol}`, commodity)
  return data
}

export const deleteCommodityAdmin = async (symbol: string) => {
  const { data } = await api.delete(`/admin/commodities/${symbol}`)
  return data
}

export const syncAllCommodityPrices = async () => {
  const { data } = await api.post('/admin/commodities/sync')
  return data
}

export const syncOneCommodityPrice = async (symbol: string) => {
  const { data } = await api.post(`/admin/commodities/${symbol}/sync`)
  return data
}

export const fetchCommodityLogs = async (limit: number = 50) => {
  const { data } = await api.get('/admin/commodities/logs', { params: { limit } })
  return data
}
