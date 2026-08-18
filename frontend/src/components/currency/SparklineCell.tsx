import { TrendingUp, TrendingDown, MinusIcon } from 'lucide-react';
import { useCurrencyHistory } from '@/hooks/use-currencies';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function SparklineCell({ currencyKey, days, type }: { currencyKey: string, days: number, type?: string }) {
  const basePath = type === 'commodity' || type === 'metal' ? '/commodities' : '/currency';
  const { data, isLoading } = useCurrencyHistory(currencyKey, days, undefined, undefined, undefined, basePath);

  const parsedData = useMemo(() => {
    if (!data?.success || data.data.length === 0) return null;
    const history = data.data;
    const sorted = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const prices = sorted.map(item => Number(item.price));
    if (prices.length < 2) return null;

    const first = prices[0];
    const last = prices[prices.length - 1];
    
    const diff = last - first;
    const percent = first > 0 ? (diff / first) * 100 : 0;
    
    const width = 60;
    const height = 24;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    
    const points = prices.map((p, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = range === 0 ? height / 2 : height - ((p - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const isUp = percent > 0;
    const isDown = percent < 0;
    const color = isUp ? '#10b981' : isDown ? '#ef4444' : '#71717a';

    return { percent, points, color, isUp, isDown };
  }, [data]);

  if (isLoading) {
    return (
      <>
        <td className="px-6 py-4 text-right"><Skeleton className="w-12 h-4 ml-auto" /></td>
        <td className="px-6 py-4 text-right"><Skeleton className="w-16 h-6 ml-auto" /></td>
      </>
    );
  }

  if (!parsedData) {
    return (
      <>
        <td className="px-6 py-4 text-right text-xs text-muted-foreground">-</td>
        <td className="px-6 py-4 text-right text-xs text-muted-foreground">-</td>
      </>
    );
  }

  return (
    <>
      <td className="px-6 py-4 text-right">
        <span className={`inline-flex items-center gap-1 text-[12px] font-black tracking-widest ${
          parsedData.isUp ? 'text-emerald-500' : 
          parsedData.isDown ? 'text-red-500' : 
          'text-muted-foreground'
        }`}>
          {parsedData.isUp ? <TrendingUp className="w-3.5 h-3.5" /> :
           parsedData.isDown ? <TrendingDown className="w-3.5 h-3.5" /> :
           <MinusIcon className="w-3.5 h-3.5" />}
          ~{parsedData.isUp ? '+' : ''}{parsedData.percent.toFixed(2)}%
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end">
          <svg width="60" height="24" className="overflow-visible">
            <polyline
              fill="none"
              stroke={parsedData.color}
              strokeWidth="1.5"
              points={parsedData.points}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </td>
    </>
  );
}
