import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllCommodities, createCommodityAdmin, updateCommodityAdmin, deleteCommodityAdmin, syncOneCommodityPrice, syncAllCommodityPrices } from '@/lib/api'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Edit2, RefreshCw, FileText, ChevronDown, ChevronUp, X } from 'lucide-react'

const CATEGORIES = [
  { value: 'metals_precious', label: 'Precious Metals' },
  { value: 'metals_base', label: 'Base Metals' },
  { value: 'metals_other', label: 'Other Metals' },
  { value: 'energy', label: 'Energy' },
  { value: 'grains', label: 'Grains' },
  { value: 'softs', label: 'Softs' },
  { value: 'livestock', label: 'Livestock' },
  { value: 'other', label: 'Other' },
]
const EMOJIS: Record<string, string> = {
  metals_precious: '💎', metals_base: '🔩', metals_other: '⚙️',
  energy: '⚡', grains: '🌾', softs: '🍫', livestock: '🐄', other: '📦',
}

interface SyncLogEntry {
  timestamp: Date
  updated: number
  errors: string[]
  duration?: number
}

export function CommoditiesTab() {
  const qc = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [edit, setEdit] = React.useState(false)
  const [f, setF] = React.useState({ symbol: '', name: '', nameRu: '', nameUa: '', category: 'metals_precious', unit: 'oz', exchange: '', source: 'investing', enabled: true, order: 0, params: '' })
  const [syncLog, setSyncLog] = React.useState<SyncLogEntry[]>([])
  const [showLog, setShowLog] = React.useState(false)

  const { data: items } = useQuery({ queryKey: ['admin-commodities'], queryFn: fetchAllCommodities })

  const toggleMut = useMutation({
    mutationFn: ({ symbol, enabled }: { symbol: string, enabled: boolean }) => updateCommodityAdmin(symbol, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-commodities'] })
  })
  const saveMut = useMutation({
    mutationFn: (d: any) => edit ? updateCommodityAdmin(d.symbol, (({ symbol: _, ...r }) => r)(d)) : createCommodityAdmin(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-commodities'] }); setOpen(false); reset() },
    onError: (e: any) => alert('Error: ' + (e?.response?.data?.message || e.message))
  })
  const delMut = useMutation({
    mutationFn: (s: string) => deleteCommodityAdmin(s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-commodities'] }),
    onError: (e: any) => alert('Error: ' + (e?.response?.data?.message || e.message))
  })
  const syncMut = useMutation({
    mutationFn: (s: string) => syncOneCommodityPrice(s),
    onSuccess: (d, s) => {
      setSyncLog(prev => [{
        timestamp: new Date(),
        updated: d.price ? 1 : 0,
        errors: d.price ? [] : [`${s}: no price returned`],
        duration: 0
      }, ...prev].slice(0, 50))
      setShowLog(true)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['admin-commodities'] }), 1000)
    },
    onError: (e: any) => {
      setSyncLog(prev => [{
        timestamp: new Date(),
        updated: 0,
        errors: [e?.response?.data?.message || e.message],
        duration: 0
      }, ...prev].slice(0, 50))
      setShowLog(true)
    }
  })
  const syncAllMut = useMutation({
    mutationFn: () => syncAllCommodityPrices(),
    onSuccess: (d) => {
      setSyncLog(prev => [{
        timestamp: new Date(),
        updated: d.updated || 0,
        errors: d.errors || [],
        duration: d.duration
      }, ...prev].slice(0, 50))
      setShowLog(true)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['admin-commodities'] }), 2000)
    },
    onError: (e: any) => {
      setSyncLog(prev => [{
        timestamp: new Date(),
        updated: 0,
        errors: [e?.response?.data?.message || e.message],
        duration: 0
      }, ...prev].slice(0, 50))
      setShowLog(true)
    }
  })

  const reset = () => setF({ symbol: '', name: '', nameRu: '', nameUa: '', category: 'metals_precious', unit: 'oz', exchange: '', source: 'investing', enabled: true, order: 0, params: '' })
  const add = () => { setEdit(false); reset(); setOpen(true) }
  const editOpen = (c: any) => {
    setEdit(true)
    setF({ symbol: c.symbol, name: c.name || '', nameRu: c.nameRu || '', nameUa: c.nameUa || '', category: c.category || 'other', unit: c.unit || 'oz', exchange: c.exchange || '', source: c.source || 'investing', enabled: c.enabled ?? true, order: c.order ?? 0, params: c.params ? JSON.stringify(c.params) : '' })
    setOpen(true)
  }
  const del = (s: string) => { if (confirm('Delete ' + s + '? This will delete all rates too.')) delMut.mutate(s) }
  const save = () => {
    let p = null
    if (f.params) { try { p = JSON.parse(f.params) } catch {} }
    const { params: _, ...rest } = f
    saveMut.mutate({ ...rest, params: p })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Commodities</h2>
        <div className="flex items-center gap-2">
        <Button onClick={() => syncAllMut.mutate()} size="sm" className="rounded-xl font-bold uppercase tracking-widest text-[10px] border border-amber-500/30 text-amber-400 hover:bg-amber-500/10" disabled={syncAllMut.isPending}>
          <RefreshCw className={"w-3 h-3 mr-2 " + (syncAllMut.isPending ? "animate-spin" : "")} /> Sync All
        </Button>
        <Button onClick={add} size="sm" className="rounded-xl font-bold uppercase tracking-widest text-[10px] bg-foreground text-background hover:bg-foreground/90">
          <Plus className="w-3 h-3 mr-2" /> Add
        </Button>
        </div>
      </div>

      {/* Sync Log Panel */}
      {syncLog.length > 0 && (
        <div className="border-b border-border">
          <button
            onClick={() => setShowLog(!showLog)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors bg-secondary/30"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Sync Log ({syncLog.length})
              {syncAllMut.isPending && <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setSyncLog([]); setShowLog(false); }}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                title="Clear log"
              >
                <X className="w-3 h-3" />
              </button>
              {showLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>
          {showLog && (
            <div className="max-h-[300px] overflow-y-auto px-5 py-2 space-y-1.5 bg-secondary/20">
              {syncLog.map((entry, i) => {
                const time = new Date(entry.timestamp).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                return (
                  <div key={i} className="text-xs font-mono leading-relaxed">
                    <span className="text-muted-foreground">[{time}]</span>{' '}
                    <span className={entry.errors.length > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                      {entry.updated} updated
                    </span>
                    {entry.duration ? <span className="text-muted-foreground"> ({entry.duration}ms)</span> : null}
                    {entry.errors.length > 0 && (
                      <div className="pl-4 text-red-400/80">
                        {entry.errors.map((err, j) => (
                          <div key={j}>⚠ {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background border border-border rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">{edit ? 'Edit: ' + f.symbol : 'Add Commodity'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-left">
            {!edit && <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Symbol</label>
              <Input value={f.symbol} onChange={e => setF({...f, symbol: e.target.value.toUpperCase()})} className="rounded-lg bg-card border-border font-mono" placeholder="XAU" />
            </div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name (EN)</label>
                <Input value={f.name} onChange={e => setF({...f, name: e.target.value})} className="rounded-lg bg-card border-border" placeholder="Gold" />
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
                <select value={f.category} onChange={e => setF({...f, category: e.target.value})} className="rounded-lg bg-card border border-border p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{EMOJIS[c.value]} {c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2 p-3 rounded-xl bg-secondary/30 border border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">🌐 Translations</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">RU</label>
                  <Input value={f.nameRu} onChange={e => setF({...f, nameRu: e.target.value})} className="rounded-lg bg-card border-border h-8 text-xs" placeholder="Золото" />
                </div>
                <div className="grid gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">UA</label>
                  <Input value={f.nameUa} onChange={e => setF({...f, nameUa: e.target.value})} className="rounded-lg bg-card border-border h-8 text-xs" placeholder="Золото" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unit</label>
                <select value={f.unit} onChange={e => setF({...f, unit: e.target.value})} className="rounded-lg bg-card border border-border p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="oz">oz (Troy ounce)</option>
                  <option value="lb">lb (Pound)</option>
                  <option value="mt">mt (Metric ton)</option>
                  <option value="bbl">bbl (Barrel)</option>
                  <option value="bushel">bushel</option>
                  <option value="lbs">lbs</option>
                  <option value="cnt">cnt (Cents/lb)</option>
                  <option value="pnt">pnt (Points)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Exchange</label>
                <Input value={f.exchange} onChange={e => setF({...f, exchange: e.target.value})} className="rounded-lg bg-card border-border" placeholder="COMEX / ICE" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source</label>
                <select value={f.source} onChange={e => setF({...f, source: e.target.value})} className="rounded-lg bg-card border border-border p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="investing">Investing.com</option>
                  <option value="metalcharts">MetalCharts</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order</label>
                <Input type="number" value={f.order} onChange={e => setF({...f, order: parseInt(e.target.value) || 0})} className="rounded-lg bg-card border-border" placeholder="0" />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Params (JSON)</label>
              <textarea value={f.params} onChange={e => setF({...f, params: e.target.value})} className="rounded-lg bg-card border border-border p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]" placeholder='{"slug": "xau-usd", "pairId": "8830"}' />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} className="rounded-xl w-full bg-foreground text-background font-bold uppercase tracking-widest text-[10px]">{edit ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="font-bold text-xs uppercase tracking-wider">Commodity</TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider">Category</TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider text-center">Enabled</TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items?.map((c: any) => (
            <TableRow key={c.symbol} className="border-border hover:bg-secondary/30">
              <TableCell className="font-bold text-sm">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span>{EMOJIS[c.category] || '📦'}</span>
                    <span className="font-mono">{c.symbol}</span>
                    <span className="text-muted-foreground text-xs ml-1">{c.name}</span>
                    <span className={'text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ' + (c.ratesCount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400')}>
                      {c.ratesCount > 0 ? c.ratesCount + ' pts' : 'no data'}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest pl-2">{c.exchange || c.unit} · {c.source}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{CATEGORIES.find(cat => cat.value === c.category)?.label || c.category}</TableCell>
              <TableCell className="text-center">
                <Switch checked={c.enabled} onCheckedChange={(ch) => toggleMut.mutate({ symbol: c.symbol, enabled: ch })} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button onClick={() => syncMut.mutate(c.symbol)} variant="ghost" size="sm" className="text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl" title="Sync price" disabled={syncMut.isPending}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button onClick={() => editOpen(c)} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button onClick={() => del(c.symbol)} variant="ghost" size="sm" className="text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
