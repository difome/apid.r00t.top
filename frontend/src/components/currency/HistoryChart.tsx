import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { RefreshCcw, TrendingUp, TrendingDown, Clock, Calendar, XIcon } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useCurrencyHistory, useCurrencyYears, useCurrencies } from "@/hooks/use-currencies"
import { useMemo, useState, useEffect, useRef } from "react"
import type { ElementType } from "react"
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from "framer-motion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { MarketAsset } from '@/types/market'
import { formatDateForInput, getChartStats, getLocale, toChartPoints } from '@/lib/history-chart'
import { useMediaQuery } from '@/hooks/use-media-query'

interface HistoryChartProps {
  selectedKey: string | null
  onClose: () => void
  basePath?: string
  currencyData?: MarketAsset
}

export function HistoryChart({ selectedKey, onClose, basePath = '/currency', currencyData }: HistoryChartProps) {
  const { list: currencies } = useCurrencies()
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const isMobile = useMediaQuery('(max-width: 639px)')

  const [days, setDays] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const d = params.get('days');
      if (d) return parseInt(d) || 7;
    }
    return 7;
  });

  const [selectedYear, setSelectedYear] = useState<number | undefined>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const y = params.get('year');
      if (y) return parseInt(y) || undefined;
    }
    return undefined;
  });

  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('startDate') || '';
    }
    return '';
  });

  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('endDate') || '';
    }
    return '';
  });

  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (selectedKey) {
      setDays(7);
      setSelectedYear(undefined);
      setCustomStartDate('');
      setCustomEndDate('');
    }
  }, [selectedKey]);

  const { data: yearsRes } = useCurrencyYears(selectedKey, basePath)

  const years = useMemo(() => {
    if (!yearsRes?.success) return []
    return yearsRes.data.filter(y => y >= 1999).sort((a, b) => b - a)
  }, [yearsRes])

  const { data: historyRes, isLoading } = useCurrencyHistory(
    selectedKey,
    days,
    selectedYear,
    days === 0 && !selectedYear ? (customStartDate || undefined) : undefined,
    days === 0 && !selectedYear ? (customEndDate || undefined) : undefined,
    basePath
  )

  useEffect(() => {
    const today = new Date();

    if (selectedYear) {
      const start = new Date(selectedYear, 0, 1);
      const end = selectedYear === today.getFullYear()
        ? today
        : new Date(selectedYear, 11, 31);
      setCustomStartDate(formatDateForInput(start));
      setCustomEndDate(formatDateForInput(end));
    } else if (days > 0) {
      const end = today;
      const start = new Date();
      if (days === 7300) {
        if (historyRes?.success && historyRes.data.length > 0) {
          const firstDate = new Date(historyRes.data[0].createdAt);
          setCustomStartDate(formatDateForInput(firstDate));
        } else {
          const minYear = years.length > 0 ? Math.min(...years) : 1999;
          setCustomStartDate(`${minYear}-01-01`);
        }
      } else {
        start.setDate(today.getDate() - days);
        setCustomStartDate(formatDateForInput(start));
      }
      setCustomEndDate(formatDateForInput(end));
    }
  }, [days, selectedYear, years, historyRes]);

  const currency = useMemo(() => {
    if (currencyData) return currencyData;
    return (selectedKey ? currencies.find(c => c.key === selectedKey) : null) ?? null;
  }, [currencies, selectedKey, currencyData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (selectedKey) {
      url.searchParams.set('currency', selectedKey);
      if (days === 0 && !selectedYear && customStartDate && customEndDate) {
        url.searchParams.set('startDate', customStartDate);
        url.searchParams.set('endDate', customEndDate);
        url.searchParams.delete('days');
        url.searchParams.delete('year');
      } else if (selectedYear) {
        url.searchParams.set('year', String(selectedYear));
        url.searchParams.delete('days');
        url.searchParams.delete('startDate');
        url.searchParams.delete('endDate');
      } else {
        url.searchParams.set('days', String(days));
        url.searchParams.delete('year');
        url.searchParams.delete('startDate');
        url.searchParams.delete('endDate');
      }
    } else {
      url.searchParams.delete('currency');
      url.searchParams.delete('year');
      url.searchParams.delete('days');
      url.searchParams.delete('startDate');
      url.searchParams.delete('endDate');
    }
    window.history.pushState({}, '', url.pathname + url.search);
  }, [selectedKey, days, selectedYear, customStartDate, customEndDate]);

  const historyData = useMemo(() => {
    if (!historyRes?.success) return []
    const isIntraday = days === 1 && selectedYear === undefined;
    return toChartPoints(historyRes.data, lang, isIntraday)
  }, [historyRes, lang, days, selectedYear])

  const stats = useMemo(() => {
    return getChartStats(historyData)
  }, [historyData])

  const currencyTitle = useMemo(() => {
    if (!currency) return selectedKey?.replace('_to_', ' / ') || '';
    const base = currency.baseCurrency.toUpperCase();
    const target = currency.targetCurrency.toUpperCase();
    
    const trans = currency.params?.translation;
    const transBase = currency.baseName || trans?.base?.[lang] || t(`currency_codes.${base}`, base);
    const transTarget = currency.targetName || trans?.target?.[lang] || t(`currency_codes.${target}`, target);
    return `${transBase} / ${transTarget}`;
  }, [currency, selectedKey, t, lang]);

  const formatPrice = (price: number) => {
    if (!currency) return String(price);
    const targetSymbol = currency.key.endsWith('_to_usd') ? '$' : (currency.key.startsWith('usd_to_uah') ? '₴' : (currency.key.startsWith('usd_to_rub') ? '₽' : ''));
    
    let fractionDigits = 2;
    if (price < 0.01) fractionDigits = 6;
    else if (price < 1) fractionDigits = 4;
    
    const formatted = price.toLocaleString(lang === 'uk' ? 'uk-UA' : 'ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: fractionDigits
    });
    
    return `${formatted} ${targetSymbol || currency.targetCurrency}`;
  };

  const trendColor = stats.direction === 'up' ? 'text-emerald-300/90 bg-emerald-500/8 border-emerald-400/15' : 
                     stats.direction === 'down' ? 'text-red-300/90 bg-red-500/8 border-red-400/15' : 
                      'text-muted-foreground bg-secondary border-border';

  const chartColor = stats.direction === 'down' ? '#b45a63' : stats.direction === 'up' ? '#6f9b82' : '#8a8a8a';

  const historyPeriodLabel = useMemo(() => {
    if (customStartDate && customEndDate) {
      const formatD = (dStr: string) => {
        const d = new Date(dStr);
        return d.toLocaleDateString(getLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' });
      };
      return `${t('currency.historyFor')} ${formatD(customStartDate)} — ${formatD(customEndDate)}`;
    }
    if (selectedYear) {
      return `${t('currency.historyFor')} ${selectedYear} ${t('currency.yearSign')}`;
    }
    if (days === 7300) {
      return lang === 'uk' ? 'Вся історія котирувань' : 'Вся история котировок';
    }
    return `${t('currency.historyFor')} ${days} ${t('currency.daysSign')}`;
  }, [selectedYear, days, customStartDate, customEndDate, lang, t]);

  const renderInnerContent = (inDialog: boolean) => {
    const TitleComponent: ElementType = inDialog ? DialogTitle : 'h2';
    const DescriptionComponent: ElementType = inDialog ? DialogDescription : 'div';

    return (
      <>
        {/* Custom Header with real values, flags & trend badge */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4 mb-4 pr-8 md:pr-0">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {currency?.emoji && <span className="text-2xl leading-none">{currency.emoji}</span>}
              <TitleComponent className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground font-sans flex flex-wrap items-center gap-x-2 gap-y-1 pr-6 sm:pr-0">
                {currencyTitle}
              </TitleComponent>
              
              {/* Dynamic period trend badge */}
              {historyData.length > 0 && (
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${trendColor}`}>
                  {stats.direction === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : stats.direction === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                  {stats.percent >= 0 ? '+' : ''}{stats.percent.toFixed(2)}%
                </div>
              )}
            </div>
            
            <DescriptionComponent className="text-muted-foreground text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 shrink-0" />
              {historyPeriodLabel}
            </DescriptionComponent>
          </div>

        {/* Current Rate Display */}
        {currency && (
          <div className="text-left md:text-right shrink-0 whitespace-nowrap">
            <div className="text-xl sm:text-2xl font-semibold tracking-tight font-sans text-foreground">
              {formatPrice(Number(currency.latestRate.price))}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">
              {t('currency.currentRate')}
            </div>
          </div>
        )}
      </div>

      {/* Toolbar Row for Period & Year Selectors */}
      <div className="relative z-10 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between mb-4 w-full min-w-0">
        <div className="flex bg-card p-1 rounded-xl border border-border items-center gap-1 overflow-x-auto w-full md:w-auto scrollbar-none shrink-0 min-w-0">
          {[
            { d: 7, label: t('currency.period_7d') },
            { d: 30, label: t('currency.period_30d') },
            { d: 90, label: t('currency.period_90d') },
            { d: 365, label: t('currency.period_365d') },
            { d: 7300, label: t('currency.period_max') }
          ].map(({ d, label }) => {
            const isActive = days === d && selectedYear === undefined;
            return (
              <button
                key={d}
                onClick={() => {
                  if (isActive) return;
                  setSelectedYear(undefined)
                  setCustomStartDate('')
                  setCustomEndDate('')
                  setDays(d)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1 ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {isActive && <span className="text-xs font-semibold mr-0.5">✓</span>}
                {label}
              </button>
            );
          })}
          
          {years.length > 0 && (
            <>
              <div className="w-px h-4 bg-border mx-1 shrink-0" />
              <Select
                value={String(selectedYear || new Date().getFullYear())}
                onValueChange={(val) => {
                  if (val) {
                    setDays(0)
                    setSelectedYear(Number(val))
                  }
                }}
              >
                <SelectTrigger className="h-8 bg-transparent hover:bg-secondary border-0 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0 px-3 min-w-[95px] transition-colors shrink-0">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue placeholder={t('currency.selectYear')} />
                </SelectTrigger>
                <SelectContent position="popper" align="end" className="bg-popover border-border rounded-xl max-h-[220px] shadow-lg mt-1.5 min-w-[110px]">
                  {years.map((y) => (
                    <SelectItem 
                      key={y} 
                      value={String(y)}
                      className="text-xs font-semibold text-muted-foreground focus:bg-secondary focus:text-foreground rounded-lg py-2 pr-8 pl-3 cursor-pointer transition-colors"
                    >
                      {y} {t('currency.yearSign')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Row 2: Gorgeous Custom Date Range Picker inputs matching the screenshot */}
        <div className="flex items-center justify-between sm:justify-start gap-2 bg-card border border-border px-3 py-1.5 rounded-xl text-sm font-medium text-muted-foreground w-full md:w-auto overflow-x-auto scrollbar-none shrink-0 min-w-0">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            {lang === 'uk' ? 'Період:' : 'Период:'}
          </span>
          <input 
            type="date" 
            value={customStartDate} 
            onChange={(e) => {
              const val = e.target.value;
              setCustomStartDate(val);
              setSelectedYear(undefined);
              setDays(0);
              if (val && !customEndDate) {
                setCustomEndDate(new Date().toISOString().split('T')[0]);
              }
            }}
            max={customEndDate || undefined}
            className="bg-transparent border-0 text-foreground font-medium font-sans text-sm outline-none cursor-pointer focus:text-primary transition-colors py-0.5"
          />
          <span className="text-muted-foreground px-1">—</span>
          <input 
            type="date" 
            value={customEndDate} 
            onChange={(e) => {
              const val = e.target.value;
              setCustomEndDate(val);
              setSelectedYear(undefined);
              setDays(0);
              if (val && !customStartDate) {
                const prev = new Date(val);
                prev.setDate(prev.getDate() - 7);
                setCustomStartDate(prev.toISOString().split('T')[0]);
              }
            }}
            min={customStartDate || undefined}
            max={new Date().toISOString().split('T')[0]}
            className="bg-transparent border-0 text-foreground font-medium font-sans text-sm outline-none cursor-pointer focus:text-primary transition-colors py-0.5"
          />
        </div>
      </div>
      
      {/* Beautiful Chart Container with Subtle Neon Glow */}
      <div className="relative z-10 h-[220px] sm:h-[280px] md:h-[340px] min-h-[220px] sm:min-h-[280px] md:min-h-[340px] w-full mt-2 bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <RefreshCcw className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground animate-pulse">
              {t('currency.loadingData')}
            </span>
          </div>
        ) : historyData.length > 0 ? (
          <div className="absolute inset-0 p-4 w-full h-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.18}/>
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="uniqueId" 
                  tickFormatter={(val) => {
                    const dt = new Date(val);
                    const locale = lang === 'uk' ? 'uk-UA' : (lang === 'ru' ? 'ru-RU' : 'en-US');
                    const isIntraday = days === 1 && selectedYear === undefined;
                    return isIntraday 
                      ? dt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                      : dt.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
                  }}
                  stroke="var(--border)"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-sans)' }}
                  tickMargin={15}
                  minTickGap={30}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 500, fontFamily: 'var(--font-sans)' }} 
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => {
                    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
                    if (val < 0.01) return val.toFixed(4);
                    if (val < 1) return val.toFixed(3);
                    return val.toFixed(2);
                  }}
                  width={45}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={({ active, payload }) => {
                    if (active && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-xl p-3 shadow-lg flex flex-col gap-0.5 min-w-[120px] text-popover-foreground">
                          <span className="text-xs text-muted-foreground font-medium">
                            {data.rawDate}
                          </span>
                          <span className="text-sm font-semibold tracking-tight text-foreground">
                            {formatPrice(data.price)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke={chartColor} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                  animationDuration={1200}
                  activeDot={{ r: 5, strokeWidth: 0, fill: chartColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-medium">{t('currency.noHistory')}</div>
        )}
      </div>
    </>
  );
}

  return (
    <AnimatePresence>
      {selectedKey && (
        isMobile ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop Overlay with fade animation */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-md"
            />

            {/* Swipe-to-close Bottom Sheet Drawer */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.1, bottom: 0.8 }}
              onDragEnd={(_, info) => {
                // Swipe down gesture thresholds
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  onClose();
                }
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative z-50 w-full bg-background border-t border-border rounded-t-3xl px-4 pt-3 pb-8 text-foreground max-h-[92vh] overflow-y-auto flex flex-col min-w-0 shadow-lg"
            >
              {/* Native Mobile Drag Handle Bar at top */}
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 shrink-0 cursor-grab active:cursor-grabbing" />

              {/* Accessible Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors hover:bg-secondary z-20"
              >
                <XIcon className="w-4 h-4" />
              </button>

              {renderInnerContent(false)}
            </motion.div>
          </div>
        ) : (
          <Dialog open={!!selectedKey} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[94vw] max-w-[94vw] sm:max-w-5xl bg-background border-border rounded-2xl overflow-hidden shadow-xl p-4 sm:p-6 md:p-7 text-foreground">
              {renderInnerContent(true)}
            </DialogContent>
          </Dialog>
        )
      )}
    </AnimatePresence>
  )
}
