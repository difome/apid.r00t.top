import { TrendingUp, TrendingDown, MinusIcon, Search } from "lucide-react"
import type { CurrencyMeta } from "@/types/currency"
import type { MarketAsset } from "@/types/market"
import { useTranslation } from 'react-i18next'
import { useState, useMemo } from "react"
import { SparklineCell } from "./SparklineCell"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MarketOverviewProps {
  currencies: MarketAsset[]
  converterMap: Record<string, number>
  symbolsMap: Record<string, CurrencyMeta>
  onSelect: (key: string) => void
  showTabs?: boolean
  defaultTab?: 'all' | 'fiat' | 'crypto' | 'commodity'
}

const periods = [
  { label: '1d', days: 1 },
  { label: '7d', days: 7 },
  { label: '1m', days: 30 },
  { label: '3m', days: 90 },
  { label: '6m', days: 180 },
  { label: '1y', days: 365 },
];

export function MarketOverview({ currencies, converterMap, symbolsMap, onSelect, showTabs = true, defaultTab = 'all' }: MarketOverviewProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'ru' ? 'ru' : 'uk'

  const [activeTab, setActiveTab] = useState<'all' | 'fiat' | 'crypto' | 'commodity'>(defaultTab)
  const [displayCurrency, setDisplayCurrency] = useState('USD')
  const [searchQuery, setSearchQuery] = useState('')
  const [currencyPickerSearch, setCurrencyPickerSearch] = useState('')
  
  const availableDisplayCurrencies = useMemo(() => {
    const set = new Set<string>();
    set.add('USD');
    Object.keys(symbolsMap).forEach(k => {
      set.add(k.toUpperCase());
    });
    return Array.from(set).sort();
  }, [symbolsMap]);

  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]);

  const isCryptoAsset = (asset: MarketAsset | string) => {
    if (typeof asset !== 'string' && asset.type === 'commodity') return false;
    const k = (typeof asset === 'string' ? asset : asset.key || '').toLowerCase();
    return k.includes('btc') || k.includes('eth') || k.includes('sol') || k.includes('ton') || k.includes('usdt');
  };

  const counts = useMemo(() => {
    let fiat = 0;
    let crypto = 0;
    let commodity = 0;
    currencies.forEach(c => {
      if (c.type === 'commodity') {
        commodity++;
      } else if (isCryptoAsset(c)) {
        crypto++;
      } else {
        fiat++;
      }
    });
    return { all: currencies.length, fiat, crypto, commodity };
  }, [currencies]);

  const filteredCurrencies = useMemo(() => {
    return currencies.filter(c => {
      if (activeTab === 'commodity') return c.type === 'commodity';
      const isCrypto = isCryptoAsset(c);
      if (activeTab === 'crypto' && !isCrypto) return false;
      if (activeTab === 'fiat' && (isCrypto || c.type === 'commodity')) return false;
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(c.name || '').toLowerCase().includes(q) && 
            !(c.baseCurrency || '').toLowerCase().includes(q) && 
            !(c.targetCurrency || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [currencies, activeTab, searchQuery]);

  const tabLabels: Record<string, Record<string, string>> = {
    all: { uk: 'Всі активи', ru: 'Все активы', en: 'All Assets' },
    fiat: { uk: 'Фіатні валюти', ru: 'Фиатные валюты', en: 'Fiat Currencies' },
    crypto: { uk: 'Криптовалюта', ru: 'Криптовалюта', en: 'Cryptocurrency' },
    commodity: { uk: 'Сировинні товари', ru: 'Сырьевые товары', en: 'Commodities' }
  };

  const getTabLabel = (tab: string) => {
    const l = lang === 'uk' ? 'uk' : 'ru';
    return tabLabels[tab][l] || tabLabels[tab]['ru'];
  };

  const getPriceInDisplayCurrency = (c: MarketAsset) => {
    let priceUsd = Number(c.latestRate.price);
    
    // Normalize to USD
    if (c.targetCurrency.toUpperCase() !== 'USD') {
      if (c.baseCurrency.toUpperCase() === 'USD') {
        priceUsd = 1 / priceUsd;
      }
    } else if (c.baseCurrency.toUpperCase() === 'USD') {
      priceUsd = 1;
    }

    if (displayCurrency === 'USD') return priceUsd;

    const directKey = `usd_to_${displayCurrency.toLowerCase()}`;
    const reverseKey = `${displayCurrency.toLowerCase()}_to_usd`;
    
    if (converterMap[directKey]) {
      return priceUsd * converterMap[directKey];
    } else if (converterMap[reverseKey]) {
      return priceUsd * (1 / converterMap[reverseKey]);
    }
    
    return priceUsd; // fallback if conversion not found
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 border-b border-border pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {t('currency.marketOverview')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {lang === 'uk' ? 'Актуальні котирування та короткострокова динаміка.' : 'Актуальные котировки и краткосрочная динамика.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full md:w-auto">
          <div className="relative w-full sm:w-[190px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={lang === 'uk' ? 'Пошук активів...' : 'Поиск активов...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border text-sm font-medium rounded-lg h-9"
            />
          </div>

          <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
            <SelectTrigger className="w-full sm:w-[112px] bg-card border-border text-sm font-semibold uppercase h-9 rounded-lg">
              <SelectValue>{displayCurrency}</SelectValue>
            </SelectTrigger>
            <SelectContent 
              position="popper" 
              sideOffset={8}
              className="bg-popover border-border text-popover-foreground max-h-[360px] w-[230px] rounded-xl p-1 shadow-lg"
            >
              <div className="p-1 pb-2 sticky top-0 bg-popover z-10 mb-1 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Пошук валюти"
                    value={currencyPickerSearch}
                    onChange={(e) => setCurrencyPickerSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="pl-8 bg-transparent border-border text-sm h-9 rounded-lg text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-primary/50 transition-colors"
                  />
                </div>
              </div>
              <div className="px-0.5">
                {availableDisplayCurrencies.filter(c => (c || '').toLowerCase().includes(currencyPickerSearch.toLowerCase())).map(curr => {
                  const meta = symbolsMap[curr] as CurrencyMeta | undefined;
                  const emoji = meta?.emoji || curr.substring(0, 2);
                  const name = meta?.name || curr;
                  return (
                    <SelectItem 
                      key={curr} 
                      value={curr} 
                      className="focus:bg-secondary/50 cursor-pointer py-1.5 rounded-lg mb-0.5 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="bg-secondary w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                          {emoji}
                        </div>
                        <div className="flex flex-col text-left justify-center">
                          <span className="font-medium text-sm text-foreground leading-tight">{name}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold leading-none mt-[1px]">{curr}</span>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </div>
            </SelectContent>
          </Select>
          </div>
        </div>

        {showTabs && (
          <div className="flex w-full overflow-x-auto scrollbar-none rounded-xl border border-border bg-card p-1">
              {(['all', 'fiat', 'crypto'] as const).map((tab) => {
                const isActive = activeTab === tab;
                const count = counts[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                      isActive 
                        ? 'bg-secondary text-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {getTabLabel(tab)}
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-background text-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-1.5 flex items-center justify-between">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {periods.map(p => (
            <button
              key={p.label}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                selectedPeriod.label === p.label
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold pr-3 hidden sm:block">
          Timeframe
        </div>
      </div>

      {/* Sleek Table Layout with Borders */}
      <div className="w-full overflow-x-auto bg-card border border-border rounded-xl">
        <table className="w-full border-collapse text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-[11px] text-muted-foreground font-semibold tracking-wide uppercase">
              <th className="px-4 py-3 w-10 text-center">#</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">24H %</th>
              <th className="px-4 py-3 text-right">{selectedPeriod.label} %</th>
              <th className="px-4 py-3 text-right">Last {selectedPeriod.label.toUpperCase()}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCurrencies.map((c, idx) => {
              const price = getPriceInDisplayCurrency(c);
              // Avoid showing fiat/fiat pairs that match the selected currency (e.g. USD/RUB when displaying RUB is 1)
              if (c.baseCurrency.toUpperCase() === displayCurrency && c.targetCurrency.toUpperCase() === 'USD') return null;

              const isReversed = c.baseCurrency.toUpperCase() === 'USD' && !isCryptoAsset(c.key);
              const displayName = isReversed ? (c.targetName || c.targetCurrency) : (c.baseName || c.baseCurrency);
              const displayCode = isReversed ? c.targetCurrency : c.baseCurrency;

              return (
                <tr 
                  key={c.key} 
                  onClick={() => onSelect(c.key)}
                  className="group border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-secondary w-7 h-7 rounded-md flex items-center justify-center text-base">
                        {c.emoji}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm tracking-tight text-foreground">
                          {displayName}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground tracking-wide mt-0.5">
                          {displayCode}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold tracking-tight text-foreground flex items-center justify-end">
                        <span className="text-muted-foreground font-medium text-xs mr-1">{(symbolsMap as Record<string, CurrencyMeta | undefined>)[displayCurrency]?.symbol || displayCurrency}</span>
                        {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      c.stats24h.direction === 'up' ? 'text-emerald-500' :
                      c.stats24h.direction === 'down' ? 'text-red-500' :
                      'text-muted-foreground'
                    }`}>
                      {c.stats24h.direction === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> :
                       c.stats24h.direction === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> :
                       <MinusIcon className="w-3.5 h-3.5" />}
                      ~{c.stats24h.direction === 'up' ? '+' : ''}{c.stats24h.percent.toFixed(2)}%
                    </span>
                  </td>
                    <SparklineCell currencyKey={c.key} type={c.type} days={selectedPeriod.days} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
