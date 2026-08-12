import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCommodityLogs } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function CommoditiesLogsTab() {
  const qc = useQueryClient()

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['commodities-logs'],
    queryFn: () => fetchCommodityLogs(100),
    refetchInterval: 15000
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-emerald-500/10 text-emerald-400'
      case 'warning': return 'bg-amber-500/10 text-amber-400'
      case 'error': return 'bg-red-500/10 text-red-400'
      default: return 'bg-secondary text-muted-foreground'
    }
  }

  const symbolColor = (line: string): string => {
    if (line.includes('up')) return 'text-emerald-400'
    if (line.includes('down')) return 'text-sky-400'
    if (line.includes('unchanged')) return 'text-yellow-400/70'
    if (line.includes('data not available') || line.includes('no data')) return 'text-red-400/80'
    return 'text-muted-foreground'
  }

  const symbolIcon = (line: string): string => {
    if (line.includes('up')) return '\u25b2'
    if (line.includes('down')) return '\u25bc'
    if (line.includes('unchanged')) return '\u25ac'
    if (line.includes('no data') || line.includes('not available')) return '\u2715'
    return '\u2022'
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Commodities sync log</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => qc.invalidateQueries({ queryKey: ['commodities-logs'] })}
            size="sm"
            className="rounded-lg font-semibold text-xs border border-border text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3 h-3 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-3 font-medium">Loading logs...</p>
        </div>
      )}

      {error && (
        <div className="p-6 text-center">
          <p className="text-red-400 text-xs font-mono">Error loading logs: {error.message}</p>
        </div>
      )}

      {logs && logs.length === 0 && (
        <div className="p-12 text-center border-b border-border">
          <p className="text-muted-foreground text-sm">No sync logs yet. Run a sync first!</p>
        </div>
      )}

      {logs && logs.length > 0 && (
        <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
          {logs.map((log: any) => {
            const time = new Date(log.createdAt).toLocaleString('uk-UA', {
              day: '2-digit', month: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            })
            const msgLines = log.message.split('\n')
            const summary = msgLines[0]
            const perSymbolLines = msgLines.slice(1).filter((l: string) => l.trim().length > 0)
            return (
              <div key={log.id} className="px-6 py-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider whitespace-nowrap ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">[{time}]</span>
                      <span className="text-xs font-mono text-foreground truncate">{summary}</span>
                    </div>
                    {perSymbolLines.length > 0 && (
                      <div className="mt-2 space-y-1 pl-2 border-l-2 border-border">
                        {perSymbolLines.map((line: string, i: number) => {
                          const text = line.replace(/^.\s*/, '').trim()
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className={`text-xs font-mono leading-relaxed ${symbolColor(line)}`}>
                                <span className="mr-1.5">{symbolIcon(line)}</span>
                                {text}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {logs && logs.length > 0 && (
        <div className="p-3 border-t border-border text-center">
          <p className="text-[9px] text-muted-foreground font-mono">
            {logs.length} logs · auto-refreshes every 15s
          </p>
        </div>
      )}
    </div>
  )
}
